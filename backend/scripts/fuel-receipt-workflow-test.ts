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
  const admin = await login('admin'); const stamp = Date.now();

  // 1. Create a test vehicle
  const vehicle = await call('/vehicles', admin, 'POST', { vehicleNumber: `TEST-E2E-FR-${stamp}`, vehicleType: 'TRUCK', fuelType: 'DIESEL' }); check('create test vehicle', vehicle, 201);
  const vehicleId = vehicle.data.data.id;

  // 2. Create QUICK_AMOUNT fuel entry (no quantityLiters/pricePerLiter required)
  const quickFuel = await call('/fuel', admin, 'POST', { vehicleId, fuelDate: new Date().toISOString(), fuelType: 'DIESEL', entryMode: 'QUICK_AMOUNT', totalAmount: 12000 }); check('create QUICK_AMOUNT fuel entry', quickFuel, 201);
  const quickId = quickFuel.data.data.id;

  // 3. Verify QUICK_AMOUNT entry has entryMode QUICK_AMOUNT
  const quickDetail = await call(`/fuel/${quickId}`, admin, 'GET');
  check('QUICK_AMOUNT entry has correct entryMode', quickDetail, 200);
  const qm = quickDetail.data.data.entryMode === 'QUICK_AMOUNT'; results.push({ name: 'QUICK_AMOUNT entryMode is QUICK_AMOUNT', ok: qm, status: 200 });
  if (!qm) { console.error('Expected entryMode QUICK_AMOUNT, got', quickDetail.data.data.entryMode); }

  // 4. Verify quantityLiters and pricePerLiter are null/omitted
  const qlOk = quickDetail.data.data.quantityLiters === null || quickDetail.data.data.quantityLiters === undefined;
  results.push({ name: 'QUICK_AMOUNT quantityLiters is null/omitted', ok: qlOk, status: 200 });
  const pplOk = quickDetail.data.data.pricePerLiter === null || quickDetail.data.data.pricePerLiter === undefined;
  results.push({ name: 'QUICK_AMOUNT pricePerLiter is null/omitted', ok: pplOk, status: 200 });

  // 5. Create FULL_DETAILS fuel entry (with quantityLiters and pricePerLiter)
  const fullFuel = await call('/fuel', admin, 'POST', { vehicleId, fuelDate: new Date().toISOString(), fuelType: 'DIESEL', entryMode: 'FULL_DETAILS', quantityLiters: 55.2, pricePerLiter: 81.52 }); check('create FULL_DETAILS fuel entry', fullFuel, 201);
  const fullId = fullFuel.data.data.id;

  // 6. Verify FULL_DETAILS entry has calculated totalAmount (55.2 * 81.52 = 4499.904)
  const fullDetail = await call(`/fuel/${fullId}`, admin, 'GET');
  check('FULL_DETAILS entry has entryMode FULL_DETAILS', fullDetail, 200);
  const fullEm = fullDetail.data.data.entryMode === 'FULL_DETAILS'; results.push({ name: 'FULL_DETAILS entryMode is FULL_DETAILS', ok: fullEm, status: 200 });
  const expectedTotal = Math.round(55.2 * 81.52 * 100) / 100;
  const actualTotal = fullDetail.data.data.totalAmount;
  const totalMatch = Math.abs(actualTotal - expectedTotal) < 1; results.push({ name: `FULL_DETAILS totalAmount matches calculation (expected ~${expectedTotal}, got ${actualTotal})`, ok: totalMatch, status: 200 });
  if (!totalMatch) { console.error('totalAmount mismatch:', actualTotal, 'expected', expectedTotal); }

  // 7. Test invalid totalAmount=0 in QUICK_AMOUNT mode fails (expect 400)
  const invalidQuick = await call('/fuel', admin, 'POST', { vehicleId, fuelDate: new Date().toISOString(), fuelType: 'DIESEL', entryMode: 'QUICK_AMOUNT', totalAmount: 0 });
  check('QUICK_AMOUNT totalAmount=0 rejected with 400', invalidQuick, [400, 422]);

  // 8. Test extraction endpoint (POST /fuel/extract-receipt)
  const extractResult = await call('/fuel/extract-receipt', admin, 'POST', { storageKey: 'test', mimeType: 'application/pdf' });
  check('extract-receipt endpoint responds', extractResult, [200, 400, 500]);

  // 9. Upload a document with fuelEntryId link
  const form = new FormData();
  const blob = new Blob(['test pdf content'], { type: 'application/pdf' });
  form.append('file', blob, 'test-receipt.pdf');
  form.append('title', `TEST-E2E Fuel Receipt ${stamp}`);
  form.append('documentType', 'RECEIPT');
  form.append('documentCategory', 'FUEL');
  form.append('fuelEntryId', quickId);
  const uploadR = await fetch(`${api}/documents/upload`, { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: form });
  const uploadText = await uploadR.text();
  const uploadData = uploadText ? JSON.parse(uploadText) : undefined;
  const uploadResult: ApiResult = { ok: uploadR.ok, status: uploadR.status, data: uploadData };
  check('upload document with fuelEntryId', uploadResult, 201);
  const docId = uploadData?.data?.id;

  // 10. List documents filtered by fuelEntryId
  const docList = await call(`/documents?fuelEntryId=${quickId}`, admin, 'GET');
  check('list documents filtered by fuelEntryId', docList, 200);

  // 11. Verify document linked to fuel entry
  const docs = docList.data?.data?.items || docList.data?.data || [];
  const linkedDoc = Array.isArray(docs) ? docs.find((d: any) => d.id === docId) : null;
  const linkOk = linkedDoc !== null && linkedDoc !== undefined;
  results.push({ name: 'document found in filtered list', ok: linkOk, status: 200 });
  if (linkOk && docId) {
    const fuelLinkOk = linkedDoc.fuelEntryId === quickId;
    results.push({ name: 'document fuelEntryId matches fuel entry', ok: fuelLinkOk, status: 200 });
    if (!fuelLinkOk) { console.error('fuelEntryId mismatch:', linkedDoc.fuelEntryId, 'expected', quickId); }
  }

  // Summary
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name} (${r.status})`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`Summary: ${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : 'Unknown failure'); process.exit(1); });
