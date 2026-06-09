import type { RequestUser } from './auth';

declare global {
  namespace Express {
    interface Request {
      authUser?: RequestUser;
      authPermissions?: string[];
    }
  }
}

export {};
