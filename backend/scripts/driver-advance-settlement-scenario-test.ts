/**
 * Driver Advance & Settlement Scenario Test
 *
 * Local-only workflow test for:
 * finance/admin advance issue -> approved fuel/expense spend -> driver cash return -> settlement close.
 *
 * Required:
 * - local backend running on API_BASE_URL or http://127.0.0.1:4000
 * - DATABASE_URL pointing to the same local database
 * - migrations applied: npm --prefix backend run prisma:migrate:deploy
 * - admin credentials in CI_ADMIN_IDENTIFIER/CI_ADMIN_PASSWORD or ADMIN_USERNAME/ADMIN_PASSWORD or ADMIN_EMAIL/ADMIN_PASSWORD
 *
 * This script never prints credentials or tokens.
 */

import http from 'http';
import { prisma } from '../src/lib/prisma';

const BASE = process.env.API_BASE_URL || 'http://127.0.0.1:4000';
const PREFIX = 'DRIVER_ADV_SETTLEMENT_TEST';

let passed = 0;
let failed = 0;

function pass(message: string) {
  passed += 1;
  console.log(`PASS ${message}`);
}

function fail(message: string) {
  failed += 1;
  console.log(`FAIL ${message}`);
}

async function request(method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, data: raw ? JSON.parse(raw) : {} });
        } catch {
          resolve({ status: res.statusCode || 0, data: { raw } });
        }
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(identifier: string, password: string): Promise<string> {
  const res = await request('POST', '/api/v1/auth/login', undefined, { identifier, password });
  const token = res.data?.data?.accessToken || res.data?.accessToken;
  if (!token) throw new Error(`Login failed with status ${res.status}`);
  return token;
}

async function cleanup() {
  const drivers = await prisma.driver.findMany({ where: { name: { startsWith: PREFIX } }, select: { id: true } });
  const driverIds = drivers.map(d => d.id);
  const users = await prisma.user.findMany({ where: { name: { startsWith: PREFIX } }, select: { id: true } });
  const userIds = users.map(u => u.id);
  const vehicles = await prisma.vehicle.findMany({ where: { vehicleNumber: { startsWith: PREFIX } }, select: { id: true } });
  const vehicleIds = vehicles.map(v => v.id);

  if (driverIds.length > 0) {
    await prisma.$executeRawUnsafe(`DELETE FROM driver_settlement_history WHERE advance_id IN (SELECT id FROM driver_advances WHERE driver_id = ANY($1))`, driverIds).catch(() => undefined);
    await prisma.$executeRawUnsafe(`DELETE FROM driver_settlement_lines WHERE settlement_id IN (SELECT id FROM driver_settlements WHERE driver_id = ANY($1))`, driverIds).catch(() => undefined);
    await prisma.$executeRawUnsafe(`DELETE FROM driver_settlements WHERE driver_id = ANY($1)`, driverIds).catch(() => undefined);
    await prisma.$executeRawUnsafe(`DELETE FROM driver_advances WHERE driver_id = ANY($1)`, driverIds).catch(() => undefined);
    await prisma.fuelEntry.deleteMany({ where: { driverId: { in: driverIds } } }).catch(() => undefined);
    await prisma.expense.deleteMany({ where: { driverId: { in: driverIds } } }).catch(() => undefined);
    await prisma.userProfileLink.deleteMany({ where: { profileType: 'DRIVER', profileId: { in: driverIds } } }).catch(() => undefined);
  }
  if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined);
  if (vehicleIds.length > 0) await prisma.vehicle.deleteMany({ where: { id: { in: vehicleIds } } }).catch(() => undefined);
  if (driverIds.length > 0) await prisma.driver.deleteMany({ where: { id: { in: driverIds } } }).catch(() => undefined);
}

