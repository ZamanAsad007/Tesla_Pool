import { Request, Response, NextFunction } from 'express';
import { processPayment, getPaymentById } from './payments.service';

export async function handleProcessPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payment = await processPayment(req.params.id, req.body, req.user!);
    res.json({ payment });
  } catch (error) {
    next(error);
  }
}

export async function handleGetPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payment = await getPaymentById(req.params.id, req.user!);
    res.json({ payment });
  } catch (error) {
    next(error);
  }
}
