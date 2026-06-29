import { prisma } from '../src/lib/prisma';
import { getEffectivePermissions } from '../src/modules/access/effective-permissions.service';

const TEST_PREFIX = 'PHASE_ACCOUNT_SCOPE_TEST_';
const cleanupUserIds: string[] = [];

async function cleanup() {
  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });
  const ids = testUsers.map(u => u.id);
  if (ids.length === 0) return;

  await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
  await prisma.userPermissionOverride.deleteMany({ where: { userId: { in: ids } } });
  await prisma.userDataScope.deleteMany({ where: { userId: { in: ids } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`  PASS ${label}`);
}

async function main() {
  console.log('=== Account Scope Test ===\n');
  await cleanup();

  // 1. Create test users
  console.log('1. Creating test users...');
  const role = await prisma.role.findFirst({ where: { key: 'driver' } });
  if (!role) throw new Error('Driver role not found');

  const driverPerms = await prisma.rolePermission.findMany({ where: { roleId: role.id }, include: { permission: true } });
  const permKey = driverPerms[0]?.permission.key;
  if (!permKey) throw new Error('No permissions found for driver role');

  const [userA, userB] = await Promise.all([
    prisma.user.create({ data: { name: `${TEST_PREFIX}User_A`, email: `${TEST_PREFIX}user_a@test.com`, passwordHash: 'x', roleId: role.id, status: 'ACTIVE' } }),
    prisma.user.create({ data: { name: `${TEST_PREFIX}User_B`, email: `${TEST_PREFIX}user_b@test.com`, passwordHash: 'x', roleId: role.id, status: 'ACTIVE' } }),
  ]);
  cleanupUserIds.push(userA.id, userB.id);
  console.log(`  PASS Created users A (${userA.id}) and B (${userB.id})`);

  // 2. Test data scopes
  console.log('\n2. Testing data scopes...');
  const scopeA = await prisma.userDataScope.create({ data: { userId: userA.id, scopeType: 'VEHICLE', scopeId: 'vehicle-1', accessLevel: 'VIEW' } });
  const scopeB = await prisma.userDataScope.create({ data: { userId: userB.id, scopeType: 'VEHICLE', scopeId: 'vehicle-2', accessLevel: 'VIEW' } });

  const actorA = await prisma.user.findUnique({ where: { id: userA.id }, include: { role: true, dataScopes: true } });
  const actorB = await prisma.user.findUnique({ where: { id: userB.id }, include: { role: true, dataScopes: true } });

  assert(actorA!.dataScopes.length === 1 && actorA!.dataScopes[0].scopeId === 'vehicle-1', 'User A has scope to vehicle-1');
  assert(actorB!.dataScopes.length === 1 && actorB!.dataScopes[0].scopeId === 'vehicle-2', 'User B has scope to vehicle-2');

  // 3. Test permission overrides
  console.log('\n3. Testing permission overrides...');
  const permission = await prisma.permission.findFirst({ where: { key: permKey } });
  if (!permission) throw new Error(`Permission ${permKey} not found`);

  const override = await prisma.userPermissionOverride.create({ data: { userId: userA.id, permissionId: permission.id, effect: 'ALLOW', reason: 'test grant' } });
  assert(override.effect === 'ALLOW', 'ALLOW override created for user A');

  const denyOverride = await prisma.userPermissionOverride.create({ data: { userId: userB.id, permissionId: permission.id, effect: 'DENY', reason: 'test deny' } });
  assert(denyOverride.effect === 'DENY', 'DENY override created for user B');

  // 4. Test effective permissions
  console.log('\n4. Testing effective permissions...');
  const effectiveA = await getEffectivePermissions(userA.id);
  const effectiveB = await getEffectivePermissions(userB.id);

  assert(effectiveA.userAllowedPermissions.includes(permKey), 'User A has allowed permission');
  assert(effectiveB.userDeniedPermissions.includes(permKey), 'User B has denied permission');
  assert(effectiveA.effectivePermissions.includes(permKey), 'User A effective includes allowed perm');
  assert(!effectiveB.effectivePermissions.includes(permKey), 'User B effective excludes denied perm');

  // 5. Test expired overrides ignored
  console.log('\n5. Testing expired overrides ignored...');
  await prisma.userPermissionOverride.update({ where: { id: override.id }, data: { expiresAt: new Date('2020-01-01') } });
  const effectiveExpired = await getEffectivePermissions(userA.id);
  assert(!effectiveExpired.userAllowedPermissions.includes(permKey), 'Expired override ignored for user A');

  // Cleanup
  console.log('\nCleaning up...');
  await prisma.userPermissionOverride.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
  await prisma.userDataScope.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });

  console.log('\n=== All tests passed ===');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('\nTEST FAILED:', e.message);
  await cleanup();
  await prisma.$disconnect();
  process.exit(1);
});
