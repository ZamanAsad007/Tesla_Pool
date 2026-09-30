import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { registerSchema, loginSchema } from './schemas';
import { handleRegister, handleLogin, handleGetCurrentUser } from './auth.controller';

export const authRouter = Router();

// Rate limiter for auth endpoints: 20 req / 15 min / IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again after 15 minutes',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

authRouter.post('/register', authLimiter, validate(registerSchema), handleRegister);
authRouter.post('/login', authLimiter, validate(loginSchema), handleLogin);
authRouter.get('/me', requireAuth, handleGetCurrentUser);
