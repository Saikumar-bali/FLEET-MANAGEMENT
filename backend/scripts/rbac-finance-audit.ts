import { prisma } from '../src/lib/prisma';

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
  const rolePermissions = await prisma.rolePermission.findMany({
    include: { permission: true, role: true },
  });

  const violations: string[] = [];

  for (const rp of rolePermissions) {
    if (RESTRICTED_ROLES.has(rp.role.key) && FINANCE_SENSITIVE_PERMISSIONS.has(rp.permission.key)) {
      violations.push(`${rp.role.key} has ${rp.permission.key}`);
    }
  }

  console.log('RBAC Finance Audit Report');
  console.log('=========================');
  console.log();

  for (const role of roles.sort((a, b) => a.key.localeCompare(b.key))) {
    const perms = rolePermissions
      .filter((rp) => rp.roleId === role.id)
      .map((rp) => rp.permission.key)
      .sort();

    const financePerms = perms.filter((k) => FINANCE_SENSITIVE_PERMISSIONS.has(k));
    const isRestricted = RESTRICTED_ROLES.has(role.key);

    console.log(`Role: ${role.key}${isRestricted ? ' (RESTRICTED - should have 0 finance perms)' : ''}`);
    console.log(`  Finance permissions: ${financePerms.length}`);
    const pass = !isRestricted || financePerms.length === 0;
    console.log(`  Status: ${pass ? 'PASS' : 'FAIL'}`);
    if (financePerms.length > 0) {
      console.log(`  Permissions: ${financePerms.join(', ')}`);
    }
    console.log();
  }

  if (violations.length > 0) {
    console.log('VIOLATIONS FOUND:');
    violations.forEach((v) => console.log(`  - ${v}`));
    process.exit(1);
  }

  console.log('All restricted roles have zero finance permissions. PASS');
  process.exit(0);
}

main().catch((e) => {
  console.error('Audit failed:', e);
  process.exit(1);
});
