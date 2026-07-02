export type DataScopeEntry = {
  id: string;
  scopeType: string;
  scopeId: string | null;
  accessLevel: string;
  expiresAt: Date | null;
};

export type EffectivePermissions = {
  rolePermissions: string[];
  userAllowedPermissions: string[];
  userDeniedPermissions: string[];
  effectivePermissions: string[];
};

export type RequestUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  mobile: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  role: {
    id: string;
    name: string;
    key: string;
    status: 'ACTIVE' | 'INACTIVE';
  };
};

export type AuthTokenPayload = {
  sub: string;
  email: string;
  roleKey: string;
};
