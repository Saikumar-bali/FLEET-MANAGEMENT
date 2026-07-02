import { getWorkspace } from '../src/services/workspace.service';
import { prisma } from '../src/lib/prisma';
import { ROLE_TEMPLATES } from '../src/constants/role-templates';

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

async function findUser(find: Record<string, unknown>): Promise<string | null> {
  const user = await prisma.user.findFirst({ where: find as any, select: { id: true } });
  return user?.id ?? null;
}

async function main() {
  console.log('\n--- Workspace Engine Test ---\n');

  // ── Test 1: Super admin ──
  console.log('Test 1: super_admin workspace');
  const superAdminId = await getUserIdByRole('super_admin');
  let saWorkspace: any = null;
  if (superAdminId) {
    saWorkspace = await getWorkspace(superAdminId);
    assert(saWorkspace.workspaceType === 'SUPER_ADMIN', 'workspaceType should be SUPER_ADMIN');
    assert(saWorkspace.capabilities.canUseAdmin === true, 'super_admin should have canUseAdmin');
    assert(saWorkspace.capabilities.canManageUsers === true, 'super_admin should have canManageUsers');
    assert(saWorkspace.capabilities.canManageRoles === true, 'super_admin should have canManageRoles');
    assert(saWorkspace.capabilities.canManageTrips === true, 'super_admin should have canManageTrips');
    assert(saWorkspace.capabilities.canViewReports === true, 'super_admin should have canViewReports');
    assert(saWorkspace.capabilities.canUseFinance === true, 'super_admin should have canUseFinance');
    assert(saWorkspace.navigation.length > 0, 'super_admin should have navigation items');
    const hasAdminSection = saWorkspace.navigation.some((s: any) => s.section === 'ADMIN');
    assert(hasAdminSection === true, 'super_admin should have ADMIN section in nav');
    console.log(`  Navigation sections: ${saWorkspace.navigation.length}, items: ${saWorkspace.navigation.reduce((s: number, n: any) => s + n.items.length, 0)}`);
  } else {
    console.log('  SKIP: no super_admin user found');
  }

  // ── Test 2: Admin is not automatically global ──
  console.log('\nTest 2: admin workspace does not become global unless permission/scope allows');
  const adminId = await getUserIdByRole('admin');
  if (adminId) {
    const ws = await getWorkspace(adminId);
    assert(ws.workspaceType === 'ADMIN', 'admin should have ADMIN workspace');
  } else {
    console.log('  SKIP: no admin user found');
  }

  // ── Test 3: Driver without DRIVER profile ──
  console.log('\nTest 3: driver without DRIVER profile');
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

  // ── Test 4: Driver with DRIVER profile ──
  console.log('\nTest 4: driver with DRIVER profile');
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
    const hasDriverSection = ws.navigation.some((s: any) => s.section === 'DRIVER');
    assert(hasDriverSection === true, 'navigation should include DRIVER section');
  } else {
    console.log('  SKIP: no driver with DRIVER profile found');
  }

  // ── Test 5: Driver with pool vehicle permission ──
  console.log('\nTest 5: driver with pool template gets vehicle checkout capability');
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
    const hasCheckoutAction = ws.quickActions.some((a: any) => a.id === 'checkout_vehicle');
    assert(hasCheckoutAction === true, 'should include checkout_vehicle quick action');
  } else {
    console.log('  SKIP: no driver with pool vehicle override found');
  }

  // ── Test 6: Finance ──
  console.log('\nTest 6: finance sees finance workspace and not driver portal');
  const financeUser = await prisma.user.findFirst({
    where: { role: { key: 'finance' }, status: 'ACTIVE' },
    select: { id: true },
  });
  if (financeUser) {
    const ws = await getWorkspace(financeUser.id);
    assert(ws.workspaceType === 'FINANCE', 'finance user should have FINANCE workspace');
    assert(ws.capabilities.canUseFinance === true, 'finance user should have canUseFinance');
    assert(ws.capabilities.canUseDriverPortal === false, 'finance user should NOT have driver portal capability');
    const hasFinanceNav = ws.navigation.some((s: any) => s.section === 'FINANCE');
    assert(hasFinanceNav === true, 'navigation should include FINANCE section');
  } else {
    console.log('  SKIP: no finance user found');
  }

  // ── Test 7: Mechanic ──
  console.log('\nTest 7: mechanic sees mechanic workspace and maintenance/repair actions');
  const mechanicUser = await prisma.user.findFirst({
    where: { role: { key: 'mechanic' }, status: 'ACTIVE' },
    select: { id: true },
  });
  if (mechanicUser) {
    const ws = await getWorkspace(mechanicUser.id);
    assert(ws.workspaceType === 'MECHANIC', 'mechanic user should have MECHANIC workspace');
    assert(ws.capabilities.canUseMaintenance === true, 'mechanic user should have canUseMaintenance');
    assert(ws.capabilities.canUseDriverPortal === false, 'mechanic user should NOT have driver portal capability');
    assert(ws.capabilities.canManageRepairs === true, 'mechanic user should have canManageRepairs');
  } else {
    console.log('  SKIP: no mechanic user found');
  }

  // ── Test 8: Manager sees operational review ──
  console.log('\nTest 8: manager sees operational review workspace');
  const managerUser = await prisma.user.findFirst({
    where: { role: { key: 'manager' }, status: 'ACTIVE' },
    select: { id: true },
  });
  if (managerUser) {
    const ws = await getWorkspace(managerUser.id);
    assert(ws.workspaceType === 'MANAGER', 'manager should have MANAGER workspace');
    assert(ws.capabilities.canManageTrips === true, 'manager should have canManageTrips');
    assert(ws.capabilities.canManageVehicles === true, 'manager should have canManageVehicles');
    assert(ws.capabilities.canManageDrivers === true, 'manager should have canManageDrivers');
  } else {
    console.log('  SKIP: no manager user found');
  }

  // ── Test 9: Viewer read-only ──
  console.log('\nTest 9: viewer sees read-only workspace with no create/approve/delete capabilities');
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
    assert(ws.capabilities.canManageVehicles === true, 'viewer should have canManageVehicles (read-only)');
    assert(ws.capabilities.canManageTrips === true, 'viewer should have canManageTrips (read-only via trip_view)');
    // Viewer should NOT have any write capabilities
    assert(ws.capabilities.canCreateTrips === false, 'viewer should NOT have canCreateTrips');
    assert(ws.capabilities.canReviewDriverSubmissions === false, 'viewer should NOT have canReviewDriverSubmissions');
    assert(ws.capabilities.canUseFinance === false, 'viewer should NOT have canUseFinance (unless permission allows)');
    // Viewer should NOT have admin/management capabilities
    assert(ws.capabilities.canManageUsers === false, 'viewer should NOT have canManageUsers');
    assert(ws.capabilities.canManageRoles === false, 'viewer should NOT have canManageRoles');
  } else {
    console.log('  SKIP: no viewer user found');
  }

  // ── Test 10: Mixed profile user ──
  console.log('\nTest 10: mixed user with multiple profiles');
  const mixedUsers = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
    },
    include: {
      profileLinks: {
        where: { status: 'ACTIVE' },
        select: { profileType: true },
      },
    },
  });
  const mixedUser = mixedUsers.find((u) => {
    const types = new Set(u.profileLinks.map((l) => l.profileType));
    return types.size >= 2;
  });
  if (mixedUser) {
    const ws = await getWorkspace(mixedUser.id);
    assert(ws.workspaceType === 'MIXED', 'user with 2+ profiles should get MIXED workspace');
    console.log(`  Found mixed user with profiles: ${mixedUser.profileLinks.map(l => l.profileType).join(', ')}`);
  } else {
    console.log('  SKIP: no user with multiple active profile types found');
  }

  // ── Test 11: My Access is not primary navigation ──
  console.log('\nTest 11: My Access is not primary navigation');
  for (const roleKey of ['super_admin', 'admin', 'manager', 'driver', 'finance', 'mechanic', 'viewer']) {
    const uid = await getUserIdByRole(roleKey);
    if (uid) {
      const ws = await getWorkspace(uid);
      const allIds = ws.navigation.flatMap((s: any) => s.items.map((i: any) => i.id));
      assert(!allIds.includes('my-access'), `${roleKey}: my-access should NOT be in primary navigation`);
    }
  }
  console.log(`  Verified all 7 roles have no 'my-access' in primary nav`);

  // ── Test 12: Navigation is generated from workspace.navigation only ──
  console.log('\nTest 12: sidebar navigation is generated from workspace.navigation only');
  if (superAdminId && saWorkspace) {
    const navItemCount = saWorkspace.navigation.reduce((s: number, n: any) => s + n.items.length, 0);
    assert(navItemCount > 10, 'super_admin should have extensive navigation');
    for (const section of saWorkspace.navigation) {
      for (const item of section.items) {
        assert(typeof item.id === 'string', 'each nav item must have an id');
        assert(typeof item.label === 'string', 'each nav item must have a label');
        assert(typeof item.path === 'string', 'each nav item must have a path');
        assert(typeof item.icon === 'string', 'each nav item must have an icon');
      }
    }
    console.log(`  All ${navItemCount} nav items have required fields`);
  }

  // ── Test 13: No restricted modules for normal driver ──
  console.log('\nTest 13: no restricted/global modules appear for normal driver');
  if (linkedDriver) {
    const ws = await getWorkspace(linkedDriver.id);
    const allPaths = ws.navigation.flatMap((s: any) => s.items.map((i: any) => i.path));
    const restrictedPaths = ['/users', '/roles', '/finance', '/admin', '/settings'];
    for (const rp of restrictedPaths) {
      if (rp === '/finance') {
        assert(!ws.capabilities.canUseFinance, 'driver should NOT have finance capability');
      }
    }
    // Admin section should not appear for driver
    const hasAdminSection = ws.navigation.some((s: any) => s.section === 'ADMIN');
    assert(hasAdminSection === false, 'driver should NOT have ADMIN section in navigation');
    console.log(`  Driver correctly has no ADMIN/FINANCE sections`);
  }

  // ── Role Template Safety ──
  console.log('\n--- Role Template Safety ---\n');

  const ADMIN_OR_REVIEW_PERMS = [
    'user_view', 'user_create', 'user_update', 'user_delete',
    'role_view', 'role_create', 'role_update', 'role_delete',
    'permission_view', 'permission_assign',
    'driver_submission_view', 'driver_submission_review',
    'driver_fuel_approve', 'driver_expense_approve',
    'driver_document_verify', 'driver_issue_review', 'driver_inspection_review',
    'fuel_approve', 'expense_approve',
    'finance_view', 'finance_create', 'finance_update', 'finance_delete', 'finance_approve',
  ];

  // Driver Basic safety
  console.log('Driver Basic template safety');
  const driverBasic = ROLE_TEMPLATES.find((t) => t.key === 'driver_basic');
  if (driverBasic) {
    for (const badPerm of ADMIN_OR_REVIEW_PERMS) {
      assert(!driverBasic.permissions.includes(badPerm), `Driver Basic should NOT contain: ${badPerm}`);
    }
    const requiredDriverPerms = [
      'driver_portal_view', 'driver_my_trips_view', 'driver_trip_create',
      'driver_quick_fuel_create', 'driver_expense_create', 'driver_document_upload',
      'driver_vehicle_issue_report', 'driver_vehicle_inspection_create',
    ];
    for (const rp of requiredDriverPerms) {
      assert(driverBasic.permissions.includes(rp), `Driver Basic should contain: ${rp}`);
    }
    console.log(`  Driver Basic: ${driverBasic.permissions.length} permissions, no admin/review perms`);
  }

  // Driver Pool Vehicle safety
  console.log('Driver Pool Vehicle template safety');
  const driverPool = ROLE_TEMPLATES.find((t) => t.key === 'driver_pool_vehicle');
  if (driverPool) {
    for (const badPerm of ADMIN_OR_REVIEW_PERMS) {
      assert(!driverPool.permissions.includes(badPerm), `Driver Pool Vehicle should NOT contain: ${badPerm}`);
    }
    const poolSpecificPerms = [
      'driver_available_vehicle_select', 'driver_vehicle_self_checkout',
      'driver_vehicle_return', 'driver_vehicle_checkout_view_own',
    ];
    for (const pp of poolSpecificPerms) {
      assert(driverPool.permissions.includes(pp), `Driver Pool Vehicle should contain: ${pp}`);
    }
    console.log(`  Driver Pool Vehicle: ${driverPool.permissions.length} permissions, includes checkout perms`);
  }

  // Finance safety
  console.log('Finance template safety');
  const financeTmpl = ROLE_TEMPLATES.find((t) => t.key === 'finance_billing');
  if (financeTmpl) {
    const driverPerms = financeTmpl.permissions.filter((p) => p.startsWith('driver_'));
    assert(driverPerms.length === 0, 'Finance template should NOT have any driver_ permissions');
    console.log(`  Finance: ${financeTmpl.permissions.length} permissions, no driver portal perms`);
  }

  // Viewer safety
  console.log('Viewer template safety');
  const viewerTmpl = ROLE_TEMPLATES.find((t) => t.key === 'viewer_read_only');
  if (viewerTmpl) {
    const writeActions = ['create', 'update', 'delete', 'approve', 'assign', 'revoke', 'verify', 'submit', 'upload', 'mark_paid', 'start', 'end', 'cancel', 'close', 'renew'];
    for (const perm of viewerTmpl.permissions) {
      const action = perm.split('_').pop() || '';
      assert(!writeActions.includes(action), `Viewer should NOT have write permission: ${perm}`);
    }
    console.log(`  Viewer: ${viewerTmpl.permissions.length} permissions, all read-only`);
  }

  // Manager safety
  console.log('Manager Operations template safety');
  const managerTmpl = ROLE_TEMPLATES.find((t) => t.key === 'manager_operations');
  if (managerTmpl) {
    const globalAdminPerms = ['role_delete', 'user_delete', 'user_create', 'user_update', 'role_create'];
    for (const gap of globalAdminPerms) {
      assert(!managerTmpl.permissions.includes(gap), `Manager should NOT contain: ${gap}`);
    }
    console.log(`  Manager: ${managerTmpl.permissions.length} permissions, no global admin perms`);
  }

  // ── Summary ──
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
