import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { AppError } from '../src/lib/errors';
import { errorHandler } from '../src/middleware/errorHandler';

describe('Error Handler Middleware', () => {
  const testApp = express();
  testApp.use(express.json());

  testApp.get('/test-app-error', () => {
    throw new AppError('POOL_FULL', 409, 'Vehicle has reached max passenger capacity', { capacity: 3 });
  });

  testApp.get('/test-zod-error', () => {
    const schema = z.object({ seats: z.number().int().positive() });
    schema.parse({ seats: -1 });
  });

  testApp.get('/test-unknown-error', () => {
    throw new Error('Database connection failed unexpectedly');
  });

  testApp.use(errorHandler);

  it('formats AppError to standard API error shape with status code', async () => {
    const res = await request(testApp).get('/test-app-error');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: {
        code: 'POOL_FULL',
        message: 'Vehicle has reached max passenger capacity',
        details: { capacity: 3 },
      },
    });
  });

  it('formats ZodError to 422 VALIDATION_ERROR', async () => {
    const res = await request(testApp).get('/test-zod-error');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.issues).toBeDefined();
    expect(res.body.error.details.issues.length).toBeGreaterThan(0);
  });

  it('masks unknown internal errors as 500 INTERNAL_SERVER_ERROR', async () => {
    const res = await request(testApp).get('/test-unknown-error');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred',
      },
    });
  });
});
