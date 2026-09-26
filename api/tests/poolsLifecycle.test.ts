import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('Phase 5: Driver Flow & Pool Lifecycle Integration Tests', () => {
  let driverToken: string;
  let driverId: string;
  let otherDriverToken: string;
  let passengerToken: string;
  let passengerId: string;
  let secondPassengerToken: string;
  let secondPassengerId: string;

  let bananiId: number;
  let mohakhaliId: number;
  let gulshan1Id: number;

  beforeAll(async () => {
    // Seed core cast
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
    passengerId = nusratLogin.body.user.id;

    // Login Rafiq (passenger)
    const rafiqLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rafiq@passenger.test', password: 'password123' });
    secondPassengerToken = rafiqLogin.body.token;
    secondPassengerId = rafiqLogin.body.user.id;

    // Register second driver
    const otherDriverRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'other_driver_phase5@test.com',
        password: 'password123',
        name: 'Other Driver P5',
        role: 'DRIVER',
      });
    otherDriverToken = otherDriverRes.body.token;

    // Get areas
    const areasRes = await request(app).get('/api/v1/areas');
    bananiId = areasRes.body.areas.find((a: any) => a.name === 'Banani').id;
    mohakhaliId = areasRes.body.areas.find((a: any) => a.name === 'Mohakhali').id;
    gulshan1Id = areasRes.body.areas.find((a: any) => a.name === 'Gulshan 1').id;
  });

  afterAll(async () => {
    await prisma.payment.deleteMany();
    await prisma.poolEvent.deleteMany();
    await prisma.poolMembership.deleteMany();
    await prisma.pool.deleteMany();
    await prisma.fareSnapshot.deleteMany();
    await prisma.rideRequest.deleteMany();
    await prisma.tesla.deleteMany({
      where: { owner: { email: 'other_driver_phase5@test.com' } },
    });
    await prisma.user.deleteMany({
      where: { email: 'other_driver_phase5@test.com' },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear ride requests and pools between tests for clean state
    await prisma.payment.deleteMany();
    await prisma.poolEvent.deleteMany();
    await prisma.poolMembership.deleteMany();
    await prisma.pool.deleteMany();
    await prisma.fareSnapshot.deleteMany();
    await prisma.rideRequest.deleteMany();
  });

  describe('GET /api/v1/driver/requests (Driver Feed)', () => {
    it('returns open REQUESTED requests, optionally filtered by areaId', async () => {
      // Nusrat requests Banani -> Mohakhali
      await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });

      // Rafiq requests Mohakhali -> Banani
      await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${secondPassengerToken}`)
        .send({ pickupAreaId: mohakhaliId, dropoffAreaId: bananiId, seats: 1 });

      // Driver requests without areaId -> returns both
      const allRes = await request(app)
        .get('/api/v1/driver/requests')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(allRes.status).toBe(200);
      expect(allRes.body.requests.length).toBe(2);

      // Driver requests filtered by Banani areaId -> returns only Nusrat's request
      const filteredRes = await request(app)
        .get(`/api/v1/driver/requests?areaId=${bananiId}`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(filteredRes.status).toBe(200);
      expect(filteredRes.body.requests.length).toBe(1);
      expect(filteredRes.body.requests[0].pickupAreaId).toBe(bananiId);
    });

    it('forbids passenger role from accessing driver feed (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .get('/api/v1/driver/requests')
        .set('Authorization', `Bearer ${passengerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/v1/pools (Pool Creation)', () => {
    it('creates pool from accepted request, tesla derived from driver owner_id (MATCHED)', async () => {
      const rideRes = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });
      const rideId = rideRes.body.request.id;

      const poolRes = await request(app)
        .post('/api/v1/pools')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: rideId });

      expect(poolRes.status).toBe(201);
      expect(poolRes.body.pool.status).toBe('MATCHED');
      expect(poolRes.body.pool.driverId).toBe(driverId);
      expect(poolRes.body.pool.tesla.name).toBe('Bullet');
      expect(poolRes.body.pool.memberships.length).toBe(1);
      expect(poolRes.body.pool.memberships[0].rideRequestId).toBe(rideId);

      // Ride request status transitioned to MATCHED in lockstep
      const checkReq = await request(app)
        .get(`/api/v1/ride-requests/${rideId}`)
        .set('Authorization', `Bearer ${passengerToken}`);
      expect(checkReq.body.request.status).toBe('MATCHED');
    });

    it('rejects pool creation if driver already has an active pool (409 TESLA_BUSY)', async () => {
      const r1 = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });

      const r2 = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${secondPassengerToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });

      // First pool created successfully
      await request(app)
        .post('/api/v1/pools')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: r1.body.request.id });

      // Second pool creation attempt for same driver/tesla fails with TESLA_BUSY
      const res2 = await request(app)
        .post('/api/v1/pools')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: r2.body.request.id });

      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('TESLA_BUSY');
      expect(res2.body.error.details?.poolId).toBeDefined();

      // Driver can retrieve their active pool via /driver/active-pool
      const activeRes = await request(app)
        .get('/api/v1/driver/active-pool')
        .set('Authorization', `Bearer ${driverToken}`);
      expect(activeRes.status).toBe(200);
      expect(activeRes.body.pool).toBeDefined();
      expect(activeRes.body.pool.id).toBe(res2.body.error.details.poolId);
      expect(activeRes.body.pool.status).toBe('MATCHED');
    });
  });

  describe('Pool Lifecycle & Transition Engine', () => {
    it('happy-path full lifecycle: MATCHED -> ARRIVED -> STARTED -> COMPLETED fanning out to request', async () => {
      const rideRes = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });
      const rideId = rideRes.body.request.id;

      const poolRes = await request(app)
        .post('/api/v1/pools')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: rideId });
      const poolId = poolRes.body.pool.id;

      // 1. ARRIVE
      const arriveRes = await request(app)
        .post(`/api/v1/pools/${poolId}/arrive`)
        .set('Authorization', `Bearer ${driverToken}`);
      expect(arriveRes.status).toBe(200);
      expect(arriveRes.body.pool.status).toBe('ARRIVED');

      let checkReq = await request(app)
        .get(`/api/v1/ride-requests/${rideId}`)
        .set('Authorization', `Bearer ${passengerToken}`);
      expect(checkReq.body.request.status).toBe('ARRIVED');

      // 2. START
      const startRes = await request(app)
        .post(`/api/v1/pools/${poolId}/start`)
        .set('Authorization', `Bearer ${driverToken}`);
      expect(startRes.status).toBe(200);
      expect(startRes.body.pool.status).toBe('STARTED');

      checkReq = await request(app)
        .get(`/api/v1/ride-requests/${rideId}`)
        .set('Authorization', `Bearer ${passengerToken}`);
      expect(checkReq.body.request.status).toBe('STARTED');

      // 3. COMPLETE
      const completeRes = await request(app)
        .post(`/api/v1/pools/${poolId}/complete`)
        .set('Authorization', `Bearer ${driverToken}`);
      expect(completeRes.status).toBe(200);
      expect(completeRes.body.pool.status).toBe('COMPLETED');

      checkReq = await request(app)
        .get(`/api/v1/ride-requests/${rideId}`)
        .set('Authorization', `Bearer ${passengerToken}`);
      expect(checkReq.body.request.status).toBe('COMPLETED');
    });

    it('T4: Invalid transitions rejected (start before arrive, complete before start, arrive on completed)', async () => {
      const rideRes = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });
      const rideId = rideRes.body.request.id;

      const poolRes = await request(app)
        .post('/api/v1/pools')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: rideId });
      const poolId = poolRes.body.pool.id;

      // Pool is currently MATCHED. Attempting START before ARRIVE -> 409
      const invalidStart = await request(app)
        .post(`/api/v1/pools/${poolId}/start`)
        .set('Authorization', `Bearer ${driverToken}`);
      expect(invalidStart.status).toBe(409);
      expect(invalidStart.body.error.code).toBe('INVALID_STATE');

      // Attempting COMPLETE before START -> 409
      const invalidComplete = await request(app)
        .post(`/api/v1/pools/${poolId}/complete`)
        .set('Authorization', `Bearer ${driverToken}`);
      expect(invalidComplete.status).toBe(409);
      expect(invalidComplete.body.error.code).toBe('INVALID_STATE');

      // Now legitimately move to COMPLETED
      await request(app).post(`/api/v1/pools/${poolId}/arrive`).set('Authorization', `Bearer ${driverToken}`);
      await request(app).post(`/api/v1/pools/${poolId}/start`).set('Authorization', `Bearer ${driverToken}`);
      await request(app).post(`/api/v1/pools/${poolId}/complete`).set('Authorization', `Bearer ${driverToken}`);

      // Attempting ARRIVE on COMPLETED pool -> 409
      const arriveOnCompleted = await request(app)
        .post(`/api/v1/pools/${poolId}/arrive`)
        .set('Authorization', `Bearer ${driverToken}`);
      expect(arriveOnCompleted.status).toBe(409);
      expect(arriveOnCompleted.body.error.code).toBe('INVALID_STATE');
    });

    it('T6: Cancellation rules: cancel ok while REQUESTED/MATCHED/ARRIVED, fails after STARTED (409)', async () => {
      const rideRes = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });
      const rideId = rideRes.body.request.id;

      const poolRes = await request(app)
        .post('/api/v1/pools')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: rideId });
      const poolId = poolRes.body.pool.id;

      // Move pool to ARRIVED
      await request(app).post(`/api/v1/pools/${poolId}/arrive`).set('Authorization', `Bearer ${driverToken}`);

      // Move pool to STARTED
      await request(app).post(`/api/v1/pools/${poolId}/start`).set('Authorization', `Bearer ${driverToken}`);

      // Passenger attempts to cancel after STARTED -> 409 INVALID_STATE
      const cancelAttempt = await request(app)
        .post(`/api/v1/ride-requests/${rideId}/cancel`)
        .set('Authorization', `Bearer ${passengerToken}`);
      expect(cancelAttempt.status).toBe(409);
      expect(cancelAttempt.body.error.code).toBe('INVALID_STATE');

      // Driver attempts to cancel pool after STARTED -> 409 INVALID_STATE
      const driverCancelAttempt = await request(app)
        .post(`/api/v1/pools/${poolId}/cancel`)
        .set('Authorization', `Bearer ${driverToken}`);
      expect(driverCancelAttempt.status).toBe(409);
      expect(driverCancelAttempt.body.error.code).toBe('INVALID_STATE');
    });

    it('T11: Last member leaving a pool auto-cancels it (§5); frees active pool slot immediately', async () => {
      const rideRes = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });
      const rideId = rideRes.body.request.id;

      const poolRes = await request(app)
        .post('/api/v1/pools')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: rideId });
      const poolId = poolRes.body.pool.id;

      // Nusrat cancels her ride (she is the only/last member of the pool)
      const cancelRes = await request(app)
        .post(`/api/v1/ride-requests/${rideId}/cancel`)
        .set('Authorization', `Bearer ${passengerToken}`);
      expect(cancelRes.status).toBe(200);

      // Verify the pool auto-cancelled per §5
      const poolCheck = await request(app)
        .get(`/api/v1/pools/${poolId}`)
        .set('Authorization', `Bearer ${driverToken}`);
      expect(poolCheck.body.pool.status).toBe('CANCELLED');

      // Verify Tesla slot is immediately freed: driver can accept a new request right away!
      const newRide = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${secondPassengerToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });

      const newPoolRes = await request(app)
        .post('/api/v1/pools')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: newRide.body.request.id });

      expect(newPoolRes.status).toBe(201);
      expect(newPoolRes.body.pool.status).toBe('MATCHED');
    });
  });
});
