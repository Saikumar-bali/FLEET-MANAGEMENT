import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/appError';

export function requirePermission(permissionKey: string) {
  return requireAnyPermission([permissionKey]);
}

export function requireAnyPermission(permissionKeys: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const permissions = req.authPermissions ?? [];

    if (!req.authUser) {
      return next(new AppError('Authentication required', 401));
    }

    if (!permissionKeys.some((permissionKey) => permissions.includes(permissionKey))) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    return next();
  };
}
