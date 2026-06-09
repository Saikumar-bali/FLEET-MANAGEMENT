type CheckResult = {
  name: string;
  ok: boolean;
  status?: number;
  detail?: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T | null; text: string }> {
  const response = await fetch(url, init);
  const text = await response.text();

  if (!text) {
    return {
      ok: response.ok,
      status: response.status,
      data: null,
      text,
    };
  }

  try {
    return {
      ok: response.ok,
      status: response.status,
      data: JSON.parse(text) as T,
      text,
    };
  } catch {
    return {
      ok: response.ok,
      status: response.status,
      data: null,
      text,
    };
  }
}

async function main() {
  const apiBaseUrl = requiredEnv('API_BASE_URL').replace(/\/$/, '');
  const adminEmail = requiredEnv('ADMIN_EMAIL');
  const adminPassword = requiredEnv('ADMIN_PASSWORD');
  const results: CheckResult[] = [];

  const health = await requestJson<{
    data?: { database?: string };
  }>(`${apiBaseUrl}/api/v1/health`);
  const healthOk = health.ok && health.data?.data?.database === 'connected';
  results.push({
    name: 'GET /api/v1/health',
    ok: healthOk,
    status: health.status,
    detail: healthOk ? 'database connected' : 'health or database check failed',
  });

  const login = await requestJson<{
    data?: { accessToken?: string; refreshToken?: string };
  }>(`${apiBaseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
  });

  const accessToken = login.data?.data?.accessToken;
  const loginOk = login.ok && !!accessToken;
  results.push({
    name: 'POST /api/v1/auth/login',
    ok: loginOk,
    status: login.status,
    detail: loginOk ? 'login succeeded' : 'login failed',
  });

  if (!accessToken) {
    printSummary(results);
    process.exit(1);
  }

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
  };

  for (const path of ['/api/v1/auth/me', '/api/v1/roles', '/api/v1/users']) {
    const response = await requestJson(`${apiBaseUrl}${path}`, {
      headers: authHeaders,
    });

    results.push({
      name: `GET ${path}`,
      ok: response.ok,
      status: response.status,
      detail: response.ok ? 'request succeeded' : 'request failed',
    });
  }

  const hasFailure = printSummary(results);
  process.exit(hasFailure ? 1 : 0);
}

function printSummary(results: CheckResult[]): boolean {
  console.log('Smoke test summary');

  for (const result of results) {
    const statusText = result.status ? ` (${result.status})` : '';
    const detailText = result.detail ? ` - ${result.detail}` : '';
    console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${statusText}${detailText}`);
  }

  const failedCount = results.filter((result) => !result.ok).length;
  const passedCount = results.length - failedCount;
  console.log(`Summary: ${passedCount} passed, ${failedCount} failed`);

  return failedCount > 0;
}

void main().catch((error) => {
  console.log('Smoke test summary');
  console.log(`FAIL setup - ${error instanceof Error ? error.message : 'unknown error'}`);
  console.log('Summary: 0 passed, 1 failed');
  process.exit(1);
});
