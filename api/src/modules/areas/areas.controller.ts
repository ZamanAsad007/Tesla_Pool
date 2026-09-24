import { Request, Response, NextFunction } from 'express';
import { listAreas, getAreaById } from './areas.service';

export async function handleListAreas(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const areas = await listAreas();
    res.json({ areas });
  } catch (error) {
    next(error);
  }
}

export async function handleGetArea(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const area = await getAreaById(id);
    res.json({ area });
  } catch (error) {
    next(error);
  }
}
