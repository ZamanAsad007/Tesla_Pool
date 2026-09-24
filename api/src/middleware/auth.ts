import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/jwt';
import { AppError } from '../lib/errors';

export interface AuthenticatedUser {
  id: string;
  role: 'PASSENGER' | 'DRIVER';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication token missing or invalid');
  }

  const token = authHeader.split(' ')[1];
  const payload: JwtPayload = verifyToken(token);

  req.user = {
    id: payload.sub,
    role: payload.role,
  };

  next();
}

export function requireRole(allowedRole: 'PASSENGER' | 'DRIVER') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
    }

    if (req.user.role !== allowedRole) {
      throw new AppError('FORBIDDEN', 403, `Access forbidden: requires ${allowedRole} role`);
    }

    next();
  };
}