async function main() {
  console.log('Driver Advance & Settlement Scenario Test');
  console.log(`API: ${BASE}`);

  const health = await request('GET', '/api/v1/health');
  if (health.status !== 200) throw new Error('Backend health check failed. Start local backend first.');
  pass('Backend health check');

  const adminIdentifier = process.env.CI_ADMIN_IDENTIFIER || process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
  const adminPassword = process.env.CI_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!adminIdentifier || !adminPassword) throw new Error('Missing admin credentials in environment');

  await cleanup();

  const adminToken = await login(adminIdentifier, adminPassword);
  pass('Admin login');

  const rolesRes = await request('GET', '/api/v1/roles', adminToken);
  const roles = rolesRes.data?.data?.items || rolesRes.data?.data || [];
  const driverRole = roles.find((r: any) => r.key === 'driver');
  if (!driverRole?.id) throw new Error('Driver role not found');

  const ts = Date.now();
  const driverRes = await request('POST', '/api/v1/drivers', adminToken, {
    name: `${PREFIX}_Driver_${ts}`,
    mobile: `+9198${String(ts).slice(-8)}`,
    licenseNumber: `${PREFIX}_LIC_${ts}`,
    status: 'AVAILABLE',
  });
  const driverId = driverRes.data?.data?.id;
  if (!driverId) throw new Error(`Driver creation failed: ${JSON.stringify(driverRes.data)}`);
  pass('Created test driver');

  const vehicleRes = await request('POST', '/api/v1/vehicles', adminToken, {
    vehicleNumber: `${PREFIX}_VEH_${ts}`,
    vehicleType: 'TRUCK',
    fuelType: 'DIESEL',
    currentDriverId: driverId,
  });
  const vehicleId = vehicleRes.data?.data?.id;
  if (!vehicleId) throw new Error(`Vehicle creation failed: ${JSON.stringify(vehicleRes.data)}`);
  pass('Created test vehicle');

  const driverUsername = `${PREFIX}_driver_${ts}`;
  const driverPassword = 'TestPass123!';
  const userRes = await request('POST', '/api/v1/users', adminToken, {
    name: `${PREFIX}_User_${ts}`,
    username: driverUsername,
    email: `${driverUsername}@local.test`,
    password: driverPassword,
    roleId: driverRole.id,
    status: 'ACTIVE',
  });
  const driverUserId = userRes.data?.data?.id;
  if (!driverUserId) throw new Error(`Driver user creation failed: ${JSON.stringify(userRes.data)}`);
  await prisma.userProfileLink.create({ data: { userId: driverUserId, profileType: 'DRIVER', profileId: driverId, isPrimary: true, status: 'ACTIVE' } });
  const driverToken = await login(driverUsername, driverPassword);
  pass('Created and linked driver user');

  const deniedAdvance = await request('POST', '/api/v1/driver-advances', driverToken, {
    driverId,
    vehicleId,
    amount: 5000,
    paymentMode: 'CASH',
  });
  if (deniedAdvance.status === 403) pass('Driver cannot create finance advance'); else fail(`Driver advance creation should be 403, got ${deniedAdvance.status}`);

  const advanceRes = await request('POST', '/api/v1/driver-advances', adminToken, {
    driverId,
    vehicleId,
    amount: 5000,
    paymentMode: 'CASH',
    purpose: 'Trip diesel/toll/food advance',
  });
  const advance = advanceRes.data?.data;
  if (!advance?.id) throw new Error(`Advance creation failed: ${JSON.stringify(advanceRes.data)}`);
  pass('Admin created driver advance');

  const issueRes = await request('PATCH', `/api/v1/driver-advances/${advance.id}/issue`, adminToken, { paymentMode: 'CASH' });
  if (issueRes.data?.data?.status !== 'ISSUED') throw new Error(`Advance issue failed: ${JSON.stringify(issueRes.data)}`);
  pass('Admin issued advance');

  const myAdvance = await request('GET', `/api/v1/me/driver-advances/${advance.id}`, driverToken);
  if (myAdvance.status === 200 && myAdvance.data?.data?.issuedAmount === 5000) pass('Driver can view own issued advance'); else fail('Driver cannot view own issued advance');

  await prisma.fuelEntry.create({
    data: {
      vehicleId,
      driverId,
      fuelDate: new Date(),
      fuelType: 'DIESEL',
      totalAmount: 2500,
      status: 'APPROVED',
      createdById: driverUserId,
      approvedById: driverUserId,
      approvedAt: new Date(),
    },
  });
  await prisma.expense.create({
    data: {
      vehicleId,
      driverId,
      category: 'TOLL',
      expenseDate: new Date(),
      amount: 500,
      status: 'APPROVED',
      createdById: driverUserId,
      approvedById: driverUserId,
      approvedAt: new Date(),
    },
  });
  pass('Seeded approved fuel and expense spends');

  const settlementRes = await request('POST', `/api/v1/driver-advances/${advance.id}/settlements`, adminToken, {
    returnedCashAmount: 2000,
    includeApprovedFuel: true,
    includeApprovedExpenses: true,
    notes: 'Expected zero-balance settlement',
  });
  const settlement = settlementRes.data?.data;
  if (!settlement?.id) throw new Error(`Settlement creation failed: ${JSON.stringify(settlementRes.data)}`);
  if (settlement.approvedFuelTotal === 2500 && settlement.approvedExpenseTotal === 500 && settlement.balanceDueFromDriver === 0) {
    pass('Settlement calculated fuel + expense + cash return correctly');
  } else {
    fail(`Unexpected settlement calculation: ${JSON.stringify(settlement)}`);
  }

  const submitRes = await request('PATCH', `/api/v1/driver-settlements/${settlement.id}/submit`, adminToken, {});
  if (submitRes.data?.data?.status === 'SUBMITTED') pass('Settlement submitted'); else fail('Settlement submit failed');

  const approveRes = await request('PATCH', `/api/v1/driver-settlements/${settlement.id}/approve`, adminToken, { reason: 'Bills verified' });
  if (approveRes.data?.data?.status === 'APPROVED') pass('Settlement approved'); else fail('Settlement approve failed');

  const settleRes = await request('PATCH', `/api/v1/driver-settlements/${settlement.id}/settle`, adminToken, { paymentMode: 'CASH' });
  const settled = settleRes.data?.data;
  if (settled?.status === 'SETTLED' && settled.balanceDueFromDriver === 0 && settled.reimbursementDueToDriver === 0) {
    pass('Settlement settled with zero balance');
  } else {
    fail(`Settlement close failed: ${JSON.stringify(settleRes.data)}`);
  }

  const finalAdvance = await request('GET', `/api/v1/driver-advances/${advance.id}`, adminToken);
  if (finalAdvance.data?.data?.status === 'SETTLED' && finalAdvance.data?.data?.balanceAmount === 0) {
    pass('Advance marked SETTLED with zero balance');
  } else {
    fail(`Advance final state invalid: ${JSON.stringify(finalAdvance.data)}`);
  }

  console.log('\nSummary');
  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);

  if (failed > 0) process.exit(1);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
