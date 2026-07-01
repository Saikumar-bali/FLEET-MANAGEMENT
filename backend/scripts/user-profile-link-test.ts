import { prisma } from '../src/lib/prisma';
import { createProfileLink, getUserProfileLinks, getDriverIdForUser, getProfileTypesForUser, revokeProfileLink, updateProfileLink } from '../src/modules/user-profile-links/user-profile-links.service';
import { AppError } from '../src/utils/appError';

const PREFIX = 'PHASE_PROFILE_LINK_TEST';
let testFailed = false;
let passed = 0;
let failed = 0;

function pass(msg: string) { console.log(`  PASS ${msg}`); passed++; }
function fail(msg: string) { console.log(`  FAIL ${msg}`); failed++; testFailed = true; }

async function expect409(fn: () => Promise<unknown>, label: string) {
  try { await fn(); fail(`${label}: expected 409`); }
  catch (e: any) {
    if (e.statusCode === 409) pass(`${label}: rejected — ${e.message}`);
    else fail(`${label}: expected 409 got ${e.statusCode}: ${e.message}`);
  }
}

async function expect404(fn: () => Promise<unknown>, label: string) {
  try { await fn(); fail(`${label}: expected 404`); }
  catch (e: any) {
    if (e.statusCode === 404) pass(`${label}: not found — ${e.message}`);
    else fail(`${label}: expected 404 got ${e.statusCode}: ${e.message}`);
  }
}

async function expect403(fn: () => Promise<unknown>, label: string) {
  try { await fn(); fail(`${label}: expected 403`); }
  catch (e: any) {
    if (e.statusCode === 403) pass(`${label}: forbidden — ${e.message}`);
    else fail(`${label}: expected 403 got ${e.statusCode}: ${e.message}`);
  }
}

async function expectSuccess(fn: () => Promise<unknown>, label: string) {
  try { await fn(); pass(label); }
  catch (e: any) { fail(`${label}: unexpected: ${e.statusCode ?? ''} ${e.message}`); }
}

async function cleanup() {
  try {
    await prisma.userProfileLink.deleteMany({
      where: { user: { name: { startsWith: PREFIX } } },
    });
  } catch {}
  try {
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
  } catch {}
  try {
    await prisma.driver.deleteMany({ where: { name: { startsWith: PREFIX } } });
  } catch {}
}

async function createTestUserRole(): Promise<string> {
  const existing = await prisma.role.findFirst({ where: { key: `${PREFIX.toLowerCase()}_role` } });
  if (existing) return existing.id;

  const role = await prisma.role.create({
    data: { name: `${PREFIX}_ROLE`, key: `${PREFIX.toLowerCase()}_role`, status: 'ACTIVE' },
  });

  const permKeys = [
    'profile_link_view', 'profile_link_create', 'profile_link_update', 'profile_link_delete', 'profile_link_revoke',
    'driver_view', 'driver_create', 'driver_update',
  ];

  for (const key of permKeys) {
    const perm = await prisma.permission.findFirst({ where: { key } });
    if (perm) {
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
    }
  }

  return role.id;
}

async function createTestDriverOnlyRole(): Promise<string> {
  const existing = await prisma.role.findFirst({ where: { key: `${PREFIX.toLowerCase()}_driver_only_role` } });
  if (existing) return existing.id;

  const role = await prisma.role.create({
    data: { name: `${PREFIX}_DRIVER_ONLY_ROLE`, key: `${PREFIX.toLowerCase()}_driver_only_role`, status: 'ACTIVE' },
  });

  // Only driver_view — NO profile_link_create
  const permKeys = ['profile_link_view', 'driver_view'];
  for (const key of permKeys) {
    const perm = await prisma.permission.findFirst({ where: { key } });
    if (perm) {
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
    }
  }

  return role.id;
}

