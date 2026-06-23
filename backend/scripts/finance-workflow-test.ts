import { PrismaClient } from '@prisma/client';
import { getAdminCredential, getApiBase } from './test-helpers/credentials';

const BASE_URL = getApiBase();
const prisma = new PrismaClient();

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

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

  // 1. Finance Accounts
  console.log('Finance Accounts');
  let accountId: string;
  await runTest('Create finance account', async () => {
    const res = await apiCall('POST', '/api/v1/finance/accounts', token, {
      name: 'HDFC Main',
      type: 'BANK',
      bankName: 'HDFC Bank',
      accountNumberMasked: '****1234',
      openingBalance: 100000,
    });
    expect(res.status === 201, `Expected 201, got ${res.status}: ${res.data?.message || ''}`);
    accountId = res.data.data.id;
  });

  await runTest('List finance accounts', async () => {
    const res = await apiCall('GET', '/api/v1/finance/accounts', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(Array.isArray(res.data.data?.data ?? res.data.data), 'Expected array in response');
  });

  await runTest('Update finance account', async () => {
    const res = await apiCall('PUT', `/api/v1/finance/accounts/${accountId}`, token, {
      bankName: 'HDFC Bank Updated',
    });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // 2. Finance Categories
  console.log('\nFinance Categories');
  let categoryId: string;
  await runTest('Create income category', async () => {
    const res = await apiCall('POST', '/api/v1/finance/categories', token, {
      name: 'Trip Revenue',
      type: 'INCOME',
      module: 'TRIP',
    });
    expect(res.status === 201, `Expected 201, got ${res.status}`);
    categoryId = res.data.data.id;
  });

  await runTest('List categories', async () => {
    const res = await apiCall('GET', '/api/v1/finance/categories', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('Reject duplicate category type', async () => {
    const res = await apiCall('POST', '/api/v1/finance/categories', token, {
      name: 'Fuel Cost',
      type: 'INVALID',
      module: 'FUEL',
    });
    expect(res.status >= 400, `Expected 4xx, got ${res.status}`);
  });

  // 3. Vendors
  console.log('\nVendors');
  let vendorId: string;
  await runTest('Create vendor', async () => {
    const res = await apiCall('POST', '/api/v1/finance/vendors', token, {
      name: 'Shell Fuel Station',
      vendorType: 'FUEL_STATION',
      phone: '9876543210',
      gstin: '27AALCS1234F1ZH',
    });
    expect(res.status === 201, `Expected 201, got ${res.status}`);
    vendorId = res.data.data.id;
  });

  await runTest('List vendors', async () => {
    const res = await apiCall('GET', '/api/v1/finance/vendors', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // 4. Customers
  console.log('\nCustomers');
  let customerId: string;
  await runTest('Create customer', async () => {
    const res = await apiCall('POST', '/api/v1/finance/customers', token, {
      name: 'Acme Corp',
      phone: '9876543210',
      email: 'billing@acme.com',
      gstin: '27AALCC5678G1ZI',
    });
    expect(res.status === 201, `Expected 201, got ${res.status}`);
    customerId = res.data.data.id;
  });

  await runTest('List customers', async () => {
    const res = await apiCall('GET', '/api/v1/finance/customers', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // 5. Transactions
  console.log('\nTransactions');
  let txnId: string;
  await runTest('Create income transaction', async () => {
    const res = await apiCall('POST', '/api/v1/finance/transactions', token, {
      transactionType: 'INCOME',
      sourceModule: 'TRIP',
      vendorId,
      customerId,
      accountId: accountId,
      categoryId,
      amount: 15000,
      taxAmount: 2700,
      transactionDate: new Date().toISOString(),
      paymentMode: 'BANK_TRANSFER',
      description: 'Trip payment from Acme',
    });
    expect(res.status === 201, `Expected 201, got ${res.status}: ${res.data?.message || ''}`);
    txnId = res.data.data.id;
    expect(res.data.data.transactionNumber.startsWith('TXN-'), 'Transaction number format');
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

  // 6. Payments
  console.log('\nPayments');
  let paymentId: string;
  await runTest('Create payment', async () => {
    const res = await apiCall('POST', '/api/v1/finance/payments', token, {
      transactionId: txnId,
      accountId: accountId,
      vendorId,
      customerId,
      amount: 15000,
      paymentDate: new Date().toISOString(),
      paymentMode: 'BANK_TRANSFER',
      referenceNumber: 'NEFT-12345',
    });
    expect(res.status === 201, `Expected 201, got ${res.status}`);
    paymentId = res.data.data.id;
  });

  await runTest('List payments', async () => {
    const res = await apiCall('GET', '/api/v1/finance/payments', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // 7. Dashboard & P&L
  console.log('\nDashboard & P&L');
  await runTest('Get dashboard summary', async () => {
    const res = await apiCall('GET', '/api/v1/finance/dashboard-summary', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect('currentMonthIncome' in res.data.data, 'Has currentMonthIncome');
    expect('pendingPayments' in res.data.data, 'Has pendingPayments');
  });

  await runTest('Get P&L report', async () => {
    const res = await apiCall('GET', '/api/v1/finance/pnl', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect('totalIncome' in res.data.data, 'Has totalIncome');
    expect('netProfit' in res.data.data, 'Has netProfit');
  });

  // Cleanup
  console.log('\nCleanup');
  await runTest('Delete payment', async () => {
    const res = await apiCall('DELETE', `/api/v1/finance/payments/${paymentId}`, token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('Delete transaction', async () => {
    const res = await apiCall('DELETE', `/api/v1/finance/transactions/${txnId}`, token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('Delete vendor', async () => {
    const res = await apiCall('DELETE', `/api/v1/finance/vendors/${vendorId}`, token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('Delete customer', async () => {
    const res = await apiCall('DELETE', `/api/v1/finance/customers/${customerId}`, token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

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
