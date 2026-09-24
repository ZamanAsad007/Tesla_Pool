import { Request, Response, NextFunction } from 'express';
import { register, login } from './auth.service';

export async function handleRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await register(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await login(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
