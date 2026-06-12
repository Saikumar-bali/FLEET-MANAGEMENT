/* eslint-disable @typescript-eslint/no-explicit-any */
import { defaultRolePermissionMap, roleDefinitions } from '../src/constants/rbac';
import {
  getAdminCredential,
  getApiBase,
  getCredential,
  requireAllRoles,
  RoleKey,
} from './test-helpers/credentials';

type CheckStatus = 'PASS' | 'FAIL' | 'SKIP';

type CheckResult = {
  name: string;
  status: CheckStatus;
  httpStatus?: number;
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
  const requireAll = requireAllRoles();

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
    if (health.ok && health.data?.data?.database === 'connected') {
      pass(results, 'GET /health', health.status);
    } else {
      fail(results, 'GET /health', health.status);
    }

    // 2. Login
    adminToken = await login(apiBase, adminId, adminPass);
    if (adminToken) {
      pass(results, 'POST /auth/login');
    } else {
      fail(results, 'POST /auth/login');
      printSummary(results);
      process.exit(1);
    }

    const authHeaders = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

    // 3. Unauthorized returns 401
    const unauth = await requestJson(`${apiBase}/api/v1/trips`);
    if (!unauth.ok && unauth.status === 401) {
      pass(results, 'GET /trips without token returns 401', unauth.status);
    } else {
      fail(results, 'GET /trips without token returns 401', unauth.status);
    }

    // 4. Create TEST-E2E vehicle
    const vNum = `TEST-E2E-TRIP-VEH-${ts()}`;
    const newV = await requestJson<{ data?: { id: string; vehicleNumber: string } }>(
      `${apiBase}/api/v1/vehicles`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ vehicleNumber: vNum, vehicleType: 'TRUCK', fuelType: 'DIESEL' }) },
    );
    const vehicle = newV.data?.data;
    if (vehicle) {
      pass(results, 'Create TEST-E2E vehicle', newV.status);
      created.vehicleIds.push(vehicle.id);
    } else {
      fail(results, 'Create TEST-E2E vehicle', newV.status);
      printSummary(results);
      process.exit(1);
    }

    // 5. Create TEST-E2E driver
    const dName = `TEST-E2E-TRIP-DRV-${ts()}`;
    const dLic = `TEST-E2E-TRIP-DL-${ts()}`;
    const dMobile = `9${ts().slice(-9)}`;
    const newD = await requestJson<{ data?: { id: string; name: string } }>(
      `${apiBase}/api/v1/drivers`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ name: dName, mobile: dMobile, licenseNumber: dLic }) },
    );
    const driver = newD.data?.data;
    if (driver) {
      pass(results, 'Create TEST-E2E driver', newD.status);
      created.driverIds.push(driver.id);
    } else {
      fail(results, 'Create TEST-E2E driver', newD.status);
      printSummary(results);
      process.exit(1);
    }

    // 6. Create trip
    const createRes = await requestJson<{ data?: { id: string; tripNumber: string; status: string } }>(
      `${apiBase}/api/v1/trips`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: vehicle.id, driverId: driver.id, originName: 'Depot', destinationName: 'Client A' }) },
    );
    const tripId = createRes.data?.data?.id;
    if (createRes.ok && tripId) {
      pass(results, 'POST /trips (create)', createRes.status);
      created.tripIds.push(tripId);
    } else {
      fail(results, 'POST /trips (create)', createRes.status);
      printSummary(results);
      process.exit(1);
    }

    // 7. GET /trips list
    const listRes = await requestJson<{ data?: { items?: unknown[] } }>(`${apiBase}/api/v1/trips`, { headers: authHeaders });
    if (listRes.ok && Array.isArray(listRes.data?.data?.items)) {
      pass(results, 'GET /trips (list)', listRes.status);
    } else {
      fail(results, 'GET /trips (list)', listRes.status);
    }

    // 8. GET /trips/:id
    const getRes = await requestJson<{ data?: { id: string; status: string } }>(`${apiBase}/api/v1/trips/${tripId}`, { headers: authHeaders });
    if (getRes.ok && getRes.data?.data?.status === 'DRAFT') {
      pass(results, `GET /trips/${tripId}`, getRes.status);
    } else {
      fail(results, `GET /trips/${tripId}`, getRes.status);
    }

    // 9. Schedule trip
    const schedRes = await requestJson<{ data?: { status: string } }>(
      `${apiBase}/api/v1/trips/${tripId}/schedule`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ plannedStartAt: new Date().toISOString() }) },
    );
    if (schedRes.ok && schedRes.data?.data?.status === 'SCHEDULED') {
      pass(results, 'POST /trips/:id/schedule', schedRes.status);
    } else {
      fail(results, 'POST /trips/:id/schedule', schedRes.status);
    }

    // 10. Start trip
    const startRes = await requestJson<{ data?: { status: string } }>(
      `${apiBase}/api/v1/trips/${tripId}/start`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ startOdometer: 1000 }) },
    );
    if (startRes.ok && startRes.data?.data?.status === 'STARTED') {
      pass(results, 'POST /trips/:id/start', startRes.status);
      created.startedTripIds.push(tripId);
    } else {
      fail(results, 'POST /trips/:id/start', startRes.status);
    }

    // 11. Verify vehicle ON_TRIP
    const vAfterStart = await requestJson<{ data?: { status: string } }>(`${apiBase}/api/v1/vehicles/${vehicle.id}`, { headers: authHeaders });
    if (vAfterStart.ok && vAfterStart.data?.data?.status === 'ON_TRIP') {
      pass(results, 'Vehicle status ON_TRIP after start', vAfterStart.status);
    } else {
      fail(results, 'Vehicle status ON_TRIP after start', vAfterStart.status);
    }

    // 12. Verify driver ON_TRIP
    const dAfterStart = await requestJson<{ data?: { status: string } }>(`${apiBase}/api/v1/drivers/${driver.id}`, { headers: authHeaders });
    if (dAfterStart.ok && dAfterStart.data?.data?.status === 'ON_TRIP') {
      pass(results, 'Driver status ON_TRIP after start', dAfterStart.status);
    } else {
      fail(results, 'Driver status ON_TRIP after start', dAfterStart.status);
    }

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
      if (!start2.ok && start2.status === 400) {
        pass(results, 'Second trip with same vehicle blocked (400)', start2.status);
      } else {
        fail(results, 'Second trip with same vehicle blocked (400)', start2.status);
      }
      await requestJson(`${apiBase}/api/v1/trips/${create2.data.data.id}/cancel`, { method: 'POST', headers: authHeaders, body: JSON.stringify({}) });
    } else {
      fail(results, 'Second trip with same vehicle blocked (400)', undefined, 'Could not create second trip');
    }

    // 14. Complete trip
    const compRes = await requestJson<{ data?: { status: string } }>(
      `${apiBase}/api/v1/trips/${tripId}/complete`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ endOdometer: 1200 }) },
    );
    if (compRes.ok && compRes.data?.data?.status === 'COMPLETED') {
      pass(results, 'POST /trips/:id/complete', compRes.status);
      created.startedTripIds = created.startedTripIds.filter((id) => id !== tripId);
    } else {
      fail(results, 'POST /trips/:id/complete', compRes.status);
    }

    // 15. Verify vehicle AVAILABLE
    const vAfterComp = await requestJson<{ data?: { status: string } }>(`${apiBase}/api/v1/vehicles/${vehicle.id}`, { headers: authHeaders });
    if (vAfterComp.ok && vAfterComp.data?.data?.status === 'AVAILABLE') {
      pass(results, 'Vehicle status AVAILABLE after complete', vAfterComp.status);
    } else {
      fail(results, 'Vehicle status AVAILABLE after complete', vAfterComp.status);
    }

    // 16. Verify driver AVAILABLE
    const dAfterComp = await requestJson<{ data?: { status: string } }>(`${apiBase}/api/v1/drivers/${driver.id}`, { headers: authHeaders });
    if (dAfterComp.ok && dAfterComp.data?.data?.status === 'AVAILABLE') {
      pass(results, 'Driver status AVAILABLE after complete', dAfterComp.status);
    } else {
      fail(results, 'Driver status AVAILABLE after complete', dAfterComp.status);
    }

    // 17. History records
    const histRes = await requestJson<{ data?: Array<{ action: string }> }>(
      `${apiBase}/api/v1/trips/${tripId}/history`,
      { headers: authHeaders },
    );
    const actions = histRes.data?.data?.map((h) => h.action) ?? [];
    for (const action of ['CREATED', 'SCHEDULED', 'STARTED', 'COMPLETED']) {
      if (actions.includes(action)) {
        pass(results, `History contains ${action}`);
      } else {
        fail(results, `History contains ${action}`);
      }
    }

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
      if (cancelRes.ok && cancelRes.data?.data?.status === 'CANCELLED') {
        pass(results, 'POST /trips/:id/cancel', cancelRes.status);
      } else {
        fail(results, 'POST /trips/:id/cancel', cancelRes.status);
      }

      const cancelHist = await requestJson<{ data?: Array<{ action: string }> }>(
        `${apiBase}/api/v1/trips/${cancelId}/history`,
        { headers: authHeaders },
      );
      if (cancelHist.data?.data?.some((h) => h.action === 'CANCELLED')) {
        pass(results, 'Cancelled trip history contains CANCELLED');
      } else {
        fail(results, 'Cancelled trip history contains CANCELLED');
      }
    } else {
      fail(results, 'POST /trips/:id/cancel', undefined, 'Could not create cancel test trip');
    }

    // 19. Invalid status query
    const badQuery = await requestJson(`${apiBase}/api/v1/trips?status=INVALID_STATUS`, { headers: authHeaders });
    if (!badQuery.ok && (badQuery.status === 400 || badQuery.status === 422)) {
      pass(results, 'Invalid status query returns 400/422', badQuery.status);
    } else {
      fail(results, 'Invalid status query returns 400/422', badQuery.status);
    }

    // 20. Invalid tripType query
    const badType = await requestJson(`${apiBase}/api/v1/trips?tripType=INVALID_TYPE`, { headers: authHeaders });
    if (!badType.ok && (badType.status === 400 || badType.status === 422)) {
      pass(results, 'Invalid tripType query returns 400/422', badType.status);
    } else {
      fail(results, 'Invalid tripType query returns 400/422', badType.status);
    }

    // --- NEGATIVE CHECKS ---

    // 21. UNDER_MAINTENANCE vehicle cannot start
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
        if (!startMaint.ok && startMaint.status === 400) {
          pass(results, 'UNDER_MAINTENANCE vehicle start blocked (400)', startMaint.status);
        } else {
          fail(results, 'UNDER_MAINTENANCE vehicle start blocked (400)', startMaint.status);
        }
        await requestJson(`${apiBase}/api/v1/trips/${maintTrip.data.data.id}/cancel`, { method: 'POST', headers: authHeaders, body: JSON.stringify({}) });
      } else {
        fail(results, 'UNDER_MAINTENANCE vehicle start blocked (400)', undefined, 'Could not create trip');
      }
    } else {
      fail(results, 'UNDER_MAINTENANCE vehicle start blocked (400)', undefined, 'Could not create vehicle');
    }

    // 22. SUSPENDED driver cannot start
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
        if (!startSusp.ok && startSusp.status === 400) {
          pass(results, 'SUSPENDED driver start blocked (400)', startSusp.status);
        } else {
          fail(results, 'SUSPENDED driver start blocked (400)', startSusp.status);
        }
        await requestJson(`${apiBase}/api/v1/trips/${suspTrip.data.data.id}/cancel`, { method: 'POST', headers: authHeaders, body: JSON.stringify({}) });
      } else {
        fail(results, 'SUSPENDED driver start blocked (400)', undefined, 'Could not create trip');
      }
    } else {
      fail(results, 'SUSPENDED driver start blocked (400)', undefined, 'Could not create driver');
    }

    // 23. driver === assistantDriver rejected
    const sameTrip = await requestJson(
      `${apiBase}/api/v1/trips`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: vehicle.id, driverId: driver.id, assistantDriverId: driver.id, originName: 'X', destinationName: 'Y' }) },
    );
    if (!sameTrip.ok && (sameTrip.status === 400 || sameTrip.status === 422)) {
      pass(results, 'driver === assistantDriver rejected (400/422)', sameTrip.status);
    } else {
      fail(results, 'driver === assistantDriver rejected (400/422)', sameTrip.status);
    }

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
      if (!negStart.ok && (negStart.status === 400 || negStart.status === 422)) {
        pass(results, 'Negative startOdometer rejected (400/422)', negStart.status);
      } else {
        fail(results, 'Negative startOdometer rejected (400/422)', negStart.status);
      }
      await requestJson(`${apiBase}/api/v1/trips/${negOdoTrip.data.data.id}/cancel`, { method: 'POST', headers: authHeaders, body: JSON.stringify({}) });
    } else {
      fail(results, 'Negative startOdometer rejected (400)', undefined, 'Could not create trip');
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
      if (!failComplete.ok && failComplete.status === 400) {
        pass(results, 'endOdometer < startOdometer rejected (400)', failComplete.status);
      } else {
        fail(results, 'endOdometer < startOdometer rejected (400)', failComplete.status);
      }
      await requestJson(`${apiBase}/api/v1/trips/${odoFailTrip.data.data.id}/cancel`, { method: 'POST', headers: authHeaders, body: JSON.stringify({}) });
      created.startedTripIds = created.startedTripIds.filter((id) => id !== odoFailTrip.data!.data!.id);
    } else {
      fail(results, 'endOdometer < startOdometer rejected (400)', undefined, 'Could not create trip');
    }

    // --- ROLE-BASED PERMISSION CHECKS (imported from rbac.ts defaultRolePermissionMap) ---

    const seededRoleKeys = roleDefinitions.map((r) => r.key);

    for (const roleKey of seededRoleKeys) {
      if (!seededRoleKeys.includes(roleKey)) {
        skip(results, `[${roleKey}] all permission checks`, 'Role not in roleDefinitions (not seeded)');
        continue;
      }

      const rolePerms = defaultRolePermissionMap[roleKey] ?? [];
      const roleCred = getCredential(roleKey as RoleKey);

      if (!roleCred) {
        const msg = `No ${roleKey} credentials in .env`;
        if (requireAll) {
          fail(results, `[${roleKey}] all permission checks`, undefined, msg);
        } else {
          skip(results, `[${roleKey}] all permission checks`, msg);
        }
        continue;
      }

      const roleToken = await login(apiBase, roleCred.identifier, roleCred.password);
      if (!roleToken) {
        fail(results, `[${roleKey}] login`, undefined, 'Login failed');
        continue;
      }
      pass(results, `[${roleKey}] login`);

      const rHeaders = { Authorization: `Bearer ${roleToken}`, 'Content-Type': 'application/json' };

      // Test trip_view: GET /trips
      const canViewTrips = rolePerms.includes('trip_view');
      const viewRes = await requestJson(`${apiBase}/api/v1/trips`, { headers: rHeaders });
      if (canViewTrips) {
        if (viewRes.ok) {
          pass(results, `[${roleKey}] can GET /trips (trip_view)`, viewRes.status);
        } else {
          fail(results, `[${roleKey}] can GET /trips (trip_view)`, viewRes.status);
        }
      } else {
        if (!viewRes.ok && viewRes.status === 403) {
          pass(results, `[${roleKey}] cannot GET /trips (no trip_view)`, viewRes.status);
        } else {
          fail(results, `[${roleKey}] cannot GET /trips (no trip_view)`, viewRes.status);
        }
      }

      // Test trip_create: POST /trips
      const canCreateTrip = rolePerms.includes('trip_create');
      const createTripRes = await requestJson<{ data?: { id: string } }>(
        `${apiBase}/api/v1/trips`,
        { method: 'POST', headers: rHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: vehicle.id, originName: 'X', destinationName: 'Y' }) },
      );
      if (canCreateTrip) {
        if (createTripRes.ok && createTripRes.data?.data?.id) {
          pass(results, `[${roleKey}] can POST /trips (trip_create)`, createTripRes.status);
          created.tripIds.push(createTripRes.data.data.id);
        } else {
          fail(results, `[${roleKey}] can POST /trips (trip_create)`, createTripRes.status);
        }
      } else {
        if (!createTripRes.ok && createTripRes.status === 403) {
          pass(results, `[${roleKey}] cannot POST /trips (no trip_create)`, createTripRes.status);
        } else {
          fail(results, `[${roleKey}] cannot POST /trips (no trip_create)`, createTripRes.status);
        }
      }

      // Test trip_start: POST /trips/:id/start
      const canStartTrip = rolePerms.includes('trip_start');
      const startTripRes = await requestJson(
        `${apiBase}/api/v1/trips/${tripId}/start`,
        { method: 'POST', headers: rHeaders, body: JSON.stringify({ startOdometer: 99999 }) },
      );
      if (canStartTrip) {
        if (!startTripRes.ok && startTripRes.status === 400) {
          pass(results, `[${roleKey}] can POST /trips/:id/start (trip_start, rejected=400 OK)`, startTripRes.status);
        } else if (startTripRes.ok) {
          pass(results, `[${roleKey}] can POST /trips/:id/start (trip_start)`, startTripRes.status);
        } else {
          fail(results, `[${roleKey}] can POST /trips/:id/start (trip_start)`, startTripRes.status);
        }
      } else {
        if (!startTripRes.ok && startTripRes.status === 403) {
          pass(results, `[${roleKey}] cannot POST /trips/:id/start (no trip_start)`, startTripRes.status);
        } else {
          fail(results, `[${roleKey}] cannot POST /trips/:id/start (no trip_start)`, startTripRes.status);
        }
      }

      // Test trip_cancel: POST /trips/:id/cancel
      const canCancelTrip = rolePerms.includes('trip_cancel');
      const cancelTripRes = await requestJson(
        `${apiBase}/api/v1/trips/${tripId}/cancel`,
        { method: 'POST', headers: rHeaders, body: JSON.stringify({ notes: 'role test' }) },
      );
      if (canCancelTrip) {
        if (!cancelTripRes.ok && (cancelTripRes.status === 400 || cancelTripRes.status === 409)) {
          pass(results, `[${roleKey}] can POST /trips/:id/cancel (trip_cancel, rejected=${cancelTripRes.status} OK)`, cancelTripRes.status);
        } else if (cancelTripRes.ok) {
          pass(results, `[${roleKey}] can POST /trips/:id/cancel (trip_cancel)`, cancelTripRes.status);
        } else {
          fail(results, `[${roleKey}] can POST /trips/:id/cancel (trip_cancel)`, cancelTripRes.status);
        }
      } else {
        if (!cancelTripRes.ok && cancelTripRes.status === 403) {
          pass(results, `[${roleKey}] cannot POST /trips/:id/cancel (no trip_cancel)`, cancelTripRes.status);
        } else {
          fail(results, `[${roleKey}] cannot POST /trips/:id/cancel (no trip_cancel)`, cancelTripRes.status);
        }
      }
    }

  } finally {
    if (adminToken) {
      await cleanup(apiBase, adminToken, created);
    }
  }

  const exitCode = printSummary(results);
  process.exit(exitCode);
}

function printSummary(results: CheckResult[]): number {
  console.log('\nTrip workflow test summary');
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
  console.log('Trip workflow test summary');
  console.log(`FAIL setup - ${error instanceof Error ? error.message : 'unknown error'}`);
  console.log('Summary: 0 passed, 1 failed, 0 skipped');
  process.exit(1);
});
