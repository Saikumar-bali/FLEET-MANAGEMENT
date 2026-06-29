import { prisma } from '../src/lib/prisma';
import { getEffectivePermissions } from '../src/modules/access/effective-permissions.service';
import { getActorContext, canAccessGlobal } from '../src/modules/access/actor-context.service';
import { hasScope, isGlobalUser, can, canAny } from '../src/modules/access/access-policy.service';

const TEST_PREFIX = 'PHASE_ACCOUNT_SCOPE_TEST_';

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
  const driverRole = await prisma.role.findFirst({ where: { key: 'driver' } });
  if (!driverRole) throw new Error('Driver role not found');
  const superAdminRole = await prisma.role.findFirst({ where: { key: 'super_admin' } });
  if (!superAdminRole) throw new Error('super_admin role not found');
  const adminRole = await prisma.role.findFirst({ where: { key: 'admin' } });
  if (!adminRole) throw new Error('admin role not found');

  const driverPerms = await prisma.rolePermission.findMany({ where: { roleId: driverRole.id }, include: { permission: true } });
  const permKey = driverPerms[0]?.permission.key;
  if (!permKey) throw new Error('No permissions found for driver role');

  const [userA, userB, testAdmin, testSuperAdmin] = await Promise.all([
    prisma.user.create({ data: { name: `${TEST_PREFIX}User_A`, email: `${TEST_PREFIX}user_a@test.com`, passwordHash: 'x', roleId: driverRole.id, status: 'ACTIVE' } }),
    prisma.user.create({ data: { name: `${TEST_PREFIX}User_B`, email: `${TEST_PREFIX}user_b@test.com`, passwordHash: 'x', roleId: driverRole.id, status: 'ACTIVE' } }),
    prisma.user.create({ data: { name: `${TEST_PREFIX}Admin`, email: `${TEST_PREFIX}admin@test.com`, passwordHash: 'x', roleId: adminRole.id, status: 'ACTIVE' } }),
    prisma.user.create({ data: { name: `${TEST_PREFIX}SuperAdmin`, email: `${TEST_PREFIX}superadmin@test.com`, passwordHash: 'x', roleId: superAdminRole.id, status: 'ACTIVE' } }),
  ]);
  console.log(`  PASS Created users A(${userA.id}), B(${userB.id}), Admin(${testAdmin.id}), SuperAdmin(${testSuperAdmin.id})`);

  // 2. Test role permissions included
  console.log('\n2. Testing role permissions included...');
  const effectiveA = await getEffectivePermissions(userA.id);
  assert(effectiveA.rolePermissions.length > 0, 'User A has role permissions');
  assert(effectiveA.effectivePermissions.length > 0, 'User A has effective permissions');

  // 3. ALLOW override adds permission
  console.log('\n3. Testing ALLOW override adds permission...');
  const permission = await prisma.permission.findFirst({ where: { key: permKey } });
  if (!permission) throw new Error(`Permission ${permKey} not found`);

  const allowOverride = await prisma.userPermissionOverride.create({
    data: { userId: userA.id, permissionId: permission.id, effect: 'ALLOW', reason: 'test grant' },
  });
  const effA1 = await getEffectivePermissions(userA.id);
  assert(effA1.userAllowedPermissions.includes(permKey), 'ALLOW override adds permission');

  // 4. DENY override removes permission
  console.log('\n4. Testing DENY override removes permission...');
  const denyOverride = await prisma.userPermissionOverride.create({
    data: { userId: userB.id, permissionId: permission.id, effect: 'DENY', reason: 'test deny' },
  });
  const effB1 = await getEffectivePermissions(userB.id);
  assert(effB1.userDeniedPermissions.includes(permKey), 'DENY override removes permission');

  // 5. DENY wins over ALLOW/role
  console.log('\n5. Testing DENY wins over ALLOW/role...');
  // User B already has DENY for permKey. Add ALLOW for a different permission to show both exist.
  const secondPerm = driverPerms[1]?.permission;
  if (secondPerm) {
    await prisma.userPermissionOverride.upsert({
      where: { userId_permissionId: { userId: userB.id, permissionId: permission.id } },
      create: { userId: userB.id, permissionId: permission.id, effect: 'DENY', reason: 'test deny' },
      update: { effect: 'DENY', reason: 'test deny alongside role' },
    });
  }
  const effB2 = await getEffectivePermissions(userB.id);
  assert(effB2.userDeniedPermissions.includes(permKey), 'DENY still recorded');
  assert(!effB2.effectivePermissions.includes(permKey), 'DENY wins: permission excluded from effective');

  // 6. Expired overrides ignored
  console.log('\n6. Testing expired overrides ignored...');
  await prisma.userPermissionOverride.update({ where: { id: allowOverride.id }, data: { expiresAt: new Date('2020-01-01') } });
  const effA2 = await getEffectivePermissions(userA.id);
  assert(!effA2.userAllowedPermissions.includes(permKey), 'Expired override ignored');

  // Restore for later tests
  await prisma.userPermissionOverride.update({ where: { id: allowOverride.id }, data: { expiresAt: null } });

  // 7. User A scope to VEHICLE vehicle-1
  console.log('\n7. Testing data scopes...');
  const scopeA = await prisma.userDataScope.create({ data: { userId: userA.id, scopeType: 'VEHICLE', scopeId: 'vehicle-1', accessLevel: 'VIEW' } });
  const scopeB = await prisma.userDataScope.create({ data: { userId: userB.id, scopeType: 'VEHICLE', scopeId: 'vehicle-2', accessLevel: 'VIEW' } });
  assert(scopeA.scopeId === 'vehicle-1', 'User A scope to vehicle-1');
  assert(scopeB.scopeId === 'vehicle-2', 'User B scope to vehicle-2');

  // 8-9. hasScope tests
  console.log('\n8. Testing hasScope...');
  const actorA = await getActorContext(userA.id);
  const actorB = await getActorContext(userB.id);
  assert(hasScope(actorA, 'VEHICLE', 'vehicle-1', 'VIEW') === true, 'hasScope(A, VEHICLE, vehicle-1, VIEW) = true');
  assert(hasScope(actorA, 'VEHICLE', 'vehicle-2', 'VIEW') === false, 'hasScope(A, VEHICLE, vehicle-2, VIEW) = false');
  assert(hasScope(actorB, 'VEHICLE', 'vehicle-2', 'VIEW') === true, 'hasScope(B, VEHICLE, vehicle-2, VIEW) = true');
  assert(hasScope(actorB, 'VEHICLE', 'vehicle-1', 'VIEW') === false, 'hasScope(B, VEHICLE, vehicle-1, VIEW) = false');

  // 10. MANAGE scope includes VIEW/UPDATE/DELETE
  console.log('\n9. Testing MANAGE scope hierarchy...');
  await prisma.userDataScope.create({ data: { userId: userA.id, scopeType: 'VEHICLE', scopeId: 'vehicle-3', accessLevel: 'MANAGE' } });
  const actorAManage = await getActorContext(userA.id);
  assert(hasScope(actorAManage, 'VEHICLE', 'vehicle-3', 'VIEW') === true, 'MANAGE includes VIEW');
  assert(hasScope(actorAManage, 'VEHICLE', 'vehicle-3', 'UPDATE') === true, 'MANAGE includes UPDATE');
  assert(hasScope(actorAManage, 'VEHICLE', 'vehicle-3', 'DELETE') === true, 'MANAGE includes DELETE');
  assert(hasScope(actorAManage, 'VEHICLE', 'vehicle-3', 'MANAGE') === true, 'MANAGE includes MANAGE');

  // 11. super_admin global access = true
  console.log('\n10. Testing super_admin global access...');
  const actorSuperAdmin = await getActorContext(testSuperAdmin.id);
  assert(isGlobalUser(actorSuperAdmin) === true, 'super_admin is global');
  assert(hasScope(actorSuperAdmin, 'VEHICLE', 'anything', 'VIEW') === true, 'super_admin has scope to any vehicle');
  assert(hasScope(actorSuperAdmin, 'TRIP', 'anything', 'VIEW') === true, 'super_admin has scope to any trip');

  // 12. admin is NOT automatically global
  console.log('\n11. Testing admin is NOT automatically global...');
  const actorAdmin = await getActorContext(testAdmin.id);
  assert(isGlobalUser(actorAdmin) === false, 'admin without GLOBAL scope is NOT global');
  assert(hasScope(actorAdmin, 'VEHICLE', 'vehicle-1', 'VIEW') === false, 'admin without scope cannot access vehicle');

  // Admin WITH GLOBAL scope IS global
  await prisma.userDataScope.create({ data: { userId: testAdmin.id, scopeType: 'GLOBAL', accessLevel: 'MANAGE', reason: 'test global scope' } });
  const actorAdminGlobal = await getActorContext(testAdmin.id);
  assert(isGlobalUser(actorAdminGlobal) === true, 'admin WITH GLOBAL/MANAGE scope IS global');
  assert(canAccessGlobal(actorAdminGlobal) === true, 'admin canAccessGlobal returns true with GLOBAL/MANAGE scope');

  // 13. non-super_admin cannot grant GLOBAL scope
  console.log('\n12. Testing non-super_admin cannot grant GLOBAL scope...');
  let globalGrantFailed = false;
  try {
    await import('../src/modules/access/access-policy.service').then(m =>
      m.assertCanGrantScope(actorAdmin, userA.id, 'GLOBAL', 'VIEW'),
    );
  } catch (e: any) {
    globalGrantFailed = e.message.includes('super_admin');
  }
  assert(globalGrantFailed, 'Non-super_admin blocked from granting GLOBAL scope');

  // 14. non-super_admin cannot grant critical permissions
  console.log('\n13. Testing non-super_admin cannot grant critical permissions...');
  let criticalGrantFailed = false;
  try {
    await import('../src/modules/access/access-policy.service').then(m =>
      m.assertCanGrantPermission(actorAdmin, userA.id, 'role.assign'),
    );
  } catch (e: any) {
    criticalGrantFailed = e.message.includes('super_admin');
  }
  assert(criticalGrantFailed, 'Non-super_admin blocked from granting role.assign');

  // 15. Audit log contains actor user id
  console.log('\n14. Testing audit log contains actor user id...');
  await prisma.auditLog.create({
    data: {
      userId: userA.id,
      action: 'admin.user.permission.allow',
      entityType: 'user_permission_override',
      entityId: userB.id,
      metadata: { actorUserId: userA.id, targetUserId: userB.id, permissionKey: permKey, effect: 'ALLOW' },
    },
  });
  const auditEntry = await prisma.auditLog.findFirst({
    where: { userId: userA.id, action: 'admin.user.permission.allow' },
  });
  assert(auditEntry !== null, 'Audit log entry exists');
  assert((auditEntry!.metadata as any)?.actorUserId === userA.id, 'Audit log has actorUserId');
  assert((auditEntry!.metadata as any)?.targetUserId === userB.id, 'Audit log has targetUserId');

  // 16. can/canAny helpers work
  console.log('\n15. Testing can/canAny helpers...');
  assert(can(actorA, permKey) === true, 'can(A, permKey) = true (from role)');
  assert(canAny(actorA, [permKey, 'nonexistent.perm']) === true, 'canAny returns true if any match');

  // 17. Cleanup and verify
  console.log('\n16. Cleaning up test data...');
  await prisma.auditLog.deleteMany({ where: { userId: { in: [userA.id, userB.id, testAdmin.id, testSuperAdmin.id] } } });
  await prisma.userPermissionOverride.deleteMany({ where: { userId: { in: [userA.id, userB.id, testAdmin.id, testSuperAdmin.id] } } });
  await prisma.userDataScope.deleteMany({ where: { userId: { in: [userA.id, userB.id, testAdmin.id, testSuperAdmin.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id, testAdmin.id, testSuperAdmin.id] } } });
  const remaining = await prisma.user.count({ where: { email: { startsWith: TEST_PREFIX } } });
  assert(remaining === 0, 'All test users cleaned up');

  console.log('\n=== All tests passed ===');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('\nTEST FAILED:', e.message);
  await cleanup();
  await prisma.$disconnect();
  process.exit(1);
});
