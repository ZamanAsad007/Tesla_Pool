import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { requireAuth, requireRole } from '../src/middleware/auth';
import { errorHandler } from '../src/middleware/errorHandler';

describe('Auth Module Integration Tests', () => {
  beforeAll(async () => {
    // Seed users first
    const { main } = await import('../prisma/seed');
    await main();
  });

  afterAll(async () => {
    // Cleanup temporary registered users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['new_passenger@test.com', 'new_driver@test.com'],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('registers a new passenger successfully and returns JWT + user info', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'new_passenger@test.com',
          password: 'password123',
          name: 'New Passenger',
          role: 'PASSENGER',
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toMatchObject({
        email: 'new_passenger@test.com',
        name: 'New Passenger',
        role: 'PASSENGER',
        walletBalancePaisa: 0,
      });
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('registers a new driver successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'new_driver@test.com',
          password: 'password123',
          name: 'New Driver',
          role: 'DRIVER',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('DRIVER');
    });

    it('rejects duplicate email with 409 EMAIL_EXISTS', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'nusrat@passenger.test', // Already seeded
          password: 'password123',
          name: 'Nusrat Copy',
          role: 'PASSENGER',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('rejects invalid payload with 422 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: '123', // too short
          name: '',
          role: 'ADMIN', // invalid role
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.issues).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('authenticates valid credentials for seeded driver (Jashim)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'jashim@driver.test',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('jashim@driver.test');
      expect(res.body.user.role).toBe('DRIVER');
    });

    it('authenticates valid credentials for seeded passenger (Nusrat)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nusrat@passenger.test',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('PASSENGER');
      expect(res.body.user.walletBalancePaisa).toBe(50000);
    });

    it('rejects wrong password with 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nusrat@passenger.test',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects non-existent email with 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'ghost@passenger.test',
          password: 'password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('requireAuth & requireRole Middleware', () => {
    const testApp = express();
    testApp.use(express.json());

    testApp.get('/test/protected', requireAuth, (req, res) => {
      res.json({ ok: true, user: req.user });
    });

    testApp.get('/test/driver-only', requireAuth, requireRole('DRIVER'), (req, res) => {
      res.json({ ok: true, message: 'Driver access granted', user: req.user });
    });

    testApp.use(errorHandler);

    it('rejects requests without Authorization header with 401 UNAUTHORIZED', async () => {
      const res = await request(testApp).get('/test/protected');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects requests with malformed or invalid token with 401', async () => {
      const res = await request(testApp)
        .get('/test/protected')
        .set('Authorization', 'Bearer invalid.token.value');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('allows protected access with valid JWT token', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nusrat@passenger.test', password: 'password123' });

      const token = loginRes.body.token;

      const res = await request(testApp)
        .get('/test/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('PASSENGER');
    });

    it('allows driver role to access driver-only route', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'jashim@driver.test', password: 'password123' });

      const token = loginRes.body.token;

      const res = await request(testApp)
        .get('/test/driver-only')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Driver access granted');
    });

    it('forbids passenger role from accessing driver-only route with 403 FORBIDDEN', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nusrat@passenger.test', password: 'password123' });

      const token = loginRes.body.token;

      const res = await request(testApp)
        .get('/test/driver-only')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
