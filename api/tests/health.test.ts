import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Healthcheck API', () => {
  it('GET /health returns 200 with ok: true', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, status: 'healthy' });
  });

  it('GET /api/v1/health returns 200 with ok: true', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, status: 'healthy' });
  });
});
