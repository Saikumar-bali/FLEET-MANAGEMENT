import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { AppError } from '../utils/appError';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('Unhandled error:', err);

  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.errors);
  }

  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';

  return sendError(res, message, 500);
}
