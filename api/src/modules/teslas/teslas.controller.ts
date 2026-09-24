import { Request, Response, NextFunction } from 'express';
import { getDriverTeslas, getTeslaById, createTesla, updateTesla } from './teslas.service';

export async function handleGetMyTeslas(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teslas = await getDriverTeslas(req.user!.id);
    res.json({ teslas });
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
