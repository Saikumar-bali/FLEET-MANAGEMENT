const BASE = 'http://localhost:4000';

async function apiLogin(identifier, password) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const json = await res.json();
  return json.data.accessToken;
}

async function apiGet(token, path) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
  clearTimeout(id);
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; }
  catch { return { status: res.status, json: { raw: text } }; }
}

async function apiPost(token, path, body) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 30000);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(id);
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; }
  catch { return { status: res.status, json: { raw: text } }; }
}

async function main() {
  console.log('=== Fuel Full Flow Test v6 ===\n');
  const adminToken = await apiLogin('admin', 'admin@123');
  const driverToken = await apiLogin('aanand', 'aanand@123');

  const vehicleId = 'cmrem6pm3000jl204a5ivpjyr';
  console.log('Using vehicle:', vehicleId);
  const createRes = await apiPost(driverToken, '/api/v1/me/driver-fuel', {
    vehicleId, fuelDate: new Date().toISOString(), fuelType: 'DIESEL',
    entryMode: 'QUICK_AMOUNT', totalAmount: 1111, notes: 'flow test v6',
  });
  console.log('\n1. Create:', createRes.status, createRes.json.message);
  const fuelId = createRes.json.data?.id;
  if (!fuelId) { console.log('ABORT'); return; }

  // Driver submit
  console.log('\n2. Driver submit...');
  const submitRes = await apiPost(driverToken, `/api/v1/fuel/${fuelId}/submit`, { notes: 'driver submit v6' });
  console.log(`   Status: ${submitRes.status} - ${submitRes.json.message}`);

  console.log('   Waiting 5s...');
  await new Promise(r => setTimeout(r, 5000));

  // Check admin notifications
  console.log('\n3. Admin notifications...');
  const notifs = await apiGet(adminToken, '/api/v1/me/notifications?limit=20');
  const items = notifs.json.data?.items || [];
  console.log(`   Count: ${items.length}`);
  for (const n of items.slice(0, 10)) {
    console.log(`   [${n.severity}] ${n.title}: ${(n.message || '').substring(0, 80)}`);
  }

  // Admin approve
  console.log('\n4. Admin approve...');
  const approveRes = await apiPost(adminToken, `/api/v1/fuel/${fuelId}/approve`, { notes: 'approved v6' });
  console.log(`   Status: ${approveRes.status} - ${approveRes.json.message}`);

  console.log('   Waiting 5s...');
  await new Promise(r => setTimeout(r, 5000));

  // Check driver notifications
  console.log('\n5. Driver notifications...');
  const dNotifs = await apiGet(driverToken, '/api/v1/me/notifications?limit=20');
  const dItems = dNotifs.json.data?.items || [];
  console.log(`   Count: ${dItems.length}`);
  for (const n of dItems.slice(0, 10)) {
    console.log(`   [${n.severity}] ${n.title}: ${(n.message || '').substring(0, 80)}`);
  }

  const unreadAdmin = await apiGet(adminToken, '/api/v1/me/notifications/unread-count');
  console.log(`\n6. Admin unread: ${JSON.stringify(unreadAdmin.json.data)}`);
  const unreadDriver = await apiGet(driverToken, '/api/v1/me/notifications/unread-count');
  console.log(`   Driver unread: ${JSON.stringify(unreadDriver.json.data)}`);

  console.log('\n=== Test Complete ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
