import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { CreateTeslaInput, UpdateTeslaInput } from './schemas';

export async function getDriverTesla(driverId: string) {
  return prisma.tesla.findUnique({
    where: { ownerId: driverId },
  });
}

export async function getTeslaById(teslaId: string, actorId: string) {
  const tesla = await prisma.tesla.findUnique({
    where: { id: teslaId },
  });

  if (!tesla) {
    throw new AppError('TESLA_NOT_FOUND', 404, 'Vehicle not found');
  }

  if (tesla.ownerId !== actorId) {
    throw new AppError('FORBIDDEN', 403, 'You do not have access to this vehicle');
  }

  return tesla;
}

export async function createTesla(driverId: string, input: CreateTeslaInput) {
  const existing = await prisma.tesla.findUnique({
    where: { ownerId: driverId },
  });

  if (existing) {
    throw new AppError('TESLA_EXISTS', 409, 'Driver already has a registered vehicle');
  }

  if (input.capacity <= 0) {
    throw new AppError('INVALID_CAPACITY', 422, 'Vehicle capacity must be greater than 0');
  }

  return prisma.tesla.create({
    data: {
      ownerId: driverId,
      name: input.name.trim(),
      capacity: input.capacity,
      online: false,
    },
  });
}

export async function updateTesla(teslaId: string, actorId: string, input: UpdateTeslaInput) {
  // Check ownership (throws 403 if not owner, 404 if not found)
  await getTeslaById(teslaId, actorId);

  return prisma.tesla.update({
    where: { id: teslaId },
    data: {
      online: input.online,
    },
  });
}
