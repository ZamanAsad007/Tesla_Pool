import { Request, Response, NextFunction } from 'express';
import {
  createPoolFromRequest,
  transitionPool,
  leavePool,
  getPoolById,
} from './pools.service';

export async function handleCreatePool(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pool = await createPoolFromRequest(req.user!.id, req.body);
    res.status(201).json({ pool });
  } catch (error) {
    next(error);
  }
}

export async function handleArrivePool(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pool = await transitionPool(req.params.id, 'ARRIVED', req.user!);
    res.json({ pool });
  } catch (error) {
    next(error);
  }
}

export async function handleStartPool(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pool = await transitionPool(req.params.id, 'STARTED', req.user!);
    res.json({ pool });
  } catch (error) {
    next(error);
  }
}

export async function handleCompletePool(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pool = await transitionPool(req.params.id, 'COMPLETED', req.user!);
    res.json({ pool });
  } catch (error) {
    next(error);
  }
}

export async function handleCancelPool(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pool = await transitionPool(req.params.id, 'CANCELLED', req.user!);
    res.json({ pool });
  } catch (error) {
    next(error);
  }
}

export async function handleLeavePool(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await leavePool(req.params.id, req.body.rideRequestId, req.user!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetPool(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pool = await getPoolById(req.params.id, req.user!);
    res.json({ pool });
  } catch (error) {
    next(error);
  }
}
