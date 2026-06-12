import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

export type RoleKey =
  | 'admin'
  | 'super_admin'
  | 'manager'
  | 'supervisor'
  | 'driver'
  | 'assistant_driver'
  | 'collector'
  | 'mechanic'
  | 'finance'
  | 'viewer';

type Credential = { identifier: string; password: string } | null;

const roleEnvMap: Record<RoleKey, { identifiers: string[]; passwords: string[] }> = {
  admin: {
    identifiers: ['E2E_ADMIN_IDENTIFIER', 'ADMIN_USERNAME', 'ADMIN_EMAIL'],
    passwords: ['E2E_ADMIN_PASSWORD', 'ADMIN_PASSWORD'],
  },
  super_admin: {
    identifiers: ['E2E_SUPER_ADMIN_IDENTIFIER', 'SUPER_ADMIN_USERNAME', 'ADMIN_EMAIL'],
    passwords: ['E2E_SUPER_ADMIN_PASSWORD', 'ADMIN_PASSWORD'],
  },
  manager: {
    identifiers: ['E2E_MANAGER_IDENTIFIER', 'MANAGER_USERNAME', 'MANAGER_EMAIL'],
    passwords: ['E2E_MANAGER_PASSWORD', 'MANAGER_PASSWORD'],
  },
  supervisor: {
    identifiers: ['E2E_SUPERVISOR_IDENTIFIER', 'SUPERVISOR_USERNAME', 'SUPERVISOR_EMAIL'],
    passwords: ['E2E_SUPERVISOR_PASSWORD', 'SUPERVISOR_PASSWORD'],
  },
  driver: {
    identifiers: ['E2E_DRIVER_IDENTIFIER', 'DRIVER_USERNAME', 'DRIVER_EMAIL'],
    passwords: ['E2E_DRIVER_PASSWORD', 'DRIVER_PASSWORD'],
  },
  assistant_driver: {
    identifiers: ['E2E_ASSISTANT_DRIVER_IDENTIFIER', 'ASSISTANT_DRIVER_USERNAME', 'ASSISTANT_DRIVER_EMAIL'],
    passwords: ['E2E_ASSISTANT_DRIVER_PASSWORD', 'ASSISTANT_DRIVER_PASSWORD'],
  },
  collector: {
    identifiers: ['E2E_COLLECTOR_IDENTIFIER', 'COLLECTOR_USERNAME', 'COLLECTOR_EMAIL'],
    passwords: ['E2E_COLLECTOR_PASSWORD', 'COLLECTOR_PASSWORD'],
  },
  mechanic: {
    identifiers: ['E2E_MECHANIC_IDENTIFIER', 'MECHANIC_USERNAME', 'MECHANIC_EMAIL'],
    passwords: ['E2E_MECHANIC_PASSWORD', 'MECHANIC_PASSWORD'],
  },
  finance: {
    identifiers: ['E2E_FINANCE_IDENTIFIER', 'FINANCE_USERNAME', 'FINANCE_EMAIL'],
    passwords: ['E2E_FINANCE_PASSWORD', 'FINANCE_PASSWORD'],
  },
  viewer: {
    identifiers: ['E2E_VIEWER_IDENTIFIER', 'VIEWER_USERNAME', 'VIEWER_EMAIL'],
    passwords: ['E2E_VIEWER_PASSWORD', 'VIEWER_PASSWORD'],
  },
};

function resolveFirst(envKeys: string[]): string | undefined {
  for (const key of envKeys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getCredential(roleKey: RoleKey): Credential {
  const def = roleEnvMap[roleKey];
  const identifier = resolveFirst(def.identifiers);
  const password = resolveFirst(def.passwords);
  if (!identifier || !password) return null;
  return { identifier, password };
}

export function getAdminCredential(): { identifier: string; password: string } {
  const cred = getCredential('admin');
  if (!cred) {
    throw new Error(
      'Admin credentials required. Set E2E_ADMIN_IDENTIFIER + E2E_ADMIN_PASSWORD in backend/.env',
    );
  }
  return cred;
}

export function getApiBase(): string {
  const value = process.env.API_BASE_URL?.trim() || process.env.E2E_API_BASE_URL?.trim();
  if (!value) throw new Error('API_BASE_URL or E2E_API_BASE_URL is required');
  return value.replace(/\/$/, '');
}

export function requireAllRoles(): boolean {
  return process.env.E2E_REQUIRE_ALL_ROLES === 'true';
}
