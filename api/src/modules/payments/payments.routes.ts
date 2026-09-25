import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { processPaymentSchema } from './schemas';
import { handleProcessPayment, handleGetPayment } from './payments.controller';

export const paymentsRouter = Router();

paymentsRouter.post(
  '/:id/pay',
  requireAuth,
  validate(processPaymentSchema),
  handleProcessPayment
);

paymentsRouter.get('/:id', requireAuth, handleGetPayment);
