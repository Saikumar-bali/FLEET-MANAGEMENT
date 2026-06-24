import { PrismaClient } from '@prisma/client';
import { getAdminCredential, getApiBase } from './test-helpers/credentials';

const BASE_URL = getApiBase();
const prisma = new PrismaClient();
const PREFIX = `PH7_TEST_${Date.now()}`;

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];
const createdIds: { type: string; id: string }[] = [];

async function apiCall(
  method: string,
  path: string,
  token: string,
  body?: Record<string, unknown>,
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  return { status: res.status, data };
}

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, message: 'OK', duration: Date.now() - start });
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, message: err.message || String(err), duration: Date.now() - start });
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

function expect(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function main() {
  console.log('\n📋 Finance & P&L Workflow Test Suite\n');
  console.log('─'.repeat(60));
  console.log(`  Test prefix: ${PREFIX}\n`);

  // Login
  const adminCred = getAdminCredential();
  const loginRes = await apiCall('POST', '/api/v1/auth/login', '', {
    identifier: adminCred.identifier,
    password: adminCred.password,
  });
  expect(loginRes.status === 200, `Login failed: ${loginRes.status} ${loginRes.data?.message || ''}`);
  const token = loginRes.data.data.accessToken;
  expect(!!token, 'No access token');
  console.log('  ✓ Authenticated as admin\n');

  // ─── 1. Finance Accounts ───
  console.log('Finance Accounts');
  let accountId: string;
  await runTest('Create finance account with Indian bank', async () => {
    const res = await apiCall('POST', '/api/v1/finance/accounts', token, {
      name: `${PREFIX}_HDFC_MAIN`,
      type: 'BANK',
      bankName: 'HDFC Bank',
      accountNumberMasked: '****5678',
      openingBalance: 500000,
    });
    expect(res.status === 201, `Expected 201, got ${res.status}: ${res.data?.message || ''}`);
    accountId = res.data.data.id;
    createdIds.push({ type: 'account', id: accountId });
  });

  await runTest('List finance accounts', async () => {
    const res = await apiCall('GET', '/api/v1/finance/accounts', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(Array.isArray(res.data.data?.data ?? res.data.data), 'Expected array in response');
  });

  // ─── 2. Finance Categories ───
  console.log('\nFinance Categories');
  let incomeCategoryId: string;
  let expenseCategoryId: string;
  await runTest('Create income category', async () => {
    const res = await apiCall('POST', '/api/v1/finance/categories', token, {
      name: `${PREFIX}_Trip_Revenue`,
      type: 'INCOME',
      module: 'TRIP',
    });
    expect(res.status === 201, `Expected 201, got ${res.status}`);
    incomeCategoryId = res.data.data.id;
    createdIds.push({ type: 'category', id: incomeCategoryId });
  });

  await runTest('Create expense category', async () => {
    const res = await apiCall('POST', '/api/v1/finance/categories', token, {
      name: `${PREFIX}_Fuel_Cost`,
      type: 'EXPENSE',
      module: 'FUEL',
    });
    expect(res.status === 201, `Expected 201, got ${res.status}`);
    expenseCategoryId = res.data.data.id;
    createdIds.push({ type: 'category', id: expenseCategoryId });
  });

  await runTest('Reject invalid category type', async () => {
    const res = await apiCall('POST', '/api/v1/finance/categories', token, {
      name: 'Bad Category',
      type: 'INVALID',
      module: 'FUEL',
    });
    expect(res.status >= 400, `Expected 4xx, got ${res.status}`);
  });

  // ─── 3. Vendors ───
  console.log('\nVendors');
  let vendorId: string;
  await runTest('Create vendor with India-native fields', async () => {
    const res = await apiCall('POST', '/api/v1/finance/vendors', token, {
      name: `${PREFIX}_Bharat_Petroleum`,
      vendorType: 'FUEL_STATION',
      phone: '9876543210',
      email: 'billing@bharatpetro.in',
      gstin: '27AALCS1234F1ZH',
      pan: 'AALCS1234F',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '400001',
      contactPersonName: 'Rajesh Kumar',
      contactPersonPhone: '9876543211',
      paymentTermsDays: 30,
      bankAccountMasked: '****9012',
      ifscCode: 'HDFC0001234',
      upiId: 'bharatpetro@upi',
      address: '123 MG Road, Mumbai',
    });
    expect(res.status === 201, `Expected 201, got ${res.status}: ${res.data?.message || ''}`);
    vendorId = res.data.data.id;
    createdIds.push({ type: 'vendor', id: vendorId });
    expect(res.data.data.gstin === '27AALCS1234F1ZH', 'GSTIN stored correctly');
    expect(res.data.data.pan === 'AALCS1234F', 'PAN stored correctly');
    expect(res.data.data.stateCode === '27', 'State code stored correctly');
    expect(res.data.data.ifscCode === 'HDFC0001234', 'IFSC stored correctly');
  });

  await runTest('Reject invalid GSTIN', async () => {
    const res = await apiCall('POST', '/api/v1/finance/vendors', token, {
      name: 'Bad GSTIN Vendor',
      vendorType: 'GENERAL',
      gstin: 'INVALID_GSTIN',
    });
    expect(res.status >= 400, `Expected 4xx for invalid GSTIN, got ${res.status}`);
  });

  await runTest('Reject invalid PAN', async () => {
    const res = await apiCall('POST', '/api/v1/finance/vendors', token, {
      name: 'Bad PAN Vendor',
      vendorType: 'GENERAL',
      pan: '12345',
    });
    expect(res.status >= 400, `Expected 4xx for invalid PAN, got ${res.status}`);
  });

  await runTest('List vendors', async () => {
    const res = await apiCall('GET', '/api/v1/finance/vendors', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // ─── 4. Customers ───
  console.log('\nCustomers');
  let customerId: string;
  await runTest('Create customer with India-native fields', async () => {
    const res = await apiCall('POST', '/api/v1/finance/customers', token, {
      name: `${PREFIX}_Tata_Logistics`,
      phone: '9876543220',
      email: 'accounts@tatalogistics.in',
      gstin: '27AALCC5678G1ZI',
      pan: 'AALCC5678G',
      customerType: 'ENTERPRISE',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '400002',
      billingAddress: '456 Nehru Nagar, Mumbai',
      shippingAddress: '789 Gandhi Road, Mumbai',
      contactPersonName: 'Priya Sharma',
      contactPersonPhone: '9876543221',
      paymentTermsDays: 45,
      creditLimit: 1000000,
      isGstRegistered: true,
    });
    expect(res.status === 201, `Expected 201, got ${res.status}: ${res.data?.message || ''}`);
    customerId = res.data.data.id;
    createdIds.push({ type: 'customer', id: customerId });
    expect(res.data.data.gstin === '27AALCC5678G1ZI', 'GSTIN stored correctly');
    expect(res.data.data.pan === 'AALCC5678G', 'PAN stored correctly');
    expect(res.data.data.isGstRegistered === true, 'isGstRegistered stored correctly');
    expect(res.data.data.stateCode === '27', 'State code stored correctly');
  });

  await runTest('Reject invalid customer GSTIN', async () => {
    const res = await apiCall('POST', '/api/v1/finance/customers', token, {
      name: 'Bad GSTIN Customer',
      gstin: 'NOT_VALID',
    });
    expect(res.status >= 400, `Expected 4xx for invalid GSTIN, got ${res.status}`);
  });

  await runTest('List customers', async () => {
    const res = await apiCall('GET', '/api/v1/finance/customers', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // ─── 5. Transactions ───
  console.log('\nTransactions');
  let incomeTxnId: string;
  let expenseTxnId: string;
  await runTest('Create income transaction', async () => {
    const res = await apiCall('POST', '/api/v1/finance/transactions', token, {
      transactionType: 'INCOME',
      sourceModule: 'TRIP',
      vendorId,
      customerId,
      accountId,
      categoryId: incomeCategoryId,
      amount: 150000,
      taxAmount: 27000,
      transactionDate: new Date().toISOString(),
      paymentMode: 'BANK_TRANSFER',
      description: `${PREFIX} - Trip payment from Tata Logistics`,
    });
    expect(res.status === 201, `Expected 201, got ${res.status}: ${res.data?.message || ''}`);
    incomeTxnId = res.data.data.id;
    createdIds.push({ type: 'transaction', id: incomeTxnId });
    expect(res.data.data.transactionNumber.startsWith('TXN-'), 'Transaction number format');
  });

  await runTest('Create expense transaction', async () => {
    const res = await apiCall('POST', '/api/v1/finance/transactions', token, {
      transactionType: 'EXPENSE',
      sourceModule: 'FUEL',
      vendorId,
      accountId,
      categoryId: expenseCategoryId,
      amount: 45000,
      taxAmount: 8100,
      transactionDate: new Date().toISOString(),
      paymentMode: 'UPI',
      description: `${PREFIX} - Fuel expense at Bharat Petroleum`,
    });
    expect(res.status === 201, `Expected 201, got ${res.status}: ${res.data?.message || ''}`);
    expenseTxnId = res.data.data.id;
    createdIds.push({ type: 'transaction', id: expenseTxnId });
  });

  await runTest('List transactions', async () => {
    const res = await apiCall('GET', '/api/v1/finance/transactions', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('Reject invalid transaction type', async () => {
    const res = await apiCall('POST', '/api/v1/finance/transactions', token, {
      transactionType: 'INVALID',
      sourceModule: 'TRIP',
      amount: 1000,
      transactionDate: new Date().toISOString(),
      paymentMode: 'CASH',
    });
    expect(res.status >= 400, `Expected 4xx, got ${res.status}`);
  });

  // ─── 6. Trip Billing ───
  console.log('\nTrip Billing');
  let tripBillingId: string;
  await runTest('Create trip billing with India-native charges', async () => {
    const res = await apiCall('POST', '/api/v1/finance/trip-billings', token, {
      tripId: 'test-trip-for-billing',
      customerId,
      invoiceNumber: `${PREFIX}_INV-001`,
      invoiceDate: new Date().toISOString(),
      lrNumber: 'LR-2026-001',
      challanNumber: 'CH-2026-001',
      ewayBillNumber: 'EWB-2026-001',
      customerPoNumber: 'PO-TATA-2026-001',
      placeOfSupplyState: 'Maharashtra',
      originState: 'Maharashtra',
      destinationState: 'Karnataka',
      freightAmount: 100000,
      loadingCharges: 5000,
      unloadingCharges: 5000,
      detentionCharges: 0,
      tollCharges: 3000,
      permitCharges: 2000,
      otherCharges: 0,
      discountAmount: 2000,
      cgstAmount: 9000,
      sgstAmount: 9000,
      igstAmount: 0,
      tdsAmount: 5000,
      dueDate: new Date(Date.now() + 45 * 86400000).toISOString(),
      notes: `${PREFIX} - Mumbai to Bangalore trip`,
    });
    expect(res.status === 201, `Expected 201, got ${res.status}: ${res.data?.message || ''}`);
    tripBillingId = res.data.data.id;
    createdIds.push({ type: 'tripBilling', id: tripBillingId });
    expect(res.data.data.invoiceNumber === `${PREFIX}_INV-001`, 'Invoice number stored');
    expect(Number(res.data.data.totalAmount) > 0, 'Total amount computed');
    expect(Number(res.data.data.netReceivable) > 0, 'Net receivable computed');
    expect(Number(res.data.data.netReceivable) <= Number(res.data.data.totalAmount), 'Net receivable <= total (TDS deduction)');
  });

  await runTest('List trip billings', async () => {
    const res = await apiCall('GET', '/api/v1/finance/trip-billings', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // ─── 7. Payments ───
  console.log('\nPayments');
  let paymentId1: string;
  let paymentId2: string;

  await runTest('Create partial payment on trip billing', async () => {
    const billingRes = await apiCall('GET', `/api/v1/finance/trip-billings/${tripBillingId}`, token);
    const netReceivable = Number(billingRes.data.data.netReceivable);
    const partialAmount = Math.floor(netReceivable * 0.6);

    const res = await apiCall('POST', '/api/v1/finance/payments', token, {
      tripBillingId,
      accountId,
      vendorId,
      customerId,
      amount: partialAmount,
      paymentDate: new Date().toISOString(),
      paymentMode: 'BANK_TRANSFER',
      bankUtrNumber: 'UTR-HDFC-2026-001',
      upiReference: '',
      notes: `${PREFIX} - 60% advance payment`,
    });
    expect(res.status === 201, `Expected 201, got ${res.status}: ${res.data?.message || ''}`);
    paymentId1 = res.data.data.id;
    createdIds.push({ type: 'payment', id: paymentId1 });
    expect(res.data.data.paymentNumber.startsWith('PAY-'), 'Payment number format');
    expect(res.data.data.bankUtrNumber === 'UTR-HDFC-2026-001', 'Bank UTR stored');
  });

  await runTest('Confirm billing status is PARTIALLY_PAID', async () => {
    const res = await apiCall('GET', `/api/v1/finance/trip-billings/${tripBillingId}`, token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(res.data.data.paymentStatus === 'PARTIALLY_PAID', `Expected PARTIALLY_PAID, got ${res.data.data.paymentStatus}`);
    expect(Number(res.data.data.balanceAmount) > 0, 'Balance should be > 0');
  });

  await runTest('Create second payment to complete billing', async () => {
    const billingRes = await apiCall('GET', `/api/v1/finance/trip-billings/${tripBillingId}`, token);
    const balanceAmount = Number(billingRes.data.data.balanceAmount);

    const res = await apiCall('POST', '/api/v1/finance/payments', token, {
      tripBillingId,
      accountId,
      customerId,
      amount: balanceAmount,
      paymentDate: new Date().toISOString(),
      paymentMode: 'CHEQUE',
      chequeNumber: 'CHQ-001234',
      chequeDate: new Date().toISOString(),
      notes: `${PREFIX} - Final payment`,
    });
    expect(res.status === 201, `Expected 201, got ${res.status}: ${res.data?.message || ''}`);
    paymentId2 = res.data.data.id;
    createdIds.push({ type: 'payment', id: paymentId2 });
  });

  await runTest('Confirm billing status is PAID', async () => {
    const res = await apiCall('GET', `/api/v1/finance/trip-billings/${tripBillingId}`, token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(res.data.data.paymentStatus === 'PAID', `Expected PAID, got ${res.data.data.paymentStatus}`);
    expect(Number(res.data.data.balanceAmount) === 0, 'Balance should be 0');
  });

  await runTest('Reject overpayment on trip billing', async () => {
    const billingRes = await apiCall('GET', `/api/v1/finance/trip-billings/${tripBillingId}`, token);
    const balanceAmount = Number(billingRes.data.data.balanceAmount);
    const overpayment = balanceAmount + 1000;

    const res = await apiCall('POST', '/api/v1/finance/payments', token, {
      tripBillingId,
      accountId,
      customerId,
      amount: overpayment,
      paymentDate: new Date().toISOString(),
      paymentMode: 'CASH',
    });
    expect(res.status >= 400, `Expected 4xx for overpayment, got ${res.status}`);
  });

  await runTest('Reject payment amount <= 0', async () => {
    const res = await apiCall('POST', '/api/v1/finance/payments', token, {
      accountId,
      amount: 0,
      paymentDate: new Date().toISOString(),
      paymentMode: 'CASH',
    });
    expect(res.status >= 400, `Expected 4xx for zero amount, got ${res.status}`);
  });

  await runTest('List payments', async () => {
    const res = await apiCall('GET', '/api/v1/finance/payments', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // ─── 8. Dashboard & P&L ───
  console.log('\nDashboard & P&L');
  await runTest('Get dashboard summary', async () => {
    const res = await apiCall('GET', '/api/v1/finance/dashboard-summary', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect('currentMonthIncome' in res.data.data, 'Has currentMonthIncome');
    expect('pendingPayments' in res.data.data, 'Has pendingPayments');
  });

  await runTest('Get P&L report (unfiltered)', async () => {
    const res = await apiCall('GET', '/api/v1/finance/pnl', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect('totalIncome' in res.data.data, 'Has totalIncome');
    expect('netProfit' in res.data.data, 'Has netProfit');
    expect('breakdown' in res.data.data, 'Has breakdown');
    expect(Array.isArray(res.data.data.breakdown), 'breakdown is array');
  });

  await runTest('Get P&L with date range', async () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    const res = await apiCall('GET', `/api/v1/finance/pnl?dateFrom=${start}&dateTo=${end}`, token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(typeof res.data.data.totalIncome === 'number', 'totalIncome is number');
  });

  // ─── 9. RBAC Negative Tests ───
  console.log('\nRBAC Negative Tests');
  await runTest('Verify unauthenticated request is rejected', async () => {
    const res = await apiCall('GET', '/api/v1/finance/accounts', '');
    expect(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // Cleanup
  console.log('\nCleanup');
  // Delete in reverse order of creation
  for (const item of createdIds.reverse()) {
    await runTest(`Delete ${item.type} ${item.id}`, async () => {
      let path = '';
      switch (item.type) {
        case 'payment': path = `/api/v1/finance/payments/${item.id}`; break;
        case 'tripBilling': path = `/api/v1/finance/trip-billings/${item.id}`; break;
        case 'transaction': path = `/api/v1/finance/transactions/${item.id}`; break;
        case 'vendor': path = `/api/v1/finance/vendors/${item.id}`; break;
        case 'customer': path = `/api/v1/finance/customers/${item.id}`; break;
        case 'category': path = `/api/v1/finance/categories/${item.id}`; break;
        case 'account': path = `/api/v1/finance/accounts/${item.id}`; break;
        default: return;
      }
      const res = await apiCall('DELETE', path, token);
      expect(res.status === 200, `Expected 200, got ${res.status}: ${res.data?.message || ''}`);
    });
  }

  // Summary
  console.log('\n' + '─'.repeat(60));
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`\n📊 Results: ${passed}/${results.length} passed (${failed} failed) in ${totalDuration}ms\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
