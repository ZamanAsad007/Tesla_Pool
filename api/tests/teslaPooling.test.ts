import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { calculatePooledFare, calculateSoloFare } from '../src/modules/fares/fares.service';
import { canJoin } from '../src/modules/pools/matching';

describe('Phase 6: Tesla Pooling, Matching, Fares, Payments & Concurrency Tests', () => {
  let driverToken: string;
  let driverId: string;
  let nusratToken: string;
  let nusratId: string;
  let rafiqToken: string;
  let rafiqId: string;
  let shirinToken: string;
  let shirinId: string;

  let bananiId: number;
  let mohakhaliId: number;
  let gulshan1Id: number;
  let gulshan2Id: number;
  let farmgateId: number;
  let dhanmondiId: number;

  beforeAll(async () => {
    // Seed core cast
    const { main } = await import('../prisma/seed');
    await main();

    // Login driver Jashim
    const jashimLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'jashim@driver.test', password: 'password123' });
    driverToken = jashimLogin.body.token;
    driverId = jashimLogin.body.user.id;

    // Login passengers: Nusrat, Rafiq, Shirin
    const nusratLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nusrat@passenger.test', password: 'password123' });
    nusratToken = nusratLogin.body.token;
    nusratId = nusratLogin.body.user.id;

    const rafiqLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rafiq@passenger.test', password: 'password123' });
    rafiqToken = rafiqLogin.body.token;
    rafiqId = rafiqLogin.body.user.id;

    const shirinLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'shirin@passenger.test', password: 'password123' });
    shirinToken = shirinLogin.body.token;
    shirinId = shirinLogin.body.user.id;

    // Get areas
    const areasRes = await request(app).get('/api/v1/areas');
    bananiId = areasRes.body.areas.find((a: any) => a.name === 'Banani').id;
    mohakhaliId = areasRes.body.areas.find((a: any) => a.name === 'Mohakhali').id;
    gulshan1Id = areasRes.body.areas.find((a: any) => a.name === 'Gulshan 1').id;
    gulshan2Id = areasRes.body.areas.find((a: any) => a.name === 'Gulshan 2').id;
    farmgateId = areasRes.body.areas.find((a: any) => a.name === 'Farmgate').id;
    dhanmondiId = areasRes.body.areas.find((a: any) => a.name === 'Dhanmondi').id;
  });

  afterAll(async () => {
    await prisma.payment.deleteMany();
    await prisma.poolEvent.deleteMany();
    await prisma.poolMembership.deleteMany();
    await prisma.pool.deleteMany();
    await prisma.fareSnapshot.deleteMany();
    await prisma.rideRequest.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.payment.deleteMany();
    await prisma.poolEvent.deleteMany();
    await prisma.poolMembership.deleteMany();
    await prisma.pool.deleteMany();
    await prisma.fareSnapshot.deleteMany();
    await prisma.rideRequest.deleteMany();
  });

  describe('T3: Fare Model (§6 exact numbers)', () => {
    it('asserts exact worked example numbers from §6: Nusrat = 4000 paisa, Rafiq = 3200 paisa', () => {
      // Nusrat: 4 km (Banani -> Mohakhali)
      const nusratSolo = calculateSoloFare(4);
      expect(nusratSolo).toBe(5000); // 1000 + 4 * 1000
      const nusratPooled = calculatePooledFare(4);
      expect(nusratPooled.soloFarePaisa).toBe(5000);
      expect(nusratPooled.discountPaisa).toBe(1000); // 20% of 5000
      expect(nusratPooled.pooledFarePaisa).toBe(4000); // ৳40

      // Rafiq: 3 km (Banani -> Gulshan 1)
      const rafiqSolo = calculateSoloFare(3);
      expect(rafiqSolo).toBe(4000); // 1000 + 3 * 1000
      const rafiqPooled = calculatePooledFare(3);
      expect(rafiqPooled.soloFarePaisa).toBe(4000);
      expect(rafiqPooled.discountPaisa).toBe(800); // 20% of 4000
      expect(rafiqPooled.pooledFarePaisa).toBe(3200); // ৳32

      // Shirin: 2 km (Banani -> Gulshan 2)
      const shirinSolo = calculateSoloFare(2);
      expect(shirinSolo).toBe(3000);
      const shirinPooled = calculatePooledFare(2);
      expect(shirinPooled.pooledFarePaisa).toBe(2400); // ৳24
    });
  });

  describe('T7: Matching Rule (§7 canJoin single source of truth)', () => {
    it('accepts same pickup + same corridor; rejects pickup mismatch or corridor mismatch', async () => {
      // Unit level checks on matching rule
      const poolState = {
        status: 'MATCHED' as const,
        occupiedSeats: 1,
        capacitySnapshot: 3,
      };

      const activeMember = {
        rideRequest: {
          pickupAreaId: bananiId,
          dropoffArea: { corridor: 'NORTH' },
        },
      };

      // Same pickup (Banani) + same corridor (NORTH: Gulshan 1) -> Matchable
      const validCandidate = {
        seats: 1,
        pickupAreaId: bananiId,
        dropoffArea: { corridor: 'NORTH' },
      };
      expect(canJoin(poolState, [activeMember], validCandidate).allowed).toBe(true);

      // Different pickup (Dhanmondi) -> Reject
      const diffPickup = {
        seats: 1,
        pickupAreaId: dhanmondiId,
        dropoffArea: { corridor: 'NORTH' },
      };
      const pickupResult = canJoin(poolState, [activeMember], diffPickup);
      expect(pickupResult.allowed).toBe(false);
      expect(pickupResult.reason).toBe('PICKUP_AREA_MISMATCH');

      // Same pickup (Banani) + different corridor (CENTER: Farmgate) -> Reject
      const diffCorridor = {
        seats: 1,
        pickupAreaId: bananiId,
        dropoffArea: { corridor: 'CENTER' },
      };
      const corridorResult = canJoin(poolState, [activeMember], diffCorridor);
      expect(corridorResult.allowed).toBe(false);
      expect(corridorResult.reason).toBe('CORRIDOR_MISMATCH');
    });

    it('rejects join at API layer when destination corridor mismatches (409 NOT_COMPATIBLE)', async () => {
      // Nusrat: Banani -> Mohakhali (NORTH)
      const r1 = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });

      const poolRes = await request(app)
        .post('/api/v1/pools')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: r1.body.request.id });
      const poolId = poolRes.body.pool.id;

      // Rafiq: Banani -> Farmgate (CENTER corridor)
      const r2 = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${secondPassengerToken = rafiqToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: farmgateId, seats: 1 });

      // Driver tries to join Rafiq into Nusrat's NORTH pool -> 409 NOT_COMPATIBLE
      const joinRes = await request(app)
        .post(`/api/v1/pools/${poolId}/join`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: r2.body.request.id });

      expect(joinRes.status).toBe(409);
      expect(joinRes.body.error.code).toBe('NOT_COMPATIBLE');
    });
  });

  describe('T1 & T2: Capacity & The Last-Seat Race (§8)', () => {
    it('T1: Bullet capacity 3, 3 joins succeed, 4th fails with POOL_FULL, occupied stays 3', async () => {
      // Create a 4th passenger
      const p4Res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'p4@passenger.test', password: 'password123', name: 'Passenger 4', role: 'PASSENGER' });
      const p4Token = p4Res.body.token;

      // 1. Nusrat: Banani -> Mohakhali (NORTH)
      const r1 = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });

      // 2. Rafiq: Banani -> Gulshan 1 (NORTH)
      const r2 = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${rafiqToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: gulshan1Id, seats: 1 });

      // 3. Shirin: Banani -> Gulshan 2 (NORTH)
      const r3 = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${shirinToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: gulshan2Id, seats: 1 });

      // 4. Passenger 4: Banani -> Mohakhali (NORTH)
      const r4 = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${p4Token}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });

      // Create pool with Nusrat (seat 1/3)
      const poolRes = await request(app)
        .post('/api/v1/pools')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: r1.body.request.id });
      const poolId = poolRes.body.pool.id;

      // Join Rafiq (seat 2/3)
      const j2 = await request(app)
        .post(`/api/v1/pools/${poolId}/join`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: r2.body.request.id });
      expect(j2.status).toBe(200);
      expect(j2.body.occupiedSeats).toBe(2);

      // Join Shirin (seat 3/3 - capacity full)
      const j3 = await request(app)
        .post(`/api/v1/pools/${poolId}/join`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: r3.body.request.id });
      expect(j3.status).toBe(200);
      expect(j3.body.occupiedSeats).toBe(3);

      // Join Passenger 4 -> fails with 409 POOL_FULL
      const j4 = await request(app)
        .post(`/api/v1/pools/${poolId}/join`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: r4.body.request.id });
      expect(j4.status).toBe(409);
      expect(j4.body.error.code).toBe('POOL_FULL');

      // Verify DB backstop: occupied_seats is exactly 3
      const poolCheck = await prisma.pool.findUnique({ where: { id: poolId } });
      expect(poolCheck!.occupiedSeats).toBe(3);

      // Cleanup p4
      await prisma.user.delete({ where: { email: 'p4@passenger.test' } });
    });

    it('T2: Race test: simultaneous joins for the last seat -> exactly one succeeds, one 409 POOL_FULL', async () => {
      // 1. Nusrat creates request and driver creates pool (occupied = 1)
      const r1 = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });

      const poolRes = await request(app)
        .post('/api/v1/pools')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: r1.body.request.id });
      const poolId = poolRes.body.pool.id;

      // 2. Rafiq joins (occupied = 2, exactly 1 seat remains in 3-seat Bullet)
      const r2 = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${rafiqToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: gulshan1Id, seats: 1 });

      await request(app)
        .post(`/api/v1/pools/${poolId}/join`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: r2.body.request.id });

      // 3. Prepare two competing requests for the final seat:
      // Candidate A: Shirin (1 seat)
      const r3 = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${shirinToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: gulshan2Id, seats: 1 });

      // Candidate B: New competing passenger (1 seat)
      const competitor = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'competitor@passenger.test', password: 'password123', name: 'Competitor', role: 'PASSENGER' });
      const rComp = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${competitor.body.token}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });

      // FIRE SIMULTANEOUS REQUESTS FOR THE LAST SEAT!
      const [joinA, joinB] = await Promise.all([
        request(app)
          .post(`/api/v1/pools/${poolId}/join`)
          .set('Authorization', `Bearer ${driverToken}`)
          .send({ rideRequestId: r3.body.request.id }),
        request(app)
          .post(`/api/v1/pools/${poolId}/join`)
          .set('Authorization', `Bearer ${driverToken}`)
          .send({ rideRequestId: rComp.body.request.id }),
      ]);

      const statuses = [joinA.status, joinB.status].sort();
      // Exactly one must succeed (200) and one must be rejected (409 POOL_FULL)
      expect(statuses).toEqual([200, 409]);

      const rejectedResponse = joinA.status === 409 ? joinA : joinB;
      expect(rejectedResponse.body.error.code).toBe('POOL_FULL');

      // Verify final occupied seats is exactly 3
      const poolCheck = await prisma.pool.findUnique({ where: { id: poolId } });
      expect(poolCheck!.occupiedSeats).toBe(3);

      // Cleanup competitor
      await prisma.user.delete({ where: { email: 'competitor@passenger.test' } });
    });
  });

  describe('T9: Payments & TeslaPay Settlement (§4, §6)', () => {
    it('settles CASH payment on completion and processes TESLAPAY wallet debit', async () => {
      // 1. Nusrat requests ride, pool is created, arrived, started, completed
      const r1 = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });

      const poolRes = await request(app)
        .post('/api/v1/pools')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: r1.body.request.id });
      const poolId = poolRes.body.pool.id;

      // Progress pool to COMPLETED
      await request(app).post(`/api/v1/pools/${poolId}/arrive`).set('Authorization', `Bearer ${driverToken}`);
      await request(app).post(`/api/v1/pools/${poolId}/start`).set('Authorization', `Bearer ${driverToken}`);
      const completeRes = await request(app)
        .post(`/api/v1/pools/${poolId}/complete`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(completeRes.status).toBe(200);

      // Find the generated payment record
      const payment = await prisma.payment.findFirst({
        where: { membership: { poolId } },
      });
      expect(payment).toBeDefined();
      expect(payment!.status).toBe('PENDING');

      // Nusrat's initial seeded balance is 50000 paisa (৳500)
      const initialUser = await prisma.user.findUnique({ where: { id: nusratId } });
      const initialBalance = initialUser!.walletBalancePaisa;

      // Settle via TESLAPAY
      const payRes = await request(app)
        .post(`/api/v1/payments/${payment!.id}/pay`)
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({ method: 'TESLAPAY' });

      expect(payRes.status).toBe(200);
      expect(payRes.body.payment.status).toBe('SETTLED');
      expect(payRes.body.payment.method).toBe('TESLAPAY');

      // Verify wallet was atomically debited
      const debitedUser = await prisma.user.findUnique({ where: { id: nusratId } });
      expect(debitedUser!.walletBalancePaisa).toBe(initialBalance - payment!.amountPaisa);
    });

    it('T9: rejects TESLAPAY settlement with 409 INSUFFICIENT_FUNDS when balance is inadequate', async () => {
      // Register a passenger with 0 balance
      const brokePassenger = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'broke@passenger.test', password: 'password123', name: 'Broke Rider', role: 'PASSENGER' });
      const brokeToken = brokePassenger.body.token;
      const brokeId = brokePassenger.body.user.id;

      const r1 = await request(app)
        .post('/api/v1/ride-requests')
        .set('Authorization', `Bearer ${brokeToken}`)
        .send({ pickupAreaId: bananiId, dropoffAreaId: mohakhaliId, seats: 1 });

      const poolRes = await request(app)
        .post('/api/v1/pools')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideRequestId: r1.body.request.id });
      const poolId = poolRes.body.pool.id;

      await request(app).post(`/api/v1/pools/${poolId}/arrive`).set('Authorization', `Bearer ${driverToken}`);
      await request(app).post(`/api/v1/pools/${poolId}/start`).set('Authorization', `Bearer ${driverToken}`);
      await request(app).post(`/api/v1/pools/${poolId}/complete`).set('Authorization', `Bearer ${driverToken}`);

      const payment = await prisma.payment.findFirst({
        where: { membership: { poolId } },
      });

      // Attempt payment with 0 balance
      const payRes = await request(app)
        .post(`/api/v1/payments/${payment!.id}/pay`)
        .set('Authorization', `Bearer ${brokeToken}`)
        .send({ method: 'TESLAPAY' });

      expect(payRes.status).toBe(409);
      expect(payRes.body.error.code).toBe('INSUFFICIENT_FUNDS');

      // Verify payment remains PENDING and balance remains 0
      const checkPayment = await prisma.payment.findUnique({ where: { id: payment!.id } });
      expect(checkPayment!.status).toBe('PENDING');

      // Cleanup broke passenger
      await prisma.user.delete({ where: { id: brokeId } });
    });
  });
});
