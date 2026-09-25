import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createRideRequestSchema, listRideRequestsQuerySchema } from './schemas';
import {
  handleCreateRideRequest,
  handleGetRideRequest,
  handleGetMyRideRequests,
  handleCancelRideRequest,
} from './ride-requests.controller';

export const rideRequestsRouter = Router();

// Passenger creates a ride request (supports optional Idempotency-Key header)
rideRequestsRouter.post(
  '/',
  requireAuth,
  requireRole('PASSENGER'),
  validate(createRideRequestSchema),
  handleCreateRideRequest
);

// Passenger gets own ride history
rideRequestsRouter.get(
  '/mine',
  requireAuth,
  requireRole('PASSENGER'),
  validate(listRideRequestsQuerySchema, 'query'),
  handleGetMyRideRequests
);

// Passenger-scoped get by ID
rideRequestsRouter.get('/:id', requireAuth, handleGetRideRequest);

// Passenger cancels own ride request (allowed while REQUESTED, MATCHED, ARRIVED)
rideRequestsRouter.post(
  '/:id/cancel',
  requireAuth,
  requireRole('PASSENGER'),
  handleCancelRideRequest
);
