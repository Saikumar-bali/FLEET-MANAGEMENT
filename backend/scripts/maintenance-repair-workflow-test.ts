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
  const vehicle = await call('/vehicles', admin, 'POST', { vehicleNumber: `TEST-E2E-MR-${stamp}`, vehicleType: 'TRUCK', fuelType: 'DIESEL' }); check('create TEST-E2E vehicle', vehicle, 201);
  const vid = vehicle.data.data.id;

  // --- Maintenance tests ---
  const m1 = await call('/maintenance', admin, 'POST', { vehicleId: vid, requestDate: new Date().toISOString(), category: 'TEST-E2E ENGINE', description: 'Engine oil change needed', priority: 'HIGH', estimatedCost: 5000 }); check('create maintenance', m1, 201);
  check('list maintenance', await call('/maintenance?search=TEST-E2E', admin), 200);
  check('get maintenance', await call(`/maintenance/${m1.data.data.id}`, admin), 200);
  check('update maintenance', await call(`/maintenance/${m1.data.data.id}`, admin, 'PATCH', { estimatedCost: 5500 }), 200);
  check('submit maintenance', await call(`/maintenance/${m1.data.data.id}/submit`, admin, 'POST', {}), 200);
  check('approve maintenance', await call(`/maintenance/${m1.data.data.id}/approve`, admin, 'POST', {}), 200);

  const m2 = await call('/maintenance', admin, 'POST', { vehicleId: vid, requestDate: new Date().toISOString(), category: 'TEST-E2E BRAKE', description: 'Brake pad replacement', priority: 'MEDIUM' }); check('create maintenance 2', m2, 201);
  await call(`/maintenance/${m2.data.data.id}/submit`, admin, 'POST', {});
  check('reject maintenance', await call(`/maintenance/${m2.data.data.id}/reject`, admin, 'POST', {}), 200);

  const m3 = await call('/maintenance', admin, 'POST', { vehicleId: vid, requestDate: new Date().toISOString(), category: 'TEST-E2E TIRE', description: 'Tire rotation', priority: 'LOW' }); check('create maintenance 3', m3, 201);
  check('cancel maintenance', await call(`/maintenance/${m3.data.data.id}/cancel`, admin, 'POST', {}), 200);

  // negative: viewer create denied
  check('viewer create maintenance denied', await call('/maintenance', viewer, 'POST', { vehicleId: vid }), 403);

  // --- Repair tests ---
  const r1 = await call('/repairs', admin, 'POST', { vehicleId: vid, repairDate: new Date().toISOString(), category: 'TEST-E2E TRANSMISSION', description: 'Transmission rebuild', estimatedCost: 25000, provider: 'TEST-E2E Workshop' }); check('create repair', r1, 201);
  check('list repairs', await call('/repairs?search=TEST-E2E', admin), 200);
  check('get repair', await call(`/repairs/${r1.data.data.id}`, admin), 200);
  check('update repair', await call(`/repairs/${r1.data.data.id}`, admin, 'PATCH', { actualCost: 27000 }), 200);
  check('start repair', await call(`/repairs/${r1.data.data.id}/start`, admin, 'POST', {}), 200);
  check('complete repair', await call(`/repairs/${r1.data.data.id}/complete`, admin, 'POST', {}), 200);

  const r2 = await call('/repairs', admin, 'POST', { vehicleId: vid, repairDate: new Date().toISOString(), category: 'TEST-E2E SUSPENSION', description: 'Suspension repair', estimatedCost: 8000 }); check('create repair 2', r2, 201);
  check('start repair 2', await call(`/repairs/${r2.data.data.id}/start`, admin, 'POST', {}), 200);
  check('cancel repair', await call(`/repairs/${r2.data.data.id}/cancel`, admin, 'POST', {}), 200);

  const r3 = await call('/repairs', admin, 'POST', { vehicleId: vid, repairDate: new Date().toISOString(), category: 'TEST-E2E ELECTRICAL', description: 'Wiring fix' }); check('create repair 3', r3, 201);
  check('cancel open repair', await call(`/repairs/${r3.data.data.id}/cancel`, admin, 'POST', {}), 200);

  // negative: viewer create denied
  check('viewer create repair denied', await call('/repairs', viewer, 'POST', { vehicleId: vid }), 403);

  // cleanup: reset vehicle
  await call(`/vehicles/${vid}/status`, admin, 'PATCH', { status: 'AVAILABLE' });

  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name} (${r.status})`); const failed = results.filter((r) => !r.ok).length; console.log(`Summary: ${results.length - failed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : 'Unknown failure'); process.exit(1); });
