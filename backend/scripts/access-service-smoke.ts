import { prisma } from '../src/lib/prisma';
import {
  setPermissionOverride,
  removePermissionOverride,
  grantDataScope,
  removeDataScope,
  listPermissionOverrides,
  listDataScopes,
} from '../src/modules/access/access-permissions.service';

const TEST_PREFIX = 'PHASE_SMOKE_SVC_';

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`  PASS ${label}`);
}

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

async function main() {
  console.log('=== Service-Level Smoke Test ===\n');
  await cleanup();

  // Setup: create actor (super_admin) and target (driver)
  console.log('1. Setup...');
  const superAdminRole = await prisma.role.findFirst({ where: { key: 'super_admin' } });
  const driverRole = await prisma.role.findFirst({ where: { key: 'driver' } });
  if (!superAdminRole || !driverRole) throw new Error('Roles not found');

  const fuelViewPerm = await prisma.permission.findFirst({ where: { key: 'fuel_view' } });
  const fuelCreatePerm = await prisma.permission.findFirst({ where: { key: 'fuel_create' } });
  if (!fuelViewPerm || !fuelCreatePerm) throw new Error('Permissions not found');

  const [actor, target] = await Promise.all([
    prisma.user.create({ data: { name: `${TEST_PREFIX}Actor`, email: `${TEST_PREFIX}actor@test.com`, passwordHash: 'x', roleId: superAdminRole.id, status: 'ACTIVE' } }),
    prisma.user.create({ data: { name: `${TEST_PREFIX}Target`, email: `${TEST_PREFIX}target@test.com`, passwordHash: 'x', roleId: driverRole.id, status: 'ACTIVE' } }),
  ]);
  console.log(`  PASS Created actor(${actor.id}) and target(${target.id})`);

  // 2. setPermissionOverride — ALLOW
  console.log('\n2. setPermissionOverride (ALLOW)...');
  const overrideResult = await setPermissionOverride(actor.id, target.id, 'fuel_view', 'ALLOW', 'smoke test');
  assert(overrideResult.effect === 'ALLOW', 'Override effect is ALLOW');
  assert(overrideResult.grantedById === actor.id, 'Override grantedById is actor');

  // Verify audit: entityType should be user_permission_override
  const permAudit = await prisma.auditLog.findFirst({
    where: { userId: actor.id, action: 'admin.user.permission.allow' },
    orderBy: { createdAt: 'desc' },
  });
  assert(permAudit !== null, 'Permission audit entry exists');
  assert(permAudit!.entityType === 'user_permission_override', 'Audit entityType is user_permission_override');
  assert(permAudit!.entityId === target.id, 'Audit entityId is target');
  assert((permAudit!.metadata as any)?.actorUserId === actor.id, 'Audit metadata has actorUserId');
  assert((permAudit!.metadata as any)?.permissionKey === 'fuel_view', 'Audit metadata has permissionKey');

  // 3. listPermissionOverrides
  console.log('\n3. listPermissionOverrides...');
  const overrides = await listPermissionOverrides(target.id);
  assert(overrides.length === 1, 'One override listed');
  assert(overrides[0].permission.key === 'fuel_view', 'Override permission is fuel_view');

  // 4. setPermissionOverride — DENY (upsert)
  console.log('\n4. setPermissionOverride (DENY upsert)...');
  const denyResult = await setPermissionOverride(actor.id, target.id, 'fuel_view', 'DENY', 'smoke deny');
  assert(denyResult.effect === 'DENY', 'Upserted override effect is DENY');

  const overrides2 = await listPermissionOverrides(target.id);
  assert(overrides2.length === 1, 'Still one override (upserted)');
  assert(overrides2[0].effect === 'DENY', 'Upserted override is DENY');

  // 5. removePermissionOverride
  console.log('\n5. removePermissionOverride...');
  await removePermissionOverride(actor.id, target.id, fuelViewPerm.id);
  const overrides3 = await listPermissionOverrides(target.id);
  assert(overrides3.length === 0, 'Override removed');

  const removeAudit = await prisma.auditLog.findFirst({
    where: { userId: actor.id, action: 'admin.user.permission.remove' },
    orderBy: { createdAt: 'desc' },
  });
  assert(removeAudit !== null, 'Remove audit entry exists');
  assert(removeAudit!.entityType === 'user_permission_override', 'Remove audit entityType correct');

  // 6. grantDataScope
  console.log('\n6. grantDataScope...');
  const scopeResult = await grantDataScope(actor.id, target.id, 'VEHICLE', 'VIEW', 'vehicle-100', 'smoke scope');
  assert(scopeResult.scopeType === 'VEHICLE', 'Scope type is VEHICLE');
  assert(scopeResult.scopeId === 'vehicle-100', 'Scope ID is vehicle-100');
  assert(scopeResult.accessLevel === 'VIEW', 'Access level is VIEW');
  assert(scopeResult.grantedById === actor.id, 'Scope grantedById is actor');

  // Verify audit: entityType should be user_data_scope
  const scopeAudit = await prisma.auditLog.findFirst({
    where: { userId: actor.id, action: 'admin.user.scope.grant' },
    orderBy: { createdAt: 'desc' },
  });
  assert(scopeAudit !== null, 'Scope audit entry exists');
  assert(scopeAudit!.entityType === 'user_data_scope', 'Scope audit entityType is user_data_scope');
  assert((scopeAudit!.metadata as any)?.scopeType === 'VEHICLE', 'Scope audit metadata has scopeType');

  // 7. listDataScopes
  console.log('\n7. listDataScopes...');
  const scopes = await listDataScopes(target.id);
  assert(scopes.length === 1, 'One scope listed');
  assert(scopes[0].scopeType === 'VEHICLE', 'Scope is VEHICLE');

  // 8. removeDataScope
  console.log('\n8. removeDataScope...');
  await removeDataScope(actor.id, scopeResult.id);
  const scopes2 = await listDataScopes(target.id);
  assert(scopes2.length === 0, 'Scope removed');

  const removeScopeAudit = await prisma.auditLog.findFirst({
    where: { userId: actor.id, action: 'admin.user.scope.remove' },
    orderBy: { createdAt: 'desc' },
  });
  assert(removeScopeAudit !== null, 'Remove scope audit exists');
  assert(removeScopeAudit!.entityType === 'user_data_scope', 'Remove scope audit entityType correct');

  // 9. Error: non-super_admin cannot grant critical permission
  console.log('\n9. Error: non-super_admin blocked from critical permission...');
  const adminRole = await prisma.role.findFirst({ where: { key: 'admin' } });
  const adminUser = await prisma.user.create({ data: { name: `${TEST_PREFIX}Admin`, email: `${TEST_PREFIX}admin@test.com`, passwordHash: 'x', roleId: adminRole!.id, status: 'ACTIVE' } });

  let blocked = false;
  try {
    await setPermissionOverride(adminUser.id, target.id, 'role_view', 'ALLOW', 'should fail');
  } catch (e: any) {
    blocked = e.message.includes('super_admin');
  }
  assert(blocked, 'Admin blocked from granting role_view');

  // 10. Error: non-super_admin cannot grant MANAGE scope
  console.log('\n10. Error: non-super_admin blocked from MANAGE scope...');
  let manageBlocked = false;
  try {
    await grantDataScope(adminUser.id, target.id, 'VEHICLE', 'MANAGE', 'vehicle-200', 'should fail');
  } catch (e: any) {
    manageBlocked = e.message.includes('super_admin');
  }
  assert(manageBlocked, 'Admin blocked from granting MANAGE scope');

  // 11. Cleanup
  console.log('\n11. Cleanup...');
  const allIds = [actor.id, target.id, adminUser.id];
  await prisma.auditLog.deleteMany({ where: { userId: { in: allIds } } });
  await prisma.userPermissionOverride.deleteMany({ where: { userId: { in: allIds } } });
  await prisma.userDataScope.deleteMany({ where: { userId: { in: allIds } } });
  await prisma.user.deleteMany({ where: { id: { in: allIds } } });
  const remaining = await prisma.user.count({ where: { email: { startsWith: TEST_PREFIX } } });
  assert(remaining === 0, 'All test users cleaned up');

  console.log('\n=== All service smoke tests passed ===');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('\nTEST FAILED:', e.message);
  await cleanup();
  await prisma.$disconnect();
  process.exit(1);
});
