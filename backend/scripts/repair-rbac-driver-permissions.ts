import { prisma } from '../src/lib/prisma';
import { defaultRolePermissionMap } from '../src/constants/rbac';

const DRIVER_FORBIDDEN_PERMISSIONS = new Set([
  'trip_view',
  'trip_start',
  'trip_end',
  'driver_submission_review',
  'driver_fuel_approve',
  'driver_expense_approve',
  'driver_document_verify',
  'driver_issue_review',
  'driver_inspection_review',
  'vehicle_compliance_view',
  'compliance_alerts_view',
]);

async function main() {
  const shouldApply = process.env.RBAC_DRIVER_REPAIR_APPLY === 'true';

  console.log('=== RBAC Driver Permission Repair ===\n');

  const role = await prisma.role.findUnique({ where: { key: 'driver' } });
  if (!role) {
    console.log('Driver role not found. Nothing to repair.');
    return;
  }

  const permissions = await prisma.permission.findMany({
    where: { key: { in: [...DRIVER_FORBIDDEN_PERMISSIONS] } },
  });

  const forbiddenIds = permissions.map(p => p.id);
  if (forbiddenIds.length > 0) {
    const currentRolePerms = await prisma.rolePermission.findMany({
      where: { roleId: role.id, permissionId: { in: forbiddenIds } },
      include: { permission: true },
    });

    if (currentRolePerms.length === 0) {
      console.log('Driver role is clean. No forbidden permissions assigned.\n');
    } else {
      console.log(`Found ${currentRolePerms.length} forbidden permission(s) on driver role:`);
      for (const rp of currentRolePerms) {
        console.log(`  - ${rp.permission.key}`);
      }

      if (shouldApply) {
        await prisma.rolePermission.deleteMany({
          where: { roleId: role.id, permissionId: { in: forbiddenIds } },
        });
        console.log(`\nRemoved ${currentRolePerms.length} forbidden permission(s) from driver role.`);
      } else {
        console.log('\nDry-run mode. Set RBAC_DRIVER_REPAIR_APPLY=true to apply.');
      }
    }
  } else {
    console.log('No forbidden permissions defined in DB. Nothing to clean.');
  }

  const intendedPerms = defaultRolePermissionMap['driver'] ?? [];
  const intendedSet = new Set(intendedPerms);
  const allPerms = await prisma.permission.findMany();
  const permByKey = new Map(allPerms.map(p => [p.key, p.id]));

  const missingPermIds: string[] = [];
  for (const key of intendedSet) {
    const pid = permByKey.get(key);
    if (!pid) {
      console.log(`Warning: Permission not found in DB: ${key}`);
      continue;
    }
    const exists = await prisma.rolePermission.findFirst({
      where: { roleId: role.id, permissionId: pid },
    });
    if (!exists) {
      missingPermIds.push(pid);
    }
  }

  if (missingPermIds.length > 0) {
    console.log(`\nMissing ${missingPermIds.length} intended permission(s) on driver role.`);
    if (shouldApply) {
      await prisma.rolePermission.createMany({
        data: missingPermIds.map(pid => ({ roleId: role.id, permissionId: pid })),
      });
      console.log(`Added ${missingPermIds.length} missing permission(s).`);
    } else {
      console.log('Dry-run: these would be added.');
    }
  } else {
    console.log('\nAll intended permissions are present on driver role.');
  }

  console.log('\n=== Repair Complete ===');
}

main().catch((e) => {
  console.error('Repair failed:', e);
  process.exit(1);
});
