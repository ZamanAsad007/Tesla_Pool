import { Request, Response } from 'express';
import { checkHealth } from './health.service';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const health = await checkHealth();
  const statusCode = health.ok ? 200 : 503;
  res.status(statusCode).json(health);
}
