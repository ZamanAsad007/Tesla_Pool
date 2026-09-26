import { prisma } from '../../lib/prisma';

export async function getOpenRequests(areaId?: number) {
  return prisma.rideRequest.findMany({
    where: {
      status: 'REQUESTED',
      ...(areaId ? { pickupAreaId: areaId } : {}),
    },
    include: {
      pickupArea: true,
      dropoffArea: true,
      passenger: {
        select: { id: true, name: true, email: true },
      },
      fareSnapshots: {
        orderBy: { quotedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getDriverActivePool(driverId: string) {
  const tesla = await prisma.tesla.findUnique({
    where: { ownerId: driverId },
  });

  if (!tesla) {
    return null;
  }

  const pool = await prisma.pool.findFirst({
    where: {
      teslaId: tesla.id,
      status: {
        notIn: ['COMPLETED', 'CANCELLED'],
      },
    },
    include: {
      tesla: true,
      driver: {
        select: { id: true, name: true, email: true },
      },
      memberships: {
        where: { leftAt: null },
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
          payments: true,
        },
      },
      events: {
        orderBy: { at: 'desc' },
      },
    },
  });

  return pool;
}
