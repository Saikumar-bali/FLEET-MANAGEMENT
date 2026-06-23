const BASE = 'http://localhost:4000';

async function api(method: string, path: string, token: string, body?: any) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data: any = null;
  if (text) try { data = JSON.parse(text); } catch {}
  return { status: res.status, data };
}

async function main() {
  const login = await api('POST', '/api/v1/auth/login', '', { identifier: 'admin@example.com', password: 'admin@123' });
  const token = login.data.data.accessToken;
  console.log('Logged in');

  // 1. Get all vehicles
  const vRes = await api('GET', '/api/v1/vehicles?limit=50', token);
  const vehicles = vRes.data?.data?.items || vRes.data?.data?.data || vRes.data?.data || [];
  console.log(`\nFound ${vehicles.length} vehicles`);
  if (!Array.isArray(vehicles)) { console.log('Vehicle response keys:', Object.keys(vRes.data?.data || {})); return; }

  // 2. Delete TEST vehicles
  const testVehicles = vehicles.filter((v: any) => v.vehicleNumber?.startsWith('TEST-'));
  console.log(`\nDeleting ${testVehicles.length} TEST vehicles...`);
  for (const v of testVehicles) {
    const r = await api('DELETE', `/api/v1/vehicles/${v.id}`, token);
    console.log(`  Delete ${v.vehicleNumber}: ${r.status}`);
  }

  // 3. Update real vehicles with rcNumber and expiry dates
  const realVehicles = vehicles.filter((v: any) => !v.vehicleNumber?.startsWith('TEST-'));
  console.log(`\nUpdating ${realVehicles.length} real vehicles with expiry data...`);

  const vehicleData: Record<string, any> = {
    'MH12DE1234': {
      rcNumber: 'MH-RC-2022-DE-1234',
      insuranceExpiry: '2027-03-15T00:00:00.000Z',
      fitnessExpiry: '2027-06-20T00:00:00.000Z',
      pollutionExpiry: '2026-12-10T00:00:00.000Z',
      permitExpiry: '2027-09-01T00:00:00.000Z',
    },
    'KA01AB5678': {
      rcNumber: 'KA-RC-2023-AB-5678',
      insuranceExpiry: '2027-08-25T00:00:00.000Z',
      fitnessExpiry: '2027-11-30T00:00:00.000Z',
      pollutionExpiry: '2026-10-15T00:00:00.000Z',
      permitExpiry: '2027-05-10T00:00:00.000Z',
    },
    'DL03CE9012': {
      rcNumber: 'DL-RC-2021-CE-9012',
      insuranceExpiry: '2026-09-30T00:00:00.000Z',
      fitnessExpiry: '2027-01-20T00:00:00.000Z',
      pollutionExpiry: '2026-08-05T00:00:00.000Z',
      permitExpiry: '2027-04-18T00:00:00.000Z',
    },
    'TN07FG3456': {
      rcNumber: 'TN-RC-2022-FG-3456',
      insuranceExpiry: '2027-12-01T00:00:00.000Z',
      fitnessExpiry: '2027-07-15T00:00:00.000Z',
      pollutionExpiry: '2026-11-20T00:00:00.000Z',
      permitExpiry: '2027-02-28T00:00:00.000Z',
    },
    'GJ05HI7890': {
      rcNumber: 'GJ-RC-2023-HI-7890',
      insuranceExpiry: '2027-04-10T00:00:00.000Z',
      fitnessExpiry: '2027-09-05T00:00:00.000Z',
      pollutionExpiry: '2026-07-25T00:00:00.000Z',
      permitExpiry: '2027-06-30T00:00:00.000Z',
    },
    'MH14JK2468': {
      rcNumber: 'MH-RC-2022-JK-2468',
      insuranceExpiry: '2027-01-20T00:00:00.000Z',
      fitnessExpiry: '2027-03-10T00:00:00.000Z',
      pollutionExpiry: '2026-09-12T00:00:00.000Z',
      permitExpiry: '2027-08-22T00:00:00.000Z',
    },
    'UP32LM1357': {
      rcNumber: 'UP-RC-2023-LM-1357',
      insuranceExpiry: '2027-06-05T00:00:00.000Z',
      fitnessExpiry: '2027-10-18T00:00:00.000Z',
      pollutionExpiry: '2026-12-28T00:00:00.000Z',
      permitExpiry: '2027-07-14T00:00:00.000Z',
    },
  };

  for (const v of realVehicles) {
    const data = vehicleData[v.vehicleNumber];
    if (data) {
      const r = await api('PATCH', `/api/v1/vehicles/${v.id}`, token, data);
      console.log(`  Updated ${v.vehicleNumber}: ${r.status} (rcNumber: ${data.rcNumber})`);
    }
  }

  // 4. Delete test compliance documents
  const docRes = await api('GET', '/api/v1/compliance/documents?limit=50', token);
  const docs = docRes.data?.data?.items || docRes.data?.data?.data || docRes.data?.data || [];
  console.log(`\nCompliance documents: ${Array.isArray(docs) ? docs.length : typeof docs}`);
  if (Array.isArray(docs)) {
    const testDocs = docs.filter((d: any) => d.documentNumber?.includes('1782215458719') || d.documentNumber?.includes('1782215457853'));
    console.log(`Deleting ${testDocs.length} test compliance documents...`);
    for (const d of testDocs) {
      const r = await api('DELETE', `/api/v1/compliance/documents/${d.id}`, token);
      console.log(`  Delete ${d.documentNumber || d.id}: ${r.status}`);
    }
  }

  // 5. Create compliance documents for each real vehicle
  console.log('\nCreating compliance documents for each vehicle...');
  for (const v of realVehicles) {
    const docs = [
      { complianceType: 'RC', documentNumber: `${v.vehicleNumber}-RC`, issuingAuthority: 'Regional Transport Office', validFrom: '2022-01-15T00:00:00.000Z', validTo: '2037-01-15T00:00:00.000Z' },
      { complianceType: 'INSURANCE', documentNumber: `${v.vehicleNumber}-INS`, issuingAuthority: 'ICICI Lombard', validFrom: '2026-01-01T00:00:00.000Z', validTo: vehicleData[v.vehicleNumber]?.insuranceExpiry || '2027-01-01T00:00:00.000Z' },
      { complianceType: 'FITNESS', documentNumber: `${v.vehicleNumber}-FIT`, issuingAuthority: 'RTO Inspection', validFrom: '2026-06-01T00:00:00.000Z', validTo: vehicleData[v.vehicleNumber]?.fitnessExpiry || '2027-06-01T00:00:00.000Z' },
      { complianceType: 'PUC', documentNumber: `${v.vehicleNumber}-PUC`, issuingAuthority: 'Authorized PUC Center', validFrom: '2026-03-01T00:00:00.000Z', validTo: vehicleData[v.vehicleNumber]?.pollutionExpiry || '2026-09-01T00:00:00.000Z' },
      { complianceType: 'PERMIT', documentNumber: `${v.vehicleNumber}-PER`, issuingAuthority: 'State Transport Authority', validFrom: '2025-12-01T00:00:00.000Z', validTo: vehicleData[v.vehicleNumber]?.permitExpiry || '2027-12-01T00:00:00.000Z' },
      { complianceType: 'ROAD_TAX', documentNumber: `${v.vehicleNumber}-RT`, issuingAuthority: 'RTO', validFrom: '2026-04-01T00:00:00.000Z', validTo: '2027-03-31T00:00:00.000Z' },
    ];
    for (const doc of docs) {
      const r = await api('POST', `/api/v1/vehicle/${v.id}/compliance/documents`, token, doc);
      if (r.status !== 201) console.log(`  WARN ${v.vehicleNumber} ${doc.complianceType}: ${r.status} ${JSON.stringify(r.data?.message || '')}`);
    }
    console.log(`  ${v.vehicleNumber}: 6 documents created`);
  }

  // 6. Verify all new documents
  const docRes2 = await api('GET', '/api/v1/compliance/documents?limit=100', token);
  const allDocs = docRes2.data?.data?.items || docRes2.data?.data?.data || docRes2.data?.data || [];
  if (Array.isArray(allDocs)) {
    const pendingDocs = allDocs.filter((d: any) => d.status === 'DRAFT' || d.status === 'ACTIVE');
    console.log(`\nVerifying ${pendingDocs.length} documents...`);
    for (const d of pendingDocs) {
      await api('PUT', `/api/v1/compliance/documents/${d.id}/verify`, token, { status: 'VERIFIED' });
    }
    console.log('All documents verified');
  }

  // 7. Summary
  console.log('\n=== Final Summary ===');
  const vFinal = await api('GET', '/api/v1/vehicles?limit=50', token);
  const finalVehicles = vFinal.data?.data?.items || vFinal.data?.data?.data || vFinal.data?.data || [];
  console.log(`Vehicles: ${finalVehicles.length}`);
  for (const v of finalVehicles) {
    console.log(`  ${v.vehicleNumber} | RC: ${v.rcNumber || 'EMPTY'} | Ins: ${v.insuranceExpiry ? 'YES' : 'NULL'} | Fitness: ${v.fitnessExpiry ? 'YES' : 'NULL'} | PUC: ${v.pollutionExpiry ? 'YES' : 'NULL'} | Permit: ${v.permitExpiry ? 'YES' : 'NULL'}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
