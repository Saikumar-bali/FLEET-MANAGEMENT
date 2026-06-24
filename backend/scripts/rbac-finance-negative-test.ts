import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';

async function apiLogin(identifier: string, password: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: { accessToken?: string } };
    return json.data?.accessToken ?? null;
  } catch {
    return null;
  }
}

async function apiGet(url: string, token: string): Promise<number> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.status;
  } catch {
    return 0;
  }
}

type TestCase = {
  roleKey: string;
  identifier: string;
  password: string;
};

async function main() {
  const testCases: TestCase[] = [];

  const demoUsers = [
    { roleKey: 'driver', username: 'driver', password: 'driver@123' },
    { roleKey: 'assistant_driver', username: 'assistantdriver', password: 'assistant@123' },
    { roleKey: 'mechanic', username: 'mechanic', password: 'mechanic@123' },
    { roleKey: 'viewer', username: 'viewer', password: 'viewer@123' },
  ];

  for (const u of demoUsers) {
    const envPrefix = u.roleKey.toUpperCase();
    const ciId = process.env[`CI_${envPrefix}_IDENTIFIER`]?.trim();
    const ciPw = process.env[`CI_${envPrefix}_PASSWORD`]?.trim();
    testCases.push({
      roleKey: u.roleKey,
      identifier: ciId || u.username,
      password: ciPw || u.password,
    });
  }

  const FINANCE_ENDPOINTS = [
    '/api/v1/finance/dashboard-summary',
    '/api/v1/finance/pnl',
    '/api/v1/finance/payments',
    '/api/v1/finance/trip-billings',
    '/api/v1/finance/vendors',
    '/api/v1/finance/customers',
    '/api/v1/finance/transactions',
    '/api/v1/finance/accounts',
    '/api/v1/finance/categories',
  ];

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const tc of testCases) {
    console.log(`\nRole: ${tc.roleKey}`);
    const token = await apiLogin(tc.identifier, tc.password);
    if (!token) {
      console.log(`  SKIP - Could not log in as ${tc.roleKey}`);
      continue;
    }

    for (const endpoint of FINANCE_ENDPOINTS) {
      totalTests++;
      const status = await apiGet(`${API_BASE}${endpoint}`, token);
      const isForbidden = status === 403;
      const label = endpoint.replace('/api/v1/finance/', '');
      if (isForbidden || status === 401) {
        console.log(`  PASS ${label} -> ${status}`);
        passedTests++;
      } else {
        console.log(`  FAIL ${label} -> ${status} (expected 403)`);
        failedTests++;
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${totalTests} total, ${passedTests} passed, ${failedTests} failed`);
  process.exit(failedTests > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
