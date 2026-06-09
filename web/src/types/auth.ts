export type AuthUser = {
  id: string;
  name: string;
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

export type AuthState = {
  user: AuthUser | null;
  permissions: string[];
  accessToken: string | null;
  refreshToken: string | null;
};

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  permissions: string[];
};

export type RoleRecord = {
  id: string;
  name: string;
  key: string;
  description: string | null;
  isSystem: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  rolePermissions: Array<{
    permission: PermissionRecord;
  }>;
};

export type PermissionRecord = {
  id: string;
  key: string;
  module: string;
  action: string;
  description: string | null;
};

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: {
    id: string;
    name: string;
    key: string;
    status: 'ACTIVE' | 'INACTIVE';
  };
};
