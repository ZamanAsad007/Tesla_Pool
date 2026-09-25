import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { driverRequestsQuerySchema } from './schemas';
import { handleGetOpenRequests } from './driver.controller';

export const driverRouter = Router();

// Driver feed: open requests optionally filtered by areaId
driverRouter.get(
  '/requests',
  requireAuth,
  requireRole('DRIVER'),
  validate(driverRequestsQuerySchema, 'query'),
  handleGetOpenRequests
);
