/**
 * Driver Portal Actions Test
 *
 * Tests driver write actions through /me/driver-* APIs:
 * 1. Linked driver with permissions can create own trip
 * 2. Created trip has driverId = linked driver id
 * 3. Driver cannot create trip for another driver
 * 4. Driver can start own trip
 * 5. Driver cannot start another driver's trip
 * 6. Driver can end own trip
 * 7. Driver can create amount-only fuel entry
 * 8. Fuel vehicle must belong to driver
 * 9. Driver can create own expense
 * 10. Expense trip/vehicle must belong to driver
 * 11. Document upload cannot link to another driver's trip
 * 12. Revoked link blocks all write APIs
 * 13. Missing permission blocks action
 * 14. Audit logs include actor user id and driver id
 *
 * Uses local backend only (http://127.0.0.1:4000).
 * Test data prefix: PHASE_DRIVER_ACTION_TEST
 */

import http from 'http';
import { prisma } from '../src/lib/prisma';

const BASE = 'http://127.0.0.1:4000';
const PREFIX = 'PHASE_DRIVER_ACTION_TEST';
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
        try { resolve({ status: res.statusCode!, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode!, data: { raw: data } }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function cleanup() {
  // Delete in dependency order to avoid FK errors
  const driverNames = await prisma.driver.findMany({ where: { name: { startsWith: PREFIX } }, select: { id: true } });
  const driverIds = driverNames.map(d => d.id);
  const userIds = (await prisma.user.findMany({ where: { name: { startsWith: PREFIX } }, select: { id: true } })).map(u => u.id);

  if (userIds.length > 0) {
    try { await prisma.userProfileLink.deleteMany({ where: { userId: { in: userIds } } }); } catch {}
  }
  if (driverIds.length > 0) {
    try { await prisma.tripHistory.deleteMany({ where: { trip: { driverId: { in: driverIds } } } }); } catch {}
    try { await prisma.fuelEntry.deleteMany({ where: { driverId: { in: driverIds } } }); } catch {}
    try { await prisma.expense.deleteMany({ where: { driverId: { in: driverIds } } }); } catch {}
    try { await prisma.document.deleteMany({ where: { driverId: { in: driverIds } } }); } catch {}
    try { await prisma.vehicleIssue.deleteMany({ where: { driverId: { in: driverIds } } }); } catch {}
    try { await prisma.vehicleInspection.deleteMany({ where: { driverId: { in: driverIds } } }); } catch {}
    try { await prisma.trip.deleteMany({ where: { driverId: { in: driverIds } } }); } catch {}
  }
  try { await prisma.vehicle.deleteMany({ where: { vehicleNumber: { startsWith: PREFIX } } }); } catch {}
  try { await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } }); } catch {}
  try { await prisma.driver.deleteMany({ where: { name: { startsWith: PREFIX } } }); } catch {}
}

async function getAuthToken(identifier: string, password: string): Promise<string | null> {
  const res = await request('POST', '/api/v1/auth/login', undefined, { identifier, password });
  return res.data?.data?.accessToken ?? res.data?.accessToken ?? null;
}

