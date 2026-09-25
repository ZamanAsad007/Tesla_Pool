import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { logger } from '../config/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Domain / Application errors
  if (err instanceof AppError) {
    logger.warn(
      {
        err: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
        path: req.path,
        method: req.method,
      },
      `AppError: ${err.message}`
    );

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // 2. Zod validation errors -> normalized 422 response
  if (err instanceof ZodError) {
    const issues = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    logger.warn({ path: req.path, method: req.method, issues }, 'Validation error');

    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: { issues },
      },
    });
    return;
  }

  // 3. SyntaxError (e.g. malformed JSON body parsed by express.json())
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn({ path: req.path, method: req.method }, 'Malformed JSON body');

    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body',
      },
    });
    return;
  }

  // 4. Unknown / unhandled error -> 500
  logger.error(
    {
      err: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      path: req.path,
      method: req.method,
    },
    'Unhandled server error'
  );

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
    },
  });
}
