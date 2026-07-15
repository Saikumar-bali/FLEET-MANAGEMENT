const BASE = 'http://localhost:4000';

async function apiLogin(identifier, password) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`Login failed for ${identifier}: ${json.message}`);
  return json.data.accessToken;
}

async function apiGet(token, path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

async function apiPost(token, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function log(label, val) {
  const s = typeof val === 'string' ? val : JSON.stringify(val).substring(0, 300);
  console.log(`   ${label}: ${s}`);
}

async function main() {
  console.log('=== Fuel Notification & Settlement Test ===\n');

  const adminToken = await apiLogin('admin', 'admin@123');
  const driverToken = await apiLogin('aanand', 'aanand@123');
  log('Step 1', 'Logged in');

  // Get driver profile
  const profile = await apiGet(driverToken, '/api/v1/me/driver-profile');
  const driverId = profile.data?.id;
  log('Step 2', `Driver ID: ${driverId}`);

  // Get driver vehicles
  const vehiclesRes = await apiGet(driverToken, '/api/v1/me/driver-vehicles');
  const vehicles = vehiclesRes.data?.vehicles || vehiclesRes.data || [];
  log('Step 3', `Vehicles: ${vehicles.length}`);
  if (vehicles.length === 0) { console.log('   ABORT: no vehicles'); return; }
  const vehicleId = vehicles[0].id;

  // Get driver trips
  const tripsRes = await apiGet(driverToken, '/api/v1/me/driver-trips?limit=5');
  const trips = tripsRes.data?.items || [];
  log('Step 4', `Trips: ${trips.length}`);
  const tripId = trips.length > 0 ? trips[0].id : null;

  // Create fuel via driver-portal route
  console.log('\n5. Creating fuel entry via driver portal...');
  const fuelEntry = await apiPost(driverToken, '/api/v1/me/driver-fuel', {
    vehicleId, tripId, fuelDate: new Date().toISOString(),
    fuelType: 'DIESEL', entryMode: 'QUICK_AMOUNT', totalAmount: 2500,
    notes: 'Test fuel for notification check',
  });
  log('Create fuel', fuelEntry);
  const fuelId = fuelEntry.data?.id;
  if (!fuelId) { console.log('   ABORT: no fuel ID'); return; }
  console.log(`   Fuel ID: ${fuelId}`);

  // Submit fuel
  console.log('\n6. Submitting fuel...');
  const submitRes = await apiPost(driverToken, `/api/v1/fuel/${fuelId}/submit`, { notes: 'test submit' });
  log('Submit', submitRes);

  // Check admin notifications
  console.log('\n7. Checking admin notifications...');
  const adminNotifs = await apiGet(adminToken, '/api/v1/notifications?limit=20');
  const allNotifs = adminNotifs.data?.items || adminNotifs.data || [];
  log('All notifs count', `${allNotifs.length}`);
  const fuelNotifs = allNotifs.filter(n => {
    const t = (n.title || '').toLowerCase();
    const m = (n.message || '').toLowerCase();
    return t.includes('fuel') || m.includes('fuel');
  });
  console.log(`   Fuel-related notifications: ${fuelNotifs.length}`);
  for (const n of fuelNotifs.slice(0, 5)) {
    console.log(`   -> [${n.severity}] ${n.title}: ${n.message}`);
  }
  if (fuelNotifs.length === 0) {
    console.log('   !!! NO FUEL NOTIFICATIONS FOUND !!!');
    console.log('   All notification titles:');
    for (const n of allNotifs.slice(0, 10)) {
      console.log(`   -> ${n.title}: ${(n.message || '').substring(0, 80)}`);
    }
  }

  // Approve fuel as admin
  console.log('\n8. Approving fuel as admin...');
  const approveRes = await apiPost(adminToken, `/api/v1/fuel/${fuelId}/approve`, { notes: 'test approve' });
  log('Approve', approveRes);

  // Check driver notifications
  console.log('\n9. Checking driver notifications...');
  const driverNotifs = await apiGet(driverToken, '/api/v1/notifications?limit=20');
  const dNotifs = driverNotifs.data?.items || driverNotifs.data || [];
  log('Driver notifs count', `${dNotifs.length}`);
  const dFuelNotifs = dNotifs.filter(n => {
    const t = (n.title || '').toLowerCase();
    const m = (n.message || '').toLowerCase();
    return t.includes('fuel') || m.includes('fuel');
  });
  console.log(`   Driver fuel notifications: ${dFuelNotifs.length}`);
  for (const n of dFuelNotifs.slice(0, 5)) {
    console.log(`   -> [${n.severity}] ${n.title}: ${n.message}`);
  }

  // Check advances
  console.log('\n10. Checking driver advances...');
  const advances = await apiGet(driverToken, '/api/v1/driver-advances/mine?limit=10');
  log('Advances', advances);

  // Check settlements
  console.log('\n11. Checking settlements...');
  const settlements = await apiGet(driverToken, '/api/v1/driver-advances/settlements?limit=10');
  log('Settlements', settlements);

  console.log('\n=== Test Complete ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
