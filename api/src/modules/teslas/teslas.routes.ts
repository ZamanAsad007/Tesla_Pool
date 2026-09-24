import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createTeslaSchema, updateTeslaSchema } from './schemas';
import {
  handleGetMyTeslas,
  handleGetTesla,
  handleCreateTesla,
  handleUpdateTesla,
} from './teslas.controller';

export const teslasRouter = Router();

// Driver-only endpoints
teslasRouter.get('/mine', requireAuth, requireRole('DRIVER'), handleGetMyTeslas);
teslasRouter.post('/', requireAuth, requireRole('DRIVER'), validate(createTeslaSchema), handleCreateTesla);
teslasRouter.get('/:id', requireAuth, handleGetTesla);
teslasRouter.patch('/:id', requireAuth, requireRole('DRIVER'), validate(updateTeslaSchema), handleUpdateTesla);
