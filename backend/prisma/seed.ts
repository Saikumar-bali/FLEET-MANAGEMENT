import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma';
import { defaultRolePermissionMap, permissionDefinitions, roleDefinitions } from '../src/constants/rbac';

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD?.trim();

function validateSeedEnvironment() {
  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the super admin user');
  }
}

async function seedRolesAndPermissions() {
  for (const role of roleDefinitions) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        status: role.status,
      },
      create: role,
    });
  }

  for (const permission of permissionDefinitions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        module: permission.module,
        action: permission.action,
        description: permission.description,
      },
      create: permission,
    });
  }

  const roles = await prisma.role.findMany();
  const permissions = await prisma.permission.findMany();
  const roleIdByKey = new Map(roles.map((role) => [role.key, role.id]));
  const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));

  for (const [roleKey, permissionKeys] of Object.entries(defaultRolePermissionMap)) {
    const roleId = roleIdByKey.get(roleKey);

    if (!roleId) {
      throw new Error(`Role not found during seed: ${roleKey}`);
    }

    const permissionIds = permissionKeys.map((permissionKey) => {
      const permissionId = permissionIdByKey.get(permissionKey);

      if (!permissionId) {
        throw new Error(`Permission not found during seed: ${permissionKey}`);
      }

      return permissionId;
    });

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      }),
    ]);
  }
}

async function seedSuperAdmin() {
  const ensuredAdminEmail = adminEmail!;
  const ensuredAdminPassword = adminPassword!;

  const superAdminRole = await prisma.role.findUnique({
    where: { key: 'super_admin' },
  });

  if (!superAdminRole) {
    throw new Error('super_admin role must exist before seeding the admin user');
  }

  const passwordHash = await bcrypt.hash(ensuredAdminPassword, 12);

  await prisma.user.upsert({
    where: { email: ensuredAdminEmail },
    update: {
      name: 'Super Admin',
      passwordHash,
      roleId: superAdminRole.id,
      status: 'ACTIVE',
    },
    create: {
      name: 'Super Admin',
      email: ensuredAdminEmail,
      passwordHash,
      roleId: superAdminRole.id,
      status: 'ACTIVE',
    },
  });
}

async function main() {
  validateSeedEnvironment();
  await seedRolesAndPermissions();
  await seedSuperAdmin();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
