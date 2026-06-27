import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import { defaultRolePermissionMap, permissionDefinitions, roleDefinitions } from '../src/constants/rbac';

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminUsername = process.env.ADMIN_USERNAME?.trim().toLowerCase() || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD?.trim();
const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase() || 'development';
const demoUsersEnabled = process.env.ENABLE_DEMO_USERS === 'true';

function validateSeedEnvironment() {
  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the super admin user');
  }

  if (nodeEnv === 'production' && demoUsersEnabled) {
    throw new Error('ENABLE_DEMO_USERS=true is not allowed when NODE_ENV is production');
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
      username: adminUsername,
      passwordHash,
      roleId: superAdminRole.id,
      status: 'ACTIVE',
    },
    create: {
      name: 'Super Admin',
      username: adminUsername,
      email: ensuredAdminEmail,
      passwordHash,
      roleId: superAdminRole.id,
      status: 'ACTIVE',
    },
  });
}

const defaultDemoCredentialDefinitions = [
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

function ciDemoCredential(roleKey: string, fallback: typeof defaultDemoCredentialDefinitions[number]) {
  const envPrefix = roleKey.toUpperCase();
  const identifier = process.env[`CI_${envPrefix}_IDENTIFIER`]?.trim();
  const password = process.env[`CI_${envPrefix}_PASSWORD`]?.trim();
  if (!identifier || !password) return fallback;
  return {
    ...fallback,
    username: identifier.toLowerCase(),
    password,
    email: `ci-${roleKey.replace(/_/g, '-')}@example.invalid`,
  };
}

async function seedDemoUsers() {
  if (!demoUsersEnabled) {
    return;
  }

  for (const fallback of defaultDemoCredentialDefinitions) {
    const demoUser = ciDemoCredential(fallback.roleKey, fallback);
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

type AlertRuleSeed = {
  key: string;
  module:
    | 'VEHICLE'
    | 'DRIVER'
    | 'TRIP'
    | 'FUEL'
    | 'DOCUMENTS'
    | 'COMPLIANCE'
    | 'FINANCE'
    | 'MAINTENANCE'
    | 'REPAIR'
    | 'SYSTEM';
  triggerType:
    | 'EXPIRY'
    | 'OVERDUE'
    | 'THRESHOLD'
    | 'MISSING_DOCUMENT'
    | 'STATUS_CHANGE'
    | 'MANUAL';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  thresholdDays?: number;
  thresholdValue?: number;
};

const alertRuleSeeds: AlertRuleSeed[] = [
  {
    key: 'vehicle.insurance.expiry',
    module: 'VEHICLE',
    triggerType: 'EXPIRY',
    severity: 'WARNING',
    title: 'Vehicle insurance expiring soon',
    description: 'Insurance will expire within 30 days',
    thresholdDays: 30,
  },
  {
    key: 'vehicle.fitness.expiry',
    module: 'VEHICLE',
    triggerType: 'EXPIRY',
    severity: 'WARNING',
    title: 'Vehicle fitness expiring soon',
    description: 'Fitness certificate will expire within 30 days',
    thresholdDays: 30,
  },
  {
    key: 'vehicle.pollution.expiry',
    module: 'VEHICLE',
    triggerType: 'EXPIRY',
    severity: 'WARNING',
    title: 'Vehicle PUC expiring soon',
    description: 'Pollution Under Control certificate will expire within 30 days',
    thresholdDays: 30,
  },
  {
    key: 'vehicle.permit.expiry',
    module: 'VEHICLE',
    triggerType: 'EXPIRY',
    severity: 'WARNING',
    title: 'Vehicle permit expiring soon',
    description: 'Permit will expire within 30 days',
    thresholdDays: 30,
  },
  {
    key: 'driver.license.expiry',
    module: 'DRIVER',
    triggerType: 'EXPIRY',
    severity: 'WARNING',
    title: 'Driver license expiring soon',
    description: 'License will expire within 30 days',
    thresholdDays: 30,
  },
  {
    key: 'document.expiry',
    module: 'DOCUMENTS',
    triggerType: 'EXPIRY',
    severity: 'WARNING',
    title: 'Document expiring soon',
    description: 'Document will expire within 30 days',
    thresholdDays: 30,
  },
  {
    key: 'document.pending_verification',
    module: 'DOCUMENTS',
    triggerType: 'THRESHOLD',
    severity: 'INFO',
    title: 'Document pending verification',
    description: 'Document awaiting verification for more than 7 days',
    thresholdDays: 7,
  },
  {
    key: 'document.rejected',
    module: 'DOCUMENTS',
    triggerType: 'STATUS_CHANGE',
    severity: 'WARNING',
    title: 'Document rejected',
    description: 'A document was rejected during verification',
  },
  {
    key: 'compliance.expiring_30d',
    module: 'COMPLIANCE',
    triggerType: 'EXPIRY',
    severity: 'WARNING',
    title: 'Compliance document expiring soon',
    description: 'Compliance document validTo date within 30 days',
    thresholdDays: 30,
  },
  {
    key: 'fuel.missing_receipt',
    module: 'FUEL',
    triggerType: 'MISSING_DOCUMENT',
    severity: 'WARNING',
    title: 'Fuel entry missing receipt',
    description: 'Approved fuel entry has no receipt attached',
    thresholdDays: 3,
  },
  {
    key: 'fuel.high_amount',
    module: 'FUEL',
    triggerType: 'THRESHOLD',
    severity: 'WARNING',
    title: 'High fuel amount',
    description: 'Fuel entry total amount exceeds threshold',
    thresholdValue: 15000,
  },
  {
    key: 'trip.billing_overdue',
    module: 'FINANCE',
    triggerType: 'OVERDUE',
    severity: 'WARNING',
    title: 'Trip billing overdue',
    description: 'Trip billing is past its due date',
    thresholdDays: 0,
  },
  {
    key: 'finance.pending_payment',
    module: 'FINANCE',
    triggerType: 'OVERDUE',
    severity: 'WARNING',
    title: 'Pending payment',
    description: 'Finance transaction pending payment for more than 15 days',
    thresholdDays: 15,
  },
  {
    key: 'maintenance.open_old',
    module: 'MAINTENANCE',
    triggerType: 'OVERDUE',
    severity: 'WARNING',
    title: 'Maintenance request open too long',
    description: 'Maintenance request open for more than 14 days',
    thresholdDays: 14,
  },
  {
    key: 'repair.in_progress_long',
    module: 'REPAIR',
    triggerType: 'THRESHOLD',
    severity: 'WARNING',
    title: 'Repair in progress too long',
    description: 'Repair has been in progress for more than 21 days',
    thresholdDays: 21,
  },
];

async function seedAlertRules() {
  for (const seed of alertRuleSeeds) {
    await prisma.alertRule.upsert({
      where: { key: seed.key },
      update: {
        module: seed.module,
        triggerType: seed.triggerType,
        severity: seed.severity,
        title: seed.title,
        description: seed.description,
        thresholdDays: seed.thresholdDays ?? null,
        thresholdValue: seed.thresholdValue ?? null,
        isActive: true,
      },
      create: {
        key: seed.key,
        module: seed.module,
        triggerType: seed.triggerType,
        severity: seed.severity,
        title: seed.title,
        description: seed.description,
        thresholdDays: seed.thresholdDays ?? null,
        thresholdValue: seed.thresholdValue ?? null,
        isActive: true,
      },
    });
  }
}

async function main() {
  validateSeedEnvironment();
  await seedRolesAndPermissions();
  await seedSuperAdmin();
  await seedDemoUsers();
  await seedAlertRules();
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
