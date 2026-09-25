import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { AuthenticatedUser } from '../../middleware/auth';
import { CreatePoolInput } from './schemas';
import { PoolStatus, PoolEventType } from '@prisma/client';

export const LEGAL_TRANSITIONS: Record<PoolStatus, PoolStatus[]> = {
  MATCHED: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['STARTED', 'CANCELLED'],
  STARTED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export async function createPoolFromRequest(driverId: string, input: CreatePoolInput) {
  // 1. Look up driver's vehicle derived from owner_id (§3 #2, §4)
  const tesla = await prisma.tesla.findUnique({
    where: { ownerId: driverId },
  });

  if (!tesla) {
    throw new AppError('TESLA_NOT_FOUND', 404, 'Driver does not have a registered vehicle');
  }

  if (!tesla.online) {
    throw new AppError('TESLA_OFFLINE', 409, 'Cannot create a pool while vehicle is offline');
  }

  // 2. Enforce one active pool per tesla (§3 #4)
  const activePool = await prisma.pool.findFirst({
    where: {
      teslaId: tesla.id,
      status: {
        notIn: ['COMPLETED', 'CANCELLED'],
      },
    },
  });

  if (activePool) {
    throw new AppError('TESLA_BUSY', 409, 'Tesla already operates an active pool');
  }

  // 3. Find and validate the requested ride
  const rideRequest = await prisma.rideRequest.findUnique({
    where: { id: input.rideRequestId },
    include: {
      fareSnapshots: {
        orderBy: { quotedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!rideRequest) {
    throw new AppError('RIDE_REQUEST_NOT_FOUND', 404, 'Ride request not found');
  }

  if (rideRequest.status !== 'REQUESTED') {
    throw new AppError(
      'INVALID_STATE',
      409,
      `Cannot accept ride request in ${rideRequest.status} status. Must be REQUESTED.`
    );
  }

  // 4. Transactionally create pool, membership, transition request, and emit event
  return prisma.$transaction(async (tx) => {
    const pool = await tx.pool.create({
      data: {
        teslaId: tesla.id,
        driverId,
        status: 'MATCHED',
      },
      include: {
        tesla: true,
      },
    });

    const quotedFare = rideRequest.fareSnapshots[0]?.totalPaisa || 1000;

    const membership = await tx.poolMembership.create({
      data: {
        poolId: pool.id,
        rideRequestId: rideRequest.id,
        passengerId: rideRequest.passengerId,
        seatCount: rideRequest.seats,
        farePaisa: quotedFare,
      },
    });

    await tx.rideRequest.update({
      where: { id: rideRequest.id },
      data: { status: 'MATCHED' },
    });

    await tx.poolEvent.create({
      data: {
        poolId: pool.id,
        actorId: driverId,
        event: 'MATCHED',
        meta: {
          rideRequestId: rideRequest.id,
          membershipId: membership.id,
        },
      },
    });

    return {
      ...pool,
      memberships: [membership],
    };
  });
}

export async function transitionPool(
  poolId: string,
  targetStatus: PoolStatus,
  actor: AuthenticatedUser
) {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      memberships: {
        where: { leftAt: null },
      },
    },
  });

  if (!pool) {
    throw new AppError('POOL_NOT_FOUND', 404, 'Pool not found');
  }

  if (pool.driverId !== actor.id) {
    throw new AppError('FORBIDDEN', 403, 'Only the operating driver can transition this pool');
  }

  const allowedTransitions = LEGAL_TRANSITIONS[pool.status];
  if (!allowedTransitions.includes(targetStatus)) {
    throw new AppError(
      'INVALID_STATE',
      409,
      `Invalid pool transition from ${pool.status} to ${targetStatus}`
    );
  }

  // Pool cannot START with 0 members (§5)
  if (targetStatus === 'STARTED' && pool.memberships.length === 0) {
    throw new AppError('INVALID_STATE', 409, 'Cannot start pool with 0 active members');
  }

  // Determine event type
  let eventType: PoolEventType;
  switch (targetStatus) {
    case 'ARRIVED':
      eventType = 'DRIVER_ARRIVED';
      break;
    case 'STARTED':
      eventType = 'STARTED';
      break;
    case 'COMPLETED':
      eventType = 'COMPLETED';
      break;
    case 'CANCELLED':
      eventType = 'CANCELLED';
      break;
    default:
      eventType = 'MATCHED';
  }

  return prisma.$transaction(async (tx) => {
    // 1. Update pool status
    const updatedPool = await tx.pool.update({
      where: { id: poolId },
      data: { status: targetStatus },
      include: {
        tesla: true,
        memberships: {
          include: { passenger: true },
        },
      },
    });

    // 2. Fan out to active member requests in lockstep (§5)
    for (const membership of pool.memberships) {
      await tx.rideRequest.update({
        where: { id: membership.rideRequestId },
        data: { status: targetStatus },
      });
    }

    // 3. Emit audit event
    await tx.poolEvent.create({
      data: {
        poolId,
        actorId: actor.id,
        event: eventType,
        meta: { fromStatus: pool.status, toStatus: targetStatus },
      },
    });

    return updatedPool;
  });
}

export async function leavePool(
  poolId: string,
  rideRequestId: string,
  actor: AuthenticatedUser
) {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      memberships: {
        where: { leftAt: null },
      },
    },
  });

  if (!pool) {
    throw new AppError('POOL_NOT_FOUND', 404, 'Pool not found');
  }

  const membership = pool.memberships.find((m) => m.rideRequestId === rideRequestId);
  if (!membership) {
    throw new AppError('MEMBERSHIP_NOT_FOUND', 404, 'Active pool membership not found for this ride request');
  }

  // Driver or the member passenger can trigger leave
  if (actor.role === 'PASSENGER' && membership.passengerId !== actor.id) {
    throw new AppError('NOT_FOUND', 404, 'Ride request not found');
  }
  if (actor.role === 'DRIVER' && pool.driverId !== actor.id) {
    throw new AppError('FORBIDDEN', 403, 'You do not operate this pool');
  }

  return prisma.$transaction(async (tx) => {
    // Void membership
    await tx.poolMembership.update({
      where: { id: membership.id },
      data: { leftAt: new Date() },
    });

    // Cancel the ride request
    await tx.rideRequest.update({
      where: { id: rideRequestId },
      data: { status: 'CANCELLED' },
    });

    // Audit event: PASSENGER_LEFT
    await tx.poolEvent.create({
      data: {
        poolId,
        actorId: actor.id,
        event: 'PASSENGER_LEFT',
        meta: { rideRequestId, seatCount: membership.seatCount },
      },
    });

    // Check remaining active members
    const remainingCount = await tx.poolMembership.count({
      where: {
        poolId,
        leftAt: null,
      },
    });

    // Auto-cancel empty pool (§5)
    let autoCancelled = false;
    if (remainingCount === 0) {
      await tx.pool.update({
        where: { id: poolId },
        data: { status: 'CANCELLED' },
      });

      await tx.poolEvent.create({
        data: {
          poolId,
          actorId: actor.id,
          event: 'CANCELLED',
          meta: { reason: 'POOL_EMPTY_AUTO_CANCELLED' },
        },
      });
      autoCancelled = true;
    }

    return {
      success: true,
      poolId,
      remainingCount,
      autoCancelled,
    };
  });
}

export async function getPoolById(poolId: string, actor: AuthenticatedUser) {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      tesla: true,
      driver: {
        select: { id: true, name: true, email: true },
      },
      memberships: {
        include: {
          passenger: {
            select: { id: true, name: true },
          },
          rideRequest: {
            include: {
              pickupArea: true,
              dropoffArea: true,
            },
          },
        },
      },
      events: {
        orderBy: { at: 'desc' },
      },
    },
  });

  if (!pool) {
    throw new AppError('POOL_NOT_FOUND', 404, 'Pool not found');
  }

  // Scoping: driver sees all; passenger only sees if they are/were a member
  if (actor.role === 'PASSENGER') {
    const isMember = pool.memberships.some((m) => m.passengerId === actor.id);
    if (!isMember) {
      throw new AppError('NOT_FOUND', 404, 'Pool not found');
    }
    // Passenger only sees own membership fare per §12
    return {
      ...pool,
      memberships: pool.memberships.filter((m) => m.passengerId === actor.id),
    };
  }

  return pool;
}
