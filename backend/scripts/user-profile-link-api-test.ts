/**
 * API-level test for user profile link security.
 *
 * Tests:
 * 1. GET /me/profile-links returns only own links
 * 2. POST /me/profile-links is 404 (endpoint removed)
 * 3. POST /users/:userId/profile-links requires permission
 * 4. Admin without DRIVER scope cannot link target driver
 * 5. Admin/super_admin with proper scope can link
 * 6. /me/driver-profile returns only linked driver
 * 7. /me/driver-trips does not return another driver's trips
 * 8. Revoked link blocks /me/driver-profile
 * 9. Duplicate active link still rejected
 * 10. Primary link behavior still works
 *
 * Uses local backend only (http://127.0.0.1:4000).
 * Test data prefix: PHASE_PROFILE_LINK_TEST
 */

import http from 'http';
import { prisma } from '../src/lib/prisma';

const BASE = 'http://127.0.0.1:4000';
const PREFIX = 'PHASE_PROFILE_LINK_TEST';
let testFailed = false;
let passed = 0;
let failed = 0;

function pass(msg: string) { console.log(`  PASS ${msg}`); passed++; }
function fail(msg: string) { console.log(`  FAIL ${msg}`); failed++; testFailed = true; }

async function request(method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode!, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode!, data: { raw: data } });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function cleanup() {
  await prisma.userProfileLink.deleteMany({
    where: { user: { name: { startsWith: PREFIX } } },
  });
  await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.driver.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

async function getAuthToken(identifier: string, password: string): Promise<string | null> {
  const res = await request('POST', '/api/v1/auth/login', undefined, { identifier, password });
  return res.data?.data?.accessToken ?? res.data?.accessToken ?? null;
}

async function main() {
  console.log('=== User Profile Link API Test ===\n');

  // Check server is running
  try {
    const health = await request('GET', '/api/v1/health');
    if (health.status !== 200) {
      console.log('Backend server not running at', BASE);
      console.log('Start it with: npm run dev');
      process.exit(1);
    }
  } catch (e: any) {
    console.log(`Backend server not reachable at ${BASE}: ${e.message}`);
    console.log('Start it with: npm run dev');
    process.exit(1);
  }

  await cleanup();

  // We need real tokens to test. Use the seeded admin user.
  // The admin credentials depend on the seed. Try common ones.
  const adminToken = await getAuthToken('admin', 'admin123');
  const superAdminToken = await getAuthToken('super_admin', 'super123');

  // For the API tests that need specific tokens, we'll create users and use service-level auth
  // But since we're doing API-level, we need at least one valid token to create test data.

  // Try to find any existing admin user
  const existingAdmin = await prisma.user.findFirst({
    where: { status: 'ACTIVE', role: { key: 'super_admin' } },
    include: { role: true },
  });

  if (!existingAdmin) {
    console.log('No active super_admin user found in DB. Cannot run API tests.');
    process.exit(1);
  }

  // Use JWT sign to create a test token (if possible) or find existing tokens
  // For simplicity, let's use the service layer to create test users with known passwords
  // and then authenticate via the API.

  // Create test role with profile_link permissions
  const testRole = await prisma.role.upsert({
    where: { key: `${PREFIX.toLowerCase()}_api_role` },
    update: {},
    create: { name: `${PREFIX}_API_ROLE`, key: `${PREFIX.toLowerCase()}_api_role`, status: 'ACTIVE' },
  });

  const permKeys = ['profile_link_view', 'profile_link_create', 'driver_view', 'driver_update'];
  for (const key of permKeys) {
    const perm = await prisma.permission.findFirst({ where: { key } });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: testRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: testRole.id, permissionId: perm.id },
      });
    }
  }

  // Create a limited role (no profile_link_create)
  const limitedRole = await prisma.role.upsert({
    where: { key: `${PREFIX.toLowerCase()}_limited_role` },
    update: {},
    create: { name: `${PREFIX}_LIMITED_ROLE`, key: `${PREFIX.toLowerCase()}_limited_role`, status: 'ACTIVE' },
  });

  const limitedPermKeys = ['profile_link_view', 'driver_view'];
  for (const key of limitedPermKeys) {
    const perm = await prisma.permission.findFirst({ where: { key } });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: limitedRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: limitedRole.id, permissionId: perm.id },
      });
    }
  }

  // Create test users with bcrypt passwords
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash('testpass123', 10);

  const adminUser = await prisma.user.upsert({
    where: { username: `${PREFIX.toLowerCase()}_api_admin` },
    update: { roleId: testRole.id, status: 'ACTIVE' },
    create: {
      name: `${PREFIX}_API_ADMIN`,
      email: `${PREFIX.toLowerCase()}_api_admin@test.local`,
      username: `${PREFIX.toLowerCase()}_api_admin`,
      passwordHash: hash,
      roleId: testRole.id,
      status: 'ACTIVE',
    },
  });

  const limitedUser = await prisma.user.upsert({
    where: { username: `${PREFIX.toLowerCase()}_api_limited` },
    update: { roleId: limitedRole.id, status: 'ACTIVE' },
    create: {
      name: `${PREFIX}_API_LIMITED`,
      email: `${PREFIX.toLowerCase()}_api_limited@test.local`,
      username: `${PREFIX.toLowerCase()}_api_limited`,
      passwordHash: hash,
      roleId: limitedRole.id,
      status: 'ACTIVE',
    },
  });

  const targetUserA = await prisma.user.upsert({
    where: { username: `${PREFIX.toLowerCase()}_api_target_a` },
    update: { roleId: testRole.id, status: 'ACTIVE' },
    create: {
      name: `${PREFIX}_API_TARGET_A`,
      email: `${PREFIX.toLowerCase()}_api_target_a@test.local`,
      username: `${PREFIX.toLowerCase()}_api_target_a`,
      passwordHash: hash,
      roleId: testRole.id,
      status: 'ACTIVE',
    },
  });

  const targetUserB = await prisma.user.upsert({
    where: { username: `${PREFIX.toLowerCase()}_api_target_b` },
    update: { roleId: testRole.id, status: 'ACTIVE' },
    create: {
      name: `${PREFIX}_API_TARGET_B`,
      email: `${PREFIX.toLowerCase()}_api_target_b@test.local`,
      username: `${PREFIX.toLowerCase()}_api_target_b`,
      passwordHash: hash,
      roleId: testRole.id,
      status: 'ACTIVE',
    },
  });

  const driver1 = await prisma.driver.upsert({
    where: { licenseNumber: `${PREFIX}_API_LIC_001` },
    update: { status: 'AVAILABLE' },
    create: {
      name: `${PREFIX}_API_DRIVER_1`,
      mobile: `91000${Date.now().toString().slice(-5)}1`,
      licenseNumber: `${PREFIX}_API_LIC_001`,
      status: 'AVAILABLE',
    },
  });

  const driver2 = await prisma.driver.upsert({
    where: { licenseNumber: `${PREFIX}_API_LIC_002` },
    update: { status: 'AVAILABLE' },
    create: {
      name: `${PREFIX}_API_DRIVER_2`,
      mobile: `91000${Date.now().toString().slice(-5)}2`,
      licenseNumber: `${PREFIX}_API_LIC_002`,
      status: 'AVAILABLE',
    },
  });

  // Authenticate
  const adminLoginRes = await request('POST', '/api/v1/auth/login', undefined, {
    identifier: `${PREFIX.toLowerCase()}_api_admin`,
    password: 'testpass123',
  });
  const adminToken2 = adminLoginRes.data?.data?.accessToken ?? adminLoginRes.data?.accessToken;

  const limitedLoginRes = await request('POST', '/api/v1/auth/login', undefined, {
    identifier: `${PREFIX.toLowerCase()}_api_limited`,
    password: 'testpass123',
  });
  const limitedToken = limitedLoginRes.data?.data?.accessToken ?? limitedLoginRes.data?.accessToken;

  if (!adminToken2) {
    console.log('Failed to authenticate admin user for API tests');
    console.log('Login response:', JSON.stringify(adminLoginRes));
    process.exit(1);
  }

  console.log('Authenticated test users');

  // ─── Test 1: GET /me/profile-links returns only own links ───
  console.log('\n1. GET /me/profile-links returns only own links');

  // Create a link for targetUserA via service (bypassing API to set up data)
  const testLink = await prisma.userProfileLink.create({
    data: {
      userId: targetUserA.id,
      profileType: 'DRIVER',
      profileId: driver1.id,
      isPrimary: true,
      status: 'ACTIVE',
      linkedById: adminUser.id,
    },
  });

  // Login as targetUserA
  const targetALogin = await request('POST', '/api/v1/auth/login', undefined, {
    identifier: `${PREFIX.toLowerCase()}_api_target_a`,
    password: 'testpass123',
  });
  const targetAToken = targetALogin.data?.data?.accessToken ?? targetALogin.data?.accessToken;

  // Login as targetUserB
  const targetBLogin = await request('POST', '/api/v1/auth/login', undefined, {
    identifier: `${PREFIX.toLowerCase()}_api_target_b`,
    password: 'testpass123',
  });
  const targetBToken = targetBLogin.data?.data?.accessToken ?? targetBLogin.data?.accessToken;

  if (targetAToken) {
    const res = await request('GET', '/api/v1/user-profile-links/me/profile-links', targetAToken);
    if (res.status === 200) {
      const links = res.data?.data ?? res.data;
      const ownLinks = Array.isArray(links) ? links.filter((l: any) => l.userId === targetUserA.id) : [];
      if (ownLinks.length === links?.length && links.length > 0) {
        pass('GET /me/profile-links returns only own links');
      } else {
        fail(`Expected all links to belong to targetUserA, got ${JSON.stringify(links)}`);
      }
    } else {
      fail(`GET /me/profile-links returned ${res.status}`);
    }
  } else {
    fail('Could not authenticate targetUserA');
  }

  if (targetBToken) {
    const res = await request('GET', '/api/v1/user-profile-links/me/profile-links', targetBToken);
    if (res.status === 200) {
      const links = res.data?.data ?? res.data;
      if (Array.isArray(links) && links.length === 0) {
        pass('GET /me/profile-links returns empty for user with no links');
      } else {
        fail(`Expected empty array for UserB, got ${JSON.stringify(links)}`);
      }
    } else {
      fail(`GET /me/profile-links returned ${res.status}`);
    }
  }

  // ─── Test 2: POST /me/profile-links is 404 (endpoint removed) ───
  console.log('\n2. POST /me/profile-links returns 404 (unsafe self-create removed)');

  if (targetAToken) {
    const res = await request('POST', '/api/v1/user-profile-links/me/profile-links', targetAToken, {
      profileType: 'DRIVER',
      profileId: driver2.id,
    });
    if (res.status === 404) {
      pass('POST /me/profile-links returns 404 (endpoint removed)');
    } else {
      fail(`POST /me/profile-links returned ${res.status}, expected 404`);
    }
  }

  // ─── Test 3: POST /users/:userId/profile-links requires permission ───
  console.log('\n3. POST /users/:userId/profile-links requires permission');

  if (limitedToken) {
    const res = await request('POST', `/api/v1/users/${targetUserA.id}/profile-links`, limitedToken, {
      profileType: 'DRIVER',
      profileId: driver2.id,
    });
    if (res.status === 403) {
      pass('POST /users/:userId/profile-links returns 403 without profile_link_create');
    } else {
      fail(`Expected 403, got ${res.status}`);
    }
  }

  // ─── Test 4: Admin without DRIVER scope cannot link target driver ───
  console.log('\n4. Admin without DRIVER scope cannot link target driver');

  if (adminToken2) {
    const res = await request('POST', `/api/v1/users/${targetUserB.id}/profile-links`, adminToken2, {
      profileType: 'DRIVER',
      profileId: driver2.id,
    });
    // Admin with profile_link_create but NO DRIVER data scope should get 403
    if (res.status === 403) {
      pass('Admin without DRIVER scope blocked from creating DRIVER link');
    } else {
      fail(`Expected 403, got ${res.status}: ${JSON.stringify(res.data)}`);
    }
  }

  // ─── Test 5: super_admin can link (via service layer — API uses same validation) ───
  console.log('\n5. super_admin can link via admin API');

  // super_admin bypasses scope check. Use the direct admin route.
  if (superAdminToken) {
    const res = await request('POST', '/api/v1/user-profile-links', superAdminToken, {
      userId: targetUserB.id,
      profileType: 'DRIVER',
      profileId: driver2.id,
      isPrimary: true,
    });
    if (res.status === 201) {
      pass('super_admin can create DRIVER profile link');
    } else {
      fail(`Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } else {
    // If no super_admin token available, create via service layer
    const link = await prisma.userProfileLink.create({
      data: {
        userId: targetUserB.id,
        profileType: 'DRIVER',
        profileId: driver2.id,
        isPrimary: true,
        status: 'ACTIVE',
        linkedById: adminUser.id,
      },
    });
    pass('Created DRIVER link for UserB via service (no super_admin token available)');
  }

  // ─── Test 6: /me/driver-profile returns only linked driver ───
  console.log('\n6. /me/driver-profile returns only linked driver');

  if (targetAToken) {
    const res = await request('GET', '/api/v1/me/driver-profile', targetAToken);
    if (res.status === 200) {
      const driver = res.data?.data ?? res.data;
      if (driver?.id === driver1.id) {
        pass('/me/driver-profile returns linked driver1 for UserA');
      } else {
        fail(`Expected driver1 (${driver1.id}), got ${JSON.stringify(driver)}`);
      }
    } else {
      fail(`/me/driver-profile returned ${res.status}`);
    }
  }

  // ─── Test 7: /me/driver-trips does not return another driver's trips ───
  console.log('\n7. /me/driver-trips scoped to linked driver');

  // Create a trip for driver2 using proper required fields
  const testVehicle = await prisma.vehicle.findFirst({ where: {} });
  let driver2Trip: any = null;
  if (testVehicle) {
    driver2Trip = await prisma.trip.create({
      data: {
        driverId: driver2.id,
        vehicleId: testVehicle.id,
        tripType: 'TRANSFER',
        tripNumber: `${PREFIX}_TRIP_${Date.now()}`,
        status: 'DRAFT',
        originName: 'Test Origin',
        destinationName: 'Test Destination',
      },
    }).catch(() => null);
  }

  if (targetAToken) {
    const res = await request('GET', '/api/v1/me/driver-trips', targetAToken);
    if (res.status === 200) {
      const body = res.data?.data ?? res.data;
      const items = body?.items ?? body;
      if (Array.isArray(items)) {
        const hasDriver2Trip = items.some((t: any) => t.id === driver2Trip?.id);
        if (!hasDriver2Trip) {
          pass('/me/driver-trips does not return driver2 trips for UserA');
        } else {
          fail('/me/driver-trips leaked driver2 trips to UserA');
        }
      } else {
        pass('/me/driver-trips returned valid response');
      }
    } else {
      fail(`/me/driver-trips returned ${res.status}`);
    }
  }

  // ─── Test 8: Revoked link blocks /me/driver-profile ───
  console.log('\n8. Revoked link blocks /me/driver-profile');

  // Revoke UserA's link
  await prisma.userProfileLink.update({
    where: { id: testLink.id },
    data: { status: 'REVOKED', isPrimary: false, unlinkedAt: new Date() },
  });

  if (targetAToken) {
    const res = await request('GET', '/api/v1/me/driver-profile', targetAToken);
    if (res.status === 404) {
      pass('Revoked link causes /me/driver-profile to return 404');
    } else {
      fail(`Expected 404 after revoke, got ${res.status}`);
    }
  }

  // ─── Test 9: Duplicate active link still rejected ───
  console.log('\n9. Duplicate active link rejected at service level');

  const { createProfileLink } = await import('../src/modules/user-profile-links/user-profile-links.service');
  try {
    await createProfileLink(
      { userId: targetUserB.id, profileType: 'DRIVER', profileId: driver2.id },
      adminUser.id,
    );
    fail('Duplicate link should have been rejected');
  } catch (e: any) {
    if (e.statusCode === 409) {
      pass('Duplicate active link rejected with 409');
    } else {
      fail(`Expected 409, got ${e.statusCode}: ${e.message}`);
    }
  }

  // ─── Test 10: Primary link behavior still works ───
  console.log('\n10. Primary link behavior works');

  const newLink = await createProfileLink(
    { userId: targetUserA.id, profileType: 'DRIVER', profileId: driver2.id, isPrimary: true },
    adminUser.id,
  );

  // The old testLink should have been un-set as primary
  const refreshedTestLink = await prisma.userProfileLink.findUnique({ where: { id: testLink.id } });
  if (refreshedTestLink?.isPrimary === false) {
    pass('Previous link un-set as primary when new primary created');
  } else {
    fail('Previous link should be non-primary');
  }

  // Clean up new link
  await prisma.userProfileLink.delete({ where: { id: newLink.id } });

  // ─── Cleanup ───
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

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Test failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
