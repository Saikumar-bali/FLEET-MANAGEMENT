/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAdminCredential, getApiBase, getCredential, RoleKey } from './test-helpers/credentials';

type CheckResult = {
  name: string;
  ok: boolean;
  status?: number;
  detail?: string;
};

async function requestJson<T>(
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

function pushResult(results: CheckResult[], name: string, ok: boolean, status?: number, detail?: string) {
  results.push({ name, ok, status, detail });
}

function ts(): string {
  return Date.now().toString();
}

async function login(apiBase: string, identifier: string, password: string): Promise<string | null> {
  const res = await requestJson<{ data?: { accessToken?: string } }>(
    `${apiBase}/api/v1/auth/login`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password }) },
  );
  return res.data?.data?.accessToken ?? null;
}

async function cleanup(
  apiBase: string,
  adminToken: string,
  created: {
    vehicleIds: string[];
    driverIds: string[];
    tripIds: string[];
    startedTripIds: string[];
  },
  results: CheckResult[],
) {
  const authHeaders = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

  for (const tripId of created.startedTripIds) {
    try {
      await requestJson(`${apiBase}/api/v1/trips/${tripId}/cancel`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ notes: 'E2E cleanup' }),
      });
    } catch { /* best effort */ }
  }

  for (const tripId of created.tripIds) {
    try {
      const trip = await requestJson<{ data?: { status: string } }>(`${apiBase}/api/v1/trips/${tripId}`, { headers: authHeaders });
      const status = trip.data?.data?.status;
      if (status === 'STARTED') {
        await requestJson(`${apiBase}/api/v1/trips/${tripId}/cancel`, {
          method: 'POST', headers: authHeaders, body: JSON.stringify({ notes: 'E2E cleanup' }),
        });
      }
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
}

async function main() {
  const apiBase = getApiBase();
  const { identifier: adminId, password: adminPass } = getAdminCredential();
  const results: CheckResult[] = [];

  const created = {
    vehicleIds: [] as string[],
    driverIds: [] as string[],
    tripIds: [] as string[],
    startedTripIds: [] as string[],
  };

  let adminToken: string | null = null;

  try {
    // 1. Health
    const health = await requestJson<{ data?: { database?: string } }>(`${apiBase}/api/v1/health`);
    pushResult(results, 'GET /health', health.ok && health.data?.data?.database === 'connected', health.status);

    // 2. Login
    adminToken = await login(apiBase, adminId, adminPass);
    pushResult(results, 'POST /auth/login', !!adminToken);
    if (!adminToken) { printSummary(results); process.exit(1); }

    const authHeaders = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

    // 3. Unauthorized returns 401
    const unauth = await requestJson(`${apiBase}/api/v1/trips`);
    pushResult(results, 'GET /trips without token returns 401', !unauth.ok && unauth.status === 401, unauth.status);

    // 4. Create TEST-E2E vehicle
    const vNum = `TEST-E2E-TRIP-VEH-${ts()}`;
    const newV = await requestJson<{ data?: { id: string; vehicleNumber: string } }>(
      `${apiBase}/api/v1/vehicles`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ vehicleNumber: vNum, vehicleType: 'TRUCK', fuelType: 'DIESEL' }) },
    );
    const vehicle = newV.data?.data;
    pushResult(results, 'Create TEST-E2E vehicle', !!vehicle);
    if (vehicle) created.vehicleIds.push(vehicle.id);
    if (!vehicle) { printSummary(results); process.exit(1); }

    // 5. Create TEST-E2E driver
    const dName = `TEST-E2E-TRIP-DRV-${ts()}`;
    const dLic = `TEST-E2E-TRIP-DL-${ts()}`;
    const dMobile = `9${ts().slice(-9)}`;
    const newD = await requestJson<{ data?: { id: string; name: string } }>(
      `${apiBase}/api/v1/drivers`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ name: dName, mobile: dMobile, licenseNumber: dLic }) },
    );
    const driver = newD.data?.data;
    pushResult(results, 'Create TEST-E2E driver', !!driver);
    if (driver) created.driverIds.push(driver.id);
    if (!driver) { printSummary(results); process.exit(1); }

    // 6. Create trip
    const createRes = await requestJson<{ data?: { id: string; tripNumber: string; status: string } }>(
      `${apiBase}/api/v1/trips`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: vehicle.id, driverId: driver.id, originName: 'Depot', destinationName: 'Client A' }) },
    );
    const tripId = createRes.data?.data?.id;
    pushResult(results, 'POST /trips (create)', createRes.ok && !!tripId, createRes.status);
    if (tripId) created.tripIds.push(tripId);
    if (!tripId) { printSummary(results); process.exit(1); }

    // 7. GET /trips list
    const listRes = await requestJson<{ data?: { items?: unknown[] } }>(`${apiBase}/api/v1/trips`, { headers: authHeaders });
    pushResult(results, 'GET /trips (list)', listRes.ok && Array.isArray(listRes.data?.data?.items), listRes.status);

    // 8. GET /trips/:id
    const getRes = await requestJson<{ data?: { id: string; status: string } }>(`${apiBase}/api/v1/trips/${tripId}`, { headers: authHeaders });
    pushResult(results, `GET /trips/${tripId}`, getRes.ok && getRes.data?.data?.status === 'DRAFT', getRes.status);

    // 9. Schedule trip
    const schedRes = await requestJson<{ data?: { status: string } }>(
      `${apiBase}/api/v1/trips/${tripId}/schedule`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ plannedStartAt: new Date().toISOString() }) },
    );
    pushResult(results, 'POST /trips/:id/schedule', schedRes.ok && schedRes.data?.data?.status === 'SCHEDULED', schedRes.status);

    // 10. Start trip
    const startRes = await requestJson<{ data?: { status: string } }>(
      `${apiBase}/api/v1/trips/${tripId}/start`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ startOdometer: 1000 }) },
    );
    pushResult(results, 'POST /trips/:id/start', startRes.ok && startRes.data?.data?.status === 'STARTED', startRes.status);
    if (startRes.ok) created.startedTripIds.push(tripId);

    // 11. Verify vehicle ON_TRIP
    const vAfterStart = await requestJson<{ data?: { status: string } }>(`${apiBase}/api/v1/vehicles/${vehicle.id}`, { headers: authHeaders });
    pushResult(results, 'Vehicle status ON_TRIP after start', vAfterStart.ok && vAfterStart.data?.data?.status === 'ON_TRIP', vAfterStart.status);

    // 12. Verify driver ON_TRIP
    const dAfterStart = await requestJson<{ data?: { status: string } }>(`${apiBase}/api/v1/drivers/${driver.id}`, { headers: authHeaders });
    pushResult(results, 'Driver status ON_TRIP after start', dAfterStart.ok && dAfterStart.data?.data?.status === 'ON_TRIP', dAfterStart.status);

    // 13. Second trip with same vehicle blocked
    const create2 = await requestJson<{ data?: { id: string } }>(
      `${apiBase}/api/v1/trips`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: vehicle.id, originName: 'X', destinationName: 'Y' }) },
    );
    if (create2.data?.data?.id) {
      const start2 = await requestJson(
        `${apiBase}/api/v1/trips/${create2.data.data.id}/start`,
        { method: 'POST', headers: authHeaders, body: JSON.stringify({}) },
      );
      pushResult(results, 'Second trip with same vehicle blocked (400)', !start2.ok && start2.status === 400, start2.status);
      await requestJson(`${apiBase}/api/v1/trips/${create2.data.data.id}/cancel`, { method: 'POST', headers: authHeaders, body: JSON.stringify({}) });
    } else {
      pushResult(results, 'Second trip with same vehicle blocked (400)', false, undefined, 'Could not create second trip');
    }

    // 14. Complete trip
    const compRes = await requestJson<{ data?: { status: string } }>(
      `${apiBase}/api/v1/trips/${tripId}/complete`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ endOdometer: 1200 }) },
    );
    pushResult(results, 'POST /trips/:id/complete', compRes.ok && compRes.data?.data?.status === 'COMPLETED', compRes.status);
    created.startedTripIds = created.startedTripIds.filter((id) => id !== tripId);

    // 15. Verify vehicle AVAILABLE
    const vAfterComp = await requestJson<{ data?: { status: string } }>(`${apiBase}/api/v1/vehicles/${vehicle.id}`, { headers: authHeaders });
    pushResult(results, 'Vehicle status AVAILABLE after complete', vAfterComp.ok && vAfterComp.data?.data?.status === 'AVAILABLE', vAfterComp.status);

    // 16. Verify driver AVAILABLE
    const dAfterComp = await requestJson<{ data?: { status: string } }>(`${apiBase}/api/v1/drivers/${driver.id}`, { headers: authHeaders });
    pushResult(results, 'Driver status AVAILABLE after complete', dAfterComp.ok && dAfterComp.data?.data?.status === 'AVAILABLE', dAfterComp.status);

    // 17. History records
    const histRes = await requestJson<{ data?: Array<{ action: string }> }>(
      `${apiBase}/api/v1/trips/${tripId}/history`,
      { headers: authHeaders },
    );
    const actions = histRes.data?.data?.map((h) => h.action) ?? [];
    pushResult(results, 'History contains CREATED', actions.includes('CREATED'));
    pushResult(results, 'History contains SCHEDULED', actions.includes('SCHEDULED'));
    pushResult(results, 'History contains STARTED', actions.includes('STARTED'));
    pushResult(results, 'History contains COMPLETED', actions.includes('COMPLETED'));

    // 18. Create and cancel a trip
    const create3 = await requestJson<{ data?: { id: string } }>(
      `${apiBase}/api/v1/trips`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ tripType: 'TRANSFER', vehicleId: vehicle.id, driverId: driver.id, originName: 'A', destinationName: 'B' }) },
    );
    const cancelId = create3.data?.data?.id;
    if (cancelId) {
      created.tripIds.push(cancelId);
      const cancelRes = await requestJson<{ data?: { status: string } }>(
        `${apiBase}/api/v1/trips/${cancelId}/cancel`,
        { method: 'POST', headers: authHeaders, body: JSON.stringify({ notes: 'Test cancel' }) },
      );
      pushResult(results, 'POST /trips/:id/cancel', cancelRes.ok && cancelRes.data?.data?.status === 'CANCELLED', cancelRes.status);

      const cancelHist = await requestJson<{ data?: Array<{ action: string }> }>(
        `${apiBase}/api/v1/trips/${cancelId}/history`,
        { headers: authHeaders },
      );
      pushResult(results, 'Cancelled trip history contains CANCELLED', (cancelHist.data?.data?.some((h) => h.action === 'CANCELLED') ?? false));
    } else {
      pushResult(results, 'POST /trips/:id/cancel', false, undefined, 'Could not create cancel test trip');
    }

    // 19. Invalid status query
    const badQuery = await requestJson(`${apiBase}/api/v1/trips?status=INVALID_STATUS`, { headers: authHeaders });
    pushResult(results, 'Invalid status query returns 400/422', !badQuery.ok && (badQuery.status === 400 || badQuery.status === 422), badQuery.status);

    // 20. Invalid tripType query
    const badType = await requestJson(`${apiBase}/api/v1/trips?tripType=INVALID_TYPE`, { headers: authHeaders });
    pushResult(results, 'Invalid tripType query returns 400/422', !badType.ok && (badType.status === 400 || badType.status === 422), badType.status);

    // --- NEGATIVE CHECKS (always create fresh E2E records) ---

    // 21. UNDER_MAINTENANCE vehicle → cannot start
    const maintVNum = `TEST-E2E-TRIP-MAINT-${ts()}`;
    const maintV = await requestJson<{ data?: { id: string } }>(
      `${apiBase}/api/v1/vehicles`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ vehicleNumber: maintVNum, vehicleType: 'TRUCK', fuelType: 'DIESEL' }) },
    );
    const maintVehicleId = maintV.data?.data?.id;
    if (maintVehicleId) {
      created.vehicleIds.push(maintVehicleId);
      await requestJson(`${apiBase}/api/v1/vehicles/${maintVehicleId}/status`, {
        method: 'PATCH', headers: authHeaders, body: JSON.stringify({ status: 'UNDER_MAINTENANCE' }),
      });
      const maintTrip = await requestJson<{ data?: { id: string } }>(
        `${apiBase}/api/v1/trips`,
        { method: 'POST', headers: authHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: maintVehicleId, driverId: driver.id, originName: 'X', destinationName: 'Y' }) },
      );
      if (maintTrip.ok && maintTrip.data?.data?.id) {
        created.tripIds.push(maintTrip.data.data.id);
        const startMaint = await requestJson(
          `${apiBase}/api/v1/trips/${maintTrip.data.data.id}/start`,
          { method: 'POST', headers: authHeaders, body: JSON.stringify({ startOdometer: 100 }) },
        );
        pushResult(results, 'Start trip with UNDER_MAINTENANCE vehicle blocked (400)', !startMaint.ok && startMaint.status === 400, startMaint.status);
        await requestJson(`${apiBase}/api/v1/trips/${maintTrip.data.data.id}/cancel`, { method: 'POST', headers: authHeaders, body: JSON.stringify({}) });
      } else {
        pushResult(results, 'Start trip with UNDER_MAINTENANCE vehicle blocked (400)', false, undefined, 'Could not create trip with maintenance vehicle');
      }
    } else {
      pushResult(results, 'Start trip with UNDER_MAINTENANCE vehicle blocked (400)', false, undefined, 'Could not create maintenance vehicle');
    }

    // 22. SUSPENDED driver → cannot start (uses PATCH /drivers/:id/status)
    const suspDName = `TEST-E2E-TRIP-SUSP-${ts()}`;
    const suspD = await requestJson<{ data?: { id: string } }>(
      `${apiBase}/api/v1/drivers`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ name: suspDName, mobile: `8${ts().slice(-9)}`, licenseNumber: `DL-S-${ts()}` }) },
    );
    const suspDriverId = suspD.data?.data?.id;
    if (suspDriverId) {
      created.driverIds.push(suspDriverId);
      await requestJson(`${apiBase}/api/v1/drivers/${suspDriverId}/status`, {
        method: 'PATCH', headers: authHeaders, body: JSON.stringify({ status: 'SUSPENDED' }),
      });
      const suspTrip = await requestJson<{ data?: { id: string } }>(
        `${apiBase}/api/v1/trips`,
        { method: 'POST', headers: authHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: vehicle.id, driverId: suspDriverId, originName: 'X', destinationName: 'Y' }) },
      );
      if (suspTrip.ok && suspTrip.data?.data?.id) {
        created.tripIds.push(suspTrip.data.data.id);
        const startSusp = await requestJson(
          `${apiBase}/api/v1/trips/${suspTrip.data.data.id}/start`,
          { method: 'POST', headers: authHeaders, body: JSON.stringify({ startOdometer: 100 }) },
        );
        pushResult(results, 'Start trip with SUSPENDED driver blocked (400)', !startSusp.ok && startSusp.status === 400, startSusp.status);
        await requestJson(`${apiBase}/api/v1/trips/${suspTrip.data.data.id}/cancel`, { method: 'POST', headers: authHeaders, body: JSON.stringify({}) });
      } else {
        pushResult(results, 'Start trip with SUSPENDED driver blocked (400)', false, undefined, 'Could not create trip with suspended driver');
      }
    } else {
      pushResult(results, 'Start trip with SUSPENDED driver blocked (400)', false, undefined, 'Could not create suspended driver');
    }

    // 23. driver === assistantDriver
    const sameTrip = await requestJson(
      `${apiBase}/api/v1/trips`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: vehicle.id, driverId: driver.id, assistantDriverId: driver.id, originName: 'X', destinationName: 'Y' }) },
    );
    pushResult(results, 'driver === assistantDriver rejected (400)', !sameTrip.ok && sameTrip.status === 400, sameTrip.status);

    // 24. Negative startOdometer
    const negOdoTrip = await requestJson<{ data?: { id: string } }>(
      `${apiBase}/api/v1/trips`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: vehicle.id, driverId: driver.id, originName: 'X', destinationName: 'Y' }) },
    );
    if (negOdoTrip.ok && negOdoTrip.data?.data?.id) {
      created.tripIds.push(negOdoTrip.data.data.id);
      const negStart = await requestJson(
        `${apiBase}/api/v1/trips/${negOdoTrip.data.data.id}/start`,
        { method: 'POST', headers: authHeaders, body: JSON.stringify({ startOdometer: -100 }) },
      );
      pushResult(results, 'Negative startOdometer rejected (400)', !negStart.ok && negStart.status === 400, negStart.status);
      await requestJson(`${apiBase}/api/v1/trips/${negOdoTrip.data.data.id}/cancel`, { method: 'POST', headers: authHeaders, body: JSON.stringify({}) });
    } else {
      pushResult(results, 'Negative startOdometer rejected (400)', false, undefined, 'Could not create odometer test trip');
    }

    // 25. endOdometer < startOdometer
    const odoFailTrip = await requestJson<{ data?: { id: string } }>(
      `${apiBase}/api/v1/trips`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: vehicle.id, driverId: driver.id, originName: 'X', destinationName: 'Y' }) },
    );
    if (odoFailTrip.ok && odoFailTrip.data?.data?.id) {
      created.tripIds.push(odoFailTrip.data.data.id);
      await requestJson(`${apiBase}/api/v1/trips/${odoFailTrip.data.data.id}/schedule`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ plannedStartAt: new Date().toISOString() }) });
      await requestJson(`${apiBase}/api/v1/trips/${odoFailTrip.data.data.id}/start`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ startOdometer: 1000 }) });
      created.startedTripIds.push(odoFailTrip.data.data.id);
      const failComplete = await requestJson(
        `${apiBase}/api/v1/trips/${odoFailTrip.data.data.id}/complete`,
        { method: 'POST', headers: authHeaders, body: JSON.stringify({ endOdometer: 500 }) },
      );
      pushResult(results, 'endOdometer < startOdometer rejected (400)', !failComplete.ok && failComplete.status === 400, failComplete.status);
      await requestJson(`${apiBase}/api/v1/trips/${odoFailTrip.data.data.id}/cancel`, { method: 'POST', headers: authHeaders, body: JSON.stringify({}) });
      created.startedTripIds = created.startedTripIds.filter((id) => id !== odoFailTrip.data!.data!.id);
    } else {
      pushResult(results, 'endOdometer < startOdometer rejected (400)', false, undefined, 'Could not create odometer test trip');
    }

    // --- ROLE-BASED PERMISSION CHECKS ---

    // 26. Viewer: can GET /trips (trip_view), cannot POST /trips (no trip_create)
    const viewerCred = getCredential('viewer');
    if (viewerCred) {
      const viewerToken = await login(apiBase, viewerCred.identifier, viewerCred.password);
      if (viewerToken) {
        const vHeaders = { Authorization: `Bearer ${viewerToken}`, 'Content-Type': 'application/json' };
        const vList = await requestJson(`${apiBase}/api/v1/trips`, { headers: vHeaders });
        pushResult(results, 'Viewer can GET /trips (trip_view)', vList.ok, vList.status);

        const vCreate = await requestJson(
          `${apiBase}/api/v1/trips`,
          { method: 'POST', headers: vHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: vehicle.id, originName: 'X', destinationName: 'Y' }) },
        );
        pushResult(results, 'Viewer cannot POST /trips (no trip_create)', !vCreate.ok && vCreate.status === 403, vCreate.status);

        const vStart = await requestJson(
          `${apiBase}/api/v1/trips/${tripId}/start`,
          { method: 'POST', headers: vHeaders, body: JSON.stringify({}) },
        );
        pushResult(results, 'Viewer cannot POST /trips/:id/start (no trip_start)', !vStart.ok && vStart.status === 403, vStart.status);
      } else {
        pushResult(results, 'Viewer can GET /trips (trip_view)', false, undefined, 'Viewer login failed');
        pushResult(results, 'Viewer cannot POST /trips (no trip_create)', false, undefined, 'Viewer login failed');
        pushResult(results, 'Viewer cannot POST /trips/:id/start (no trip_start)', false, undefined, 'Viewer login failed');
      }
    } else {
      pushResult(results, 'Viewer can GET /trips (trip_view)', false, undefined, 'No viewer credentials in .env');
      pushResult(results, 'Viewer cannot POST /trips (no trip_create)', false, undefined, 'No viewer credentials in .env');
      pushResult(results, 'Viewer cannot POST /trips/:id/start (no trip_start)', false, undefined, 'No viewer credentials in .env');
    }

    // 27. Driver: has trip_start/trip_end but not trip_create/trip_cancel
    const driverCred = getCredential('driver');
    if (driverCred) {
      const driverToken = await login(apiBase, driverCred.identifier, driverCred.password);
      if (driverToken) {
        const drHeaders = { Authorization: `Bearer ${driverToken}`, 'Content-Type': 'application/json' };
        const drCreate = await requestJson(
          `${apiBase}/api/v1/trips`,
          { method: 'POST', headers: drHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: vehicle.id, originName: 'X', destinationName: 'Y' }) },
        );
        pushResult(results, 'Driver cannot POST /trips (no trip_create)', !drCreate.ok && drCreate.status === 403, drCreate.status);

        const drCancel = await requestJson(
          `${apiBase}/api/v1/trips/${tripId}/cancel`,
          { method: 'POST', headers: drHeaders, body: JSON.stringify({}) },
        );
        pushResult(results, 'Driver cannot POST /trips/:id/cancel (no trip_cancel)', !drCancel.ok && drCancel.status === 403, drCancel.status);
      } else {
        pushResult(results, 'Driver cannot POST /trips (no trip_create)', false, undefined, 'Driver login failed');
        pushResult(results, 'Driver cannot POST /trips/:id/cancel (no trip_cancel)', false, undefined, 'Driver login failed');
      }
    } else {
      pushResult(results, 'Driver cannot POST /trips (no trip_create)', false, undefined, 'No driver credentials in .env');
      pushResult(results, 'Driver cannot POST /trips/:id/cancel (no trip_cancel)', false, undefined, 'No driver credentials in .env');
    }

    // 28. Manager: has all trip permissions
    const managerCred = getCredential('manager');
    if (managerCred) {
      const managerToken = await login(apiBase, managerCred.identifier, managerCred.password);
      if (managerToken) {
        const mHeaders = { Authorization: `Bearer ${managerToken}`, 'Content-Type': 'application/json' };
        const mList = await requestJson(`${apiBase}/api/v1/trips`, { headers: mHeaders });
        pushResult(results, 'Manager can GET /trips (trip_view)', mList.ok, mList.status);

        const mCreate = await requestJson(
          `${apiBase}/api/v1/trips`,
          { method: 'POST', headers: mHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: vehicle.id, driverId: driver.id, originName: 'X', destinationName: 'Y' }) },
        );
        pushResult(results, 'Manager can POST /trips (trip_create)', mCreate.ok && !!mCreate.data?.data?.id, mCreate.status);
        if (mCreate.data?.data?.id) {
          created.tripIds.push(mCreate.data.data.id);
        }
      } else {
        pushResult(results, 'Manager can GET /trips (trip_view)', false, undefined, 'Manager login failed');
        pushResult(results, 'Manager can POST /trips (trip_create)', false, undefined, 'Manager login failed');
      }
    } else {
      pushResult(results, 'Manager can GET /trips (trip_view)', false, undefined, 'No manager credentials in .env');
      pushResult(results, 'Manager can POST /trips (trip_create)', false, undefined, 'No manager credentials in .env');
    }

  } finally {
    if (adminToken) {
      await cleanup(apiBase, adminToken, created, results);
    }
  }

  const exitCode = printSummary(results);
  process.exit(exitCode);
}

function printSummary(results: CheckResult[]): number {
  console.log('\nTrip workflow test summary');
  console.log('─'.repeat(60));
  for (const r of results) {
    const statusText = r.status ? ` (${r.status})` : '';
    const detailText = r.detail ? ` - ${r.detail}` : '';
    console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${statusText}${detailText}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  const passed = results.length - failed;
  console.log('─'.repeat(60));
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  return failed > 0 ? 1 : 0;
}

void main().catch((error) => {
  console.log('Trip workflow test summary');
  console.log(`FAIL setup - ${error instanceof Error ? error.message : 'unknown error'}`);
  console.log('Summary: 0 passed, 1 failed');
  process.exit(1);
});
