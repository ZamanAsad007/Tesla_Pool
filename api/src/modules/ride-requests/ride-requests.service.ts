import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { calculateDistanceKm } from '../areas/distance';
import { AuthenticatedUser } from '../../middleware/auth';
import { CreateRideRequestInput } from './schemas';
import { RideRequestStatus } from '@prisma/client';

export async function createRideRequest(
  passengerId: string,
  input: CreateRideRequestInput,
  idempotencyKey?: string
) {
  // 1. Idempotency Key check
  if (idempotencyKey) {
    const existing = await prisma.rideRequest.findUnique({
      where: { idempotencyKey },
      include: {
        fareSnapshots: {
          orderBy: { quotedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existing) {
      if (existing.passengerId === passengerId) {
        return {
          request: existing,
          fareQuote: existing.fareSnapshots[0] || null,
          isReplay: true,
        };
      } else {
        throw new AppError('CONFLICT', 409, 'Idempotency key already used by another user');
      }
    }
  }

  // 2. Validate Area IDs
  if (input.pickupAreaId === input.dropoffAreaId) {
    throw new AppError('INVALID_ROUTE', 422, 'Pickup and dropoff area cannot be identical');
  }

  const [pickupArea, dropoffArea] = await Promise.all([
    prisma.area.findUnique({ where: { id: input.pickupAreaId } }),
    prisma.area.findUnique({ where: { id: input.dropoffAreaId } }),
  ]);

  if (!pickupArea || !dropoffArea) {
    throw new AppError('AREA_NOT_FOUND', 404, 'Pickup or dropoff area not found');
  }

  // 3. Enforce one open request per passenger
  const openRequest = await prisma.rideRequest.findFirst({
    where: {
      passengerId,
      status: {
        in: ['REQUESTED', 'MATCHED', 'ARRIVED', 'STARTED'],
      },
    },
  });

  if (openRequest) {
    throw new AppError('OPEN_REQUEST_EXISTS', 409, 'Passenger already has an active ride request');
  }

  // 4. Calculate solo fare
  const distanceKm = calculateDistanceKm(pickupArea.name, dropoffArea.name);
  const basePaisa = 1000; // ৳10 base
  const distancePaisa = distanceKm * 1000; // ৳10 per km
  const discountPaisa = 0;
  const totalPaisa = basePaisa + distancePaisa - discountPaisa;

  const breakdown = {
    distanceKm,
    basePaisa,
    distancePaisa,
    discountPaisa,
    totalPaisa,
    fareType: 'SOLO_QUOTE',
  };

  // 5. Transactional insert of RideRequest + FareSnapshot
  return prisma.$transaction(async (tx) => {
    const request = await tx.rideRequest.create({
      data: {
        passengerId,
        pickupAreaId: input.pickupAreaId,
        dropoffAreaId: input.dropoffAreaId,
        seats: input.seats || 1,
        status: 'REQUESTED',
        idempotencyKey: idempotencyKey || null,
      },
    });

    const fareQuote = await tx.fareSnapshot.create({
      data: {
        rideRequestId: request.id,
        basePaisa,
        distancePaisa,
        discountPaisa,
        totalPaisa,
        breakdown,
      },
    });

    return { request, fareQuote, isReplay: false };
  });
}

export async function getRideRequestById(requestId: string, actor: AuthenticatedUser) {
  const request = await prisma.rideRequest.findUnique({
    where: { id: requestId },
    include: {
      pickupArea: true,
      dropoffArea: true,
      fareSnapshots: {
        orderBy: { quotedAt: 'desc' },
        take: 1,
      },
      memberships: {
        where: { leftAt: null },
        take: 1,
      },
    },
  });

  if (!request) {
    throw new AppError('NOT_FOUND', 404, 'Ride request not found');
  }

  // Failed ownership check returns 404 NOT_FOUND per §9 to avoid information leaks
  if (actor.role === 'PASSENGER' && request.passengerId !== actor.id) {
    throw new AppError('NOT_FOUND', 404, 'Ride request not found');
  }

  const poolId = request.memberships[0]?.poolId || null;
  const latestFare = request.fareSnapshots[0] || null;

  return {
    ...request,
    poolId,
    latestFare,
  };
}

export async function getMyRideRequests(passengerId: string, statusFilter?: RideRequestStatus) {
  return prisma.rideRequest.findMany({
    where: {
      passengerId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: {
      pickupArea: true,
      dropoffArea: true,
      fareSnapshots: {
        orderBy: { quotedAt: 'desc' },
        take: 1,
      },
      memberships: {
        where: { leftAt: null },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function cancelRideRequest(requestId: string, actor: AuthenticatedUser) {
  const request = await prisma.rideRequest.findUnique({
    where: { id: requestId },
    include: {
      memberships: {
        where: { leftAt: null },
        include: { pool: true },
      },
    },
  });

  if (!request) {
    throw new AppError('NOT_FOUND', 404, 'Ride request not found');
  }

  // Failed ownership check returns 404 per §9
  if (actor.role === 'PASSENGER' && request.passengerId !== actor.id) {
    throw new AppError('NOT_FOUND', 404, 'Ride request not found');
  }

  // Allowed while REQUESTED, MATCHED, or ARRIVED (before STARTED)
  const cancelableStatuses: RideRequestStatus[] = ['REQUESTED', 'MATCHED', 'ARRIVED'];
  if (!cancelableStatuses.includes(request.status)) {
    throw new AppError(
      'INVALID_STATE',
      409,
      `Cannot cancel ride request in ${request.status} status. Only REQUESTED, MATCHED, or ARRIVED can be cancelled.`
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.rideRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    const activeMembership = request.memberships[0];
    if (activeMembership) {
      await tx.poolMembership.update({
        where: { id: activeMembership.id },
        data: { leftAt: new Date() },
      });

      await tx.poolEvent.create({
        data: {
          poolId: activeMembership.poolId,
          actorId: actor.id,
          event: 'PASSENGER_LEFT',
          meta: { rideRequestId: requestId },
        },
      });

      // Check if this was the last active member in the pool
      const remainingActive = await tx.poolMembership.count({
        where: {
          poolId: activeMembership.poolId,
          leftAt: null,
        },
      });

      if (remainingActive === 0) {
        await tx.pool.update({
          where: { id: activeMembership.poolId },
          data: { status: 'CANCELLED' },
        });

        await tx.poolEvent.create({
          data: {
            poolId: activeMembership.poolId,
            actorId: actor.id,
            event: 'CANCELLED',
            meta: { reason: 'POOL_EMPTY_AUTO_CANCELLED' },
          },
        });
      }
    }

    return updated;
  });
}
