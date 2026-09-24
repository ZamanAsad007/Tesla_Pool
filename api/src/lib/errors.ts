export interface ErrorDetails {
  [key: string]: unknown;
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number = 400,
    message: string,
    public readonly details?: ErrorDetails
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
