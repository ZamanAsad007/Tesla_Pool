import { prisma } from '../../lib/prisma';
import { logger } from '../../config/logger';

export interface HealthStatus {
  ok: boolean;
  db: 'up' | 'down';
  timestamp: string;
}

export async function checkHealth(): Promise<HealthStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      ok: true,
      db: 'up',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return {
      ok: false,
      db: 'down',
      timestamp: new Date().toISOString(),
    };
  }
}
