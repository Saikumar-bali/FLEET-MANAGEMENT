import { prisma } from '../src/lib/prisma';
import { defaultRolePermissionMap } from '../src/constants/rbac';

const FINANCE_SENSITIVE_PERMISSIONS = new Set([
  'finance_view',
  'finance_create',
  'finance_update',
  'finance_delete',
  'finance_approve',
  'finance_transactions_view',
  'finance_transactions_create',
  'finance_transactions_update',
  'finance_transactions_delete',
  'trip_billing_view',
  'trip_billing_create',
  'trip_billing_update',
  'trip_billing_delete',
  'trip_billing_mark_paid',
  'payments_view',
  'payments_create',
  'payments_update',
  'payments_delete',
  'vendors_view',
  'vendors_create',
  'vendors_update',
  'vendors_delete',
  'customers_view',
  'customers_create',
  'customers_update',
  'customers_delete',
  'pnl_view',
  'finance_history_view',
]);

const RESTRICTED_ROLES = new Set([
  'driver',
  'assistant_driver',
  'mechanic',
  'viewer',
  'supervisor',
  'manager',
]);

async function main() {
  const roles = await prisma.role.findMany();
  const permissions = await prisma.permission.findMany();
  const permissionByKey = new Map(permissions.map((p) => [p.key, p.id]));

  let totalRemoved = 0;

  for (const role of roles) {
    if (!RESTRICTED_ROLES.has(role.key)) continue;

    const intendedPerms = defaultRolePermissionMap[role.key] ?? [];
    const intendedSet = new Set(intendedPerms);
    const forbidden = [...FINANCE_SENSITIVE_PERMISSIONS].filter(
      (k) => !intendedSet.has(k) && permissionByKey.has(k),
    );

    if (forbidden.length === 0) continue;

    const forbiddenIds = forbidden.map((k) => permissionByKey.get(k)!).filter(Boolean);

    const deleted = await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permissionId: { in: forbiddenIds },
      },
    });

    totalRemoved += deleted.count;
    console.log(`  ${role.key}: removed ${deleted.count} forbidden finance permissions`);
  }

  if (totalRemoved === 0) {
    console.log('No forbidden finance permissions found on restricted roles. Nothing to repair.');
  } else {
    console.log();
    console.log(`Total: ${totalRemoved} forbidden finance permission(s) removed.`);
  }
}

main().catch((e) => {
  console.error('Repair failed:', e);
  process.exit(1);
});
