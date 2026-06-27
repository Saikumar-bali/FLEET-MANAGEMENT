/**
 * repair-driver-permissions.ts
 *
 * Adds missing driver-scoped permissions to the database without resetting.
 * Safe to run on existing databases - only inserts new permissions.
 *
 * Usage: npm --prefix backend run rbac:repair
 */

import { PrismaClient } from '@prisma/client';
import { permissionDefinitions, defaultRolePermissionMap } from '../src/constants/rbac';

const prisma = new PrismaClient();

async function main() {
  console.log('=== RBAC Repair: Driver Permissions ===\n');

  // Upsert all permissions from definitions
  let created = 0;
  let existing = 0;

  for (const def of permissionDefinitions) {
    const result = await prisma.permission.upsert({
      where: { key: def.key },
      update: {
        module: def.module,
        action: def.action,
        description: def.description,
      },
      create: {
        key: def.key,
        module: def.module,
        action: def.action,
        description: def.description,
      },
    });

    // Check if it was just created or already existed
    const existingPerm = await prisma.permission.findUnique({ where: { key: def.key } });
    if (existingPerm) {
      existing++;
    } else {
      created++;
    }
  }

  console.log(`Permissions: ${permissionDefinitions.length} defined, ${existing} in DB (created ${created} new)`);

  // Repair role permissions for driver role
  const driverRole = await prisma.role.findUnique({ where: { key: 'driver' } });
  if (driverRole) {
    const expectedKeys = defaultRolePermissionMap.driver || [];
    const perms = await prisma.permission.findMany({
      where: { key: { in: expectedKeys } },
      select: { id: true, key: true },
    });

    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: driverRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: driverRole.id,
          permissionId: perm.id,
        },
      });
    }

    console.log(`Driver role: synced ${perms.length} permissions from rbac.ts defaults`);
  }

  console.log('\n=== Repair Complete ===');
}

main()
  .catch((err) => {
    console.error('Repair failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
