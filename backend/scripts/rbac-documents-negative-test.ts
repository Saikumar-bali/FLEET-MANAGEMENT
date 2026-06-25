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

async function apiPost(url: string, token: string, body?: Record<string, unknown>): Promise<number> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
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

  const DOCUMENT_ENDPOINTS = [
    { method: 'GET', path: '/api/v1/documents' },
    { method: 'POST', path: '/api/v1/documents/upload' },
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

    for (const ep of DOCUMENT_ENDPOINTS) {
      totalTests++;
      let status: number;
      if (ep.method === 'GET') {
        status = await apiGet(`${API_BASE}${ep.path}`, token);
      } else {
        status = await apiPost(`${API_BASE}${ep.path}`, token, {});
      }
      const isForbidden = status === 403;
      const label = `${ep.method} ${ep.path.replace('/api/v1/', '')}`;
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

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
