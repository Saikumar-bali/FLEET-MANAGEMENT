/**
 * Canonical staff-finance end-to-end invariants.
 *
 * Requires a migrated/seeded database and a running backend. The fixture data
 * is intentionally unique so the suite is safe to run more than once.
 */
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

const BASE = process.env.API_BASE_URL || 'http://127.0.0.1:4000';
const PREFIX = `STAFF_FIN_E2E_${Date.now()}`;
let passed = 0;

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function pass(message: string) {
  passed += 1;
  console.log(`PASS ${message}`);
}

async function api(method: string, path: string, token?: string, body?: unknown) {
  const response = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let payload: any = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { raw }; }
  return { status: response.status, body: payload, data: payload?.data };
}

async function login(identifier: string | undefined, password: string | undefined) {
  expect(identifier && password, 'Missing CI login credential');
  const response = await api('POST', '/auth/login', undefined, { identifier, password });
  expect(response.status === 200 && response.data?.accessToken, `Login failed for ${identifier}: ${response.status}`);
  return response.data.accessToken as string;
}

function tokenSubject(token: string): string {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { sub?: string };
  expect(payload.sub, 'Authenticated token has no user subject');
  return payload.sub;
}

async function createFixtureUser(roleKey: string, suffix: string, password = 'Fixture123!') {
  const role = await prisma.role.findUnique({ where: { key: roleKey } });
  expect(role, `Missing ${roleKey} role`);
  const username = `${PREFIX}_${suffix}`.toLowerCase();
  const user = await prisma.user.create({
    data: {
      name: `${PREFIX} ${suffix}`,
      username,
      email: `${username}@example.invalid`,
      passwordHash: await bcrypt.hash(password, 10),
      roleId: role.id,
      status: 'ACTIVE',
    },
  });
  return { user, username, password };
}

async function createAdvance(adminToken: string, financeToken: string, input: Record<string, unknown>) {
  const created = await api('POST', '/finance/staff-advances', adminToken, input);
  expect(created.status === 201 && created.data?.id, `Create advance failed: ${created.status} ${JSON.stringify(created.body)}`);
  const submitted = await api('PATCH', `/finance/staff-advances/${created.data.id}/submit`, adminToken, {});
  expect(submitted.status === 200 && submitted.data.status === 'SUBMITTED', 'Advance did not submit');
  const selfApproval = await api('PATCH', `/finance/staff-advances/${created.data.id}/approve`, adminToken, {});
  expect(selfApproval.status === 409, `Maker-checker expected 409, received ${selfApproval.status}`);
  const approved = await api('PATCH', `/finance/staff-advances/${created.data.id}/approve`, financeToken, {});
  expect(approved.status === 200 && approved.data.status === 'APPROVED', 'Independent approval failed');
  const funded = await api('PATCH', `/finance/staff-advances/${created.data.id}/fund`, financeToken, { accountId: input.accountId });
  expect(funded.status === 200 && funded.data.status === 'ACTIVE', `Advance funding failed: ${funded.status} ${JSON.stringify(funded.body)}`);
  return funded.data;
}

async function closeSettlement(
  adminToken: string,
  financeToken: string,
  managerToken: string,
  accountId: string,
  advanceId: string,
  disposition: 'RETURN' | 'CARRY_FORWARD',
  declaredReturnAmount = 0,
) {
  const created = await api('POST', '/finance/staff-settlements', adminToken, { advanceId, disposition, declaredReturnAmount });
  expect(created.status === 201 && created.data?.id, `Create settlement failed: ${created.status} ${JSON.stringify(created.body)}`);
  const submitted = await api('PATCH', `/finance/staff-settlements/${created.data.id}/submit`, adminToken, {});
  expect(submitted.status === 200 && submitted.data.status === 'SUBMITTED', `Settlement submit failed: ${JSON.stringify(submitted.body)}`);
  const creatorApproval = await api('PATCH', `/finance/staff-settlements/${created.data.id}/approve`, adminToken, {});
  expect(creatorApproval.status === 409, 'Settlement creator must not approve');
  const approved = await api('PATCH', `/finance/staff-settlements/${created.data.id}/approve`, financeToken, {});
  expect(approved.status === 200 && approved.data.status === 'APPROVED', 'Settlement approval failed');
  const approverConfirm = await api('PATCH', `/finance/staff-settlements/${created.data.id}/confirm`, financeToken, { accountId });
  expect(approverConfirm.status === 409, 'Settlement approver must not act as cashier');
  const confirmed = await api('PATCH', `/finance/staff-settlements/${created.data.id}/confirm`, managerToken, { accountId, paymentMode: 'CASH', referenceNumber: `${PREFIX}-CASH` });
  expect(confirmed.status === 200 && confirmed.data.status === 'CLOSED' && confirmed.data.cashReceiptNumber, `Settlement close failed: ${JSON.stringify(confirmed.body)}`);
  return confirmed.data;
}

