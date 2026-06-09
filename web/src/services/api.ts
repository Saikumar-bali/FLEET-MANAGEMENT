import { API_BASE_URL } from '../config/api';
import type { ApiResponse } from '../types/api';
import { ApiError } from '../types/api';
import type { AuthPayload, PermissionRecord, RoleRecord } from '../types/auth';

type RequestOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new ApiError(data.message || 'Request failed', response.status, data.errors);
  }

  return data;
}

export function getHealth() {
  return request<{ status: string; timestamp: string; uptime: number; database: string }>('/health');
}

export function login(email: string, password: string) {
  return request<AuthPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logout(refreshToken: string) {
  return request<null>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export function refresh(refreshToken: string) {
  return request<AuthPayload>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export function getCurrentUser(token: string) {
  return request<{ user: AuthPayload['user']; permissions: string[] }>('/auth/me', {
    token,
  });
}

export function getRoles(token: string) {
  return request<RoleRecord[]>('/roles', { token });
}

export function createRole(
  token: string,
  payload: { name: string; key: string; description?: string; status: 'ACTIVE' | 'INACTIVE' },
) {
  return request<RoleRecord>('/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function updateRole(
  token: string,
  roleId: string,
  payload: Partial<{ name: string; key: string; description: string; status: 'ACTIVE' | 'INACTIVE' }>,
) {
  return request<RoleRecord>(`/roles/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });
}

export function getPermissions(token: string) {
  return request<PermissionRecord[]>('/permissions', { token });
}

export function updateRolePermissions(token: string, roleId: string, permissionKeys: string[]) {
  return request<RoleRecord>(`/roles/${roleId}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ permissionKeys }),
    token,
  });
}
