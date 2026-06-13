import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

type CheckStatus = 'PASS' | 'FAIL' | 'SKIP';
type CheckResult = { name: string; status: CheckStatus; httpStatus?: number; detail?: string };

function pass(results: CheckResult[], name: string, httpStatus?: number, detail?: string) {
  results.push({ name, status: 'PASS', httpStatus, detail });
}

function fail(results: CheckResult[], name: string, httpStatus?: number, detail?: string) {
  results.push({ name, status: 'FAIL', httpStatus, detail });
}

function skip(results: CheckResult[], name: string, detail?: string) {
  results.push({ name, status: 'SKIP', detail });
}

function ts(): string {
  return Date.now().toString();
}

async function requestJson<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T | null; text: string }> {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!text) return { ok: response.ok, status: response.status, data: null, text };
  try {
    return { ok: response.ok, status: response.status, data: JSON.parse(text) as T, text };
  } catch {
    return { ok: response.ok, status: response.status, data: null, text };
  }
}

async function login(apiBase: string, identifier: string, password: string): Promise<string | null> {
  const res = await requestJson<{ data?: { accessToken?: string } }>(
    `${apiBase}/api/v1/auth/login`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password }) },
  );
  return res.data?.data?.accessToken ?? null;
}

async function main() {
  const apiBase = process.env.API_BASE_URL;
  if (!apiBase) {
    console.error('FAIL: API_BASE_URL environment variable is required');
    process.exit(1);
  }

  const adminId = process.env.E2E_ADMIN_IDENTIFIER || process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
  const adminPass = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!adminId || !adminPass) {
    console.error('FAIL: Admin credentials required (E2E_ADMIN_IDENTIFIER/E2E_ADMIN_PASSWORD or ADMIN_USERNAME/ADMIN_PASSWORD)');
    process.exit(1);
  }

  const results: CheckResult[] = [];
  const created = {
    vehicleIds: [] as string[],
    driverIds: [] as string[],
    tripIds: [] as string[],
    startedTripIds: [] as string[],
  };

  let adminToken: string | null = null;

  try {
    const health = await requestJson<{ data?: { database?: string } }>(`${apiBase}/api/v1/health`);
    if (health.ok && health.data?.data?.database === 'connected') {
      pass(results, 'GET /health', health.status);
    } else {
      fail(results, 'GET /health', health.status);
    }

    const docsRes = await requestJson(`${apiBase}/api/v1/docs`);
    if (docsRes.ok) {
      pass(results, 'GET /docs', docsRes.status);
    } else {
      fail(results, 'GET /docs', docsRes.status);
    }

    const openapiRes = await requestJson(`${apiBase}/api/v1/docs/openapi.json`);
    if (openapiRes.ok) {
      pass(results, 'GET /docs/openapi.json', openapiRes.status);
    } else {
      fail(results, 'GET /docs/openapi.json', openapiRes.status);
    }

    adminToken = await login(apiBase, adminId, adminPass);
    if (adminToken) {
      pass(results, 'POST /auth/login');
    } else {
      fail(results, 'POST /auth/login');
      printSummary(results);
      process.exit(1);
    }

    const authHeaders = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

    const meRes = await requestJson(`${apiBase}/api/v1/auth/me`, { headers: authHeaders });
    if (meRes.ok) {
      pass(results, 'GET /auth/me', meRes.status);
    } else {
      fail(results, 'GET /auth/me', meRes.status);
    }

    const usersRes = await requestJson(`${apiBase}/api/v1/users`, { headers: authHeaders });
    if (usersRes.ok) {
      pass(results, 'GET /users', usersRes.status);
    } else {
      fail(results, 'GET /users', usersRes.status);
    }

    const rolesRes = await requestJson(`${apiBase}/api/v1/roles`, { headers: authHeaders });
    if (rolesRes.ok) {
      pass(results, 'GET /roles', rolesRes.status);
    } else {
      fail(results, 'GET /roles', rolesRes.status);
    }

    const permsRes = await requestJson(`${apiBase}/api/v1/permissions`, { headers: authHeaders });
    if (permsRes.ok) {
      pass(results, 'GET /permissions', permsRes.status);
    } else {
      fail(results, 'GET /permissions', permsRes.status);
    }

    const vehiclesRes = await requestJson(`${apiBase}/api/v1/vehicles`, { headers: authHeaders });
    if (vehiclesRes.ok) {
      pass(results, 'GET /vehicles', vehiclesRes.status);
    } else {
      fail(results, 'GET /vehicles', vehiclesRes.status);
    }

    const driversRes = await requestJson(`${apiBase}/api/v1/drivers`, { headers: authHeaders });
    if (driversRes.ok) {
      pass(results, 'GET /drivers', driversRes.status);
    } else {
      fail(results, 'GET /drivers', driversRes.status);
    }

    const assetsRes = await requestJson(`${apiBase}/api/v1/assets`, { headers: authHeaders });
    if (assetsRes.ok) {
      pass(results, 'GET /assets', assetsRes.status);
    } else {
      fail(results, 'GET /assets', assetsRes.status);
    }

    const assetCatsRes = await requestJson(`${apiBase}/api/v1/assets/categories`, { headers: authHeaders });
    if (assetCatsRes.ok) {
      pass(results, 'GET /assets/categories', assetCatsRes.status);
    } else {
      fail(results, 'GET /assets/categories', assetCatsRes.status);
    }

    const docsListRes = await requestJson(`${apiBase}/api/v1/documents`, { headers: authHeaders });
    if (docsListRes.ok || docsListRes.status === 403) {
      pass(results, 'GET /documents', docsListRes.status, docsListRes.status === 403 ? 'Permission denied (expected for some roles)' : undefined);
    } else {
      fail(results, 'GET /documents', docsListRes.status);
    }

    const tripsRes = await requestJson(`${apiBase}/api/v1/trips`, { headers: authHeaders });
    if (tripsRes.ok) {
      pass(results, 'GET /trips', tripsRes.status);
    } else {
      fail(results, 'GET /trips', tripsRes.status);
    }

    const unauthRes = await requestJson(`${apiBase}/api/v1/users`);
    if (!unauthRes.ok && unauthRes.status === 401) {
      pass(results, 'GET /users without token returns 401', unauthRes.status);
    } else {
      fail(results, 'GET /users without token returns 401', unauthRes.status);
    }

    const vNum = `TEST-E2E-API-${ts()}`;
    const newV = await requestJson<{ data?: { id: string } }>(
      `${apiBase}/api/v1/vehicles`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ vehicleNumber: vNum, vehicleType: 'TRUCK', fuelType: 'DIESEL' }) },
    );
    const vehicle = newV.data?.data;
    if (vehicle) {
      pass(results, 'POST /vehicles (create TEST-E2E)', newV.status);
      created.vehicleIds.push(vehicle.id);
    } else {
      fail(results, 'POST /vehicles (create TEST-E2E)', newV.status);
    }

    const dName = `TEST-E2E-API-DRV-${ts()}`;
    const dMobile = `7${ts().slice(-9)}`;
    const newD = await requestJson<{ data?: { id: string } }>(
      `${apiBase}/api/v1/drivers`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ name: dName, mobile: dMobile, licenseNumber: `DL-API-${ts()}` }) },
    );
    const driver = newD.data?.data;
    if (driver) {
      pass(results, 'POST /drivers (create TEST-E2E)', newD.status);
      created.driverIds.push(driver.id);
    } else {
      fail(results, 'POST /drivers (create TEST-E2E)', newD.status);
    }

    if (vehicle && driver) {
      const tRes = await requestJson<{ data?: { id: string; status: string } }>(
        `${apiBase}/api/v1/trips`,
        { method: 'POST', headers: authHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: vehicle.id, driverId: driver.id, originName: 'Test Origin', destinationName: 'Test Destination' }) },
      );
      const trip = tRes.data?.data;
      if (trip) {
        pass(results, 'POST /trips (create TEST-E2E)', tRes.status);
        created.tripIds.push(trip.id);

        const schedRes = await requestJson<{ data?: { status: string } }>(
          `${apiBase}/api/v1/trips/${trip.id}/schedule`,
          { method: 'POST', headers: authHeaders, body: JSON.stringify({ plannedStartAt: new Date().toISOString() }) },
        );
        if (schedRes.ok && schedRes.data?.data?.status === 'SCHEDULED') {
          pass(results, 'POST /trips/:id/schedule', schedRes.status);
        } else {
          fail(results, 'POST /trips/:id/schedule', schedRes.status);
        }

        const startRes = await requestJson<{ data?: { status: string } }>(
          `${apiBase}/api/v1/trips/${trip.id}/start`,
          { method: 'POST', headers: authHeaders, body: JSON.stringify({ startOdometer: 1000 }) },
        );
        if (startRes.ok && startRes.data?.data?.status === 'STARTED') {
          pass(results, 'POST /trips/:id/start', startRes.status);
          created.startedTripIds.push(trip.id);
        } else {
          fail(results, 'POST /trips/:id/start', startRes.status);
        }

        const compRes = await requestJson<{ data?: { status: string } }>(
          `${apiBase}/api/v1/trips/${trip.id}/complete`,
          { method: 'POST', headers: authHeaders, body: JSON.stringify({ endOdometer: 1200 }) },
        );
        if (compRes.ok && compRes.data?.data?.status === 'COMPLETED') {
          pass(results, 'POST /trips/:id/complete', compRes.status);
          created.startedTripIds = created.startedTripIds.filter((id) => id !== trip.id);
        } else {
          fail(results, 'POST /trips/:id/complete', compRes.status);
        }

        const histRes = await requestJson(`${apiBase}/api/v1/trips/${trip.id}/history`, { headers: authHeaders });
        if (histRes.ok) {
          pass(results, 'GET /trips/:id/history', histRes.status);
        } else {
          fail(results, 'GET /trips/:id/history', histRes.status);
        }
      } else {
        fail(results, 'POST /trips (create TEST-E2E)', tRes.status);
      }
    }

    for (const tripId of created.startedTripIds) {
      try {
        await requestJson(`${apiBase}/api/v1/trips/${tripId}/cancel`, {
          method: 'POST', headers: authHeaders, body: JSON.stringify({ notes: 'staging smoke cleanup' }),
        });
      } catch { /* best effort */ }
    }

    for (const vId of created.vehicleIds) {
      try {
        await requestJson(`${apiBase}/api/v1/vehicles/${vId}/status`, {
          method: 'PATCH', headers: authHeaders, body: JSON.stringify({ status: 'AVAILABLE' }),
        });
      } catch { /* best effort */ }
    }

    for (const dId of created.driverIds) {
      try {
        await requestJson(`${apiBase}/api/v1/drivers/${dId}/status`, {
          method: 'PATCH', headers: authHeaders, body: JSON.stringify({ status: 'AVAILABLE' }),
        });
      } catch { /* best effort */ }
    }

  } finally {
    if (adminToken) {
      for (const tripId of created.startedTripIds) {
        try {
          const authHeaders = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
          await requestJson(`${apiBase}/api/v1/trips/${tripId}/cancel`, {
            method: 'POST', headers: authHeaders, body: JSON.stringify({ notes: 'final cleanup' }),
          });
        } catch { /* best effort */ }
      }
    }
  }

  const exitCode = printSummary(results);
  process.exit(exitCode);
}

function printSummary(results: CheckResult[]): number {
  console.log('\nStaging API Smoke Test Summary');
  console.log('─'.repeat(70));
  for (const r of results) {
    const statusText = r.httpStatus ? ` (${r.httpStatus})` : '';
    const detailText = r.detail ? ` - ${r.detail}` : '';
    const icon = r.status === 'PASS' ? 'PASS' : r.status === 'SKIP' ? 'SKIP' : 'FAIL';
    console.log(`${icon} ${r.name}${statusText}${detailText}`);
  }
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  console.log('─'.repeat(70));
  console.log(`Summary: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  return failed > 0 ? 1 : 0;
}

void main().catch((error) => {
  console.log('Staging API smoke test');
  console.log(`FAIL setup - ${error instanceof Error ? error.message : 'unknown error'}`);
  console.log('Summary: 0 passed, 1 failed, 0 skipped');
  process.exit(1);
});
