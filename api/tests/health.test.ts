import { describe, it, expect, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import * as healthService from '../src/modules/health/health.service';

describe('Healthcheck API (Integration)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /health returns 200 with ok: true and db: up', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.db).toBe('up');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/v1/health returns 200 with ok: true and db: up', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.db).toBe('up');
    expect(res.body.timestamp).toBeDefined();
  });

  it('returns 503 and db: down when database is unreachable', async () => {
    const checkSpy = vi.spyOn(healthService, 'checkHealth').mockResolvedValueOnce({
      ok: false,
      db: 'down',
      timestamp: new Date().toISOString(),
    });

    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.db).toBe('down');

    checkSpy.mockRestore();
  });
});
