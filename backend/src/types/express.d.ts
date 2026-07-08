import type { RequestUser, EffectivePermissions, DataScopeEntry } from './auth';

declare global {
  namespace Express {
    interface Request {
      authUser?: RequestUser;
      authPermissions?: string[];
      authEffectivePermissions?: EffectivePermissions;
      authDataScopes?: DataScopeEntry[];
      authPreloadedUser?: any;
      authActorContext?: {
        user: RequestUser;
        roleKey: string;
        isSuperAdmin: boolean;
        isAdmin: boolean;
        isGlobalUser: boolean;
        effectivePermissions: string[];
        dataScopes: DataScopeEntry[];
      };
    }
  }
}

export {};
