import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });

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
    identifiers: ['CI_ADMIN_IDENTIFIER', 'E2E_ADMIN_IDENTIFIER', 'ADMIN_USERNAME', 'ADMIN_EMAIL'],
    passwords: ['CI_ADMIN_PASSWORD', 'E2E_ADMIN_PASSWORD', 'ADMIN_PASSWORD'],
  },
  super_admin: {
    identifiers: ['CI_SUPER_ADMIN_IDENTIFIER', 'E2E_SUPER_ADMIN_IDENTIFIER', 'SUPER_ADMIN_USERNAME', 'ADMIN_USERNAME', 'ADMIN_EMAIL'],
    passwords: ['CI_SUPER_ADMIN_PASSWORD', 'E2E_SUPER_ADMIN_PASSWORD', 'ADMIN_PASSWORD'],
  },
  manager: {
    identifiers: ['CI_MANAGER_IDENTIFIER', 'E2E_MANAGER_IDENTIFIER', 'MANAGER_USERNAME', 'MANAGER_EMAIL'],
    passwords: ['CI_MANAGER_PASSWORD', 'E2E_MANAGER_PASSWORD', 'MANAGER_PASSWORD'],
  },
  supervisor: {
    identifiers: ['CI_SUPERVISOR_IDENTIFIER', 'E2E_SUPERVISOR_IDENTIFIER', 'SUPERVISOR_USERNAME', 'SUPERVISOR_EMAIL'],
    passwords: ['CI_SUPERVISOR_PASSWORD', 'E2E_SUPERVISOR_PASSWORD', 'SUPERVISOR_PASSWORD'],
  },
  driver: {
    identifiers: ['CI_DRIVER_IDENTIFIER', 'E2E_DRIVER_IDENTIFIER', 'DRIVER_USERNAME', 'DRIVER_EMAIL'],
    passwords: ['CI_DRIVER_PASSWORD', 'E2E_DRIVER_PASSWORD', 'DRIVER_PASSWORD'],
  },
  assistant_driver: {
    identifiers: ['CI_ASSISTANT_DRIVER_IDENTIFIER', 'E2E_ASSISTANT_DRIVER_IDENTIFIER', 'ASSISTANT_DRIVER_USERNAME', 'ASSISTANT_DRIVER_EMAIL'],
    passwords: ['CI_ASSISTANT_DRIVER_PASSWORD', 'E2E_ASSISTANT_DRIVER_PASSWORD', 'ASSISTANT_DRIVER_PASSWORD'],
  },
  collector: {
    identifiers: ['CI_COLLECTOR_IDENTIFIER', 'E2E_COLLECTOR_IDENTIFIER', 'COLLECTOR_USERNAME', 'COLLECTOR_EMAIL'],
    passwords: ['CI_COLLECTOR_PASSWORD', 'E2E_COLLECTOR_PASSWORD', 'COLLECTOR_PASSWORD'],
  },
  mechanic: {
    identifiers: ['CI_MECHANIC_IDENTIFIER', 'E2E_MECHANIC_IDENTIFIER', 'MECHANIC_USERNAME', 'MECHANIC_EMAIL'],
    passwords: ['CI_MECHANIC_PASSWORD', 'E2E_MECHANIC_PASSWORD', 'MECHANIC_PASSWORD'],
  },
  finance: {
    identifiers: ['CI_FINANCE_IDENTIFIER', 'E2E_FINANCE_IDENTIFIER', 'FINANCE_USERNAME', 'FINANCE_EMAIL'],
    passwords: ['CI_FINANCE_PASSWORD', 'E2E_FINANCE_PASSWORD', 'FINANCE_PASSWORD'],
  },
  viewer: {
    identifiers: ['CI_VIEWER_IDENTIFIER', 'E2E_VIEWER_IDENTIFIER', 'VIEWER_USERNAME', 'VIEWER_EMAIL'],
    passwords: ['CI_VIEWER_PASSWORD', 'E2E_VIEWER_PASSWORD', 'VIEWER_PASSWORD'],
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
      'Admin credentials required. Set CI_ADMIN_* in CI or E2E_ADMIN_* in backend/.env',
    );
  }
  return cred;
}

export function getApiBase(): string {
  const value = process.env.E2E_API_BASE_URL?.trim() || process.env.API_BASE_URL?.trim() || 'http://localhost:4000';
  return value.replace(/\/$/, '');
}

export function requireAllRoles(): boolean {
  return process.env.E2E_REQUIRE_ALL_ROLES === 'true';
}

export async function loginAsRole(
  page: import('@playwright/test').Page,
  roleKey: RoleKey,
): Promise<boolean> {
  const cred = getCredential(roleKey);
  if (!cred) return false;
  await page.goto('/login');
  await page.fill('input[type="text"]', cred.identifier);
  await page.fill('input[type="password"]', cred.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
  return true;
}
