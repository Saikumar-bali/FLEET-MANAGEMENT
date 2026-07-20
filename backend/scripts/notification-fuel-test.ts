import { chromium } from 'playwright';

const BASE = 'http://localhost:4000';
const UI = 'http://localhost:5173';

async function apiLogin(identifier: string, password: string) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`Login failed for ${identifier}: ${json.message}`);
  return json.data.accessToken as string;
}

async function apiGet(token: string, path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function apiPost(token: string, path: string, body: any) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function main() {
  console.log('=== Fuel Notification & Settlement Test ===\n');

  // Step 1: Login
  console.log('1. Logging in...');
  const adminToken = await apiLogin(process.env.E2E_ADMIN_IDENTIFIER || process.env.ADMIN_USERNAME || 'admin', process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '');
  const driverToken = await apiLogin(process.env.E2E_DRIVER_IDENTIFIER || process.env.DRIVER_USERNAME || 'aanand', process.env.E2E_DRIVER_PASSWORD || process.env.DRIVER_PASSWORD || '');
  console.log('   Admin and driver logged in');

  // Step 2: Check existing fuel entries for driver
  console.log('\n2. Checking driver fuel entries...');
  const driverProfile = await apiGet(driverToken, '/api/v1/driver-portal/profile');
  const driverId = driverProfile.data?.id;
  console.log(`   Driver ID: ${driverId}`);

  // Get driver's vehicles
  const driverVehicles = await apiGet(driverToken, '/api/v1/driver-portal/vehicles');
  console.log(`   Driver vehicles response:`, JSON.stringify(driverVehicles).substring(0, 200));

  // Get driver's fuel entries via admin
  const fuelList = await apiGet(adminToken, `/api/v1/fuel?driverId=${driverId}&limit=10`);
  console.log(`   Fuel entries:`, JSON.stringify(fuelList).substring(0, 300));

  // Step 3: Create a fuel entry as driver
  console.log('\n3. Creating fuel entry as driver...');
  const vehicles = driverVehicles.data?.vehicles || driverVehicles.data || [];
  if (vehicles.length === 0) {
    console.log('   ERROR: No vehicles found for driver. Cannot create fuel.');
    return;
  }
  const vehicleId = vehicles[0].id;
  console.log(`   Using vehicle: ${vehicleId}`);

  // Get trips for the driver
  const driverTrips = await apiGet(driverToken, '/api/v1/driver-portal/trips?limit=5');
  const trips = driverTrips.data?.items || [];
  const tripId = trips.length > 0 ? trips[0].id : null;
  console.log(`   Using trip: ${tripId || 'none'}`);

  const fuelEntry = await apiPost(driverToken, '/api/v1/fuel', {
    vehicleId,
    tripId,
    driverId,
    fuelDate: new Date().toISOString(),
    fuelType: 'DIESEL',
    entryMode: 'QUICK_AMOUNT',
    totalAmount: 2500,
    notes: 'Test fuel for notification check',
    createdById: driverToken, // This won't be the actual user id, but let's see
  });
  console.log(`   Fuel created:`, JSON.stringify(fuelEntry).substring(0, 300));

  if (!fuelEntry.success) {
    console.log('   ERROR: Could not create fuel entry');
    return;
  }

  const fuelId = fuelEntry.data?.id;
  console.log(`   Fuel ID: ${fuelId}`);

  // Step 4: Submit the fuel entry
  console.log('\n4. Submitting fuel entry...');
  const submitResult = await apiPost(driverToken, `/api/v1/fuel/${fuelId}/submit`, { notes: 'Submitting for test' });
  console.log(`   Submit result:`, JSON.stringify(submitResult).substring(0, 200));

  // Step 5: Check admin notifications
  console.log('\n5. Checking admin notifications...');
  const adminNotifs = await apiGet(adminToken, '/api/v1/notifications?limit=10');
  console.log(`   Admin notifications:`, JSON.stringify(adminNotifs).substring(0, 500));
  const fuelNotifs = (adminNotifs.data?.items || adminNotifs.data || []).filter((n: any) => (n.title || '').toLowerCase().includes('fuel'));
  console.log(`   Fuel-related notifications: ${fuelNotifs.length}`);
  if (fuelNotifs.length > 0) {
    console.log(`   Latest fuel notif:`, JSON.stringify(fuelNotifs[0]));
  }

  // Step 6: Check all fuel entries status
  console.log('\n6. Checking fuel entries after submit...');
  const fuelAfter = await apiGet(adminToken, `/api/v1/fuel?driverId=${driverId}&limit=10`);
  const fuelItems = fuelAfter.data?.items || [];
  console.log(`   Fuel entries (${fuelItems.length}):`);
  for (const f of fuelItems) {
    console.log(`   - ${f.id} | Status: ${f.status} | Amount: ${f.totalAmount}`);
  }

  // Step 7: Approve the fuel entry as admin
  console.log('\n7. Approving fuel entry as admin...');
  const approveResult = await apiPost(adminToken, `/api/v1/fuel/${fuelId}/approve`, { notes: 'Approved for test' });
  console.log(`   Approve result:`, JSON.stringify(approveResult).substring(0, 200));

  // Step 8: Check driver notifications for approval
  console.log('\n8. Checking driver notifications for approval...');
  const driverNotifs = await apiGet(driverToken, '/api/v1/notifications?limit=10');
  const approvalNotifs = (driverNotifs.data?.items || driverNotifs.data || []).filter((n: any) => (n.title || '').toLowerCase().includes('fuel'));
  console.log(`   Driver fuel notifications: ${approvalNotifs.length}`);
  if (approvalNotifs.length > 0) {
    console.log(`   Latest:`, JSON.stringify(approvalNotifs[0]));
  }

  // Step 9: Check settlements
  console.log('\n9. Checking settlements...');
  const settlements = await apiGet(driverToken, '/api/v1/driver-advances/settlements?limit=10');
  console.log(`   Settlements:`, JSON.stringify(settlements).substring(0, 300));

  // Step 10: Check driver advances
  console.log('\n10. Checking driver advances...');
  const advances = await apiGet(driverToken, '/api/v1/driver-advances/mine?limit=10');
  console.log(`   Advances:`, JSON.stringify(advances).substring(0, 400));

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
