import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createTeslaSchema, updateTeslaSchema } from './schemas';
import {
  handleGetMyTesla,
  handleGetTesla,
  handleCreateTesla,
  handleUpdateTesla,
} from './teslas.controller';

export const teslasRouter = Router();

// Driver-only endpoints
teslasRouter.get('/mine', requireAuth, requireRole('DRIVER'), handleGetMyTesla);
teslasRouter.post('/', requireAuth, requireRole('DRIVER'), validate(createTeslaSchema), handleCreateTesla);
teslasRouter.get('/:id', requireAuth, handleGetTesla);
teslasRouter.patch('/:id', requireAuth, requireRole('DRIVER'), validate(updateTeslaSchema), handleUpdateTesla);
