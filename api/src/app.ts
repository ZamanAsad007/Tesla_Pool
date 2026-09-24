import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';

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
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, status: 'healthy' });
});

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ ok: true, status: 'healthy' });
});

// Centralized error handling
app.use(errorHandler);

export default app;
