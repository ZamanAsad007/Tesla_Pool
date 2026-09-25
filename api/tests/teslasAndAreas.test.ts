import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { calculateDistanceKm } from '../src/modules/areas/distance';

describe('Phase 3: Teslas and Areas Integration Tests', () => {
  let driverToken: string;
  let driverId: string;
  let otherDriverToken: string;
  let passengerToken: string;
  let bulletId: string;

  beforeAll(async () => {
    // Seed core data
    const { main } = await import('../prisma/seed');
    await main();

    // Login Jashim (driver)
    const jashimLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'jashim@driver.test', password: 'password123' });
    driverToken = jashimLogin.body.token;
    driverId = jashimLogin.body.user.id;

    // Login Nusrat (passenger)
    const nusratLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nusrat@passenger.test', password: 'password123' });
    passengerToken = nusratLogin.body.token;

    // Register another driver for owner-scoping checks
    const otherDriver = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'other_driver@test.com',
        password: 'password123',
        name: 'Other Driver',
        role: 'DRIVER',
      });
    otherDriverToken = otherDriver.body.token;

    // Find seeded Bullet
    const bullet = await prisma.tesla.findFirst({
      where: { ownerId: driverId, name: 'Bullet' },
    });
    bulletId = bullet!.id;
  });

  afterAll(async () => {
    await prisma.tesla.deleteMany({
      where: { owner: { email: 'other_driver@test.com' } },
    });
    await prisma.user.deleteMany({
      where: { email: 'other_driver@test.com' },
    });
    await prisma.$disconnect();
  });

  describe('Areas and Distance Matrix', () => {
    it('GET /api/v1/areas returns all seeded areas publicly without authentication', async () => {
      const res = await request(app).get('/api/v1/areas');
      expect(res.status).toBe(200);
      expect(res.body.areas).toBeDefined();
      expect(res.body.areas.length).toBe(14);

      const banani = res.body.areas.find((a: any) => a.name === 'Banani');
      expect(banani).toBeDefined();
      expect(banani.corridor).toBe('NORTH');
      expect(typeof banani.lat).toBe('number');
      expect(typeof banani.lng).toBe('number');
    });

    it('GET /api/v1/areas/:id returns specific area', async () => {
      const allRes = await request(app).get('/api/v1/areas');
      const firstArea = allRes.body.areas[0];

      const res = await request(app).get(`/api/v1/areas/${firstArea.id}`);
      expect(res.status).toBe(200);
      expect(res.body.area.id).toBe(firstArea.id);
      expect(res.body.area.name).toBe(firstArea.name);
    });

    it('asserts deterministic distance matrix numbers (§3 & §6)', () => {
      expect(calculateDistanceKm('Banani', 'Mohakhali')).toBe(4); // Nusrat's trip: 4 km
      expect(calculateDistanceKm('Banani', 'Gulshan 1')).toBe(3);  // Rafiq's trip: 3 km
      expect(calculateDistanceKm('Banani', 'Gulshan 2')).toBe(2);  // Shirin's trip: 2 km
      expect(calculateDistanceKm('Mohakhali', 'Banani')).toBe(4);  // Symmetric
      expect(calculateDistanceKm('Banani', 'Banani')).toBe(0);     // Identity
    });
  });

  describe('Tesla CRUD & Owner-Scoping', () => {
    it('seeded Bullet belongs to Jashim with capacity 3 and online status', async () => {
      const res = await request(app)
        .get('/api/v1/teslas/mine')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tesla).toBeDefined();
      expect(res.body.tesla.id).toBe(bulletId);
      expect(res.body.tesla.name).toBe('Bullet');
      expect(res.body.tesla.capacity).toBe(3);
      expect(res.body.tesla.online).toBe(true);
    });

    it('GET /api/v1/teslas/mine returns null if driver has not yet registered a vehicle', async () => {
      const res = await request(app)
        .get('/api/v1/teslas/mine')
        .set('Authorization', `Bearer ${otherDriverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tesla).toBeNull();
    });

    it('returns 409 TESLA_EXISTS when driver already has a registered vehicle', async () => {
      const res = await request(app)
        .post('/api/v1/teslas')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          name: 'Second Bullet',
          capacity: 3,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('TESLA_EXISTS');
    });

    it('allows a driver without a vehicle to create a new tesla', async () => {
      const res = await request(app)
        .post('/api/v1/teslas')
        .set('Authorization', `Bearer ${otherDriverToken}`)
        .send({
          name: 'Bijli',
          capacity: 3,
        });

      expect(res.status).toBe(201);
      expect(res.body.tesla.name).toBe('Bijli');
      expect(res.body.tesla.capacity).toBe(3);
      expect(res.body.tesla.online).toBe(false);

      // Subsequent create attempt for otherDriver should fail with 409
      const secondRes = await request(app)
        .post('/api/v1/teslas')
        .set('Authorization', `Bearer ${otherDriverToken}`)
        .send({
          name: 'Bijli 2',
          capacity: 3,
        });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.error.code).toBe('TESLA_EXISTS');
    });

    it('rejects tesla creation when capacity is invalid', async () => {
      // Register a third driver to test invalid capacity on a driver without a vehicle
      const thirdDriver = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'third_driver@test.com',
          password: 'password123',
          name: 'Third Driver',
          role: 'DRIVER',
        });

      const res = await request(app)
        .post('/api/v1/teslas')
        .set('Authorization', `Bearer ${thirdDriver.body.token}`)
        .send({
          name: 'Invalid Tesla',
          capacity: 0,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      // Cleanup third driver
      await prisma.user.delete({ where: { email: 'third_driver@test.com' } });
    });

    it('driver can toggle online status on own vehicle', async () => {
      const toggleOff = await request(app)
        .patch(`/api/v1/teslas/${bulletId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ online: false });

      expect(toggleOff.status).toBe(200);
      expect(toggleOff.body.tesla.online).toBe(false);

      const toggleOn = await request(app)
        .patch(`/api/v1/teslas/${bulletId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ online: true });

      expect(toggleOn.status).toBe(200);
      expect(toggleOn.body.tesla.online).toBe(true);
    });

    it('rejects patch without online flag with 422 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch(`/api/v1/teslas/${bulletId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ name: 'Renamed' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('forbids passenger role from accessing tesla management (403)', async () => {
      const res = await request(app)
        .get('/api/v1/teslas/mine')
        .set('Authorization', `Bearer ${passengerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('forbids driver B from accessing or updating driver A vehicle (403 owner-scoped)', async () => {
      // Driver B tries to update Jashim's Bullet
      const patchRes = await request(app)
        .patch(`/api/v1/teslas/${bulletId}`)
        .set('Authorization', `Bearer ${otherDriverToken}`)
        .send({ online: false });

      expect(patchRes.status).toBe(403);
      expect(patchRes.body.error.code).toBe('FORBIDDEN');

      // Driver B tries to view Jashim's Bullet
      const getRes = await request(app)
        .get(`/api/v1/teslas/${bulletId}`)
        .set('Authorization', `Bearer ${otherDriverToken}`);

      expect(getRes.status).toBe(403);
      expect(getRes.body.error.code).toBe('FORBIDDEN');
    });
  });
});
