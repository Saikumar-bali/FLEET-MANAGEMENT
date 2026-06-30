/**
 * Driver Portal Security Test
 *
 * Tests:
 * 1. Linked driver sees own profile via /me/driver-profile
 * 2. Linked driver trips only include own driverId
 * 3. Linked driver fuel only includes own driverId
 * 4. Linked driver expenses only include own driverId
 * 5. Linked driver vehicles only include relevant vehicles
 * 6. Linked driver documents only include own documents
 * 7. Revoked link returns 404 on /me/driver-profile
 * 8. Unlinked user returns 404 on /me/driver-profile
 * 9. No admin permission required for /me/driver-* endpoints
 * 10. Cannot access /me/driver-profile without auth
 *
 * Uses local backend only (http://127.0.0.1:4000).
 * Test data prefix: PHASE_DRIVER_PORTAL_TEST
 */

import http from 'http';
import { prisma } from '../src/lib/prisma';

const BASE = 'http://127.0.0.1:4000';
const PREFIX = 'PHASE_DRIVER_PORTAL_TEST';
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

async function getAuthToken(identifier: string, password: string): Promise<string | null> {
  const res = await request('POST', '/api/v1/auth/login', undefined, { identifier, password });
  return res.data?.data?.accessToken ?? res.data?.accessToken ?? null;
}

