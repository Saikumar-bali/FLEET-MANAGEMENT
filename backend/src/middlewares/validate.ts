import { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/appError';

type Schemas = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

export function validateRequest(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: string[] = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.push(...result.error.issues.map((issue) => issue.message));
      } else {
        req.body = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.push(...result.error.issues.map((issue) => issue.message));
      } else {
        req.params = result.data as Request['params'];
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.push(...result.error.issues.map((issue) => issue.message));
      } else {
        req.query = result.data as Request['query'];
      }
    }

    if (errors.length > 0) {
      return next(new AppError('Validation failed', 422, errors));
    }

    return next();
  };
}