async function main() {
  console.log('=== Driver Portal Actions Test ===\n');

  try {
    const health = await request('GET', '/api/v1/health');
    if (health.status !== 200) { console.log('Backend not running'); process.exit(1); }
  } catch { console.log('Backend not reachable'); process.exit(1); }

  await cleanup();
  console.log('\n--- Setup ---');

  const adminIdentifier = process.env.CI_ADMIN_IDENTIFIER || process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
  const adminPassword = process.env.CI_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!adminIdentifier || !adminPassword) { console.log('Missing admin credentials'); process.exit(1); }
  const adminToken = await getAuthToken(adminIdentifier, adminPassword);
  if (!adminToken) { console.log('Failed to get admin token'); process.exit(1); }
  pass('Admin token obtained');

  const roles = await request('GET', '/api/v1/roles', adminToken);
  const driverRole = roles.data?.data?.find?.((r: any) => r.key === 'driver') || roles.data?.data?.[0];
  if (!driverRole) { fail('No roles found'); process.exit(1); }

  const ts = Date.now();

  // Create driver1 and driver2 via API (not Prisma directly) to ensure consistency
  const driver1ApiRes = await request('POST', '/api/v1/drivers', adminToken, {
    name: `${PREFIX}_Driver1`,
    mobile: `+919900${ts}`,
    licenseNumber: `${PREFIX}_LIC1_${ts}`,
    status: 'AVAILABLE',
  });
  const driver1Id = driver1ApiRes.data?.data?.id;
  if (!driver1Id) { fail(`Create driver1 via API: ${JSON.stringify(driver1ApiRes.data)}`); process.exit(1); }
  pass(`Created driver1 via API: ${driver1Id}`);

  const driver2ApiRes = await request('POST', '/api/v1/drivers', adminToken, {
    name: `${PREFIX}_Driver2`,
    mobile: `+919901${ts}`,
    licenseNumber: `${PREFIX}_LIC2_${ts}`,
    status: 'AVAILABLE',
  });
  const driver2Id = driver2ApiRes.data?.data?.id;
  if (!driver2Id) { fail(`Create driver2 via API: ${JSON.stringify(driver2ApiRes.data)}`); process.exit(1); }
  pass(`Created driver2 via API: ${driver2Id}`);

  // Create vehicles via API, assigned to drivers
  const v1Res = await request('POST', '/api/v1/vehicles', adminToken, {
    vehicleNumber: `${PREFIX}_VEH1_${ts}`,
    vehicleType: 'TRUCK',
    fuelType: 'DIESEL',
    currentDriverId: driver1Id,
  });
  const vehicle1Id = v1Res.data?.data?.id;
  if (!vehicle1Id) { fail(`Create vehicle1: ${JSON.stringify(v1Res.data)}`); process.exit(1); }

  const v2Res = await request('POST', '/api/v1/vehicles', adminToken, {
    vehicleNumber: `${PREFIX}_VEH2_${ts}`,
    vehicleType: 'TRUCK',
    fuelType: 'DIESEL',
    currentDriverId: driver2Id,
  });
  const vehicle2Id = v2Res.data?.data?.id;
  if (!vehicle2Id) { fail(`Create vehicle2: ${JSON.stringify(v2Res.data)}`); process.exit(1); }
  pass('Created vehicles via API');

  // Create users via API
  const u1Res = await request('POST', '/api/v1/users', adminToken, {
    name: `${PREFIX}_User1`, username: `${PREFIX}_u1_${ts}`, email: `${PREFIX}_u1_${ts}@t.local`,
    password: 'TestPass123!', roleId: driverRole.id, status: 'ACTIVE',
  });
  const userId1 = u1Res.data?.data?.id;
  if (!userId1) { fail(`Create user1: ${JSON.stringify(u1Res.data)}`); process.exit(1); }

  const u2Res = await request('POST', '/api/v1/users', adminToken, {
    name: `${PREFIX}_User2`, username: `${PREFIX}_u2_${ts}`, email: `${PREFIX}_u2_${ts}@t.local`,
    password: 'TestPass123!', roleId: driverRole.id, status: 'ACTIVE',
  });
  const userId2 = u2Res.data?.data?.id;
  if (!userId2) { fail(`Create user2: ${JSON.stringify(u2Res.data)}`); process.exit(1); }

  // Get viewer role for the no-perm user (viewer doesn't have driver_* permissions)
  const viewerRole = roles.data?.data?.find?.((r: any) => r.key === 'viewer');
  const noPermRoleId = viewerRole?.id || driverRole.id;

  const unRes = await request('POST', '/api/v1/users', adminToken, {
    name: `${PREFIX}_UserNP`, username: `${PREFIX}_unp_${ts}`, email: `${PREFIX}_unp_${ts}@t.local`,
    password: 'TestPass123!', roleId: noPermRoleId, status: 'ACTIVE',
  });
  const userIdNoPerm = unRes.data?.data?.id;
  pass('Created users via API');

  // Grant driver_* permissions to userId1 and userId2
  const allPerms = await request('GET', '/api/v1/permissions', adminToken);
  const driverPermKeys = [
    'driver_trip_create', 'driver_trip_start', 'driver_trip_end', 'driver_trip_cancel',
    'driver_quick_fuel_create', 'driver_expense_create',
    'driver_document_upload', 'driver_pod_upload', 'driver_lr_upload', 'driver_challan_upload',
    'driver_vehicle_issue_report', 'driver_vehicle_inspection_create',
  ];
  for (const permKey of driverPermKeys) {
    const perm = allPerms.data?.data?.find?.((p: any) => p.key === permKey);
    if (perm) {
      await request('POST', `/api/v1/access/users/${userId1}/overrides`, adminToken, { permissionId: perm.id, effect: 'ALLOW' });
      await request('POST', `/api/v1/access/users/${userId2}/overrides`, adminToken, { permissionId: perm.id, effect: 'ALLOW' });
    }
  }
  pass('Granted driver permissions');

  // Create profile links via API (using admin API, not Prisma directly)
  const link1Res = await request('POST', '/api/v1/user-profile-links', adminToken, {
    userId: userId1, profileType: 'DRIVER', profileId: driver1Id, isPrimary: true,
  });
  if (link1Res.status !== 201 && link1Res.status !== 200) {
    fail(`Create link1: status=${link1Res.status} ${JSON.stringify(link1Res.data)}`);
    process.exit(1);
  }

  const link2Res = await request('POST', '/api/v1/user-profile-links', adminToken, {
    userId: userId2, profileType: 'DRIVER', profileId: driver2Id, isPrimary: true,
  });
  if (link2Res.status !== 201 && link2Res.status !== 200) {
    fail(`Create link2: status=${link2Res.status} ${JSON.stringify(link2Res.data)}`);
    process.exit(1);
  }

  const linkNPRes = await request('POST', '/api/v1/user-profile-links', adminToken, {
    userId: userIdNoPerm, profileType: 'DRIVER', profileId: driver1Id, isPrimary: false,
  });
  pass('Created profile links');

  // Verify links exist
  const verifyLinks = await request('GET', `/api/v1/user-profile-links/user/${userId1}`, adminToken);
  if (verifyLinks.status === 200) {
    const links = verifyLinks.data?.data?.items || verifyLinks.data?.data || [];
    if (Array.isArray(links) && links.length > 0) {
      pass(`Verified ${links.length} link(s) for user1`);
    } else {
      fail(`No links found for user1 via API`);
    }
  }

  // Login
  const token1 = await getAuthToken(`${PREFIX}_u1_${ts}`, 'TestPass123!');
  const token2 = await getAuthToken(`${PREFIX}_u2_${ts}`, 'TestPass123!');
  const tokenNoPerm = await getAuthToken(`${PREFIX}_unp_${ts}`, 'TestPass123!');
  if (!token1 || !token2 || !tokenNoPerm) { fail('Failed to get tokens'); process.exit(1); }
  pass('All tokens obtained');

  // Verify driver profile via API for token1
  const profileCheck = await request('GET', '/api/v1/me/driver-profile', token1);
  if (profileCheck.status !== 200) {
    fail(`driver-profile check: status=${profileCheck.status} data=${JSON.stringify(profileCheck.data)}`);
    process.exit(1);
  }
  pass(`driver-profile verified for user1: ${profileCheck.data?.data?.name}`);

  // ─── Test 1: Create own trip ───
  console.log('\n--- Test 1: Linked driver can create own trip ---');
  const createTripRes = await request('POST', '/api/v1/me/driver-trips', token1, {
    vehicleId: vehicle1Id, originName: 'Mumbai', destinationName: 'Pune', tripType: 'DELIVERY',
  });
  if (createTripRes.status === 201 && createTripRes.data?.data?.id) {
    pass('user1 created trip');
  } else {
    fail(`Create trip: status=${createTripRes.status} data=${JSON.stringify(createTripRes.data)}`);
  }

  // ─── Test 2: Created trip has correct driverId ───
  console.log('\n--- Test 2: Created trip has driverId = linked driver id ---');
  const trip = createTripRes.data?.data;
  if (trip?.driverId === driver1Id) {
    pass(`Trip driverId matches: ${trip.driverId}`);
  } else {
    fail(`Trip driverId mismatch: expected ${driver1Id}, got ${trip?.driverId}`);
  }

  if (!trip?.id) {
    fail('Cannot continue without trip id');
    await cleanup();
    process.exit(1);
  }

  // ─── Test 3: Cannot create trip for another driver ───
  console.log('\n--- Test 3: Driver cannot create trip for another driver ---');
  const crossTripRes = await request('POST', '/api/v1/me/driver-trips', token2, {
    vehicleId: vehicle1Id, originName: 'Delhi', destinationName: 'Agra', tripType: 'DELIVERY',
  });
  if (crossTripRes.status === 403) {
    pass('user2 correctly blocked from using driver1 vehicle');
  } else {
    fail(`Cross-driver trip: expected 403, got ${crossTripRes.status}`);
  }

  // ─── Test 4: Start own trip ───
  console.log('\n--- Test 4: Driver can start own trip ---');
  const startRes = await request('PATCH', `/api/v1/me/driver-trips/${trip.id}/start`, token1, { startOdometer: 10000 });
  if (startRes.status === 200 && startRes.data?.data?.status === 'STARTED') {
    pass('Trip started');
  } else {
    fail(`Start trip: status=${startRes.status} status=${startRes.data?.data?.status}`);
  }

  // ─── Test 5: Cannot start another driver's trip ───
  console.log('\n--- Test 5: Driver cannot start another driver\'s trip ---');
  const crossStartRes = await request('PATCH', `/api/v1/me/driver-trips/${trip.id}/start`, token2);
  if (crossStartRes.status === 403) {
    pass('user2 correctly blocked from starting user1 trip');
  } else {
    fail(`Cross start: expected 403, got ${crossStartRes.status}`);
  }

  // ─── Test 6: End own trip ───
  console.log('\n--- Test 6: Driver can end own trip ---');
  const endRes = await request('PATCH', `/api/v1/me/driver-trips/${trip.id}/end`, token1, { endOdometer: 10500 });
  if (endRes.status === 200 && endRes.data?.data?.status === 'COMPLETED') {
    pass('Trip completed');
  } else {
    fail(`End trip: status=${endRes.status} status=${endRes.data?.data?.status}`);
  }

  // ─── Test 7: Create amount-only fuel entry ───
  console.log('\n--- Test 7: Driver can create amount-only fuel entry ---');
  const fuelRes = await request('POST', '/api/v1/me/driver-fuel', token1, {
    vehicleId: vehicle1Id, totalAmount: 2500,
  });
  if (fuelRes.status === 201 && fuelRes.data?.data?.id) {
    pass('Amount-only fuel entry created');
  } else {
    fail(`Fuel create: status=${fuelRes.status} data=${JSON.stringify(fuelRes.data)}`);
  }

  // ─── Test 8: Fuel vehicle must belong to driver ───
  console.log('\n--- Test 8: Fuel vehicle must belong to driver ---');
  const crossFuelRes = await request('POST', '/api/v1/me/driver-fuel', token2, {
    vehicleId: vehicle1Id, totalAmount: 3000,
  });
  if (crossFuelRes.status === 403) {
    pass('user2 correctly blocked from fuel on driver1 vehicle');
  } else {
    fail(`Cross fuel: expected 403, got ${crossFuelRes.status}`);
  }

  // ─── Test 9: Create own expense ───
  console.log('\n--- Test 9: Driver can create own expense ---');
  const expenseRes = await request('POST', '/api/v1/me/driver-expenses', token1, {
    vehicleId: vehicle1Id, category: 'Toll', amount: 500, notes: 'Toll at Pune',
  });
  if (expenseRes.status === 201 && expenseRes.data?.data?.id) {
    pass('Expense created');
  } else {
    fail(`Expense create: status=${expenseRes.status} data=${JSON.stringify(expenseRes.data)}`);
  }

  // ─── Test 10: Expense vehicle must belong to driver ───
  console.log('\n--- Test 10: Expense vehicle must belong to driver ---');
  const crossExpenseRes = await request('POST', '/api/v1/me/driver-expenses', token2, {
    vehicleId: vehicle1Id, category: 'Toll', amount: 300,
  });
  if (crossExpenseRes.status === 403) {
    pass('user2 correctly blocked from expense on driver1 vehicle');
  } else {
    fail(`Cross expense: expected 403, got ${crossExpenseRes.status}`);
  }

  // ─── Test 11: Document cannot link to another driver's trip ───
  console.log('\n--- Test 11: Document cannot link to another driver trip ---');
  const docRes = await request('POST', '/api/v1/me/driver-documents', token2, {
    title: 'POD', documentType: 'POD', documentCategory: 'TRIP', tripId: trip.id,
  });
  if (docRes.status === 403) {
    pass('user2 correctly blocked from linking to user1 trip');
  } else {
    fail(`Cross doc: expected 403, got ${docRes.status}`);
  }

  // ─── Test 12: Revoked link blocks write APIs ───
  console.log('\n--- Test 12: Revoked link blocks all write APIs ---');
  const revokedUserRes = await request('POST', '/api/v1/users', adminToken, {
    name: `${PREFIX}_Revoked`, username: `${PREFIX}_rev_${ts}`, email: `${PREFIX}_rev_${ts}@t.local`,
    password: 'TestPass123!', roleId: driverRole.id, status: 'ACTIVE',
  });
  const revokedUserId = revokedUserRes.data?.data?.id;
  if (revokedUserId) {
    // Create a driver for revoked user via API
    const revDriverRes = await request('POST', '/api/v1/drivers', adminToken, {
      name: `${PREFIX}_RevDriver`, mobile: `+919902${ts}`, licenseNumber: `${PREFIX}_LIC_R_${ts}`, status: 'AVAILABLE',
    });
    const revDriverId = revDriverRes.data?.data?.id;
    if (revDriverId) {
      // Create link then revoke it
      await request('POST', '/api/v1/user-profile-links', adminToken, {
        userId: revokedUserId, profileType: 'DRIVER', profileId: revDriverId, isPrimary: true,
      });
      // Find the link to revoke
      const revLinks = await request('GET', `/api/v1/user-profile-links/user/${revokedUserId}`, adminToken);
      const revLink = (revLinks.data?.data?.items || revLinks.data?.data || [])[0];
      if (revLink) {
        await request('PATCH', `/api/v1/user-profile-links/${revLink.id}/revoke`, adminToken);
      }
      const revokedToken = await getAuthToken(`${PREFIX}_rev_${ts}`, 'TestPass123!');
      if (revokedToken) {
        const revokedTripRes = await request('POST', '/api/v1/me/driver-trips', revokedToken, {
          vehicleId: vehicle1Id, originName: 'X', destinationName: 'Y',
        });
        if (revokedTripRes.status === 404) {
          pass('Revoked user blocked from creating trip (404)');
        } else {
          fail(`Revoked trip: expected 404, got ${revokedTripRes.status}`);
        }
      } else {
        fail('Could not get token for revoked user');
      }
    }
  }

  // ─── Test 13: Missing permission blocks action ───
  console.log('\n--- Test 13: Missing permission blocks action ---');
  const noPermTripRes = await request('POST', '/api/v1/me/driver-trips', tokenNoPerm, {
    vehicleId: vehicle1Id, originName: 'X', destinationName: 'Y',
  });
  if (noPermTripRes.status === 403) {
    pass('user_noperm correctly blocked from creating trip');
  } else {
    fail(`No-perm trip: expected 403, got ${noPermTripRes.status}`);
  }

  // ─── Test 14: Audit logs ───
  console.log('\n--- Test 14: Audit logs include actor user id and driver id ---');
  const auditLogs = await prisma.auditLog.findMany({
    where: { userId: userId1, action: { startsWith: 'driver.' } },
    orderBy: { createdAt: 'desc' }, take: 5,
  });
  const hasAudit = auditLogs.length > 0;
  const allHaveDriverId = auditLogs.every((log) => {
    const meta = log.metadata as Record<string, unknown>;
    return meta && typeof meta.driverId === 'string' && meta.driverId === driver1Id;
  });
  if (hasAudit && allHaveDriverId) {
    pass(`Found ${auditLogs.length} audit logs with correct driverId`);
  } else {
    fail(`Audit: found=${auditLogs.length} allHaveDriverId=${allHaveDriverId}`);
  }

  // ─── Vehicle Issue ───
  console.log('\n--- Vehicle Issue test ---');
  const issueRes = await request('POST', '/api/v1/me/driver-vehicle-issues', token1, {
    vehicleId: vehicle1Id, title: 'Brake noise', severity: 'HIGH',
  });
  if (issueRes.status === 201) pass('Vehicle issue reported');
  else fail(`Vehicle issue: status=${issueRes.status}`);

  // ─── Vehicle Inspection ───
  console.log('\n--- Vehicle Inspection test ---');
  const inspRes = await request('POST', '/api/v1/me/driver-vehicle-inspections', token1, {
    vehicleId: vehicle1Id, inspectionType: 'Pre-Trip', odometerReading: 10500,
  });
  if (inspRes.status === 201) pass('Vehicle inspection created');
  else fail(`Vehicle inspection: status=${inspRes.status}`);

  // ─── Cleanup ───
  console.log('\n--- Cleanup ---');
  await cleanup();
  pass('Cleanup complete');

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (testFailed) { console.log('FAILED'); process.exit(1); }
  else { console.log('ALL PASSED'); }
}

main().catch((e) => { console.error('Test error:', e); process.exit(1); });
