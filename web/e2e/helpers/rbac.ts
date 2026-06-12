/* eslint-disable @typescript-eslint/no-require-imports */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const rbacPath = path.resolve(__dirname, '../../../backend/dist/src/constants/rbac.js');

if (!fs.existsSync(rbacPath)) {
  throw new Error(
    'Compiled backend RBAC file not found. Run "npm run backend:build" from repo root before Playwright.',
  );
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rbac = require(rbacPath) as {
  defaultRolePermissionMap: Record<string, string[]>;
  roleDefinitions: Array<{ key: string; name: string; isSystem: boolean }>;
};

export const defaultRolePermissionMap: Record<string, string[]> = rbac.defaultRolePermissionMap;
export const roleDefinitions: Array<{ key: string; name: string; isSystem: boolean }> = rbac.roleDefinitions;
export const seededRoleKeys: string[] = roleDefinitions.map((r) => r.key);

export function getTripPermissions(roleKey: string): string[] {
  return defaultRolePermissionMap[roleKey] ?? [];
}
