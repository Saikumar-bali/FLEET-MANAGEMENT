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
  console.log('=== CLEAN STATE VERIFICATION ===\n');

  const adminToken = await apiLogin('admin', 'admin@123');
  const driverToken = await apiLogin('aanand', 'aanand@123');

  // Check driver vehicles
  const vRes = await apiGet(driverToken, '/api/v1/me/driver-vehicles');
  const vehicles = vRes.json.data?.vehicles || [];
  console.log('Driver vehicles:', vehicles.length);
  for (const v of vehicles) {
    console.log(`  ${v.id} ${v.vehicleNumber} (${v.status})`);
  }

  // Check fuel entries (should be 0)
  const fuelRes = await apiGet(adminToken, '/api/v1/fuel?limit=50');
  console.log('\nFuel entries:', fuelRes.json.data?.pagination?.total || 0);

  // Check driver advances (should be 0)
  const advRes = await apiGet(adminToken, '/api/v1/driver-advances?limit=50');
  console.log('Driver advances:', advRes.json.data?.pagination?.total || 0);

  // Check settlements (should be 0)
  const settleRes = await apiGet(adminToken, '/api/v1/driver-settlements?limit=50');
  console.log('Driver settlements:', settleRes.json.data?.pagination?.total || 0);

  // Check drivers
  const driversRes = await apiGet(adminToken, '/api/v1/drivers?limit=50');
  const drivers = driversRes.json.data?.items || [];
  console.log('\nLinked drivers:', drivers.length);
  for (const d of drivers) {
    console.log(`  ${d.name} [${d.id}]`);
  }

  // Check notifications (should be 0 fuel/expense)
  const notifRes = await apiGet(driverToken, '/api/v1/me/notifications?limit=10');
  console.log('\nDriver notifications:', notifRes.json.data?.items?.length || 0);

  console.log('\n=== VERIFICATION COMPLETE ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
