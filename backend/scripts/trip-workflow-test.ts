type CheckResult = {
  name: string;
  ok: boolean;
  status?: number;
  detail?: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

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

async function main() {
  const apiBase = requiredEnv('API_BASE_URL').replace(/\/$/, '');
  const adminId = requiredEnv('E2E_ADMIN_IDENTIFIER');
  const adminPass = requiredEnv('E2E_ADMIN_PASSWORD');
  const results: CheckResult[] = [];

  // 1. Health
  const health = await requestJson<{ data?: { database?: string } }>(`${apiBase}/api/v1/health`);
  pushResult(results, 'GET /health', health.ok && health.data?.data?.database === 'connected', health.status);

  // 2. Login
  const login = await requestJson<{ data?: { accessToken?: string; refreshToken?: string } }>(
    `${apiBase}/api/v1/auth/login`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: adminId, password: adminPass }) },
  );
  const token = login.data?.data?.accessToken;
  pushResult(results, 'POST /auth/login', login.ok && !!token, login.status);
  if (!token) { printSummary(results); process.exit(1); }

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 3. Unauthorized request returns 401
  const unauth = await requestJson(`${apiBase}/api/v1/trips`);
  pushResult(results, 'GET /trips without token returns 401', !unauth.ok && unauth.status === 401, unauth.status);

  // 4. Create or find test vehicle
  const vList = await requestJson<{ data?: { items?: Array<{ id: string; vehicleNumber: string; status: string }> } }>(
    `${apiBase}/api/v1/vehicles?limit=100`,
    { headers: authHeaders },
  );
  let vehicle = vList.data?.data?.items?.find((v) => v.status === 'AVAILABLE');
  if (!vehicle) {
    const newV = await requestJson<{ data?: { id: string; vehicleNumber: string } }>(
      `${apiBase}/api/v1/vehicles`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ vehicleNumber: `TEST-TRIP-${Date.now()}`, vehicleType: 'TRUCK', fuelType: 'DIESEL' }) },
    );
    vehicle = newV.data?.data ? { ...newV.data.data, status: 'AVAILABLE' } : undefined;
  }
  pushResult(results, 'Get/create test vehicle', !!vehicle);
  if (!vehicle) { printSummary(results); process.exit(1); }

  // 5. Create or find test driver
  const dList = await requestJson<{ data?: { items?: Array<{ id: string; name: string; status: string }> } }>(
    `${apiBase}/api/v1/drivers?limit=100`,
    { headers: authHeaders },
  );
  let driver = dList.data?.data?.items?.find((d) => d.status === 'AVAILABLE');
  if (!driver) {
    const newD = await requestJson<{ data?: { id: string; name: string } }>(
      `${apiBase}/api/v1/drivers`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ name: `Test Driver ${Date.now()}`, mobile: `9${Date.now().toString().slice(-9)}`, licenseNumber: `DL-${Date.now()}` }) },
    );
    driver = newD.data?.data ? { ...newD.data.data, status: 'AVAILABLE' } : undefined;
  }
  pushResult(results, 'Get/create test driver', !!driver);
  if (!driver) { printSummary(results); process.exit(1); }

  // 6. Create trip
  const createRes = await requestJson<{ data?: { id: string; tripNumber: string; status: string } }>(
    `${apiBase}/api/v1/trips`,
    { method: 'POST', headers: authHeaders, body: JSON.stringify({ tripType: 'DELIVERY', vehicleId: vehicle.id, driverId: driver.id, originName: 'Depot', destinationName: 'Client A' }) },
  );
  const tripId = createRes.data?.data?.id;
  pushResult(results, 'POST /trips (create)', createRes.ok && !!tripId, createRes.status);
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

  // 11. Verify vehicle ON_TRIP
  const vAfterStart = await requestJson<{ data?: { status: string } }>(`${apiBase}/api/v1/vehicles/${vehicle.id}`, { headers: authHeaders });
  pushResult(results, 'Vehicle status ON_TRIP after start', vAfterStart.ok && vAfterStart.data?.data?.status === 'ON_TRIP', vAfterStart.status);

  // 12. Verify driver ON_TRIP
  const dAfterStart = await requestJson<{ data?: { status: string } }>(`${apiBase}/api/v1/drivers/${driver.id}`, { headers: authHeaders });
  pushResult(results, 'Driver status ON_TRIP after start', dAfterStart.ok && dAfterStart.data?.data?.status === 'ON_TRIP', dAfterStart.status);

  // 13. Try starting second trip with same vehicle — should fail 400
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
    // Clean up second trip
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

  // 15. Verify vehicle AVAILABLE after complete
  const vAfterComp = await requestJson<{ data?: { status: string } }>(`${apiBase}/api/v1/vehicles/${vehicle.id}`, { headers: authHeaders });
  pushResult(results, 'Vehicle status AVAILABLE after complete', vAfterComp.ok && vAfterComp.data?.data?.status === 'AVAILABLE', vAfterComp.status);

  // 16. Verify driver AVAILABLE after complete
  const dAfterComp = await requestJson<{ data?: { status: string } }>(`${apiBase}/api/v1/drivers/${driver.id}`, { headers: authHeaders });
  pushResult(results, 'Driver status AVAILABLE after complete', dAfterComp.ok && dAfterComp.data?.data?.status === 'AVAILABLE', dAfterComp.status);

  // 17. Get history and verify records
  const histRes = await requestJson<{ data?: Array<{ action: string }> }>(
    `${apiBase}/api/v1/trips/${tripId}/history`,
    { headers: authHeaders },
  );
  const actions = histRes.data?.data?.map((h) => h.action) ?? [];
  pushResult(results, 'History contains CREATED', actions.includes('CREATED'));
  pushResult(results, 'History contains SCHEDULED', actions.includes('SCHEDULED'));
  pushResult(results, 'History contains STARTED', actions.includes('STARTED'));
  pushResult(results, 'History contains COMPLETED', actions.includes('COMPLETED'));

  // 18. Create another trip and cancel it
  const create3 = await requestJson<{ data?: { id: string } }>(
    `${apiBase}/api/v1/trips`,
    { method: 'POST', headers: authHeaders, body: JSON.stringify({ tripType: 'TRANSFER', vehicleId: vehicle.id, driverId: driver.id, originName: 'A', destinationName: 'B' }) },
  );
  const cancelId = create3.data?.data?.id;
  if (cancelId) {
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

  // 19. Query validation: invalid status returns 400 or 422
  const badQuery = await requestJson(`${apiBase}/api/v1/trips?status=INVALID_STATUS`, { headers: authHeaders });
  pushResult(results, 'Invalid status query returns 400/422', !badQuery.ok && (badQuery.status === 400 || badQuery.status === 422), badQuery.status);

  // 20. Query validation: invalid tripType returns 400 or 422
  const badType = await requestJson(`${apiBase}/api/v1/trips?tripType=INVALID_TYPE`, { headers: authHeaders });
  pushResult(results, 'Invalid tripType query returns 400/422', !badType.ok && (badType.status === 400 || badType.status === 422), badType.status);

  printSummary(results);
}

function printSummary(results: CheckResult[]) {
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
}

void main().catch((error) => {
  console.log('Trip workflow test summary');
  console.log(`FAIL setup - ${error instanceof Error ? error.message : 'unknown error'}`);
  console.log('Summary: 0 passed, 1 failed');
  process.exit(1);
});
