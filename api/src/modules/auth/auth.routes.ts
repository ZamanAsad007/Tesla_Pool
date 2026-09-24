import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate';
import { registerSchema, loginSchema } from './schemas';
import { handleRegister, handleLogin } from './auth.controller';

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

authRouter.use(authLimiter);

authRouter.post('/register', validate(registerSchema), handleRegister);
authRouter.post('/login', validate(loginSchema), handleLogin);
