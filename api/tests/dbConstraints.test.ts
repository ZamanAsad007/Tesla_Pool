import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';

describe('Database Schema & Constraints', () => {
  let passengerId: string;
  let driverId: string;
  let area1Id: number;
  let area2Id: number;
  let teslaId: string;

  beforeAll(async () => {
    // Clean tables in reverse dependency order
    await prisma.payment.deleteMany();
    await prisma.poolEvent.deleteMany();
    await prisma.poolMembership.deleteMany();
    await prisma.pool.deleteMany();
    await prisma.fareSnapshot.deleteMany();
    await prisma.rideRequest.deleteMany();
    await prisma.tesla.deleteMany();
    await prisma.area.deleteMany();
    await prisma.user.deleteMany();

    const passenger = await prisma.user.create({
      data: {
        email: 'passenger_test@example.com',
        name: 'Test Passenger',
        passwordHash: 'hash',
        role: 'PASSENGER',
      },
    });
    passengerId = passenger.id;

    const driver = await prisma.user.create({
      data: {
        email: 'driver_test@example.com',
        name: 'Test Driver',
        passwordHash: 'hash',
        role: 'DRIVER',
      },
    });
    driverId = driver.id;

    const area1 = await prisma.area.create({
      data: {
        name: 'Banani Test',
        corridor: 'NORTH',
        lat: 23.7937,
        lng: 90.4066,
      },
    });
    area1Id = area1.id;

    const area2 = await prisma.area.create({
      data: {
        name: 'Mohakhali Test',
        corridor: 'NORTH',
        lat: 23.7776,
        lng: 90.4054,
      },
    });
    area2Id = area2.id;

    const tesla = await prisma.tesla.create({
      data: {
        name: 'Bullet Test',
        capacity: 3,
        ownerId: driverId,
      },
    });
    teslaId = tesla.id;
  });

  afterAll(async () => {
    await prisma.payment.deleteMany();
    await prisma.poolEvent.deleteMany();
    await prisma.poolMembership.deleteMany();
    await prisma.pool.deleteMany();
    await prisma.fareSnapshot.deleteMany();
    await prisma.rideRequest.deleteMany();
    await prisma.tesla.deleteMany();
    await prisma.area.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('rejects tesla with capacity <= 0 via check constraint', async () => {
    await expect(
      prisma.tesla.create({
        data: {
          name: 'Invalid Tesla',
          capacity: 0,
          ownerId: driverId,
        },
      })
    ).rejects.toThrow();
  });

  it('enforces one open ride request per passenger', async () => {
    // First open request (REQUESTED)
    await prisma.rideRequest.create({
      data: {
        passengerId,
        pickupAreaId: area1Id,
        dropoffAreaId: area2Id,
        seats: 1,
        status: 'REQUESTED',
      },
    });

    // Attempting second open request for same passenger should fail
    await expect(
      prisma.rideRequest.create({
        data: {
          passengerId,
          pickupAreaId: area1Id,
          dropoffAreaId: area2Id,
          seats: 1,
          status: 'REQUESTED',
        },
      })
    ).rejects.toThrow();
  });

  it('enforces one active pool per tesla', async () => {
    // First active pool (MATCHED)
    await prisma.pool.create({
      data: {
        teslaId,
        driverId,
        status: 'MATCHED',
      },
    });

    // Attempting second active pool for same tesla should fail
    await expect(
      prisma.pool.create({
        data: {
          teslaId,
          driverId,
          status: 'MATCHED',
        },
      })
    ).rejects.toThrow();
  });
});
