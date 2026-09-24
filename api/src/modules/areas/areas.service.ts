import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { calculateDistanceKm } from './distance';

export interface AreaResult {
  id: number;
  name: string;
  corridor: string;
  lat: number;
  lng: number;
}

export async function listAreas(): Promise<AreaResult[]> {
  const areas = await prisma.area.findMany({
    orderBy: { name: 'asc' },
  });

  return areas.map((a) => ({
    id: a.id,
    name: a.name,
    corridor: a.corridor,
    lat: Number(a.lat),
    lng: Number(a.lng),
  }));
}

export async function getAreaById(id: number): Promise<AreaResult> {
  const area = await prisma.area.findUnique({
    where: { id },
  });

  if (!area) {
    throw new AppError('AREA_NOT_FOUND', 404, `Area with ID ${id} not found`);
  }

  return {
    id: area.id,
    name: area.name,
    corridor: area.corridor,
    lat: Number(area.lat),
    lng: Number(area.lng),
  };
}

export async function getDistanceBetweenAreas(pickupAreaId: number, dropoffAreaId: number): Promise<number> {
  const [pickup, dropoff] = await Promise.all([
    getAreaById(pickupAreaId),
    getAreaById(dropoffAreaId),
  ]);

  return calculateDistanceKm(pickup.name, dropoff.name);
}
