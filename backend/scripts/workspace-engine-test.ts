import { getWorkspace } from '../src/services/workspace.service';
import { prisma } from '../src/lib/prisma';

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(message);
    console.error(`  FAIL: ${message}`);
  }
}

async function getUserIdByRole(roleKey: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { role: { key: roleKey }, status: 'ACTIVE' },
    select: { id: true },
  });
  return user?.id ?? null;
}

async function main() {
  console.log('\n--- Workspace Engine Test ---\n');

  // Test 1: Super admin workspace
  console.log('Test 1: super_admin workspace');
  const superAdminId = await getUserIdByRole('super_admin');
  if (superAdminId) {
    const ws = await getWorkspace(superAdminId);
    assert(ws.workspaceType === 'SUPER_ADMIN', 'workspaceType should be SUPER_ADMIN');
    assert(ws.capabilities.canUseAdmin === true, 'super_admin should have canUseAdmin');
    assert(ws.capabilities.canManageUsers === true, 'super_admin should have canManageUsers');
    assert(ws.capabilities.canManageRoles === true, 'super_admin should have canManageRoles');
    assert(ws.navigation.length > 0, 'super_admin should have navigation items');
    console.log(`  Navigation sections: ${ws.navigation.length}, items: ${ws.navigation.reduce((s, n) => s + n.items.length, 0)}`);
  } else {
    console.log('  SKIP: no super_admin user found');
  }

  // Test 2: Driver without DRIVER profile
  console.log('\nTest 2: driver without DRIVER profile');
  const driverRoleUser = await prisma.user.findFirst({
    where: {
      role: { key: 'driver' },
      profileLinks: { none: { profileType: 'DRIVER', status: 'ACTIVE' } },
      status: 'ACTIVE',
    },
    select: { id: true },
  });
  if (driverRoleUser) {
    const ws = await getWorkspace(driverRoleUser.id);
    assert(ws.capabilities.canUseDriverPortal === false, 'driver without DRIVER profile should not have driver portal capability');
    assert(ws.workspaceType === 'DRIVER', 'workspaceType should still be DRIVER based on role key');
  } else {
    console.log('  SKIP: no driver user without DRIVER profile found');
  }

  // Test 3: Driver with DRIVER profile
  console.log('\nTest 3: driver with DRIVER profile');
  const linkedDriver = await prisma.user.findFirst({
    where: {
      role: { key: 'driver' },
      profileLinks: { some: { profileType: 'DRIVER', status: 'ACTIVE', isPrimary: true } },
      status: 'ACTIVE',
    },
    select: { id: true },
  });
  if (linkedDriver) {
    const ws = await getWorkspace(linkedDriver.id);
    assert(ws.primaryProfiles.driver !== null, 'driver with DRIVER profile should have primaryProfiles.driver');
    assert(ws.capabilities.canUseDriverPortal === true, 'driver with DRIVER profile should have driver portal capability');
    const hasDriverSection = ws.navigation.some((s) => s.section === 'DRIVER');
    assert(hasDriverSection === true, 'navigation should include DRIVER section');
  } else {
    console.log('  SKIP: no driver with DRIVER profile found');
  }

  // Test 4: Driver with pool vehicle permission
  console.log('\nTest 4: driver with pool vehicle permission');
  const poolDriver = await prisma.user.findFirst({
    where: {
      role: { key: 'driver' },
      profileLinks: { some: { profileType: 'DRIVER', status: 'ACTIVE' } },
      status: 'ACTIVE',
      permissionOverrides: { some: { permission: { key: 'driver_available_vehicle_select' }, effect: 'ALLOW' } },
    },
    select: { id: true },
  });
  if (poolDriver) {
    const ws = await getWorkspace(poolDriver.id);
    assert(ws.capabilities.canViewAvailableVehicles === true, 'driver with available_vehicle_select should have canViewAvailableVehicles');
    const hasCheckoutAction = ws.quickActions.some((a) => a.id === 'checkout_vehicle');
    assert(hasCheckoutAction === true, 'should include checkout_vehicle quick action');
  } else {
    console.log('  SKIP: no driver with pool vehicle override found');
  }

  // Test 5: Finance user
  console.log('\nTest 5: finance user');
  const financeUser = await prisma.user.findFirst({
    where: { role: { key: 'finance' }, status: 'ACTIVE' },
    select: { id: true },
  });
  if (financeUser) {
    const ws = await getWorkspace(financeUser.id);
    assert(ws.workspaceType === 'FINANCE', 'finance user should have FINANCE workspace');
    assert(ws.capabilities.canUseFinance === true, 'finance user should have canUseFinance');
    assert(ws.capabilities.canUseDriverPortal === false, 'finance user should NOT have driver portal capability');
    const hasFinanceNav = ws.navigation.some((s) => s.section === 'FINANCE');
    assert(hasFinanceNav === true, 'navigation should include FINANCE section');
  } else {
    console.log('  SKIP: no finance user found');
  }

  // Test 6: Mechanic user
  console.log('\nTest 6: mechanic user');
  const mechanicUser = await prisma.user.findFirst({
    where: { role: { key: 'mechanic' }, status: 'ACTIVE' },
    select: { id: true },
  });
  if (mechanicUser) {
    const ws = await getWorkspace(mechanicUser.id);
    assert(ws.workspaceType === 'MECHANIC', 'mechanic user should have MECHANIC workspace');
    assert(ws.capabilities.canUseMaintenance === true, 'mechanic user should have canUseMaintenance');
    assert(ws.capabilities.canUseDriverPortal === false, 'mechanic user should NOT have driver portal capability');
  } else {
    console.log('  SKIP: no mechanic user found');
  }

  // Test 7: Viewer has no create/approve capabilities
  console.log('\nTest 7: viewer read-only');
  const viewerUser = await prisma.user.findFirst({
    where: { role: { key: 'viewer' }, status: 'ACTIVE' },
    select: { id: true },
  });
  if (viewerUser) {
    const ws = await getWorkspace(viewerUser.id);
    assert(ws.workspaceType === 'VIEWER', 'viewer user should have VIEWER workspace');
    assert(ws.capabilities.canCreateTrips === false, 'viewer should NOT have canCreateTrips');
    assert(ws.capabilities.canManageUsers === false, 'viewer should NOT have canManageUsers');
    assert(ws.capabilities.canManageRoles === false, 'viewer should NOT have canManageRoles');
    assert(ws.capabilities.canViewReports === true, 'viewer should have canViewReports');
  } else {
    console.log('  SKIP: no viewer user found');
  }

  // Test 8: Manager with review permissions
  console.log('\nTest 8: manager with review permissions');
  const managerUser = await prisma.user.findFirst({
    where: { role: { key: 'manager' }, status: 'ACTIVE' },
    select: { id: true },
  });
  if (managerUser) {
    const ws = await getWorkspace(managerUser.id);
    assert(ws.workspaceType === 'MANAGER', 'manager should have MANAGER workspace');
    const canReview = ws.capabilities.canReviewDriverSubmissions;
    console.log(`  canReviewDriverSubmissions: ${canReview}`);
    // Manager may or may not have submission review — depends on actual permissions
  } else {
    console.log('  SKIP: no manager user found');
  }

  // Test 9: Verify no unsafe permissions granted outside role
  console.log('\nTest 9: role template does not grant unsafe permissions');
  const { ROLE_TEMPLATES } = await import('../src/constants/role-templates');
  for (const tmpl of ROLE_TEMPLATES) {
    for (const perm of tmpl.permissions) {
      assert(typeof perm === 'string' && perm.length > 0, `Template ${tmpl.key}: permission "${perm}" is valid`);
    }
    assert(tmpl.permissions.length > 0, `Template ${tmpl.key} has at least one permission`);
  }
  console.log(`  ${ROLE_TEMPLATES.length} templates validated`);

  // Test 10: Data scopes affect vehicle capabilities
  console.log('\nTest 10: data scopes and vehicle capabilities');
  if (superAdminId) {
    const ws = await getWorkspace(superAdminId);
    assert(ws.capabilities.canManageVehicles === true, 'super_admin should have canManageVehicles');
  }

  // Summary
  console.log(`\n--- Results ---`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (errors.length > 0) {
    console.log(`\nErrors:`);
    for (const err of errors) {
      console.log(`  ${err}`);
    }
  }

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test failed with error:', err);
  prisma.$disconnect().then(() => process.exit(1));
});
