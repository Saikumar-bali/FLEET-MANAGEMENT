type CheckResult = {
  name: string;
  ok: boolean;
  status?: number;
  detail?: string;
};

type ApiOk<T> = { success: true; data: T };
type ApiErr = { success: false; message: string };

function env(name: string, fallback?: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`${name} is required`);
}

async function request<T>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: ApiOk<T> | null; text: string }> {
  const response = await fetch(url, init);
  const text = await response.text();
  let data: ApiOk<T> | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as ApiOk<T>;
    } catch {
      data = null;
    }
  }
  return { ok: response.ok, status: response.status, data, text };
}

function ok<T>(r: { ok: boolean; status: number; data: ApiOk<T> | null }): r is { ok: true; status: number; data: ApiOk<T> } {
  return r.ok && !!r.data;
}

async function login(apiBase: string, identifier: string, password: string): Promise<string | null> {
  const res = await request<{ accessToken: string }>(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  return ok(res) ? res.data.data.accessToken : null;
}

async function main() {
  const apiBase = env('API_BASE_URL').replace(/\/$/, '');
  const adminId = env('ADMIN_USERNAME', env('ADMIN_EMAIL', 'admin'));
  const adminPw = env('ADMIN_PASSWORD', 'admin@123');
  const viewerId = env('VIEWER_USERNAME', 'viewer');
  const viewerPw = env('VIEWER_PASSWORD', 'viewer@123');

  const results: CheckResult[] = [];
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const adminToken = await login(apiBase, adminId, adminPw);
  if (!adminToken) {
    console.log('FAIL setup - admin login failed');
    process.exit(1);
  }

  const viewerToken = await login(apiBase, viewerId, viewerPw);

  // 1. generate
  {
    const r = await request<{ scanned: number; created: number; skipped: number }>(`${apiBase}/alerts/generate`, {
      method: 'POST',
      headers: { ...auth(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    results.push({
      name: 'POST /alerts/generate',
      ok: ok(r),
      status: r.status,
      detail: ok(r) ? `scanned=${r.data.data.scanned} created=${r.data.data.created}` : r.text,
    });
  }

  // 2. list
  {
    const r = await request<{ items: unknown[] }>(`${apiBase}/alerts?limit=20`, { headers: auth(adminToken) });
    results.push({
      name: 'GET /alerts',
      ok: ok(r),
      status: r.status,
      detail: ok(r) ? `count=${r.data.data.items.length}` : r.text,
    });
  }

  // 3. summary
  {
    const r = await request<{ unreadCount: number }>(`${apiBase}/alerts/summary`, { headers: auth(adminToken) });
    results.push({
      name: 'GET /alerts/summary',
      ok: ok(r),
      status: r.status,
      detail: ok(r) ? `unread=${r.data.data.unreadCount}` : r.text,
    });
  }

  // 4. read / resolve on first alert (if any)
  {
    const list = await request<{ items: Array<{ id: string; status: string }> }>(
      `${apiBase}/alerts?limit=1`,
      { headers: auth(adminToken) },
    );
    if (ok(list) && list.data.data.items.length > 0) {
      const id = list.data.data.items[0].id;
      const read = await request<{ id: string }>(`${apiBase}/alerts/${id}/read`, {
        method: 'POST',
        headers: auth(adminToken),
      });
      results.push({
        name: `POST /alerts/{id}/read`,
        ok: ok(read),
        status: read.status,
      });
      const resolve = await request<{ id: string }>(`${apiBase}/alerts/${id}/resolve`, {
        method: 'POST',
        headers: auth(adminToken),
      });
      results.push({
        name: `POST /alerts/{id}/resolve`,
        ok: ok(resolve),
        status: resolve.status,
      });
    } else {
      results.push({ name: 'POST /alerts/{id}/read', ok: true, detail: 'no alerts to test against (skipped)' });
      results.push({ name: 'POST /alerts/{id}/resolve', ok: true, detail: 'no alerts to test against (skipped)' });
    }
  }

  // 5. alert-rules list
  {
    const r = await request<{ items: unknown[] }>(`${apiBase}/alert-rules`, { headers: auth(adminToken) });
    results.push({
      name: 'GET /alert-rules',
      ok: ok(r),
      status: r.status,
      detail: ok(r) ? `count=${r.data.data.items.length}` : r.text,
    });
  }

  // 6. reports
  {
    const dateFrom = new Date(Date.now() - 60 * 86400000).toISOString();
    const dateTo = new Date().toISOString();
    const queries: Array<[string, string]> = [
      ['GET /reports/vehicle-utilization', `vehicle-utilization?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`],
      ['GET /reports/trip-summary', `trip-summary`],
      ['GET /reports/fuel-summary', `fuel-summary`],
      ['GET /reports/fuel-missing-receipts', `fuel-missing-receipts`],
      ['GET /reports/finance-pnl', `finance-pnl`],
      ['GET /reports/compliance-expiry', `compliance-expiry?daysToExpire=30`],
      ['GET /reports/document-verification', `document-verification`],
      ['GET /reports/maintenance-summary', `maintenance-summary`],
    ];
    for (const [name, q] of queries) {
      const r = await request<unknown>(`${apiBase}/reports/${q}`, { headers: auth(adminToken) });
      results.push({ name, ok: ok(r), status: r.status, detail: ok(r) ? 'OK' : r.text.slice(0, 120) });
    }
  }

  // 7. CSV export
  {
    const r = await fetch(`${apiBase}/reports/vehicle-utilization/export.csv`, {
      headers: auth(adminToken),
    });
    const text = await r.text();
    results.push({
      name: 'GET /reports/vehicle-utilization/export.csv',
      ok: r.ok && (text.startsWith('vehicleId') || text.length === 0),
      status: r.status,
      detail: `bytes=${text.length}`,
    });
  }

  // 8. RBAC negative: viewer cannot generate
  if (viewerToken) {
    const r = await request<unknown>(`${apiBase}/alerts/generate`, {
      method: 'POST',
      headers: { ...auth(viewerToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    results.push({
      name: 'RBAC: viewer POST /alerts/generate → 403',
      ok: r.status === 403,
      status: r.status,
    });

    const csv = await fetch(`${apiBase}/reports/vehicle-utilization/export.csv`, {
      headers: auth(viewerToken),
    });
    results.push({
      name: 'RBAC: viewer GET /reports/.../export.csv → 403',
      ok: csv.status === 403,
      status: csv.status,
    });
  }

  // 9. 404 on unknown alert
  {
    const r = await request<unknown>(`${apiBase}/alerts/nonexistent-id-12345`, { headers: auth(adminToken) });
    results.push({
      name: 'GET /alerts/<missing> → 404',
      ok: r.status === 404,
      status: r.status,
    });
  }

  // 10. Idempotency: generate twice, second should be created=0 (or all skipped)
  {
    const r1 = await request<{ created: number; scanned: number }>(`${apiBase}/alerts/generate`, {
      method: 'POST',
      headers: { ...auth(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const r2 = await request<{ created: number; scanned: number }>(`${apiBase}/alerts/generate`, {
      method: 'POST',
      headers: { ...auth(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    results.push({
      name: 'Idempotency: 2nd generate created == 0',
      ok: ok(r2) && r2.data.data.created === 0,
      detail: ok(r2) ? `r1.created=${r1.ok ? r1.data!.data.created : '?'} r2.created=${r2.data.data.created}` : r2.text,
    });
  }

  // Print
  console.log('\nPhase 9 smoke test summary');
  console.log('─'.repeat(70));
  for (const r of results) {
    const st = r.status ? ` (${r.status})` : '';
    const d = r.detail ? ` - ${r.detail}` : '';
    console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${st}${d}`);
  }
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log('─'.repeat(70));
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.log('FAIL setup -', err instanceof Error ? err.message : err);
  process.exit(1);
});