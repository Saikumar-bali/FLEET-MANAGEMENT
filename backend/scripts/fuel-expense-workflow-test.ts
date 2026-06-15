import { getAdminCredential, getApiBase, getCredential } from './test-helpers/credentials';

type ApiResult = { ok: boolean; status: number; data?: any };
const results: Array<{ name: string; ok: boolean; status: number }> = [];
const api = `${getApiBase()}/api/v1`;
async function call(path: string, token?: string, method = 'GET', body?: unknown): Promise<ApiResult> {
  const r = await fetch(`${api}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); return { ok: r.ok, status: r.status, data: text ? JSON.parse(text) : undefined };
}
function check(name: string, r: ApiResult, expected: number | number[]) { const ok = (Array.isArray(expected) ? expected : [expected]).includes(r.status); results.push({ name, ok, status: r.status }); return ok; }
async function login(role: 'admin' | 'viewer') {
  const credential = role === 'admin' ? getAdminCredential() : getCredential('viewer');
  if (!credential) throw new Error(`${role} credential required`);
  const r = await call('/auth/login', undefined, 'POST', credential); if (!r.ok) throw new Error(`${role} login failed`); return r.data.data.accessToken as string;
}
async function main() {
  const admin = await login('admin'); const viewer = await login('viewer'); const stamp = Date.now();
  const vehicle = await call('/vehicles', admin, 'POST', { vehicleNumber: `TEST-E2E-FE-${stamp}`, vehicleType: 'TRUCK', fuelType: 'DIESEL' }); check('create TEST-E2E vehicle', vehicle, 201);
  const other = await call('/vehicles', admin, 'POST', { vehicleNumber: `TEST-E2E-FE-OTHER-${stamp}`, vehicleType: 'TRUCK', fuelType: 'DIESEL' }); check('create mismatch vehicle', other, 201);
  const trip = await call('/trips', admin, 'POST', { tripNumber: `TEST-E2E-FE-TRIP-${stamp}`, tripType: 'INTERNAL', vehicleId: vehicle.data.data.id, originName: 'TEST-E2E Origin', destinationName: 'TEST-E2E Destination' }); check('create TEST-E2E trip', trip, 201);
  const mismatch = await call('/fuel', admin, 'POST', { vehicleId: other.data.data.id, tripId: trip.data.data.id, fuelDate: new Date().toISOString(), fuelType: 'DIESEL', quantityLiters: 10, pricePerLiter: 100 }); check('fuel trip vehicle mismatch rejected', mismatch, 400);
  const fuel = await call('/fuel', admin, 'POST', { vehicleId: vehicle.data.data.id, tripId: trip.data.data.id, fuelDate: new Date().toISOString(), fuelType: 'DIESEL', quantityLiters: 10, pricePerLiter: 100, stationName: 'TEST-E2E Station' }); check('create fuel', fuel, 201);
  check('list fuel', await call('/fuel?search=TEST-E2E', admin), 200); check('update fuel', await call(`/fuel/${fuel.data.data.id}`, admin, 'PATCH', { quantityLiters: 11 }), 200); check('submit fuel', await call(`/fuel/${fuel.data.data.id}/submit`, admin, 'POST', {}), 200); check('approve fuel', await call(`/fuel/${fuel.data.data.id}/approve`, admin, 'POST', {}), 200);
  const rejectedFuel = await call('/fuel', admin, 'POST', { vehicleId: vehicle.data.data.id, fuelDate: new Date().toISOString(), fuelType: 'DIESEL', quantityLiters: 5, pricePerLiter: 100 }); await call(`/fuel/${rejectedFuel.data.data.id}/submit`, admin, 'POST', {}); check('reject fuel', await call(`/fuel/${rejectedFuel.data.data.id}/reject`, admin, 'POST', {}), 200);
  const expense = await call('/expenses', admin, 'POST', { vehicleId: vehicle.data.data.id, tripId: trip.data.data.id, category: 'TEST-E2E TOLL', expenseDate: new Date().toISOString(), amount: 250, vendor: 'TEST-E2E Vendor' }); check('create expense', expense, 201);
  check('list expense', await call('/expenses?search=TEST-E2E', admin), 200); check('update expense', await call(`/expenses/${expense.data.data.id}`, admin, 'PATCH', { amount: 275 }), 200); check('submit expense', await call(`/expenses/${expense.data.data.id}/submit`, admin, 'POST', {}), 200); check('approve expense', await call(`/expenses/${expense.data.data.id}/approve`, admin, 'POST', {}), 200);
  const rejectedExpense = await call('/expenses', admin, 'POST', { vehicleId: vehicle.data.data.id, category: 'TEST-E2E PARKING', expenseDate: new Date().toISOString(), amount: 50 }); await call(`/expenses/${rejectedExpense.data.data.id}/submit`, admin, 'POST', {}); check('reject expense', await call(`/expenses/${rejectedExpense.data.data.id}/reject`, admin, 'POST', {}), 200);
  check('viewer create fuel denied', await call('/fuel', viewer, 'POST', { vehicleId: vehicle.data.data.id }), 403); check('viewer create expense denied', await call('/expenses', viewer, 'POST', { vehicleId: vehicle.data.data.id }), 403);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name} (${r.status})`); const failed = results.filter((r) => !r.ok).length; console.log(`Summary: ${results.length - failed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : 'Unknown failure'); process.exit(1); });
