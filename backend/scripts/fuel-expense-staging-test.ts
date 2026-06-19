import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

type ApiResult = { ok: boolean; status: number; data?: any };
const results: Array<{ name: string; ok: boolean; status: number }> = [];

const rawBase = process.env.API_BASE_URL || 'https://fleet-management-backend-staging.vercel.app';
let base = rawBase.trim().replace(/\/+$/, '');
if (base.endsWith('/api/v1')) base = base.slice(0, -7);
const api = `${base}/api/v1`;

async function call(path: string, token?: string, method = 'GET', body?: unknown): Promise<ApiResult> {
  const r = await fetch(`${api}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, data: text ? JSON.parse(text) : undefined };
}

function check(name: string, r: ApiResult, expected: number | number[]) {
  const ok = (Array.isArray(expected) ? expected : [expected]).includes(r.status);
  results.push({ name, ok, status: r.status });
  return ok;
}

async function login(identifier: string, password: string): Promise<string> {
  const r = await call('/auth/login', undefined, 'POST', { identifier, password });
  if (!r.ok) throw new Error(`login failed: ${r.status}`);
  return r.data.data.accessToken as string;
}

async function main() {
  const adminId = process.env.E2E_ADMIN_IDENTIFIER || process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
  const adminPass = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!adminId || !adminPass) {
    console.error('FAIL: Admin credentials required (E2E_ADMIN_IDENTIFIER/E2E_ADMIN_PASSWORD or ADMIN_USERNAME/ADMIN_PASSWORD)');
    process.exit(1);
  }

  const admin = await login(adminId, adminPass);
  const stamp = Date.now();
  const tag = 'TEST-E2E-STAGING';

  const vehicle = await call('/vehicles', admin, 'POST', {
    vehicleNumber: `${tag}-FE-VEH-${stamp}`,
    vehicleType: 'TRUCK',
    fuelType: 'DIESEL',
  });
  check(`create ${tag} vehicle`, vehicle, 201);

  const otherVehicle = await call('/vehicles', admin, 'POST', {
    vehicleNumber: `${tag}-FE-OTHER-${stamp}`,
    vehicleType: 'TRUCK',
    fuelType: 'DIESEL',
  });
  check(`create ${tag} mismatch vehicle`, otherVehicle, 201);

  const trip = await call('/trips', admin, 'POST', {
    tripNumber: `${tag}-FE-TRIP-${stamp}`,
    tripType: 'INTERNAL',
    vehicleId: vehicle.data.data.id,
    originName: `${tag} Origin`,
    destinationName: `${tag} Destination`,
  });
  check(`create ${tag} trip`, trip, 201);

  const mismatch = await call('/fuel', admin, 'POST', {
    vehicleId: otherVehicle.data.data.id,
    tripId: trip.data.data.id,
    fuelDate: new Date().toISOString(),
    fuelType: 'DIESEL',
    quantityLiters: 10,
    pricePerLiter: 100,
  });
  check('fuel trip vehicle mismatch rejected', mismatch, 400);

  const fuel = await call('/fuel', admin, 'POST', {
    vehicleId: vehicle.data.data.id,
    tripId: trip.data.data.id,
    fuelDate: new Date().toISOString(),
    fuelType: 'DIESEL',
    quantityLiters: 10,
    pricePerLiter: 100,
    stationName: `${tag} Station`,
  });
  check(`create ${tag} fuel`, fuel, 201);

  check(`list ${tag} fuel`, await call(`/fuel?search=${tag}`, admin), 200);

  const fuelDetail = await call(`/fuel/${fuel.data.data.id}`, admin);
  check(`read ${tag} fuel detail`, fuelDetail, 200);

  check(`update ${tag} fuel`, await call(`/fuel/${fuel.data.data.id}`, admin, 'PATCH', { quantityLiters: 11 }), 200);
  check(`submit ${tag} fuel`, await call(`/fuel/${fuel.data.data.id}/submit`, admin, 'POST', {}), 200);
  check(`approve ${tag} fuel`, await call(`/fuel/${fuel.data.data.id}/approve`, admin, 'POST', {}), 200);

  const rejectedFuel = await call('/fuel', admin, 'POST', {
    vehicleId: vehicle.data.data.id,
    fuelDate: new Date().toISOString(),
    fuelType: 'DIESEL',
    quantityLiters: 5,
    pricePerLiter: 100,
  });
  await call(`/fuel/${rejectedFuel.data.data.id}/submit`, admin, 'POST', {});
  check(`reject ${tag} fuel`, await call(`/fuel/${rejectedFuel.data.data.id}/reject`, admin, 'POST', {}), 200);
  check(`rejected ${tag} fuel cancel (rejected record)`, await call(`/fuel/${rejectedFuel.data.data.id}/cancel`, admin, 'POST', {}), 200);

  const cancelledFuel = await call('/fuel', admin, 'POST', {
    vehicleId: vehicle.data.data.id,
    fuelDate: new Date().toISOString(),
    fuelType: 'DIESEL',
    quantityLiters: 3,
    pricePerLiter: 100,
  });
  await call(`/fuel/${cancelledFuel.data.data.id}/submit`, admin, 'POST', {});
  check(`cancel submitted ${tag} fuel`, await call(`/fuel/${cancelledFuel.data.data.id}/cancel`, admin, 'POST', {}), 200);

  const expense = await call('/expenses', admin, 'POST', {
    vehicleId: vehicle.data.data.id,
    tripId: trip.data.data.id,
    category: `${tag} TOLL`,
    expenseDate: new Date().toISOString(),
    amount: 250,
    vendor: `${tag} Vendor`,
  });
  check(`create ${tag} expense`, expense, 201);

  check(`list ${tag} expense`, await call(`/expenses?search=${tag}`, admin), 200);

  const expenseDetail = await call(`/expenses/${expense.data.data.id}`, admin);
  check(`read ${tag} expense detail`, expenseDetail, 200);

  check(`update ${tag} expense`, await call(`/expenses/${expense.data.data.id}`, admin, 'PATCH', { amount: 275 }), 200);

  const submittedExpense = await call('/expenses', admin, 'POST', {
    vehicleId: vehicle.data.data.id,
    tripId: trip.data.data.id,
    category: `${tag} PARKING`,
    expenseDate: new Date().toISOString(),
    amount: 50,
    vendor: `${tag} Vendor`,
  });
  check(`submit ${tag} expense`, await call(`/expenses/${submittedExpense.data.data.id}/submit`, admin, 'POST', {}), 200);
  check(`approve ${tag} expense`, await call(`/expenses/${submittedExpense.data.data.id}/approve`, admin, 'POST', {}), 200);

  const rejectedExpense = await call('/expenses', admin, 'POST', {
    vehicleId: vehicle.data.data.id,
    category: `${tag} PARKING`,
    expenseDate: new Date().toISOString(),
    amount: 50,
  });
  await call(`/expenses/${rejectedExpense.data.data.id}/submit`, admin, 'POST', {});
  check(`reject ${tag} expense`, await call(`/expenses/${rejectedExpense.data.data.id}/reject`, admin, 'POST', {}), 200);
  check(`rejected ${tag} expense cancel (rejected record)`, await call(`/expenses/${rejectedExpense.data.data.id}/cancel`, admin, 'POST', {}), 200);

  const cancelledExpense = await call('/expenses', admin, 'POST', {
    vehicleId: vehicle.data.data.id,
    category: `${tag} PARKING`,
    expenseDate: new Date().toISOString(),
    amount: 30,
  });
  await call(`/expenses/${cancelledExpense.data.data.id}/submit`, admin, 'POST', {});
  check(`cancel submitted ${tag} expense`, await call(`/expenses/${cancelledExpense.data.data.id}/cancel`, admin, 'POST', {}), 200);

  const viewerId = process.env.E2E_VIEWER_IDENTIFIER || process.env.VIEWER_USERNAME;
  const viewerPass = process.env.E2E_VIEWER_PASSWORD || process.env.VIEWER_PASSWORD;
  if (viewerId && viewerPass) {
    const viewer = await login(viewerId, viewerPass);
    check('viewer create fuel denied', await call('/fuel', viewer, 'POST', { vehicleId: vehicle.data.data.id }), 403);
    check('viewer create expense denied', await call('/expenses', viewer, 'POST', { vehicleId: vehicle.data.data.id }), 403);
  } else {
    console.log('SKIP viewer permission checks - no viewer credentials');
  }

  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name} (${r.status})`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nFuel/Expense Staging Smoke Summary: ${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown failure');
  process.exit(1);
});
