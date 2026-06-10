import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma';
import { defaultRolePermissionMap, permissionDefinitions, roleDefinitions } from '../src/constants/rbac';

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD?.trim();
const demoUsersEnabled = process.env.ENABLE_DEMO_USERS === 'true';

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
      username: 'admin',
      passwordHash,
      roleId: superAdminRole.id,
      status: 'ACTIVE',
    },
    create: {
      name: 'Super Admin',
      username: 'admin',
      email: ensuredAdminEmail,
      passwordHash,
      roleId: superAdminRole.id,
      status: 'ACTIVE',
    },
  });
}

const demoCredentialDefinitions = [
  { roleKey: 'admin', username: 'opsadmin', password: 'opsadmin@123', name: 'Demo Ops Admin', email: 'opsadmin.demo@fleet.local' },
  { roleKey: 'manager', username: 'manager', password: 'manager@123', name: 'Demo Manager', email: 'manager.demo@fleet.local' },
  { roleKey: 'supervisor', username: 'supervisor', password: 'supervisor@123', name: 'Demo Supervisor', email: 'supervisor.demo@fleet.local' },
  { roleKey: 'driver', username: 'driver', password: 'driver@123', name: 'Demo Driver', email: 'driver.demo@fleet.local' },
  { roleKey: 'assistant_driver', username: 'assistantdriver', password: 'assistant@123', name: 'Demo Assistant Driver', email: 'assistantdriver.demo@fleet.local' },
  { roleKey: 'collector', username: 'collector', password: 'collector@123', name: 'Demo Collector', email: 'collector.demo@fleet.local' },
  { roleKey: 'mechanic', username: 'mechanic', password: 'mechanic@123', name: 'Demo Mechanic', email: 'mechanic.demo@fleet.local' },
  { roleKey: 'finance', username: 'finance', password: 'finance@123', name: 'Demo Finance', email: 'finance.demo@fleet.local' },
  { roleKey: 'viewer', username: 'viewer', password: 'viewer@123', name: 'Demo Viewer', email: 'viewer.demo@fleet.local' },
] as const;

async function seedDemoUsers() {
  if (!demoUsersEnabled) {
    return;
  }

  for (const demoUser of demoCredentialDefinitions) {
    const role = await prisma.role.findUnique({
      where: { key: demoUser.roleKey },
    });

    if (!role) {
      throw new Error(`Role not found for demo user seed: ${demoUser.roleKey}`);
    }

    const passwordHash = await bcrypt.hash(demoUser.password, 12);

    await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {
        name: demoUser.name,
        username: demoUser.username,
        passwordHash,
        roleId: role.id,
        status: 'ACTIVE',
      },
      create: {
        name: demoUser.name,
        username: demoUser.username,
        email: demoUser.email,
        passwordHash,
        roleId: role.id,
        status: 'ACTIVE',
      },
    });
  }
}

async function main() {
  validateSeedEnvironment();
  await seedRolesAndPermissions();
  await seedSuperAdmin();
  await seedDemoUsers();
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
