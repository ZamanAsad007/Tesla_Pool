import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('Phase 4: Ride Requests Integration Tests', () => {
  let nusratToken: string;
  let nusratId: string;
  let rafiqToken: string;
  let rafiqId: string;
  let driverToken: string;

  let bananiAreaId: number;
  let mohakhaliAreaId: number;
  let gulshan1AreaId: number;

  beforeAll(async () => {
    // Seed core cast
    const { main } = await import('../prisma/seed');
    await main();

    // Login Nusrat (passenger)
    const nusratLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nusrat@passenger.test', password: 'password123' });
    nusratToken = nusratLogin.body.token;
    nusratId = nusratLogin.body.user.id;

    // Login Rafiq (passenger)
    const rafiqLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rafiq@passenger.test', password: 'password123' });
    rafiqToken = rafiqLogin.body.token;
    rafiqId = rafiqLogin.body.user.id;

    // Login Jashim (driver)
    const jashimLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'jashim@driver.test', password: 'password123' });
    driverToken = jashimLogin.body.token;

    // Get areas
    const areasRes = await request(app).get('/api/v1/areas');
    const banani = areasRes.body.areas.find((a: any) => a.name === 'Banani');
    const mohakhali = areasRes.body.areas.find((a: any) => a.name === 'Mohakhali');
    const gulshan1 = areasRes.body.areas.find((a: any) => a.name === 'Gulshan 1');

    bananiAreaId = banani.id;
    mohakhaliAreaId = mohakhali.id;
    gulshan1AreaId = gulshan1.id;
  });

  afterAll(async () => {
    await prisma.fareSnapshot.deleteMany();
    await prisma.rideRequest.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/ride-requests (Creation & Solo Quoting)', () => {
    it('creates a ride request with solo fare quote (Nusrat 4 km = 5000 paisa)', async () => {
      const res = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({
          pickupAreaId: bananiAreaId,
          dropoffAreaId: mohakhaliAreaId,
          seats: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.request).toBeDefined();
      expect(res.body.request.passengerId).toBe(nusratId);
      expect(res.body.request.status).toBe('REQUESTED');
      expect(res.body.request.seats).toBe(1);

      // Verify solo fare snapshot (4 km: 1000 base + 4 * 1000 = 5000 paisa)
      expect(res.body.fareQuote).toBeDefined();
      expect(res.body.fareQuote.basePaisa).toBe(1000);
      expect(res.body.fareQuote.distancePaisa).toBe(4000);
      expect(res.body.fareQuote.discountPaisa).toBe(0);
      expect(res.body.fareQuote.totalPaisa).toBe(5000);
    });

    it('T10: enforces one open ride request per passenger (409 OPEN_REQUEST_EXISTS)', async () => {
      // Nusrat already has an active REQUESTED ride request from the previous test
      const res = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({
          pickupAreaId: bananiAreaId,
          dropoffAreaId: gulshan1AreaId,
          seats: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('OPEN_REQUEST_EXISTS');
    });

    it('T8: Idempotency: same key twice returns replay without creating duplicate', async () => {
      const idempotencyKey = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

      // Rafiq creates request with idempotency key
      const res1 = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${rafiqToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          pickupAreaId: bananiAreaId,
          dropoffAreaId: gulshan1AreaId,
          seats: 1,
        });

      expect(res1.status).toBe(201);
      const createdId = res1.body.request.id;

      // Resend same key with same user -> idempotent 200 replay
      const res2 = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${rafiqToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          pickupAreaId: bananiAreaId,
          dropoffAreaId: gulshan1AreaId,
          seats: 1,
        });

      expect(res2.status).toBe(200);
      expect(res2.body.request.id).toBe(createdId);
      expect(res2.body.request.idempotencyKey).toBe(idempotencyKey);
    });

    it('forbids driver role from creating passenger ride request (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          pickupAreaId: bananiAreaId,
          dropoffAreaId: mohakhaliAreaId,
          seats: 1,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/ride-requests/:id & /mine', () => {
    it('passenger can retrieve own ride request details', async () => {
      const mineRes = await request(app)
        .get('/api/v1/ride-requests/mine')
        .set('Authorization', `Bearer ${nusratToken}`);

      expect(mineRes.status).toBe(200);
      expect(mineRes.body.requests).toBeDefined();
      expect(mineRes.body.requests.length).toBeGreaterThanOrEqual(1);

      const reqId = mineRes.body.requests[0].id;
      const singleRes = await request(app)
        .get(`/api/v1/ride-requests/${reqId}`)
        .set('Authorization', `Bearer ${nusratToken}`);

      expect(singleRes.status).toBe(200);
      expect(singleRes.body.request.id).toBe(reqId);
      expect(singleRes.body.request.passengerId).toBe(nusratId);
    });

    it('T5: User B cannot read user A ride request (404 NOT_FOUND, not 403 §9)', async () => {
      const nusratRequests = await request(app)
        .get('/api/v1/ride-requests/mine')
        .set('Authorization', `Bearer ${nusratToken}`);
      const nusratRequestId = nusratRequests.body.requests[0].id;

      // Rafiq (User B) tries to read Nusrat's (User A) request
      const res = await request(app)
        .get(`/api/v1/ride-requests/${nusratRequestId}`)
        .set('Authorization', `Bearer ${rafiqToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/v1/ride-requests/:id/cancel', () => {
    it('T5: User B cannot cancel user A ride request (404 NOT_FOUND, not 403 §9)', async () => {
      const nusratRequests = await request(app)
        .get('/api/v1/ride-requests/mine')
        .set('Authorization', `Bearer ${nusratToken}`);
      const nusratRequestId = nusratRequests.body.requests[0].id;

      // Rafiq tries to cancel Nusrat's request
      const res = await request(app)
        .post(`/api/v1/ride-requests/${nusratRequestId}/cancel`)
        .set('Authorization', `Bearer ${rafiqToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('passenger can cancel own request while in REQUESTED status (Happy Path)', async () => {
      const nusratRequests = await request(app)
        .get('/api/v1/ride-requests/mine')
        .set('Authorization', `Bearer ${nusratToken}`);
      const nusratRequestId = nusratRequests.body.requests[0].id;

      const res = await request(app)
        .post(`/api/v1/ride-requests/${nusratRequestId}/cancel`)
        .set('Authorization', `Bearer ${nusratToken}`);

      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe('CANCELLED');

      // Now that it is cancelled, passenger should be free to request a new ride
      const newRideRes = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({
          pickupAreaId: bananiAreaId,
          dropoffAreaId: mohakhaliAreaId,
          seats: 1,
        });

      expect(newRideRes.status).toBe(201);
      expect(newRideRes.body.request.status).toBe('REQUESTED');
    });

    it('rejects cancellation if request is already cancelled with 409 INVALID_STATE', async () => {
      const nusratRequests = await request(app)
        .get('/api/v1/ride-requests/mine?status=CANCELLED')
        .set('Authorization', `Bearer ${nusratToken}`);
      const cancelledId = nusratRequests.body.requests[0].id;

      const res = await request(app)
        .post(`/api/v1/ride-requests/${cancelledId}/cancel`)
        .set('Authorization', `Bearer ${nusratToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE');
    });
  });
});
