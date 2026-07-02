import { PrismaClient } from '@prisma/client';
import http from 'http';
import { createAccessToken } from '../src/utils/auth';

const prisma = new PrismaClient();
const PREFIX = 'PHASE_MODULE_SCOPE_API';
const API_PORT = Number(process.env.PORT) || 4000;
const API_BASE = `http://127.0.0.1:${API_PORT}`;

let testFailed = false;
let server: http.Server | null = null;

function pass(msg: string) { console.log(`  PASS ${msg}`); }
function fail(msg: string) { console.log(`  FAIL ${msg}`); testFailed = true; }

async function apiCall(method: string, path: string, token: string, body?: unknown): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: '127.0.0.1',
      port: API_PORT,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 0, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function cleanup() {
  await prisma.fuelEntry.deleteMany({ where: { notes: { contains: PREFIX } } });
  await prisma.expense.deleteMany({ where: { notes: { contains: PREFIX } } });
  await prisma.document.deleteMany({ where: { description: { contains: PREFIX } } });
  await prisma.trip.deleteMany({ where: { notes: { contains: PREFIX } } });
  const testUsers = await prisma.user.findMany({ where: { name: { startsWith: PREFIX } }, select: { id: true } });
  for (const u of testUsers) {
    await prisma.userPermissionOverride.deleteMany({ where: { userId: u.id } });
    await prisma.userDataScope.deleteMany({ where: { userId: u.id } });
  }
  await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.role.deleteMany({ where: { name: { startsWith: PREFIX } } });
  const testVehicles = await prisma.vehicle.findMany({ where: { vehicleNumber: { startsWith: PREFIX } }, select: { id: true } });
  for (const v of testVehicles) {
    await prisma.trip.deleteMany({ where: { vehicleId: v.id } });
    await prisma.fuelEntry.deleteMany({ where: { vehicleId: v.id } });
    await prisma.expense.deleteMany({ where: { vehicleId: v.id } });
    await prisma.document.deleteMany({ where: { vehicleId: v.id } });
  }
  await prisma.vehicle.deleteMany({ where: { vehicleNumber: { startsWith: PREFIX } } });
  await prisma.driver.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

function makeToken(userId: string, roleKey = 'test'): string {
  return createAccessToken({
    id: userId,
    name: 'test',
    username: 'test',
    email: 'test@test.local',
    mobile: null,
    status: 'ACTIVE',
    role: { id: 'r1', name: 'Test', key: roleKey, status: 'ACTIVE' },
  });
}

async function main() {
  console.log('=== Module-Scope API Smoke Test ===\n');

  await cleanup();

  const superAdmin = await prisma.user.findFirst({ where: { role: { key: 'super_admin' } }, select: { id: true } });
  if (!superAdmin) { fail('No super_admin'); return; }

  const testRoleId = (await prisma.role.create({
    data: { name: `${PREFIX}_ROLE`, key: `${PREFIX.toLowerCase()}_role`, status: 'ACTIVE' },
  })).id;

  const allPerms = [
    'trip_view', 'trip_create', 'trip_update', 'trip_delete',
    'vehicle_view', 'vehicle_create', 'vehicle_update', 'vehicle_delete',
    'driver_view', 'driver_create', 'driver_update', 'driver_delete',
    'fuel_view', 'fuel_create', 'fuel_update', 'fuel_delete',
    'expense_view', 'expense_create', 'expense_update', 'expense_delete',
    'documents_view', 'documents_upload', 'documents_update', 'documents_delete',
  ];
  for (const p of allPerms) {
    const perm = await prisma.permission.findFirst({ where: { key: p } });
    if (perm) await prisma.rolePermission.create({ data: { roleId: testRoleId, permissionId: perm.id } });
  }

  const vehicleA = await prisma.vehicle.create({ data: { vehicleNumber: `${PREFIX}-VA`, vehicleType: 'TRUCK', fuelType: 'DIESEL' } });
  const vehicleB = await prisma.vehicle.create({ data: { vehicleNumber: `${PREFIX}-VB`, vehicleType: 'TRUCK', fuelType: 'DIESEL' } });
  const tripA = await prisma.trip.create({
    data: { tripNumber: `${PREFIX}-TA`, tripType: 'TRANSFER', vehicleId: vehicleA.id, originName: 'A', destinationName: 'B', status: 'DRAFT', notes: PREFIX },
  });

  const userA = await prisma.user.create({
    data: { name: `${PREFIX}_A`, username: `${PREFIX.toLowerCase()}a`, email: `${PREFIX.toLowerCase()}a@test.local`, passwordHash: 'x', roleId: testRoleId, status: 'ACTIVE' },
  });

  await prisma.userDataScope.create({ data: { userId: userA.id, scopeType: 'VEHICLE', scopeId: vehicleA.id, accessLevel: 'MANAGE' } });
  await prisma.userDataScope.create({ data: { userId: userA.id, scopeType: 'TRIP', scopeId: tripA.id, accessLevel: 'MANAGE' } });
  await prisma.userDataScope.create({ data: { userId: userA.id, scopeType: 'DRIVER', scopeId: userA.id, accessLevel: 'MANAGE' } });

  const tokenA = makeToken(userA.id);
  const tokenSA = makeToken(superAdmin.id);

  console.log('\n=== 1. GET /vehicles/:id — scope check ===');
  const getVehA = await apiCall('GET', `/api/v1/vehicles/${vehicleA.id}`, tokenA);
  if (getVehA.status === 200) pass('VehicleA accessible (200)');
  else fail(`VehicleA: ${getVehA.status}`);

  const getVehB = await apiCall('GET', `/api/v1/vehicles/${vehicleB.id}`, tokenA);
  if (getVehB.status === 403) pass('VehicleB blocked (403)');
  else fail(`VehicleB: expected 403 got ${getVehB.status}`);

  console.log('\n=== 2. PATCH /trips/:id — move vehicle blocked ===');
  const tripForPatch = await prisma.trip.create({
    data: { tripNumber: `${PREFIX}-PATCH`, tripType: 'TRANSFER', vehicleId: vehicleA.id, originName: 'X', destinationName: 'Y', status: 'DRAFT', notes: PREFIX },
  });
  const patchTrip = await apiCall('PATCH', `/api/v1/trips/${tripForPatch.id}`, tokenA, { vehicleId: vehicleB.id });
  if (patchTrip.status === 403) pass('Trip move to VehicleB blocked (403)');
  else fail(`Trip move: expected 403 got ${patchTrip.status}`);

  console.log('\n=== 3. PATCH /trips/:id — keep vehicle ok ===');
  const patchTripOk = await apiCall('PATCH', `/api/v1/trips/${tripForPatch.id}`, tokenA, { vehicleId: vehicleA.id });
  if (patchTripOk.status === 200) pass('Trip stays on VehicleA (200)');
  else fail(`Trip stay: expected 200 got ${patchTripOk.status}`);

  console.log('\n=== 4. POST /fuel — create for VehicleA ok ===');
  const createFuel = await apiCall('POST', '/api/v1/fuel', tokenA, {
    vehicleId: vehicleA.id, fuelDate: new Date().toISOString(), fuelType: 'DIESEL', entryMode: 'QUICK_AMOUNT', totalAmount: 50, notes: PREFIX,
  });
  if (createFuel.status === 201) pass('Fuel created for VehicleA (201)');
  else fail(`Fuel create: expected 201 got ${createFuel.status}`);

  console.log('\n=== 5. POST /fuel — create for VehicleB blocked ===');
  const createFuelB = await apiCall('POST', '/api/v1/fuel', tokenA, {
    vehicleId: vehicleB.id, fuelDate: new Date().toISOString(), fuelType: 'DIESEL', entryMode: 'QUICK_AMOUNT', totalAmount: 50, notes: PREFIX,
  });
  if (createFuelB.status === 403) pass('Fuel create for VehicleB blocked (403)');
  else fail(`Fuel create B: expected 403 got ${createFuelB.status}`);

  console.log('\n=== 6. PATCH /fuel/:id — move to VehicleB blocked ===');
  const fuelForPatch = await prisma.fuelEntry.create({
    data: { vehicleId: vehicleA.id, fuelDate: new Date(), fuelType: 'DIESEL', entryMode: 'QUICK_AMOUNT', totalAmount: 100, status: 'DRAFT', notes: PREFIX, createdById: userA.id },
  });
  const patchFuel = await apiCall('PATCH', `/api/v1/fuel/${fuelForPatch.id}`, tokenA, { vehicleId: vehicleB.id });
  if (patchFuel.status === 403) pass('Fuel move to VehicleB blocked (403)');
  else fail(`Fuel move: expected 403 got ${patchFuel.status}`);

  console.log('\n=== 7. PATCH /expenses/:id — move to VehicleB blocked ===');
  const expForPatch = await prisma.expense.create({
    data: { vehicleId: vehicleA.id, category: 'Fuel', expenseDate: new Date(), amount: 50, status: 'DRAFT', notes: PREFIX, createdById: userA.id },
  });
  const patchExp = await apiCall('PATCH', `/api/v1/expenses/${expForPatch.id}`, tokenA, { vehicleId: vehicleB.id });
  if (patchExp.status === 403) pass('Expense move to VehicleB blocked (403)');
  else fail(`Expense move: expected 403 got ${patchExp.status}`);

  console.log('\n=== 8. PATCH /documents/:id — linkedEntityId to out-of-scope trip ===');
  const docForPatch = await prisma.document.create({
    data: { title: `${PREFIX}-DOC`, originalFileName: 'x.pdf', storedFileName: 'x.pdf', mimeType: 'application/pdf', fileSizeBytes: 100, storageKey: 'z', documentType: 'GENERAL', documentCategory: 'GENERAL', vehicleId: vehicleA.id, uploadedById: userA.id, description: PREFIX },
  });
  const tripB = await prisma.trip.create({
    data: { tripNumber: `${PREFIX}-TB`, tripType: 'TRANSFER', vehicleId: vehicleB.id, originName: 'C', destinationName: 'D', status: 'DRAFT', notes: PREFIX },
  });
  const patchDoc = await apiCall('PUT', `/api/v1/documents/${docForPatch.id}`, tokenA, { tripId: tripB.id, linkedEntityType: 'TRIP', linkedEntityId: tripB.id });
  if (patchDoc.status === 403) pass('Document move to TripB blocked (403)');
  else fail(`Document move: expected 403 got ${patchDoc.status}`);

  console.log('\n=== 9. PUT /documents/:id — linkedEntityId to in-scope trip ok ===');
  const patchDocOk = await apiCall('PUT', `/api/v1/documents/${docForPatch.id}`, tokenA, { tripId: tripA.id, linkedEntityType: 'TRIP', linkedEntityId: tripA.id });
  if (patchDocOk.status === 200) pass('Document linked to TripA (200)');
  else fail(`Document link: expected 200 got ${patchDocOk.status}`);

  console.log('\n=== 9b. PUT /documents/:id — linkedEntityType-only change blocked ===');
  const patchDocTypeOnly = await apiCall('PUT', `/api/v1/documents/${docForPatch.id}`, tokenA, { linkedEntityType: 'VEHICLE' });
  if (patchDocTypeOnly.status === 403) pass('Doc linkedEntityType-only to VEHICLE blocked (403)');
  else fail(`Doc type-only: expected 403 got ${patchDocTypeOnly.status}`);

  const patchDocUnknown = await apiCall('PUT', `/api/v1/documents/${docForPatch.id}`, tokenA, { linkedEntityType: 'UNKNOWN' });
  if (patchDocUnknown.status === 403) pass('Doc linkedEntityType-only to UNKNOWN blocked (403)');
  else fail(`Doc unknown type: expected 403 got ${patchDocUnknown.status}`);

  console.log('\n=== 10. GET /vehicles — list scoped ===');
  const listVeh = await apiCall('GET', '/api/v1/vehicles', tokenA);
  if (listVeh.status === 200) {
    const items = (listVeh.data as any)?.data?.items || [];
    const hasB = items.some((v: any) => v.id === vehicleB.id);
    if (!hasB) pass('Vehicle list excludes VehicleB');
    else fail('Vehicle list includes VehicleB');
  } else fail(`Vehicle list: ${listVeh.status}`);

  console.log('\n=== 11. super_admin can access all ===');
  const saGetVehB = await apiCall('GET', `/api/v1/vehicles/${vehicleB.id}`, tokenSA);
  if (saGetVehB.status === 200) pass('SA reads VehicleB (200)');
  else fail(`SA VehicleB: ${saGetVehB.status}`);

  console.log('\n=== 12. GET /trips — list scoped ===');
  const listTrips = await apiCall('GET', '/api/v1/trips', tokenA);
  if (listTrips.status === 200) {
    const items = (listTrips.data as any)?.data?.items || [];
    const hasB = items.some((t: any) => t.tripNumber === `${PREFIX}-TB`);
    if (!hasB) pass('Trip list excludes TripB');
    else fail('Trip list includes TripB');
  } else fail(`Trip list: ${listTrips.status}`);

  console.log('\n=== 13. PATCH /vehicles/:id — update out-of-scope vehicle ===');
  const patchVehB = await apiCall('PATCH', `/api/v1/vehicles/${vehicleB.id}`, tokenA, { brand: 'Hacked' });
  if (patchVehB.status === 403) pass('VehicleB update blocked (403)');
  else fail(`VehicleB update: expected 403 got ${patchVehB.status}`);

  console.log('\n=== 14. PATCH /drivers/:id — update out-of-scope driver ===');
  const driverB = await prisma.driver.create({ data: { name: `${PREFIX}_DrB`, mobile: `90000${Date.now().toString().slice(-5)}9`, licenseNumber: `LIC-API-${Date.now()}` } });
  const patchDriverB = await apiCall('PATCH', `/api/v1/drivers/${driverB.id}`, tokenA, { name: 'Hacked' });
  if (patchDriverB.status === 403) pass('DriverB update blocked (403)');
  else fail(`DriverB update: expected 403 got ${patchDriverB.status}`);

  await cleanup();

  if (testFailed) {
    console.log('\n=== SOME TESTS FAILED ===');
    process.exit(1);
  }
  console.log('\n=== All API smoke tests passed ===');
}

main().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
