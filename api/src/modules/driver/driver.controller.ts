import { Request, Response, NextFunction } from 'express';
import { getOpenRequests } from './driver.service';

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
