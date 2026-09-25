import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createPoolSchema, joinPoolSchema, leavePoolSchema } from './schemas';
import {
  handleCreatePool,
  handleJoinPool,
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

// Driver adds second/third passenger (the seat race endpoint)
poolsRouter.post(
  '/:id/join',
  requireAuth,
  requireRole('DRIVER'),
  validate(joinPoolSchema),
  handleJoinPool
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
