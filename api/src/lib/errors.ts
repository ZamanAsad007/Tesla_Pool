export interface ErrorDetails {
  [key: string]: unknown;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_JSON'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'EMAIL_EXISTS'
  | 'AREA_NOT_FOUND'
  | 'TESLA_NOT_FOUND'
  | 'TESLA_EXISTS'
  | 'TESLA_OFFLINE'
  | 'TESLA_BUSY'
  | 'INVALID_CAPACITY'
  | 'INVALID_ROUTE'
  | 'OPEN_REQUEST_EXISTS'
  | 'RIDE_REQUEST_NOT_FOUND'
  | 'POOL_NOT_FOUND'
  | 'POOL_FULL'
  | 'SEATS_EXCEEDED'
  | 'NOT_COMPATIBLE'
  | 'INVALID_STATE'
  | 'MEMBERSHIP_NOT_FOUND'
  | 'PAYMENT_NOT_FOUND'
  | 'ALREADY_SETTLED'
  | 'INSUFFICIENT_FUNDS'
  | 'USER_NOT_FOUND'
  | 'INTERNAL_SERVER_ERROR';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode | string,
    public readonly statusCode: number = 400,
    message: string,
    public readonly details?: ErrorDetails
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static notFound(message = 'Resource not found', code: ErrorCode | string = 'NOT_FOUND') {
    return new AppError(code, 404, message);
  }

  static badRequest(message: string, code: ErrorCode | string = 'VALIDATION_ERROR', details?: ErrorDetails) {
    return new AppError(code, 400, message, details);
  }

  static validation(message = 'Validation failed', details?: ErrorDetails) {
    return new AppError('VALIDATION_ERROR', 422, message, details);
  }

  static unauthorized(message = 'Authentication required', code: ErrorCode | string = 'UNAUTHORIZED') {
    return new AppError(code, 401, message);
  }

  static forbidden(message = 'Access forbidden', code: ErrorCode | string = 'FORBIDDEN') {
    return new AppError(code, 403, message);
  }

  static conflict(message: string, code: ErrorCode | string = 'CONFLICT', details?: ErrorDetails) {
    return new AppError(code, 409, message, details);
  }
}
