import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createPoolSchema, leavePoolSchema } from './schemas';
import {
  handleCreatePool,
  handleGetPool,
  handleArrivePool,
  handleStartPool,
  handleCompletePool,
  handleCancelPool,
  handleLeavePool,
} from './pools.controller';

export const poolsRouter = Router();

// Driver creates a pool by accepting first request
poolsRouter.post(
  '/',
  requireAuth,
  requireRole('DRIVER'),
  validate(createPoolSchema),
  handleCreatePool
);

// Get pool view (scoped)
poolsRouter.get('/:id', requireAuth, handleGetPool);

// Driver transitions
poolsRouter.post('/:id/arrive', requireAuth, requireRole('DRIVER'), handleArrivePool);
poolsRouter.post('/:id/start', requireAuth, requireRole('DRIVER'), handleStartPool);
poolsRouter.post('/:id/complete', requireAuth, requireRole('DRIVER'), handleCompletePool);
poolsRouter.post('/:id/cancel', requireAuth, requireRole('DRIVER'), handleCancelPool);

// Driver or member leaves pool
poolsRouter.post(
  '/:id/leave',
  requireAuth,
  validate(leavePoolSchema),
  handleLeavePool
);
