import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errors';

export interface JwtPayload {
  sub: string;
  role: 'PASSENGER' | 'DRIVER';
  iat?: number;
  exp?: number;
}

export function signToken(payload: { sub: string; role: 'PASSENGER' | 'DRIVER' }): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '12h',
    algorithm: 'HS256',
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('TOKEN_EXPIRED', 401, 'Authentication token has expired');
    }
    throw new AppError('INVALID_TOKEN', 401, 'Invalid authentication token');
  }
}
