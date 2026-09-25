import { Request, Response, NextFunction } from 'express';
import { getDriverTesla, getTeslaById, createTesla, updateTesla } from './teslas.service';

export async function handleGetMyTesla(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tesla = await getDriverTesla(req.user!.id);
    res.json({ tesla });
  } catch (error) {
    next(error);
  }
}

export async function handleGetTesla(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tesla = await getTeslaById(req.params.id, req.user!.id);
    res.json({ tesla });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateTesla(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tesla = await createTesla(req.user!.id, req.body);
    res.status(201).json({ tesla });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateTesla(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tesla = await updateTesla(req.params.id, req.user!.id, req.body);
    res.json({ tesla });
  } catch (error) {
    next(error);
  }
}
