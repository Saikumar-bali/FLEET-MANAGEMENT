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
  const r = await call('/auth/login', undefined, 'POST', credential); if (!r.ok) throw new Error(`${role} login failed`); return r.data!.data!.accessToken as string;
}
function getId(r: ApiResult): string { return r.data!.data!.id as string; }
async function main() {
  const admin = await login('admin'); const viewer = await login('viewer'); const stamp = Date.now();
  const vehicle = await call('/vehicles', admin, 'POST', { vehicleNumber: `TEST-E2E-MR-${stamp}`, vehicleType: 'TRUCK', fuelType: 'DIESEL' }); check('create vehicle', vehicle, 201);
  const vid = getId(vehicle);

  const maint = await call('/maintenance', admin, 'POST', { vehicleId: vid, issueTitle: 'TEST-E2E engine issue', issueDescription: 'TEST-E2E Description', priority: 'HIGH', odometerReading: 50000 }); check('create maintenance', maint, 201);
  check('list maintenance', await call('/maintenance?search=TEST-E2E', admin), 200);
  const mid = getId(maint);
  check('get maintenance', await call(`/maintenance/${mid}`, admin), 200);
  check('update maintenance', await call(`/maintenance/${mid}`, admin, 'PATCH', { issueTitle: 'TEST-E2E Updated' }), 200);
  check('submit maintenance', await call(`/maintenance/${mid}/submit`, admin, 'POST', {}), 200);
  check('approve maintenance', await call(`/maintenance/${mid}/approve`, admin, 'POST', {}), 200);
  check('start maintenance', await call(`/maintenance/${mid}/start`, admin, 'POST', {}), 200);
  check('complete maintenance', await call(`/maintenance/${mid}/complete`, admin, 'POST', {}), 200);

  const rejectedMaint = await call('/maintenance', admin, 'POST', { vehicleId: vid, issueTitle: 'TEST-E2E Rejected Maint', priority: 'LOW' }); check('create rejected maintenance', rejectedMaint, 201);
  const rmid = getId(rejectedMaint);
  await call(`/maintenance/${rmid}/submit`, admin, 'POST', {});
  check('reject maintenance', await call(`/maintenance/${rmid}/reject`, admin, 'POST', {}), 200);
  await call(`/maintenance/${rmid}/cancel`, admin, 'POST', {});
  check('cancel rejected maintenance', await call(`/maintenance/${rmid}`, admin), 200);

  const repair = await call('/repairs', admin, 'POST', { vehicleId: vid, repairType: 'TEST-E2E Engine Repair', laborCost: 2000, partsCost: 5000 }); check('create repair', repair, 201);
  const rid = getId(repair);
  check('list repairs', await call('/repairs?search=TEST-E2E', admin), 200);
  check('get repair', await call(`/repairs/${rid}`, admin), 200);
  check('update repair', await call(`/repairs/${rid}`, admin, 'PATCH', { repairNotes: 'TEST-E2E Updated' }), 200);
  check('schedule repair', await call(`/repairs/${rid}/schedule`, admin, 'POST', {}), 200);
  check('start repair', await call(`/repairs/${rid}/start`, admin, 'POST', {}), 200);
  check('complete repair', await call(`/repairs/${rid}/complete`, admin, 'POST', {}), 200);

  const cancelledRepair = await call('/repairs', admin, 'POST', { vehicleId: vid, repairType: 'TEST-E2E Cancelled' }); check('create cancelled repair', cancelledRepair, 201);
  check('cancel repair', await call(`/repairs/${getId(cancelledRepair)}/cancel`, admin, 'POST', {}), 200);

  check('viewer list maintenance', await call('/maintenance', viewer), 200);
  check('viewer create maintenance denied', await call('/maintenance', viewer, 'POST', { vehicleId: vid }), 403);
  check('viewer list repairs', await call('/repairs', viewer), 200);
  check('viewer create repair denied', await call('/repairs', viewer, 'POST', { vehicleId: vid }), 403);

  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name} (${r.status})`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`Summary: ${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : 'Unknown failure'); process.exit(1); });
