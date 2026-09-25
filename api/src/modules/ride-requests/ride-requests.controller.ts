import { Request, Response, NextFunction } from 'express';
import {
  createRideRequest,
  getRideRequestById,
  getMyRideRequests,
  cancelRideRequest,
} from './ride-requests.service';
import { RideRequestStatus } from '@prisma/client';

export async function handleCreateRideRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const result = await createRideRequest(req.user!.id, req.body, idempotencyKey);
    const statusCode = result.isReplay ? 200 : 201;
    res.status(statusCode).json({
      request: result.request,
      fareQuote: result.fareQuote,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetRideRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const request = await getRideRequestById(req.params.id, req.user!);
    res.json({ request });
  } catch (error) {
    next(error);
  }
}

export async function handleGetMyRideRequests(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = req.query.status as RideRequestStatus | undefined;
    const requests = await getMyRideRequests(req.user!.id, status);
    res.json({ requests });
  } catch (error) {
    next(error);
  }
}

export async function handleCancelRideRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const request = await cancelRideRequest(req.params.id, req.user!);
    res.json({ request });
  } catch (error) {
    next(error);
  }
}