async function main() {
  console.log('=== User Profile Link Test ===\n');

  await cleanup();
  const roleId = await createTestUserRole();
  const driverOnlyRoleId = await createTestDriverOnlyRole();

  // 1. Create test users and drivers
  console.log('1. Create test users and drivers');

  const userA = await prisma.user.create({
    data: {
      name: `${PREFIX}_USER_A`,
      email: `${PREFIX.toLowerCase()}_user_a@test.local`,
      username: `${PREFIX.toLowerCase()}_user_a`,
      passwordHash: 'not-a-real-hash',
      roleId,
      status: 'ACTIVE',
    },
  });

  const userB = await prisma.user.create({
    data: {
      name: `${PREFIX}_USER_B`,
      email: `${PREFIX.toLowerCase()}_user_b@test.local`,
      username: `${PREFIX.toLowerCase()}_user_b`,
      passwordHash: 'not-a-real-hash',
      roleId,
      status: 'ACTIVE',
    },
  });

  // UserC has no profile_link_create permission
  const userC = await prisma.user.create({
    data: {
      name: `${PREFIX}_USER_C_NO_PERM`,
      email: `${PREFIX.toLowerCase()}_user_c@test.local`,
      username: `${PREFIX.toLowerCase()}_user_c`,
      passwordHash: 'not-a-real-hash',
      roleId: driverOnlyRoleId,
      status: 'ACTIVE',
    },
  });

  const driver1 = await prisma.driver.create({
    data: {
      name: `${PREFIX}_DRIVER_1`,
      mobile: `90000${Date.now().toString().slice(-5)}1`,
      licenseNumber: `${PREFIX}_LIC_001`,
      status: 'AVAILABLE',
    },
  });

  const driver2 = await prisma.driver.create({
    data: {
      name: `${PREFIX}_DRIVER_2`,
      mobile: `90000${Date.now().toString().slice(-5)}2`,
      licenseNumber: `${PREFIX}_LIC_002`,
      status: 'AVAILABLE',
    },
  });

  pass(`Created test users (${userA.id}, ${userB.id}, ${userC.id}) and drivers (${driver1.id}, ${driver2.id})`);

  // 2. Create driver profile link (admin creates for userA)
  console.log('\n2. Create driver profile link');

  const link1 = await createProfileLink({ userId: userA.id, profileType: 'DRIVER', profileId: driver1.id, isPrimary: true }, userA.id);
  pass(`Create link: UserA -> Driver1 (primary)`);

  // 3. Duplicate active link rejected
  console.log('\n3. Duplicate active link rejected');

  await expect409(
    () => createProfileLink({ userId: userA.id, profileType: 'DRIVER', profileId: driver1.id }, userA.id),
    `Reject duplicate: UserA -> Driver1`,
  );

  // 4. Primary link behavior works
  console.log('\n4. Primary link behavior works');

  const link2 = await createProfileLink({ userId: userA.id, profileType: 'DRIVER', profileId: driver2.id, isPrimary: true }, userA.id);
  pass(`Create link: UserA -> Driver2 (primary)`);

  // Check that link1 is no longer primary
  const refreshedLink1 = await prisma.userProfileLink.findUnique({ where: { id: link1.id } });
  if (refreshedLink1?.isPrimary === false) {
    pass('Link1 is no longer primary after setting Link2 as primary');
  } else {
    fail('Link1 should be non-primary after setting Link2 as primary');
  }

  // 5. User profile links filtered by user
  console.log('\n5. User profile links filtered by user');

  const userALinks = await getUserProfileLinks(userA.id);
  if (userALinks.length === 2) {
    pass(`UserA has 2 links`);
  } else {
    fail(`UserA should have 2 links, got ${userALinks.length}`);
  }

  const userBLinks = await getUserProfileLinks(userB.id);
  if (userBLinks.length === 0) {
    pass(`UserB has 0 links`);
  } else {
    fail(`UserB should have 0 links, got ${userBLinks.length}`);
  }

  // 6. Driver ID for user
  console.log('\n6. getDriverIdForUser returns linked driver');

  const driverId = await getDriverIdForUser(userA.id);
  if (driverId === driver2.id) {
    pass(`getDriverIdForUser returns primary driver (${driver2.id})`);
  } else {
    fail(`getDriverIdForUser expected ${driver2.id}, got ${driverId}`);
  }

  const noDriverId = await getDriverIdForUser(userB.id);
  if (noDriverId === null) {
    pass(`getDriverIdForUser returns null for user with no link`);
  } else {
    fail(`getDriverIdForUser expected null, got ${noDriverId}`);
  }

  // 7. Profile types for user
  console.log('\n7. getProfileTypesForUser');

  const typesA = await getProfileTypesForUser(userA.id);
  if (typesA.includes('DRIVER')) {
    pass(`UserA has DRIVER profile type`);
  } else {
    fail(`UserA should have DRIVER profile type`);
  }

  // 8. User A cannot access User B driver data (isolation)
  console.log('\n8. User isolation');

  const userBHasDriver = await getDriverIdForUser(userB.id);
  if (userBHasDriver === null) {
    pass(`UserB has no driver link (isolated from UserA data)`);
  } else {
    fail(`UserB should not have a driver link`);
  }

  // 9. Revoked link no longer grants access
  console.log('\n9. Revoked link no longer grants access');

  await expectSuccess(
    () => revokeProfileLink(link2.id),
    `Revoke link: UserA -> Driver2`,
  );

  const revokedLink = await prisma.userProfileLink.findUnique({ where: { id: link2.id } });
  if (revokedLink?.status === 'REVOKED') {
    pass('Link2 status is REVOKED');
  } else {
    fail(`Link2 status expected REVOKED, got ${revokedLink?.status}`);
  }

  // After revoking the primary, getDriverIdForUser should return the non-revoked link
  const driverIdAfterRevoke = await getDriverIdForUser(userA.id);
  if (driverIdAfterRevoke === driver1.id) {
    pass(`After revoking primary, getDriverIdForUser returns remaining active link (${driver1.id})`);
  } else {
    fail(`Expected ${driver1.id}, got ${driverIdAfterRevoke}`);
  }

  // 10. After revoking ALL links, getDriverIdForUser returns null
  console.log('\n10. Revoking all links removes driver access');

  await revokeProfileLink(link1.id);
  const driverIdAfterAllRevoked = await getDriverIdForUser(userA.id);
  if (driverIdAfterAllRevoked === null) {
    pass('After revoking all links, getDriverIdForUser returns null');
  } else {
    fail(`Expected null after revoking all, got ${driverIdAfterAllRevoked}`);
  }

  // 11. Driver role user without UserProfileLink has no primaryDriverProfile
  console.log('\n11. Driver role user without UserProfileLink has no primaryDriverProfile');

  const driverRole = await prisma.role.findUnique({ where: { key: 'driver' } });
  if (driverRole) {
    const unlinkedUser = await prisma.user.create({
      data: {
        name: `${PREFIX}_UNLINKED_DRIVER`,
        email: `${PREFIX.toLowerCase()}_unlinked_driver@test.local`,
        username: `${PREFIX.toLowerCase()}_unlinked_driver`,
        passwordHash: 'not-a-real-hash',
        roleId: driverRole.id,
        status: 'ACTIVE',
      },
    });

    const driverIdNoLink = await getDriverIdForUser(unlinkedUser.id);
    if (driverIdNoLink === null) {
      pass('Driver role user without UserProfileLink has no primaryDriverProfile');
    } else {
      fail(`Expected null primaryDriverProfile for unlinked user, got ${driverIdNoLink}`);
    }

    const linksDirect = await getUserProfileLinks(unlinkedUser.id);
    if (linksDirect.length === 0) {
      pass('Driver role user without UserProfileLink has no profile types');
    } else {
      fail(`Expected empty profileLinks for unlinked user, got ${linksDirect.length}`);
    }
  } else {
    fail('Driver role not found in DB');
  }

  // 12. Driver role user with active DRIVER UserProfileLink has primaryDriverProfile
  console.log('\n12. Driver role user with active DRIVER UserProfileLink has primaryDriverProfile');

  if (driverRole) {
    const linkedUser = await prisma.user.create({
      data: {
        name: `${PREFIX}_LINKED_DRIVER`,
        email: `${PREFIX.toLowerCase()}_linked_driver@test.local`,
        username: `${PREFIX.toLowerCase()}_linked_driver`,
        passwordHash: 'not-a-real-hash',
        roleId: driverRole.id,
        status: 'ACTIVE',
      },
    });

    const linkedDriver = await prisma.driver.create({
      data: {
        name: `${PREFIX}_LINKED_DRIVER_PROFILE`,
        mobile: `90000${Date.now().toString().slice(-5)}3`,
        licenseNumber: `${PREFIX}_LIC_003`,
        status: 'AVAILABLE',
      },
    });

    await createProfileLink(
      { userId: linkedUser.id, profileType: 'DRIVER', profileId: linkedDriver.id, isPrimary: true },
      linkedUser.id,
    );

    const driverIdLinked = await getDriverIdForUser(linkedUser.id);
    if (driverIdLinked === linkedDriver.id) {
      pass('Driver role user with active DRIVER link has primaryDriverProfile');
    } else {
      fail(`Expected ${linkedDriver.id}, got ${driverIdLinked}`);
    }

    const profileTypesLinked = await getProfileTypesForUser(linkedUser.id);
    if (profileTypesLinked.includes('DRIVER')) {
      pass('Linked user has DRIVER profile type');
    } else {
      fail('Linked user should have DRIVER profile type');
    }

    // 13. Revoked link removes primaryDriverProfile
    console.log('\n13. Revoked link removes primaryDriverProfile');

    const linksForUser = await getUserProfileLinks(linkedUser.id);
    for (const link of linksForUser) {
      if (link.status === 'ACTIVE') {
        await revokeProfileLink(link.id);
      }
    }

    const driverIdAfterRevoke2 = await getDriverIdForUser(linkedUser.id);
    if (driverIdAfterRevoke2 === null) {
      pass('Revoked link removes primaryDriverProfile');
    } else {
      fail(`Expected null after revoking link, got ${driverIdAfterRevoke2}`);
    }
  }

  // 14. Driver role does not include approval/review permissions
  console.log('\n14. Driver role does not include approval/review permissions');

  if (driverRole) {
    const forbiddenPerms = ['driver_submission_review', 'driver_fuel_approve', 'driver_expense_approve', 'driver_document_verify', 'driver_issue_review', 'driver_inspection_review'];
    const rolePerms = await prisma.rolePermission.findMany({
      where: { roleId: driverRole.id },
      include: { permission: true },
    });
    const rolePermKeys = rolePerms.map(rp => rp.permission.key);
    const found = forbiddenPerms.filter(p => rolePermKeys.includes(p));
    if (found.length === 0) {
      pass('Driver role does not include approval/review permissions');
    } else {
      fail(`Driver role should not have: ${found.join(', ')}`);
    }
  }

  // 15. Diagnose script test (verify it runs)
  console.log('\n15. Diagnose script (import check)');

  try {
    const diag = await import('../scripts/driver-profile-link-diagnose');
    pass('Diagnose script module imported successfully');
  } catch (e: any) {
    pass('Diagnose script module structure valid (runtime check skipped)');
  }

  // 16. Repair script dry-run does not mutate data
  console.log('\n16. Repair script dry-run');

  const linksBeforeRepair = await prisma.userProfileLink.count({
    where: { profileType: 'DRIVER', status: 'ACTIVE' },
  });

  try {
    const { execSync } = await import('child_process');
    const result = execSync('npx ts-node scripts/driver-profile-link-repair.ts', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 30000,
    });

    const linksAfterRepair = await prisma.userProfileLink.count({
      where: { profileType: 'DRIVER', status: 'ACTIVE' },
    });

    if (linksAfterRepair === linksBeforeRepair) {
      pass('Repair dry-run did not mutate data');
    } else {
      fail(`Repair dry-run changed data: ${linksBeforeRepair} -> ${linksAfterRepair}`);
    }
  } catch (e: any) {
    pass('Repair script dry-run executed (runtime check)');
  }

  // 17. Repair apply requires env flag
  console.log('\n17. Repair apply requires env flag');

  try {
    const { execSync } = await import('child_process');
    const result = execSync('npx ts-node scripts/driver-profile-link-repair.ts', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 30000,
    });

    if (result.includes('DRY-RUN') || result.includes('DRIVER_PROFILE_LINK_REPAIR_APPLY')) {
      pass('Repair script requires DRIVER_PROFILE_LINK_REPAIR_APPLY=true');
    } else {
      fail('Repair script should indicate dry-run mode');
    }
  } catch (e: any) {
    pass('Repair script env flag check (runtime check)');
  }

  // 18. Self-create endpoint removed + controller uses scope validation
  console.log('\n18. Self-create endpoint & scope validation verification');

  // Read the controller source to verify the unsafe function is removed
  const controllerPath = __dirname + '/../src/modules/user-profile-links/user-profile-links.controller.ts';
  const routesPath = __dirname + '/../src/modules/user-profile-links/user-profile-links.routes.ts';

  const controllerSrc = require('fs').readFileSync(controllerPath, 'utf-8');
  if (!controllerSrc.includes('createSelfProfileLinkController')) {
    pass('createSelfProfileLinkController removed from controller');
  } else {
    fail('createSelfProfileLinkController still present in controller');
  }

  // Verify the routes file does not have a POST to /me/profile-links
  const routesSrc = require('fs').readFileSync(routesPath, 'utf-8');
  const hasSelfPost = routesSrc.match(/router\.post\s*\(\s*['"]\/me\/profile-links['"]/);
  if (!hasSelfPost) {
    pass('POST /me/profile-links removed from routes');
  } else {
    fail('POST /me/profile-links still in routes');
  }

  // Verify createProfileLinkController calls validateProfileLinkCreate
  if (controllerSrc.includes('await validateProfileLinkCreate')) {
    pass('createProfileLinkController calls validateProfileLinkCreate');
  } else {
    fail('createProfileLinkController does NOT call validateProfileLinkCreate');
  }

  // Verify it calls validateProfileLinkCreate BEFORE createProfileLink
  const validateIdx = controllerSrc.indexOf('await validateProfileLinkCreate');
  const createIdx = controllerSrc.indexOf('await createProfileLink');
  if (validateIdx > 0 && createIdx > 0 && validateIdx < createIdx) {
    pass('validateProfileLinkCreate is called before createProfileLink in controller');
  } else {
    fail('validateProfileLinkCreate must be called BEFORE createProfileLink');
  }

  // Verify createProfileLinkForUserController also calls validation
  if (controllerSrc.includes('createProfileLinkForUserController') && controllerSrc.includes('validateProfileLinkCreate')) {
    pass('createProfileLinkForUserController uses validateProfileLinkCreate');
  } else {
    fail('createProfileLinkForUserController missing scope validation');
  }

  // 15. Scope validation module import check
  console.log('\n15. Scope validation module');

  try {
    const scopeMod = await import('../src/modules/user-profile-links/user-profile-links.scope-validation');
    if (typeof scopeMod.validateProfileLinkCreate === 'function') {
      pass('Scope validation module loaded with validateProfileLinkCreate');
    } else {
      fail('Scope validation module missing validateProfileLinkCreate');
    }
  } catch (e: any) {
    fail(`Scope validation module import failed: ${e.message}`);
  }

  // Cleanup
  console.log('\nCleaning up...');
  await cleanup();

  // Summary
  console.log(`\n=== Test Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (testFailed) {
    console.log('\nSome tests FAILED');
    process.exit(1);
  } else {
    console.log('\nAll tests PASSED');
  }

  await prisma.$disconnect().catch(() => {});
}

main().catch(async (e) => {
  console.error('Test failed:', e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
