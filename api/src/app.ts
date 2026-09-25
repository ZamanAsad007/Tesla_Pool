import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';

import { healthRouter } from './modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { areasRouter } from './modules/areas/areas.routes';
import { teslasRouter } from './modules/teslas/teslas.routes';
import { rideRequestsRouter } from './modules/ride-requests/ride-requests.routes';
import { poolsRouter } from './modules/pools/pools.routes';
import { driverRouter } from './modules/driver/driver.routes';

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging with pino-http
app.use(
  pinoHttp({
    logger,
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    autoLogging: {
      ignore: (req) => req.url === '/health' || req.url === '/api/v1/health',
    },
  })
);

// Health check endpoints
app.use('/health', healthRouter);
app.use('/api/v1/health', healthRouter);

// Domain endpoints
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/areas', areasRouter);
app.use('/api/v1/teslas', teslasRouter);
app.use('/api/v1/ride-requests', rideRequestsRouter);
app.use('/api/v1/pools', poolsRouter);
app.use('/api/v1/driver', driverRouter);

// Centralized error handling
app.use(errorHandler);

export default app;
