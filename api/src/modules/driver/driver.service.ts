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
