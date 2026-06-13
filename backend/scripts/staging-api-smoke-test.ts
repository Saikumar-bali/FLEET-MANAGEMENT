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

function normalizeApiBase(raw: string): string {
  let base = raw.trim().replace(/\/+$/, '');
  if (base.endsWith('/api/v1')) {
    base = base.slice(0, -'/api/v1'.length);
  }
  return base;
}

function endpoint(apiRoot: string, path: string): string {
  return `${apiRoot}/api/v1${path}`;
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

async function login(apiRoot: string, identifier: string, password: string): Promise<string | null> {
  const res = await requestJson<{ data?: { accessToken?: string } }>(
    endpoint(apiRoot, '/auth/login'),
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password }) },
  );
  return res.data?.data?.accessToken ?? null;
}

async function main() {
  const rawBase = process.env.API_BASE_URL;
  if (!rawBase) {
    console.error('FAIL: API_BASE_URL environment variable is required');
    process.exit(1);
  }

  const apiRoot = normalizeApiBase(rawBase);
  console.log(`Using API root: ${apiRoot}`);

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
    const health = await requestJson<{ data?: { database?: string } }>(endpoint(apiRoot, '/health'));
    if (health.ok && health.data?.data?.database === 'connected') {
      pass(results, 'GET /health', health.status);
    } else {
      fail(results, 'GET /health', health.status);
    }

    const docsRes = await requestJson(endpoint(apiRoot, '/docs'));
    if (docsRes.ok) {
      pass(results, 'GET /docs', docsRes.status);
    } else {
      fail(results, 'GET /docs', docsRes.status);
    }

    const openapiRes = await requestJson(endpoint(apiRoot, '/docs/openapi.json'));
    if (openapiRes.ok) {
      pass(results, 'GET /docs/openapi.json', openapiRes.status);
    } else {
      fail(results, 'GET /docs/openapi.json', openapiRes.status);
    }

    adminToken = await login(apiRoot, adminId, adminPass);
    if (adminToken) {
      pass(results, 'POST /auth/login');
    } else {
      fail(results, 'POST /auth/login');
      printSummary(results);
      process.exit(1);
    }

    const authHeaders = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

    const meRes = await requestJson(endpoint(apiRoot, '/auth/me'), { headers: authHeaders });
    if (meRes.ok) {
      pass(results, 'GET /auth/me', meRes.status);
    } else {
      fail(results, 'GET /auth/me', meRes.status);
    }

    const usersRes = await requestJson(endpoint(apiRoot, '/users'), { headers: authHeaders });
    if (usersRes.ok) {
      pass(results, 'GET /users', usersRes.status);
    } else {
      fail(results, 'GET /users', usersRes.status);
    }

    const rolesRes = await requestJson(endpoint(apiRoot, '/roles'), { headers: authHeaders });
    if (rolesRes.ok) {
      pass(results, 'GET /roles', rolesRes.status);
    } else {
      fail(results, 'GET /roles', rolesRes.status);
    }

    const permsRes = await requestJson(endpoint(apiRoot, '/permissions'), { headers: authHeaders });
    if (permsRes.ok) {
      pass(results, 'GET /permissions', permsRes.status);
    } else {
      fail(results, 'GET /permissions', permsRes.status);
    }

    const vehiclesRes = await requestJson(endpoint(apiRoot, '/vehicles'), { headers: authHeaders });
    if (vehiclesRes.ok) {
      pass(results, 'GET /vehicles', vehiclesRes.status);
    } else {
      fail(results, 'GET /vehicles', vehiclesRes.status);
    }

    const driversRes = await requestJson(endpoint(apiRoot, '/drivers'), { headers: authHeaders });
    if (driversRes.ok) {
      pass(results, 'GET /drivers', driversRes.status);
    } else {
      fail(results, 'GET /drivers', driversRes.status);
    }

    const assetsRes = await requestJson(endpoint(apiRoot, '/assets'), { headers: authHeaders });
    if (assetsRes.ok) {
      pass(results, 'GET /assets', assetsRes.status);
    } else {
      fail(results, 'GET /assets', assetsRes.status);
    }

    const assetCatsRes = await requestJson(endpoint(apiRoot, '/assets/categories'), { headers: authHeaders });
    if (assetCatsRes.ok) {
      pass(results, 'GET /assets/categories', assetCatsRes.status);
    } else {
      fail(results, 'GET /assets/categories', assetCatsRes.status);
    }

    const docsListRes = await requestJson(endpoint(apiRoot, '/documents'), { headers: authHeaders });
    if (docsListRes.ok || docsListRes.status === 403) {
      pass(results, 'GET /documents', docsListRes.status, docsListRes.status === 403 ? 'Permission denied (expected for some roles)' : undefined);
    } else {
      fail(results, 'GET /documents', docsListRes.status);
    }

    const tripsRes = await requestJson(endpoint(apiRoot, '/trips'), { headers: authHeaders });
    if (tripsRes.ok) {
      pass(results, 'GET /trips', tripsRes.status);
    } else {
      fail(results, 'GET /trips', tripsRes.status);
    }

    const unauthRes = await requestJson(endpoint(apiRoot, '/users'));
    if (!unauthRes.ok && unauthRes.status === 401) {
      pass(results, 'GET /users without token returns 401', unauthRes.status);
    } else {
      fail(results, 'GET /users without token returns 401', unauthRes.status);
    }

    const vNum = `TEST-E2E-STAGING-API-${ts()}`;
    const newV = await requestJson<{ data?: { id: string } }>(
      endpoint(apiRoot, '/vehicles'),
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ vehicleNumber: vNum, vehicleType: 'TRUCK', fuelType: 'DIESEL' }) },
    );
    const vehicle = newV.data?.data;
    if (vehicle) {
      pass(results, 'POST /vehicles (create TEST-E2E-STAGING)', newV.status);
      created.vehicleIds.push(vehicle.id);
    } else {
      fail(results, 'POST /vehicles (create TEST-E2E-STAGING)', newV.status);
    }

    const dName = `TEST-E2E-STAGING-API-DRV-${ts()}`;
    const dMobile = `7${ts().slice(-9)}`;
    const newD = await requestJson<{ data?: { id: string } }>(
      endpoint(apiRoot, '/drivers'),
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ name: dName, mobile: dMobile, licenseNumber: `DL-STAGING-${ts()}` }) },
    );
    const driver = newD.data?.data;
    if (driver) {
      pass(results, 'POST /drivers (create TEST-E2E-STAGING)', newD.status);
      created.driverIds.push(driver.id);
    } else {
      fail(results, 'POST /drivers (create TEST-E2E-STAGING)', newD.status);
    }

    if (vehicle && driver) {
      // 1. Full Lifecycle Trip
      const tRes = await requestJson<{ data?: { id: string; status: string } }>(
        endpoint(apiRoot, '/trips'),
        { method: 'POST', headers: authHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: vehicle.id, driverId: driver.id, originName: 'Test Origin', destinationName: 'Test Destination' }) },
      );
      const trip = tRes.data?.data;
      if (trip) {
        pass(results, 'POST /trips (create TEST-E2E-STAGING)', tRes.status);
        created.tripIds.push(trip.id);

        const schedRes = await requestJson<{ data?: { status: string } }>(
          endpoint(apiRoot, `/trips/${trip.id}/schedule`),
          { method: 'POST', headers: authHeaders, body: JSON.stringify({ plannedStartAt: new Date().toISOString() }) },
        );
        if (schedRes.ok && schedRes.data?.data?.status === 'SCHEDULED') {
          pass(results, 'POST /trips/:id/schedule', schedRes.status);
        } else {
          fail(results, 'POST /trips/:id/schedule', schedRes.status);
        }

        const startRes = await requestJson<{ data?: { status: string } }>(
          endpoint(apiRoot, `/trips/${trip.id}/start`),
          { method: 'POST', headers: authHeaders, body: JSON.stringify({ startOdometer: 1000 }) },
        );
        if (startRes.ok && startRes.data?.data?.status === 'STARTED') {
          pass(results, 'POST /trips/:id/start', startRes.status);
          created.startedTripIds.push(trip.id);
        } else {
          fail(results, 'POST /trips/:id/start', startRes.status);
        }

        const compRes = await requestJson<{ data?: { status: string } }>(
          endpoint(apiRoot, `/trips/${trip.id}/complete`),
          { method: 'POST', headers: authHeaders, body: JSON.stringify({ endOdometer: 1200 }) },
        );
        if (compRes.ok && compRes.data?.data?.status === 'COMPLETED') {
          pass(results, 'POST /trips/:id/complete', compRes.status);
          created.startedTripIds = created.startedTripIds.filter((id) => id !== trip.id);
        } else {
          fail(results, 'POST /trips/:id/complete', compRes.status);
        }

        const histRes = await requestJson(endpoint(apiRoot, `/trips/${trip.id}/history`), { headers: authHeaders });
        if (histRes.ok) {
          pass(results, 'GET /trips/:id/history', histRes.status);
        } else {
          fail(results, 'GET /trips/:id/history', histRes.status);
        }
      } else {
        fail(results, 'POST /trips (create TEST-E2E-STAGING)', tRes.status);
      }

      // 2. Cancellation Trip
      const tCancelRes = await requestJson<{ data?: { id: string; status: string } }>(
        endpoint(apiRoot, '/trips'),
        { method: 'POST', headers: authHeaders, body: JSON.stringify({ tripType: 'INTERNAL', vehicleId: vehicle.id, driverId: driver.id, originName: 'Cancel Origin', destinationName: 'Cancel Destination' }) },
      );
      const tripToCancel = tCancelRes.data?.data;
      if (tripToCancel) {
        created.tripIds.push(tripToCancel.id);
        const cancelRes = await requestJson<{ data?: { status: string } }>(
          endpoint(apiRoot, `/trips/${tripToCancel.id}/cancel`),
          { method: 'POST', headers: authHeaders, body: JSON.stringify({ notes: 'testing cancel on staging' }) },
        );
        if (cancelRes.ok && cancelRes.data?.data?.status === 'CANCELLED') {
          pass(results, 'POST /trips/:id/cancel', cancelRes.status);
        } else {
          fail(results, 'POST /trips/:id/cancel', cancelRes.status);
        }
      } else {
        skip(results, 'POST /trips/:id/cancel', 'Could not create second trip for cancel test');
      }
    }

    // Cleanup TEST-E2E-STAGING records
    for (const tripId of created.startedTripIds) {
      try {
        await requestJson(endpoint(apiRoot, `/trips/${tripId}/cancel`), {
          method: 'POST', headers: authHeaders, body: JSON.stringify({ notes: 'staging smoke cleanup' }),
        });
      } catch { /* best effort */ }
    }

    for (const vId of created.vehicleIds) {
      try {
        await requestJson(endpoint(apiRoot, `/vehicles/${vId}/status`), {
          method: 'PATCH', headers: authHeaders, body: JSON.stringify({ status: 'AVAILABLE' }),
        });
      } catch { /* best effort */ }
    }

    for (const dId of created.driverIds) {
      try {
        await requestJson(endpoint(apiRoot, `/drivers/${dId}/status`), {
          method: 'PATCH', headers: authHeaders, body: JSON.stringify({ status: 'AVAILABLE' }),
        });
      } catch { /* best effort */ }
    }

  } finally {
    if (adminToken) {
      for (const tripId of created.startedTripIds) {
        try {
          const authHeaders = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
          await requestJson(endpoint(apiRoot, `/trips/${tripId}/cancel`), {
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