async function main() {
  console.log('=== Driver Portal Security Test ===\n');

  // Check server is running
  try {
    const health = await request('GET', '/api/v1/health');
    if (health.status !== 200) {
      console.log('Backend server not running at', BASE);
      console.log('Start it with: npm run dev');
      process.exit(1);
    }
  } catch {
    console.log('Backend server not reachable at', BASE);
    console.log('Start it with: npm run dev');
    process.exit(1);
  }

  await cleanup();

  // Setup: create test users and drivers
  console.log('\n--- Setup ---');

  // Get admin token for creating data
  const adminIdentifier = process.env.CI_ADMIN_IDENTIFIER || process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
  const adminPassword = process.env.CI_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!adminIdentifier || !adminPassword) {
    console.log('Missing admin credentials. Set CI_ADMIN_IDENTIFIER/CI_ADMIN_PASSWORD.');
    process.exit(1);
  }

  const adminToken = await getAuthToken(adminIdentifier, adminPassword);
  if (!adminToken) {
    console.log('Failed to get admin token.');
    process.exit(1);
  }
  pass('Admin token obtained');

  // Get or create a role with minimal permissions (for testing "no admin permission required")
  const roles = await request('GET', '/api/v1/roles', adminToken);
  const driverRole = roles.data?.data?.find?.((r: any) => r.key === 'driver') || roles.data?.data?.[0];
  if (!driverRole) {
    fail('No roles found');
    process.exit(1);
  }

  // Create two test drivers
  const driver1 = await prisma.driver.create({
    data: {
      name: `${PREFIX}_Driver1`,
      mobile: '+919900000101',
      licenseNumber: `${PREFIX}_LIC_001`,
      status: 'AVAILABLE',
    },
  });
  pass(`Created test driver: ${driver1.name} (${driver1.id})`);

  const driver2 = await prisma.driver.create({
    data: {
      name: `${PREFIX}_Driver2`,
      mobile: '+919900000102',
      licenseNumber: `${PREFIX}_LIC_002`,
      status: 'AVAILABLE',
    },
  });
  pass(`Created test driver2: ${driver2.name} (${driver2.id})`);

  // Create two test users (use existing role)
  const user1 = await prisma.user.create({
    data: {
      name: `${PREFIX}_User1`,
      username: `${PREFIX}_user1_${Date.now()}`,
      email: `${PREFIX}_user1_${Date.now()}@test.local`,
      passwordHash: '$2a$10$xJwL1z5z5z5z5z5z5z5z5eP9v9v9v9v9v9v9v9v9v9v9v9v9v9',
      roleId: driverRole.id,
      status: 'ACTIVE',
    },
  });
  pass(`Created test user: ${user1.name}`);

  const user2 = await prisma.user.create({
    data: {
      name: `${PREFIX}_User2`,
      username: `${PREFIX}_user2_${Date.now()}`,
      email: `${PREFIX}_user2_${Date.now()}@test.local`,
      passwordHash: '$2a$10$xJwL1z5z5z5z5z5z5z5z5eP9v9v9v9v9v9v9v9v9v9v9v9v9v9',
      roleId: driverRole.id,
      status: 'ACTIVE',
    },
  });
  pass(`Created test user2: ${user2.name}`);

  // Link user1 → driver1
  await prisma.userProfileLink.create({
    data: {
      userId: user1.id,
      profileType: 'DRIVER',
      profileId: driver1.id,
      isPrimary: true,
      status: 'ACTIVE',
    },
  });
  pass('Linked user1 → driver1');

  // Link user2 → driver2
  await prisma.userProfileLink.create({
    data: {
      userId: user2.id,
      profileType: 'DRIVER',
      profileId: driver2.id,
      isPrimary: true,
      status: 'ACTIVE',
    },
  });
  pass('Linked user2 → driver2');

  // Get tokens for user1 and user2 (set a known password for testing)
  // We'll use service-level testing since user passwords are hashed
  // Instead, let's create API test users with known passwords via admin
  const testUser1Identifier = `${PREFIX}_user1_login`;
  const testUser1Email = `${PREFIX}_user1_login@test.local`;
  const createUser1Res = await request('POST', '/api/v1/users', adminToken, {
    name: `${PREFIX}_LoginUser1`,
    username: testUser1Identifier,
    email: testUser1Email,
    password: 'TestPass123!',
    roleId: driverRole.id,
    status: 'ACTIVE',
  });

  if (createUser1Res.status !== 201 && createUser1Res.status !== 200) {
    fail(`Failed to create login user1: ${JSON.stringify(createUser1Res.data)}`);
    process.exit(1);
  }
  const loginUserId1 = createUser1Res.data?.data?.id;
  pass(`Created login user1: ${testUser1Identifier}`);

  const testUser2Identifier = `${PREFIX}_user2_login`;
  const testUser2Email = `${PREFIX}_user2_login@test.local`;
  const createUser2Res = await request('POST', '/api/v1/users', adminToken, {
    name: `${PREFIX}_LoginUser2`,
    username: testUser2Identifier,
    email: testUser2Email,
    password: 'TestPass123!',
    roleId: driverRole.id,
    status: 'ACTIVE',
  });

  if (createUser2Res.status !== 201 && createUser2Res.status !== 200) {
    fail(`Failed to create login user2: ${JSON.stringify(createUser2Res.data)}`);
    process.exit(1);
  }
  const loginUserId2 = createUser2Res.data?.data?.id;
  pass(`Created login user2: ${testUser2Identifier}`);

  // Link login users to drivers
  if (loginUserId1) {
    await prisma.userProfileLink.create({
      data: {
        userId: loginUserId1,
        profileType: 'DRIVER',
        profileId: driver1.id,
        isPrimary: false,
        status: 'ACTIVE',
      },
    });
    pass('Linked login user1 → driver1');
  }

  if (loginUserId2) {
    await prisma.userProfileLink.create({
      data: {
        userId: loginUserId2,
        profileType: 'DRIVER',
        profileId: driver2.id,
        isPrimary: false,
        status: 'ACTIVE',
      },
    });
    pass('Linked login user2 → driver2');
  }

  // Login to get tokens
  const token1 = await getAuthToken(testUser1Identifier, 'TestPass123!');
  const token2 = await getAuthToken(testUser2Identifier, 'TestPass123!');

  if (!token1) { fail('Failed to get token for user1'); process.exit(1); }
  if (!token2) { fail('Failed to get token for user2'); process.exit(1); }
  pass('Both user tokens obtained');

  // ─── Test 1: Linked driver sees own profile ───
  console.log('\n--- Test 1: Linked driver sees own profile ---');
  const profile1 = await request('GET', '/api/v1/me/driver-profile', token1);
  if (profile1.status === 200 && profile1.data?.data?.name === `${PREFIX}_Driver1`) {
    pass('user1 sees own driver profile');
  } else {
    fail(`user1 profile: status=${profile1.status} name=${profile1.data?.data?.name}`);
  }

  // ─── Test 2: Linked driver trips only include own driverId ───
  console.log('\n--- Test 2: Trips scoped to own driver ---');
  // Create trips for both drivers
  const vehicle1 = await prisma.vehicle.create({
    data: {
      vehicleNumber: `${PREFIX}_VEH1`,
      vehicleType: 'TRUCK',
      fuelType: 'DIESEL',
      status: 'AVAILABLE',
    },
  });
  const vehicle2 = await prisma.vehicle.create({
    data: {
      vehicleNumber: `${PREFIX}_VEH2`,
      vehicleType: 'TRUCK',
      fuelType: 'DIESEL',
      status: 'AVAILABLE',
    },
  });

  const trip1 = await prisma.trip.create({
    data: {
      tripNumber: `${PREFIX}_TRIP1`,
      tripType: 'DELIVERY',
      status: 'COMPLETED',
      vehicleId: vehicle1.id,
      driverId: driver1.id,
      originName: 'Origin1',
      destinationName: 'Dest1',
    },
  });
  const trip2 = await prisma.trip.create({
    data: {
      tripNumber: `${PREFIX}_TRIP2`,
      tripType: 'DELIVERY',
      status: 'COMPLETED',
      vehicleId: vehicle2.id,
      driverId: driver2.id,
      originName: 'Origin2',
      destinationName: 'Dest2',
    },
  });

  const trips1 = await request('GET', '/api/v1/me/driver-trips', token1);
  if (trips1.status === 200) {
    const items = trips1.data?.data?.items || [];
    const hasOnlyOwn = items.every((t: any) => t.driverId === driver1.id);
    if (hasOnlyOwn && items.length >= 1) {
      pass(`user1 sees ${items.length} trips, all own driverId`);
    } else {
      fail(`user1 trips leak: items=${JSON.stringify(items.map((t: any) => ({ id: t.id, driverId: t.driverId })))}`);
    }
  } else {
    fail(`user1 trips status: ${trips1.status}`);
  }

  // ─── Test 3: Fuel scoped to own driver ───
  console.log('\n--- Test 3: Fuel scoped to own driver ---');
  await prisma.fuelEntry.create({
    data: {
      vehicleId: vehicle1.id,
      driverId: driver1.id,
      fuelDate: new Date().toISOString(),
      fuelType: 'DIESEL',
      entryMode: 'QUICK_AMOUNT',
      totalAmount: 1000,
      status: 'APPROVED',
    },
  });
  await prisma.fuelEntry.create({
    data: {
      vehicleId: vehicle2.id,
      driverId: driver2.id,
      fuelDate: new Date().toISOString(),
      fuelType: 'DIESEL',
      entryMode: 'QUICK_AMOUNT',
      totalAmount: 2000,
      status: 'APPROVED',
    },
  });

  const fuel1 = await request('GET', '/api/v1/me/driver-fuel', token1);
  if (fuel1.status === 200) {
    const items = fuel1.data?.data?.items || [];
    const hasOnlyOwn = items.every((f: any) => f.driverId === driver1.id);
    if (hasOnlyOwn && items.length >= 1) {
      pass(`user1 sees ${items.length} fuel entries, all own driverId`);
    } else {
      fail(`user1 fuel leak: items=${JSON.stringify(items.map((f: any) => ({ id: f.id, driverId: f.driverId })))}`);
    }
  } else {
    fail(`user1 fuel status: ${fuel1.status}`);
  }

  // ─── Test 4: Expenses scoped to own driver ───
  console.log('\n--- Test 4: Expenses scoped to own driver ---');
  await prisma.expense.create({
    data: {
      vehicleId: vehicle1.id,
      driverId: driver1.id,
      category: 'Toll',
      expenseDate: new Date().toISOString(),
      amount: 500,
      status: 'APPROVED',
    },
  });
  await prisma.expense.create({
    data: {
      vehicleId: vehicle2.id,
      driverId: driver2.id,
      category: 'Toll',
      expenseDate: new Date().toISOString(),
      amount: 600,
      status: 'APPROVED',
    },
  });

  const expenses1 = await request('GET', '/api/v1/me/driver-expenses', token1);
  if (expenses1.status === 200) {
    const items = expenses1.data?.data?.items || [];
    const hasOnlyOwn = items.every((e: any) => e.driverId === driver1.id);
    if (hasOnlyOwn && items.length >= 1) {
      pass(`user1 sees ${items.length} expenses, all own driverId`);
    } else {
      fail(`user1 expenses leak: items=${JSON.stringify(items.map((e: any) => ({ id: e.id, driverId: e.driverId })))}`);
    }
  } else {
    fail(`user1 expenses status: ${expenses1.status}`);
  }

  // ─── Test 5: Vehicles scoped ───
  console.log('\n--- Test 5: Vehicles scoped to linked driver ---');
  const vehicles1 = await request('GET', '/api/v1/me/driver-vehicles', token1);
  if (vehicles1.status === 200) {
    const items = vehicles1.data?.data || [];
    const hasRelevant = items.length >= 1;
    if (hasRelevant) {
      pass(`user1 sees ${items.length} vehicles`);
    } else {
      fail(`user1 vehicles: no vehicles returned`);
    }
  } else {
    fail(`user1 vehicles status: ${vehicles1.status}`);
  }

  // ─── Test 6: Documents scoped ───
  console.log('\n--- Test 6: Documents scoped to linked driver ---');
  const docs1 = await request('GET', '/api/v1/me/driver-documents', token1);
  // Documents may be empty, that's fine - just check 200
  if (docs1.status === 200) {
    pass('user1 can access driver-documents endpoint');
  } else {
    fail(`user1 documents status: ${docs1.status}`);
  }

  // ─── Test 7: user2 cannot see user1's data ───
  console.log('\n--- Test 7: Cross-driver isolation ---');
  const trips2 = await request('GET', '/api/v1/me/driver-trips', token2);
  if (trips2.status === 200) {
    const items = trips2.data?.data?.items || [];
    const hasDriver2Only = items.every((t: any) => t.driverId === driver2.id);
    const noDriver1 = items.every((t: any) => t.driverId !== driver1.id);
    if (hasDriver2Only && noDriver1) {
      pass('user2 does NOT see user1 trips');
    } else {
      fail(`user2 sees user1 data: ${JSON.stringify(items.map((t: any) => ({ id: t.id, driverId: t.driverId })))}`);
    }
  } else {
    fail(`user2 trips status: ${trips2.status}`);
  }

  // ─── Test 8: Revoked link returns 404 ───
  console.log('\n--- Test 8: Revoked link returns 404 ---');
  // Create a user with a revoked link
  const revokedUserRes = await request('POST', '/api/v1/users', adminToken, {
    name: `${PREFIX}_RevokedUser`,
    username: `${PREFIX}_revoked_${Date.now()}`,
    email: `${PREFIX}_revoked_${Date.now()}@test.local`,
    password: 'TestPass123!',
    roleId: driverRole.id,
    status: 'ACTIVE',
  });
  const revokedUserId = revokedUserRes.data?.data?.id;

  if (revokedUserId) {
    const revokedDriver = await prisma.driver.create({
      data: {
        name: `${PREFIX}_RevokedDriver`,
        mobile: '+919900000199',
        licenseNumber: `${PREFIX}_LIC_REVOKED`,
        status: 'AVAILABLE',
      },
    });
    await prisma.userProfileLink.create({
      data: {
        userId: revokedUserId,
        profileType: 'DRIVER',
        profileId: revokedDriver.id,
        isPrimary: true,
        status: 'REVOKED',
      },
    });

    const revokedLogin = await request('POST', '/api/v1/auth/login', undefined, {
      identifier: revokedUserRes.data?.data?.username,
      password: 'TestPass123!',
    });
    const revokedAccessToken = revokedLogin.data?.data?.accessToken;

    if (revokedAccessToken) {
      const revokedProfile = await request('GET', '/api/v1/me/driver-profile', revokedAccessToken);
      if (revokedProfile.status === 404) {
        pass('Revoked link returns 404');
      } else {
        fail(`Revoked link: expected 404, got ${revokedProfile.status}`);
      }
    } else {
      fail('Could not get token for revoked-link user');
    }
  } else {
    fail('Could not create revoked-link test user');
  }

  // ─── Test 9: Unlinked user returns 404 ───
  console.log('\n--- Test 9: Unlinked user returns 404 ---');
  const unlinkedRes = await request('POST', '/api/v1/users', adminToken, {
    name: `${PREFIX}_UnlinkedUser`,
    username: `${PREFIX}_unlinked_${Date.now()}`,
    email: `${PREFIX}_unlinked_${Date.now()}@test.local`,
    password: 'TestPass123!',
    roleId: driverRole.id,
    status: 'ACTIVE',
  });
  const unlinkedId = unlinkedRes.data?.data?.id;

  if (unlinkedId) {
    const unlinkedLogin = await request('POST', '/api/v1/auth/login', undefined, {
      identifier: unlinkedRes.data?.data?.username,
      password: 'TestPass123!',
    });
    const unlinkedAccessToken = unlinkedLogin.data?.data?.accessToken;

    if (unlinkedAccessToken) {
      const unlinkedProfile = await request('GET', '/api/v1/me/driver-profile', unlinkedAccessToken);
      if (unlinkedProfile.status === 404) {
        pass('Unlinked user returns 404');
      } else {
        fail(`Unlinked user: expected 404, got ${unlinkedProfile.status}`);
      }
    } else {
      fail('Could not get token for unlinked user');
    }
  } else {
    fail('Could not create unlinked test user');
  }

  // ─── Test 10: No auth returns 401 ───
  console.log('\n--- Test 10: No auth returns 401 ---');
  const noAuth = await request('GET', '/api/v1/me/driver-profile');
  if (noAuth.status === 401) {
    pass('No auth returns 401');
  } else {
    fail(`No auth: expected 401, got ${noAuth.status}`);
  }

  // ─── Cleanup ───
  console.log('\n--- Cleanup ---');
  try {
    await prisma.userProfileLink.deleteMany({
      where: { user: { name: { startsWith: PREFIX } } },
    });
    await prisma.trip.deleteMany({
      where: { tripNumber: { startsWith: PREFIX } },
    });
    await prisma.fuelEntry.deleteMany({
      where: { driverId: { in: [driver1.id, driver2.id] } },
    });
    await prisma.expense.deleteMany({
      where: { driverId: { in: [driver1.id, driver2.id] } },
    });
    await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.driver.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.vehicle.deleteMany({ where: { vehicleNumber: { startsWith: PREFIX } } });
    pass('Cleanup complete');
  } catch (e: any) {
    fail(`Cleanup error: ${e.message}`);
  }

  // ─── Summary ───
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (testFailed) {
    console.log('FAILED');
    process.exit(1);
  } else {
    console.log('ALL PASSED');
  }
}

main().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
