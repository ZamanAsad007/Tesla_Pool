import { Request, Response, NextFunction } from 'express';
import { getOpenRequests, getDriverActivePool } from './driver.service';

export async function handleGetOpenRequests(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const areaId = req.query.areaId ? Number(req.query.areaId) : undefined;
    const requests = await getOpenRequests(areaId);
    res.json({ requests });
  } catch (error) {
    next(error);
  }
}

export async function handleGetActivePool(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pool = await getDriverActivePool(req.user!.id);
    res.json({ pool });
  } catch (error) {
    next(error);
  }
}
