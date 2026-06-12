/* eslint-disable @typescript-eslint/no-require-imports */
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const rbacPath = path.resolve(__dirname, '../../../backend/dist/src/constants/rbac.js');
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
