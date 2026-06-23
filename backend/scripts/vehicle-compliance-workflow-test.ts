import { getAdminCredential, getApiBase, getCredential } from './test-helpers/credentials';

type ApiResult = { ok: boolean; status: number; data?: any };
const results: Array<{ name: string; ok: boolean; status: number }> = [];
const api = `${getApiBase()}/api/v1`;

async function call(path: string, token?: string, method = 'GET', body?: unknown): Promise<ApiResult> {
  const r = await fetch(`${api}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); return { ok: r.ok, status: r.status, data: text ? JSON.parse(text) : undefined };
}

function check(name: string, r: ApiResult, expected: number | number[]) {
  const ok = (Array.isArray(expected) ? expected : [expected]).includes(r.status);
  results.push({ name, ok, status: r.status }); return ok;
}

async function login(role: 'admin' | 'viewer' | 'driver') {
  const credential = role === 'admin' ? getAdminCredential() : getCredential(role);
  if (!credential) throw new Error(`${role} credential required`);
  const r = await call('/auth/login', undefined, 'POST', credential);
  if (!r.ok) throw new Error(`${role} login failed`);
  return r.data.data.accessToken as string;
}

async function main() {
  const admin = await login('admin');
  const viewer = await login('viewer');
  let driver: string | null = null;
  try { driver = await login('driver'); } catch { /* driver credentials optional */ }
  const stamp = Date.now();

  // ─── Create test vehicle ───
  const vehicle = await call('/vehicles', admin, 'POST', { vehicleNumber: `TEST-E2E-CMP-${stamp}`, vehicleType: 'TRUCK', fuelType: 'DIESEL' });
  check('create test vehicle', vehicle, 201);
  const vid = vehicle.data.data.id;

  // ─── Registration ───
  const reg = await call(`/vehicle/${vid}/compliance/registration`, admin, 'PUT', { registrationNumber: `MH12AB${stamp}`, ownerName: 'TEST OWNER', rtoCode: 'MH12', rtoName: 'Pune RTO' });
  check('upsert registration', reg, 200);
  check('get registration', await call(`/vehicle/${vid}/compliance/registration`, admin), 200);

  // ─── Insurance ───
  const ins = await call(`/vehicle/${vid}/compliance/insurance`, admin, 'POST', { policyNumber: `POL-${stamp}`, insurerName: 'TEST INSURER', policyType: 'COMPREHENSIVE', validFrom: '2025-01-01T00:00:00.000Z', validTo: '2026-01-01T00:00:00.000Z', premiumAmount: 25000 });
  check('create insurance', ins, 201);
  const insId = ins.data.data.id;
  check('list insurance', await call(`/vehicle/${vid}/compliance/insurance`, admin), 200);
  check('get insurance', await call(`/vehicle/${vid}/compliance/insurance/${insId}`, admin), 200);
  check('update insurance', await call(`/vehicle/${vid}/compliance/insurance/${insId}`, admin, 'PUT', { premiumAmount: 27000 }), 200);

  // ─── Permit ───
  const permit = await call(`/vehicle/${vid}/compliance/permits`, admin, 'POST', { permitNumber: `NP-${stamp}`, permitType: 'NATIONAL', issuingAuthority: 'TEST RTO', validFrom: '2025-01-01T00:00:00.000Z', validTo: '2026-06-01T00:00:00.000Z' });
  check('create permit', permit, 201);
  const permitId = permit.data.data.id;
  check('list permits', await call(`/vehicle/${vid}/compliance/permits`, admin), 200);
  check('get permit', await call(`/vehicle/${vid}/compliance/permits/${permitId}`, admin), 200);
  check('update permit', await call(`/vehicle/${vid}/compliance/permits/${permitId}`, admin, 'PUT', { coveredStates: 'Maharashtra, Karnataka' }), 200);

  // ─── Fitness ───
  const fit = await call(`/vehicle/${vid}/compliance/fitness`, admin, 'POST', { certificateNumber: `FIT-${stamp}`, inspectionDate: '2025-03-01T00:00:00.000Z', validFrom: '2025-03-01T00:00:00.000Z', validTo: '2026-03-01T00:00:00.000Z', inspectionCenter: 'TEST Center' });
  check('create fitness', fit, 201);
  const fitId = fit.data.data.id;
  check('list fitness', await call(`/vehicle/${vid}/compliance/fitness`, admin), 200);
  check('get fitness', await call(`/vehicle/${vid}/compliance/fitness/${fitId}`, admin), 200);
  check('update fitness', await call(`/vehicle/${vid}/compliance/fitness/${fitId}`, admin, 'PUT', { remarks: 'All clear' }), 200);

  // ─── PUC ───
  const puc = await call(`/vehicle/${vid}/compliance/puc`, admin, 'POST', { certificateNumber: `PUC-${stamp}`, emissionNorm: 'BSVI', validFrom: '2025-02-01T00:00:00.000Z', validTo: '2025-08-01T00:00:00.000Z', testingCenter: 'TEST PUC Center' });
  check('create PUC', puc, 201);
  const pucId = puc.data.data.id;
  check('list PUC', await call(`/vehicle/${vid}/compliance/puc`, admin), 200);
  check('get PUC', await call(`/vehicle/${vid}/compliance/puc/${pucId}`, admin), 200);
  check('update PUC', await call(`/vehicle/${vid}/compliance/puc/${pucId}`, admin, 'PUT', { testingCenter: 'Updated Center' }), 200);

  // ─── Road Tax ───
  const rt = await call(`/vehicle/${vid}/compliance/road-tax`, admin, 'POST', { taxReceiptNumber: `RT-${stamp}`, taxType: 'LIFETIME', paidFrom: '2025-01-01T00:00:00.000Z', paidTo: '2035-01-01T00:00:00.000Z', amount: 15000, issuingState: 'Maharashtra' });
  check('create road tax', rt, 201);
  const rtId = rt.data.data.id;
  check('list road tax', await call(`/vehicle/${vid}/compliance/road-tax`, admin), 200);
  check('get road tax', await call(`/vehicle/${vid}/compliance/road-tax/${rtId}`, admin), 200);
  check('update road tax', await call(`/vehicle/${vid}/compliance/road-tax/${rtId}`, admin, 'PUT', { amount: 16000 }), 200);

  // ─── FASTag ───
  const ftg = await call(`/vehicle/${vid}/compliance/fastag`, admin, 'PUT', { fastagId: `FTG-${stamp}`, issuerBank: 'HDFC', status: 'ACTIVE', lastKnownBalance: 5000 });
  check('upsert FASTag', ftg, 200);
  check('get FASTag', await call(`/vehicle/${vid}/compliance/fastag`, admin), 200);

  // ─── GPS Device ───
  const gps = await call(`/vehicle/${vid}/compliance/gps-device`, admin, 'PUT', { deviceId: `GPS-${stamp}`, imei: '123456789012345', vendorName: 'TEST GPS', ais140Certified: true, status: 'ACTIVE' });
  check('upsert GPS device', gps, 200);
  check('get GPS device', await call(`/vehicle/${vid}/compliance/gps-device`, admin), 200);

  // ─── Compliance Documents ───
  const doc = await call(`/vehicle/${vid}/compliance/documents`, admin, 'POST', { complianceType: 'INSURANCE', documentNumber: `DOC-${stamp}`, validFrom: '2025-01-01T00:00:00.000Z', validTo: '2026-01-01T00:00:00.000Z', issuingAuthority: 'TEST Authority', notes: 'Test document' });
  check('create compliance document', doc, 201);
  const docId = doc.data.data.id;
  check('list compliance documents', await call('/compliance/documents?vehicleId=' + vid, admin), 200);
  check('get compliance document', await call(`/compliance/documents/${docId}`, admin), 200);
  check('update compliance document', await call(`/compliance/documents/${docId}`, admin, 'PUT', { notes: 'Updated notes' }), 200);

  // verify document
  check('verify compliance document', await call(`/compliance/documents/${docId}/verify`, admin, 'PUT', { status: 'VERIFIED', notes: 'Looks good' }), 200);

  // renew document
  check('renew compliance document', await call(`/compliance/documents/${docId}/renew`, admin, 'PUT', { validFrom: '2026-01-01T00:00:00.000Z', validTo: '2027-01-01T00:00:00.000Z', notes: 'Renewed for next year' }), 200);

  // ─── Fix 5 regression: verified docs remain in alerts ───
  // Create a doc expiring within 30 days
  const soonDoc = await call(`/vehicle/${vid}/compliance/documents`, admin, 'POST', { complianceType: 'FITNESS', documentNumber: `SOON-${stamp}`, validFrom: '2025-01-01T00:00:00.000Z', validTo: '2026-07-15T00:00:00.000Z', issuingAuthority: 'TEST' });
  check('create soon-expiring doc', soonDoc, 201);
  const soonDocId = soonDoc.data.data.id;
  // Confirm it appears in expiring alerts
  const expiringBefore = await call('/compliance/alerts/expiring?days=30', admin);
  const soonInExpiringBefore = expiringBefore.ok && expiringBefore.data.data.items.some((d: any) => d.id === soonDocId);
  results.push({ name: 'soon-expiring doc in alerts before verify', ok: !!soonInExpiringBefore, status: soonInExpiringBefore ? 200 : 500 });
  // Verify the doc
  check('verify soon-expiring doc', await call(`/compliance/documents/${soonDocId}/verify`, admin, 'PUT', { status: 'VERIFIED' }), 200);
  // Confirm it STILL appears in expiring alerts after verify
  const expiringAfter = await call('/compliance/alerts/expiring?days=30', admin);
  const soonInExpiringAfter = expiringAfter.ok && expiringAfter.data.data.items.some((d: any) => d.id === soonDocId);
  results.push({ name: 'verified doc still in expiring alerts', ok: !!soonInExpiringAfter, status: soonInExpiringAfter ? 200 : 500 });

  // Create an expired doc
  const expiredDoc = await call(`/vehicle/${vid}/compliance/documents`, admin, 'POST', { complianceType: 'PUC', documentNumber: `EXP-${stamp}`, validFrom: '2024-01-01T00:00:00.000Z', validTo: '2025-06-01T00:00:00.000Z', issuingAuthority: 'TEST' });
  check('create expired doc', expiredDoc, 201);
  const expiredDocId = expiredDoc.data.data.id;
  // Confirm it appears in expired alerts
  const expiredBefore = await call('/compliance/alerts/expired', admin);
  const expiredInAlertsBefore = expiredBefore.ok && expiredBefore.data.data.items.some((d: any) => d.id === expiredDocId);
  results.push({ name: 'expired doc in alerts before verify', ok: !!expiredInAlertsBefore, status: expiredInAlertsBefore ? 200 : 500 });
  // Verify the expired doc
  check('verify expired doc', await call(`/compliance/documents/${expiredDocId}/verify`, admin, 'PUT', { status: 'VERIFIED' }), 200);
  // Confirm it STILL appears in expired alerts after verify
  const expiredAfter = await call('/compliance/alerts/expired', admin);
  const expiredInAlertsAfter = expiredAfter.ok && expiredAfter.data.data.items.some((d: any) => d.id === expiredDocId);
  results.push({ name: 'verified expired doc still in expired alerts', ok: !!expiredInAlertsAfter, status: expiredInAlertsAfter ? 200 : 500 });

  // ─── Dashboard & Alerts ───
  check('get compliance dashboard', await call('/compliance/dashboard', admin), 200);
  check('list expiring soon', await call('/compliance/alerts/expiring?days=30', admin), 200);
  check('list expired', await call('/compliance/alerts/expired', admin), 200);

  // ─── History ───
  const history = await call(`/vehicle/${vid}/compliance/history?limit=50`, admin);
  check('list compliance history', history, 200);
  if (history.ok) {
    const hasHistory = history.data.data.items && history.data.data.items.length > 0;
    results.push({ name: 'history has entries', ok: hasHistory, status: hasHistory ? 200 : 500 });
    if (hasHistory) {
      const hasRenewed = history.data.data.items.some((h: any) => h.action === 'RENEWED');
      results.push({ name: 'history contains RENEWED action', ok: hasRenewed, status: hasRenewed ? 200 : 500 });
    }
  }

  // ─── Validation error tests ───
  check('create insurance validation error (missing fields)', await call(`/vehicle/${vid}/compliance/insurance`, admin, 'POST', {}), 422);
  check('create permit validation error (missing fields)', await call(`/vehicle/${vid}/compliance/permits`, admin, 'POST', {}), 422);
  check('create fitness validation error (missing fields)', await call(`/vehicle/${vid}/compliance/fitness`, admin, 'POST', {}), 422);
  check('create PUC validation error (missing fields)', await call(`/vehicle/${vid}/compliance/puc`, admin, 'POST', {}), 422);
  check('create road tax validation error (missing fields)', await call(`/vehicle/${vid}/compliance/road-tax`, admin, 'POST', {}), 422);

  // ─── Permission tests ───
  check('viewer create insurance denied', await call(`/vehicle/${vid}/compliance/insurance`, viewer, 'POST', { policyNumber: 'X', insurerName: 'X', policyType: 'COMPREHENSIVE', validFrom: '2025-01-01T00:00:00.000Z', validTo: '2026-01-01T00:00:00.000Z' }), 403);
  check('viewer update insurance denied', await call(`/vehicle/${vid}/compliance/insurance/${insId}`, viewer, 'PUT', { premiumAmount: 99999 }), 403);
  check('viewer create document denied', await call(`/vehicle/${vid}/compliance/documents`, viewer, 'POST', { complianceType: 'RC' }), 403);
  check('viewer verify document denied', await call(`/compliance/documents/${docId}/verify`, viewer, 'PUT', { status: 'VERIFIED' }), 403);
  check('viewer renew document denied', await call(`/compliance/documents/${docId}/renew`, viewer, 'PUT', { validFrom: '2027-01-01T00:00:00.000Z', validTo: '2028-01-01T00:00:00.000Z' }), 403);

  if (driver) {
    check('driver create insurance denied', await call(`/vehicle/${vid}/compliance/insurance`, driver, 'POST', { policyNumber: 'X', insurerName: 'X', policyType: 'COMPREHENSIVE', validFrom: '2025-01-01T00:00:00.000Z', validTo: '2026-01-01T00:00:00.000Z' }), 403);
    check('driver create document denied', await call(`/vehicle/${vid}/compliance/documents`, driver, 'POST', { complianceType: 'RC' }), 403);
  }

  // ─── Print results ───
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name} (${r.status})`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`Summary: ${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : 'Unknown failure'); process.exit(1); });
