/**
 * Driver Advance & Settlement Scenario Test
 *
 * Local/CI workflow test for:
 * finance/admin creates -> submits -> approves -> issues advance -> approved fuel/expense -> cash return -> settlement close.
 *
 * Required:
 * - backend running on API_BASE_URL or http://127.0.0.1:4000
 * - DATABASE_URL pointing to the same database
 * - migrations applied
 * - admin credentials in CI_ADMIN_IDENTIFIER/CI_ADMIN_PASSWORD or ADMIN_USERNAME/ADMIN_PASSWORD or ADMIN_EMAIL/ADMIN_PASSWORD
 *
 * This script never prints credentials or tokens.
 */

import http from 'http';
import https from 'https';
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

    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(url, { method, headers }, (res) => {
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
    for (const driverId of driverIds) {
      await prisma.$executeRawUnsafe(`DELETE FROM driver_settlement_history WHERE advance_id IN (SELECT id FROM driver_advances WHERE driver_id = $1)`, driverId).catch(() => undefined);
      await prisma.$executeRawUnsafe(`DELETE FROM driver_settlement_lines WHERE settlement_id IN (SELECT id FROM driver_settlements WHERE driver_id = $1)`, driverId).catch(() => undefined);
      await prisma.$executeRawUnsafe(`DELETE FROM driver_settlements WHERE driver_id = $1`, driverId).catch(() => undefined);
      await prisma.$executeRawUnsafe(`DELETE FROM driver_advances WHERE driver_id = $1`, driverId).catch(() => undefined);
    }
    await prisma.fuelEntry.deleteMany({ where: { driverId: { in: driverIds } } }).catch(() => undefined);
    await prisma.expense.deleteMany({ where: { driverId: { in: driverIds } } }).catch(() => undefined);
    await prisma.userProfileLink.deleteMany({ where: { profileType: 'DRIVER', profileId: { in: driverIds } } }).catch(() => undefined);
  }
  if (userIds.length > 0) {
    await prisma.$executeRawUnsafe(`DELETE FROM staff_wallet_transactions WHERE wallet_id IN (SELECT id FROM staff_wallets WHERE user_id = ANY($1::text[]))`, userIds).catch(() => undefined);
    await prisma.$executeRawUnsafe(`DELETE FROM staff_wallets WHERE user_id = ANY($1::text[])`, userIds).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => undefined);
  }
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
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    purpose: 'Trip diesel/toll/food advance',
  });
  const advance = advanceRes.data?.data;
  if (!advance?.id) throw new Error(`Advance creation failed: ${JSON.stringify(advanceRes.data)}`);
  pass('Admin created draft driver advance');

  const duplicateRes = await request('POST', '/api/v1/driver-advances', adminToken, {
    driverId,
    vehicleId,
    amount: 1000,
    paymentMode: 'CASH',
  });
  if (duplicateRes.status === 409) pass('Duplicate active advance is blocked'); else fail(`Duplicate active advance should be 409, got ${duplicateRes.status}`);

  const submitAdvanceRes = await request('PATCH', `/api/v1/driver-advances/${advance.id}/submit`, adminToken, {});
  if (submitAdvanceRes.data?.data?.status === 'SUBMITTED') pass('Advance submitted for approval'); else fail(`Advance submit failed: ${JSON.stringify(submitAdvanceRes.data)}`);

  const approveAdvanceRes = await request('PATCH', `/api/v1/driver-advances/${advance.id}/approve`, adminToken, { reason: 'Trip approved by finance' });
  if (approveAdvanceRes.data?.data?.status === 'APPROVED') pass('Advance approved before issue'); else fail(`Advance approval failed: ${JSON.stringify(approveAdvanceRes.data)}`);

  const issueRes = await request('PATCH', `/api/v1/driver-advances/${advance.id}/issue`, adminToken, { paymentMode: 'CASH' });
  if (issueRes.data?.data?.status !== 'ISSUED') throw new Error(`Advance issue failed: ${JSON.stringify(issueRes.data)}`);
  pass('Admin issued approved advance');

  const walletAfterIssue = await request('GET', '/api/v1/me/staff-wallet', driverToken);
  if (walletAfterIssue.data?.data?.currentBalance === 5000) pass('Advance auto-credited driver staff wallet'); else fail(`Expected wallet 5000 after issue: ${JSON.stringify(walletAfterIssue.data)}`);

  const myAdvance = await request('GET', `/api/v1/me/driver-advances/${advance.id}`, driverToken);
  if (myAdvance.status === 200 && myAdvance.data?.data?.issuedAmount === 5000) pass('Driver can view own issued advance'); else fail('Driver cannot view own issued advance');

  await prisma.fuelEntry.create({
    data: {
      vehicleId,
      driverId,
      fuelDate: new Date(),
      fuelType: 'DIESEL',
      totalAmount: 2500,
      status: 'SUBMITTED',
      createdById: driverUserId,
    },
  });
  await prisma.expense.create({
    data: {
      vehicleId,
      driverId,
      category: 'TOLL',
      expenseDate: new Date(),
      amount: 500,
      status: 'SUBMITTED',
      createdById: driverUserId,
    },
  });
  const fuel = await prisma.fuelEntry.findFirst({ where: { driverId, status:'SUBMITTED' }, orderBy:{createdAt:'desc'} });
  const expense = await prisma.expense.findFirst({ where: { driverId, status:'SUBMITTED' }, orderBy:{createdAt:'desc'} });
  const fuelApproval = await request('POST', `/api/v1/fuel/${fuel!.id}/approve`, adminToken, { notes:'verified' });
  const expenseApproval = await request('POST', `/api/v1/expenses/${expense!.id}/approve`, adminToken, { notes:'verified' });
  if (fuelApproval.status === 200 && expenseApproval.status === 200) pass('Approved fuel and expense through real workflow'); else fail('Fuel/expense approval failed');
  const walletAfterSpend = await request('GET', '/api/v1/me/staff-wallet', driverToken);
  if (walletAfterSpend.data?.data?.currentBalance === 2000) pass('Fuel and expense auto-debited wallet exactly once'); else fail(`Expected live wallet balance 2000: ${JSON.stringify(walletAfterSpend.data)}`);

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

  const walletAfterReturn = await request('GET', '/api/v1/me/staff-wallet', driverToken);
  if (walletAfterReturn.data?.data?.currentBalance === 0) pass('Returned cash debited wallet and closed accountability'); else fail(`Expected zero wallet after return: ${JSON.stringify(walletAfterReturn.data)}`);

  const adjustmentRef = `opening-carry-${ts}`;
  const adjustment = await request('POST', `/api/v1/staff-wallets/${driverUserId}/transactions`, adminToken, { direction:'CREDIT', amount:5000, reason:'Existing carried staff cash for allowance scenario', reference:adjustmentRef });
  if (adjustment.status === 201) pass('Role-neutral staff wallet adjustment works'); else fail(`Wallet adjustment failed: ${JSON.stringify(adjustment.data)}`);

  const allowanceRes = await request('POST', '/api/v1/driver-advances', adminToken, { driverId, vehicleId, amount:15000, includeExistingBalance:true, paymentMode:'CASH', purpose:'₹15,000 trip allowance using ₹5,000 existing cash' });
  const allowance = allowanceRes.data?.data;
  await request('PATCH', `/api/v1/driver-advances/${allowance.id}/submit`, adminToken, {});
  await request('PATCH', `/api/v1/driver-advances/${allowance.id}/approve`, adminToken, { reason:'Allowance approved' });
  const allowanceIssue = await request('PATCH', `/api/v1/driver-advances/${allowance.id}/issue`, adminToken, { paymentMode:'CASH' });
  const issuedAllowance = allowanceIssue.data?.data;
  if (issuedAllowance?.existingBalanceApplied === 5000 && issuedAllowance?.cashIssuedAmount === 10000 && issuedAllowance?.walletBalance === 15000) pass('₹5,000 existing + ₹10,000 issued = ₹15,000 allowance'); else fail(`Existing-balance allowance failed: ${JSON.stringify(allowanceIssue.data)}`);

  const carryDraft = await request('POST', `/api/v1/driver-advances/${allowance.id}/settlements`, adminToken, { returnedCashAmount:0, includeApprovedFuel:true, includeApprovedExpenses:true, balanceDisposition:'CARRY_FORWARD', notes:'Keep for next allowance' });
  const carryId = carryDraft.data?.data?.id;
  await request('PATCH', `/api/v1/driver-settlements/${carryId}/submit`, adminToken, {});
  await request('PATCH', `/api/v1/driver-settlements/${carryId}/approve`, adminToken, { reason:'Carry approved' });
  const carryClose = await request('PATCH', `/api/v1/driver-settlements/${carryId}/settle`, adminToken, { paymentMode:'CASH', balanceDisposition:'CARRY_FORWARD' });
  const walletAfterCarry = await request('GET', '/api/v1/me/staff-wallet', driverToken);
  if (carryClose.data?.data?.status === 'SETTLED' && walletAfterCarry.data?.data?.currentBalance === 15000) pass('Settlement can close while retaining wallet cash for future allowances'); else fail('Carry-forward settlement failed');

  const report = await request('GET', '/api/v1/driver-advances/reports/summary', adminToken);
  if (report.status === 200 && report.data?.data?.summary) pass('Advance summary report available'); else fail('Advance summary report failed');

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