async function main() {
  const health = await api('GET', '/health');
  expect(health.status === 200, 'Backend health check failed');
  pass('Backend is healthy');

  const [adminToken, financeToken, managerToken] = await Promise.all([
    login(process.env.CI_ADMIN_IDENTIFIER || process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME, process.env.CI_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD),
    login(process.env.CI_FINANCE_IDENTIFIER, process.env.CI_FINANCE_PASSWORD),
    login(process.env.CI_MANAGER_IDENTIFIER, process.env.CI_MANAGER_PASSWORD),
  ]);
  pass('Creator, approver, and cashier authenticated separately');

  const [mechanic, collector, driverFixture] = await Promise.all([
    createFixtureUser('mechanic', 'mechanic'),
    createFixtureUser('collector', 'collector'),
    createFixtureUser('driver', 'driver'),
  ]);
  const driverToken = await login(driverFixture.username, driverFixture.password);

  const accountResponse = await api('POST', '/finance/accounts', adminToken, { name: `${PREFIX} Treasury`, type: 'BANK', bankName: 'E2E Bank', accountNumberMasked: '****2207', openingBalance: 500000 });
  expect(accountResponse.status === 201 && accountResponse.data?.id, `Account creation failed: ${JSON.stringify(accountResponse.body)}`);
  const accountId = accountResponse.data.id as string;
  expect(Number(accountResponse.data.currentBalance) === 500000, 'Opening balance must initialize the live balance');
  pass('Opening balance initializes spendable account balance');

  const initialMechanic = await createAdvance(adminToken, financeToken, {
    beneficiaryUserId: mechanic.user.id, contextType: 'OTHER', contextId: `${PREFIX}-MECH-SEED`, accountId,
    targetAllowance: 5000, fundingMode: 'PRESERVE_EXISTING_BALANCE', paymentMode: 'CASH',
  });
  await closeSettlement(adminToken, financeToken, managerToken, accountId, initialMechanic.id, 'CARRY_FORWARD');
  const mechanicSeedWallet = await prisma.staffWallet.findUniqueOrThrow({ where: { userId: mechanic.user.id } });
  expect(Number(mechanicSeedWallet.currentBalance) === 5000 && Number(mechanicSeedWallet.reservedBalance) === 0, 'Mechanic carry-forward seed should leave ₹5,000 available');

  const reuse = await createAdvance(adminToken, financeToken, {
    beneficiaryUserId: mechanic.user.id, contextType: 'OTHER', contextId: `${PREFIX}-MECH-REUSE`, accountId,
    targetAllowance: 15000, fundingMode: 'USE_EXISTING_BALANCE', paymentMode: 'CASH',
  });
  expect(Number(reuse.existingBalanceAllocated) === 5000 && Number(reuse.newCashIssued) === 10000, '₹5,000 reuse scenario must issue only ₹10,000');
  const reuseWallet = await prisma.staffWallet.findUniqueOrThrow({ where: { userId: mechanic.user.id } });
  expect(Number(reuseWallet.currentBalance) === 15000 && Number(reuseWallet.reservedBalance) === 15000, 'Reuse wallet totals are incorrect');
  const cancelReuse = await api('PATCH', `/finance/staff-advances/${reuse.id}/cancel`, adminToken, { reason: 'E2E cancellation reversal' });
  expect(cancelReuse.status === 200 && cancelReuse.data.status === 'CANCELLED', 'Advance cancellation failed');
  const mechanicAfterCancel = await prisma.staffWallet.findUniqueOrThrow({ where: { userId: mechanic.user.id } });
  expect(Number(mechanicAfterCancel.currentBalance) === 5000 && Number(mechanicAfterCancel.reservedBalance) === 0, 'Cancellation must restore the original available balance');
  pass('₹5,000 + ₹10,000 reuse and cancellation reversal');

  const initialCollector = await createAdvance(adminToken, financeToken, {
    beneficiaryUserId: collector.user.id, contextType: 'OTHER', contextId: `${PREFIX}-COLLECTOR-SEED`, accountId,
    targetAllowance: 5000, fundingMode: 'PRESERVE_EXISTING_BALANCE', paymentMode: 'CASH',
  });
  await closeSettlement(adminToken, financeToken, managerToken, accountId, initialCollector.id, 'CARRY_FORWARD');
  const preserve = await createAdvance(adminToken, financeToken, {
    beneficiaryUserId: collector.user.id, contextType: 'OTHER', contextId: `${PREFIX}-COLLECTOR-PRESERVE`, accountId,
    targetAllowance: 15000, fundingMode: 'PRESERVE_EXISTING_BALANCE', paymentMode: 'CASH',
  });
  expect(Number(preserve.existingBalanceAllocated) === 0 && Number(preserve.newCashIssued) === 15000, 'Preserve mode must issue the full ₹15,000');
  const preserveWallet = await prisma.staffWallet.findUniqueOrThrow({ where: { userId: collector.user.id } });
  expect(Number(preserveWallet.currentBalance) === 20000 && Number(preserveWallet.reservedBalance) === 15000, 'Preserve wallet should hold ₹20,000 with ₹15,000 reserved');
  await closeSettlement(adminToken, financeToken, managerToken, accountId, preserve.id, 'CARRY_FORWARD');
  const collectorClosed = await prisma.staffWallet.findUniqueOrThrow({ where: { userId: collector.user.id } });
  expect(Number(collectorClosed.currentBalance) === 20000 && Number(collectorClosed.reservedBalance) === 0, 'Carry-forward must release reservation without reducing custody');
  expect(collectorClosed.id !== mechanicAfterCancel.id, 'Mechanic and collector wallets must be isolated');
  pass('₹5,000 + ₹15,000 preserve, carry-forward, and role isolation');

  const driver = await prisma.driver.create({ data: { name: `${PREFIX} Driver`, mobile: `91${String(Date.now()).slice(-10)}`, licenseNumber: `${PREFIX}-LIC`, status: 'ON_TRIP' } });
  const vehicle = await prisma.vehicle.create({ data: { vehicleNumber: `${PREFIX}-VEH`, vehicleType: 'TRUCK', fuelType: 'DIESEL', currentDriverId: driver.id, status: 'ON_TRIP' } });
  const adminUser = await prisma.user.findUnique({ where: { id: tokenSubject(adminToken) } });
  expect(adminUser, 'Admin fixture user not found for vehicle-scoped review');
  await prisma.userDataScope.create({
    data: {
      userId: adminUser.id,
      scopeType: 'VEHICLE',
      scopeId: vehicle.id,
      accessLevel: 'UPDATE',
      reason: `${PREFIX} reviewer scope`,
    },
  });
  expect(await prisma.userDataScope.findFirst({ where: { userId: adminUser.id, scopeType: 'VEHICLE', scopeId: vehicle.id, accessLevel: 'UPDATE' } }), 'Reviewer vehicle scope was not persisted');
  await prisma.userProfileLink.create({ data: { userId: driverFixture.user.id, profileType: 'DRIVER', profileId: driver.id, isPrimary: true, status: 'ACTIVE' } });
  const trip = await prisma.trip.create({ data: { tripNumber: `${PREFIX}-TRIP`, tripType: 'DELIVERY', status: 'STARTED', vehicleId: vehicle.id, driverId: driver.id, originName: 'Hyderabad', destinationName: 'Pune', actualStartAt: new Date(), startOdometer: 1000, createdById: driverFixture.user.id } });
  const tripAdvance = await createAdvance(adminToken, financeToken, {
    beneficiaryUserId: driverFixture.user.id, contextType: 'TRIP', contextId: trip.id, tripId: trip.id, vehicleId: vehicle.id, accountId,
    targetAllowance: 15000, fundingMode: 'PRESERVE_EXISTING_BALANCE', paymentMode: 'CASH',
  });

  const fuel = await api('POST', '/me/driver-fuel', driverToken, { vehicleId: vehicle.id, tripId: trip.id, totalAmount: 2500, quantityLiters: 25, paymentSource: 'STAFF_WALLET', paymentMode: 'CASH' });
  expect(fuel.status === 201, `Driver fuel creation failed: ${JSON.stringify(fuel.body)}`);
  expect((await api('POST', `/fuel/${fuel.data.id}/submit`, driverToken, {})).status === 200, 'Fuel submission failed');
  const fuelApproval = await api('POST', `/fuel/${fuel.data.id}/approve`, adminToken, {});
  expect(fuelApproval.status === 200, `Fuel approval failed: ${fuelApproval.status} ${JSON.stringify(fuelApproval.body)}`);
  const duplicateFuelApproval = await api('POST', `/fuel/${fuel.data.id}/approve`, adminToken, {});
  expect(duplicateFuelApproval.status >= 400, 'Duplicate approval must be rejected');
  const fuelDebits = await prisma.staffWalletEntry.count({ where: { sourceType: 'FUEL', sourceId: fuel.data.id, entryType: 'EXPENSE' } });
  expect(fuelDebits === 1, 'Fuel approval must create exactly one wallet debit');

  const companyExpense = await api('POST', '/me/driver-expenses', driverToken, { vehicleId: vehicle.id, tripId: trip.id, category: 'TOLL', amount: 300, paymentSource: 'COMPANY_ACCOUNT', financeAccountId: accountId });
  expect(companyExpense.status === 201, 'Company-paid expense creation failed');
  const walletBeforeCompanyApproval = await prisma.staffWallet.findUniqueOrThrow({ where: { userId: driverFixture.user.id } });
  expect((await api('PATCH', `/driver-submissions/expenses/${companyExpense.data.id}/approve`, adminToken, { reason: 'Receipt verified' })).status === 200, 'Company-paid expense approval failed');
  const walletAfterCompanyApproval = await prisma.staffWallet.findUniqueOrThrow({ where: { userId: driverFixture.user.id } });
  expect(walletAfterCompanyApproval.currentBalance.equals(walletBeforeCompanyApproval.currentBalance), 'Company-paid expense must not debit staff wallet');

  const personalExpense = await api('POST', '/me/driver-expenses', driverToken, { vehicleId: vehicle.id, tripId: trip.id, category: 'MEALS', amount: 500, paymentSource: 'PERSONAL_MONEY' });
  expect(personalExpense.status === 201, 'Personal expense creation failed');
  expect((await api('PATCH', `/driver-submissions/expenses/${personalExpense.data.id}/approve`, adminToken, { reason: 'Receipt verified' })).status === 200, 'Personal expense approval failed');

  const rejectedExpense = await api('POST', '/me/driver-expenses', driverToken, { vehicleId: vehicle.id, tripId: trip.id, category: 'OTHER', amount: 999, paymentSource: 'STAFF_WALLET' });
  expect((await api('PATCH', `/driver-submissions/expenses/${rejectedExpense.data.id}/reject`, adminToken, { reason: 'Receipt invalid' })).status === 200, 'Expense rejection failed');
  expect(await prisma.journalEntry.count({ where: { sourceType: 'EXPENSE', sourceId: rejectedExpense.data.id } }) === 0, 'Rejected expense must not post to the journal');
  pass('Wallet, company-paid, personal-money, duplicate, and rejected expense posting');

  const completed = await api('POST', `/trips/${trip.id}/complete`, adminToken, { endOdometer: 1250 });
  expect(completed.status === 200 && completed.data.status === 'COMPLETED', `Trip completion failed: ${JSON.stringify(completed.body)}`);
  const automaticSettlement = await prisma.staffSettlement.findFirst({ where: { advanceId: tripAdvance.id, status: 'DRAFT' } });
  expect(automaticSettlement, 'Trip completion must automatically open a settlement');
  expect(Number(automaticSettlement.declaredReturnAmount) === 12500 && Number(automaticSettlement.reimbursementAmount) === 500, 'Automatic settlement amounts are incorrect');
  await api('PATCH', `/finance/staff-settlements/${automaticSettlement.id}/submit`, adminToken, {});
  await api('PATCH', `/finance/staff-settlements/${automaticSettlement.id}/approve`, financeToken, {});
  const driverClose = await api('PATCH', `/finance/staff-settlements/${automaticSettlement.id}/confirm`, managerToken, { accountId, paymentMode: 'CASH', referenceNumber: `${PREFIX}-RETURN` });
  expect(driverClose.status === 200 && driverClose.data.status === 'CLOSED', `Driver settlement close failed: ${JSON.stringify(driverClose.body)}`);
  const driverWallet = await prisma.staffWallet.findUniqueOrThrow({ where: { userId: driverFixture.user.id } });
  expect(Number(driverWallet.currentBalance) === 0 && Number(driverWallet.reservedBalance) === 0, 'Return settlement must clear custody and reservation');
  pass('Trip completion, cash return, receipt, and personal reimbursement closure');

  const policy = await api('POST', '/finance/allowance-policies', adminToken, { name: `${PREFIX} Delivery policy`, tripType: 'DELIVERY', baseAmount: 800, perKmAmount: 0, autoApproveThreshold: 1000, fundingMode: 'USE_EXISTING_BALANCE', accountId, paymentMode: 'CASH', autoFund: false });
  expect(policy.status === 201, 'Allowance policy creation failed');
  const policyTrip = await prisma.trip.create({ data: { tripNumber: `${PREFIX}-POLICY-TRIP`, tripType: 'DELIVERY', status: 'DRAFT', vehicleId: vehicle.id, driverId: driver.id, originName: 'Pune', destinationName: 'Mumbai', createdById: driverFixture.user.id } });
  const scheduled = await api('POST', `/trips/${policyTrip.id}/schedule`, adminToken, { driverId: driver.id });
  expect(scheduled.status === 200 && scheduled.data.trip?.status === 'SCHEDULED', `Trip scheduling failed: ${JSON.stringify(scheduled.body)}`);
  const automaticAdvance = await prisma.staffAdvance.findUnique({ where: { beneficiaryUserId_contextType_contextId: { beneficiaryUserId: driverFixture.user.id, contextType: 'TRIP', contextId: policyTrip.id } } });
  expect(automaticAdvance?.status === 'APPROVED' && Number(automaticAdvance.targetAllowance) === 800, 'Trip policy must create and auto-approve its allowance');
  await api('PATCH', `/finance/staff-advances/${automaticAdvance.id}/cancel`, adminToken, { reason: 'E2E policy cleanup' });
  pass('Scheduling applies allowance policy automatically');

  const vendor = await prisma.vendor.create({ data: { vendorCode: `${PREFIX}-VEN`, name: `${PREFIX} Vendor`, vendorType: 'GENERAL' } });
  const category = await prisma.financeCategory.create({ data: { name: `${PREFIX} Vendor cost`, type: 'EXPENSE', module: 'GENERAL' } });
  const transaction = await api('POST', '/finance/transactions', financeToken, { transactionType: 'EXPENSE', sourceModule: 'MANUAL', vendorId: vendor.id, accountId, categoryId: category.id, amount: 1000, taxAmount: 0, transactionDate: new Date().toISOString(), paymentMode: 'BANK_TRANSFER', description: 'E2E vendor payable' });
  expect(transaction.status === 201 && !transaction.data.financialPostedAt, 'Manual transaction must begin as an editable draft');
  const postedTransaction = await api('PATCH', `/finance/transactions/${transaction.data.id}/post`, adminToken, {});
  expect(postedTransaction.status === 200 && postedTransaction.data.financialPostedAt, `Transaction posting failed: ${JSON.stringify(postedTransaction.body)}`);
  expect(await prisma.journalEntry.count({ where: { sourceType: 'FINANCE_TRANSACTION', sourceId: transaction.data.id } }) === 1, 'Posting must create one immutable recognition journal');
  const beforeOutgoing = await prisma.financeAccount.findUniqueOrThrow({ where: { id: accountId } });
  const outgoing = await api('POST', '/finance/payments', financeToken, { direction: 'OUTGOING', transactionId: transaction.data.id, vendorId: vendor.id, accountId, amount: 1000, paymentDate: new Date().toISOString(), paymentMode: 'BANK_TRANSFER', referenceNumber: `${PREFIX}-VENDOR` });
  expect(outgoing.status === 201, `Outgoing payment failed: ${JSON.stringify(outgoing.body)}`);
  const afterOutgoing = await prisma.financeAccount.findUniqueOrThrow({ where: { id: accountId } });
  expect(beforeOutgoing.currentBalance.minus(afterOutgoing.currentBalance).equals(new Prisma.Decimal(1000)), 'Vendor payment must reduce the selected account');
  expect((await prisma.financeTransaction.findUniqueOrThrow({ where: { id: transaction.data.id } })).paymentStatus === 'PAID', 'Vendor payment must close the posted payable');

  const billing = await prisma.tripBilling.create({ data: { tripId: policyTrip.id, vehicleId: vehicle.id, driverId: driver.id, invoiceNumber: `${PREFIX}-INV`, invoiceDate: new Date(), freightAmount: 1000, taxableAmount: 1000, totalAmount: 1000, netReceivable: 1000, balanceAmount: 1000, paymentStatus: 'BILLED' } });
  const paymentBody = { direction: 'INCOMING', tripBillingId: billing.id, accountId, amount: 800, paymentDate: new Date().toISOString(), paymentMode: 'BANK_TRANSFER' };
  const concurrent = await Promise.all([api('POST', '/finance/payments', financeToken, paymentBody), api('POST', '/finance/payments', financeToken, paymentBody)]);
  expect(concurrent.filter((result) => result.status === 201).length === 1 && concurrent.filter((result) => result.status >= 400).length === 1, `Concurrent overpayment guard failed: ${concurrent.map((result) => result.status).join(',')}`);
  const partial = await prisma.tripBilling.findUniqueOrThrow({ where: { id: billing.id } });
  expect(Number(partial.paidAmount) === 800 && Number(partial.balanceAmount) === 200 && partial.paymentStatus === 'PARTIALLY_PAID', 'Concurrent collection must leave one valid partial payment');
  const finalPayment = await api('POST', '/finance/payments', financeToken, { ...paymentBody, amount: 200 });
  expect(finalPayment.status === 201, 'Final invoice payment failed');
  expect((await api('PATCH', `/finance/payments/${finalPayment.data.id}/reconcile`, adminToken, { status: 'REJECTED', notes: 'Bank rejected transfer' })).status === 200, 'Rejected reconciliation failed');
  const afterReject = await prisma.tripBilling.findUniqueOrThrow({ where: { id: billing.id } });
  expect(Number(afterReject.paidAmount) === 800 && afterReject.paymentStatus === 'PARTIALLY_PAID', 'Rejected reconciliation must reverse invoice allocation');
  const replacement = await api('POST', '/finance/payments', financeToken, { ...paymentBody, amount: 200, referenceNumber: `${PREFIX}-REPLACEMENT` });
  expect(replacement.status === 201, 'Replacement payment failed');
  expect((await api('PATCH', `/finance/payments/${replacement.data.id}/reconcile`, adminToken, { status: 'RECONCILED' })).status === 200, 'Payment reconciliation failed');
  const paid = await prisma.tripBilling.findUniqueOrThrow({ where: { id: billing.id } });
  expect(Number(paid.balanceAmount) === 0 && paid.paymentStatus === 'PAID', 'Replacement payment must close invoice');
  pass('Posted payable, vendor outflow, concurrent collection, rejection reversal, and invoice closure');

  const pnl = await api('GET', `/finance/pnl?tripId=${trip.id}`, adminToken);
  expect(pnl.status === 200 && Number(pnl.data.totalExpenses) === 3300, `Posted-journal P&L expected ₹3,300, got ${JSON.stringify(pnl.body)}`);
  const journals = await prisma.journalEntry.findMany({ where: { idempotencyKey: { contains: PREFIX } }, include: { lines: true } });
  // Most production idempotency keys use source IDs, so check every journal, not just prefix-named fixtures.
  const allJournals = await prisma.journalEntry.findMany({ include: { lines: true } });
  for (const journal of allJournals) {
    const debit = journal.lines.filter((line) => line.side === 'DEBIT').reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
    const credit = journal.lines.filter((line) => line.side === 'CREDIT').reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
    expect(debit.equals(credit) && debit.greaterThan(0), `Unbalanced journal ${journal.entryNumber}`);
  }
  expect(journals.length === 0 || journals.every((journal) => journal.lines.length >= 2), 'Fixture journals must have balanced line pairs');
  pass('P&L reads posted journals only and every journal balances');

  console.log(`\nStaff finance E2E passed: ${passed} scenario groups`);
}

main()
  .catch((error) => {
    console.error('STAFF FINANCE E2E FAILED', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
