import { PrismaClient } from '@prisma/client';
import { getActorContext } from '../src/modules/access/actor-context.service';
import {
  assertCanReadResource,
  assertCanCreateResource,
  assertCanUpdateResource,
  assertCanDeleteResource,
  assertCanChangeResourceScope,
  getScopedWhereForResource,
} from '../src/modules/access/scoped-enforcement.service';
import { prisma } from '../src/lib/prisma';

const PREFIX = 'PHASE_MODULE_SCOPE_TEST';

let testFailed = false;

function pass(msg: string) { console.log(`  PASS ${msg}`); }
function fail(msg: string) { console.log(`  FAIL ${msg}`); testFailed = true; }
function expect403(fn: () => void, label: string) {
  try { fn(); fail(`${label}: expected 403 but succeeded`); }
  catch (e: any) {
    if (e.statusCode === 403) pass(`${label}: denied (403) — ${e.message}`);
    else fail(`${label}: expected 403 but got ${e.statusCode}: ${e.message}`);
  }
}
function expectSuccess(fn: () => void, label: string) {
  try { fn(); pass(label); }
  catch (e: any) { fail(`${label}: unexpected error: ${e.message}`); }
}
function rec(fields: Record<string, unknown>) { return fields as Record<string, unknown>; }

async function cleanup() {
  await prisma.auditLog.deleteMany({ where: { metadata: { path: ['actorUserId'], string_contains: PREFIX } } });
  await prisma.fuelEntry.deleteMany({ where: { notes: { contains: PREFIX } } });
  await prisma.expense.deleteMany({ where: { notes: { contains: PREFIX } } });
  await prisma.maintenanceRequest.deleteMany({ where: { notes: { contains: PREFIX } } });
  await prisma.repair.deleteMany({ where: { notes: { contains: PREFIX } } });
  await prisma.document.deleteMany({ where: { description: { contains: PREFIX } } });
  await prisma.trip.deleteMany({ where: { notes: { contains: PREFIX } } });

  const testUsers = await prisma.user.findMany({ where: { name: { startsWith: PREFIX } }, select: { id: true } });
  for (const u of testUsers) {
    await prisma.userPermissionOverride.deleteMany({ where: { userId: u.id } });
    await prisma.userDataScope.deleteMany({ where: { userId: u.id } });
  }
  await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });

  await prisma.role.deleteMany({ where: { name: { startsWith: PREFIX } } });

  const testVehicles = await prisma.vehicle.findMany({
    where: { vehicleNumber: { startsWith: PREFIX } }, select: { id: true },
  });
  for (const v of testVehicles) {
    await prisma.trip.deleteMany({ where: { vehicleId: v.id } });
    await prisma.fuelEntry.deleteMany({ where: { vehicleId: v.id } });
    await prisma.expense.deleteMany({ where: { vehicleId: v.id } });
    await prisma.document.deleteMany({ where: { vehicleId: v.id } });
  }
  await prisma.vehicle.deleteMany({ where: { vehicleNumber: { startsWith: PREFIX } } });

  await prisma.driver.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

async function createTestRole(): Promise<string> {
  const role = await prisma.role.create({
    data: {
      name: `${PREFIX}_ROLE`,
      key: `${PREFIX.toLowerCase()}_role`,
      status: 'ACTIVE',
    },
  });
  const perms = [
    'trip_view', 'trip_create', 'trip_update', 'trip_delete',
    'vehicle_view', 'vehicle_create', 'vehicle_update', 'vehicle_delete',
    'driver_view', 'driver_create', 'driver_update', 'driver_delete',
    'fuel_view', 'fuel_create', 'fuel_update', 'fuel_delete',
    'expense_view', 'expense_create', 'expense_update', 'expense_delete',
    'documents_view', 'documents_upload', 'documents_update', 'documents_delete',
    'maintenance_view', 'maintenance_create', 'maintenance_update', 'maintenance_delete',
    'repair_view', 'repair_create', 'repair_update', 'repair_delete',
  ];
  for (const p of perms) {
    const perm = await prisma.permission.findFirst({ where: { key: p } });
    if (perm) {
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
    }
  }
  return role.id;
}

async function createNoPermRole(): Promise<string> {
  const role = await prisma.role.create({
    data: {
      name: `${PREFIX}_NO_PERM`,
      key: `${PREFIX.toLowerCase()}_noperm`,
      status: 'ACTIVE',
    },
  });
  return role.id;
}

async function main() {
  console.log('=== Module-Level Scope Enforcement Test (Hardened) ===\n');

  await cleanup();

  const testRoleId = await createTestRole();
  const noPermRoleId = await createNoPermRole();

  const superAdmin = await prisma.user.findFirst({
    where: { role: { key: 'super_admin' } },
    select: { id: true, name: true },
  });
  if (!superAdmin) { fail('No super_admin'); return; }

  const userA = await prisma.user.create({
    data: { name: `${PREFIX}_UserA`, username: `${PREFIX.toLowerCase()}a`, email: `${PREFIX.toLowerCase()}a@test.local`, passwordHash: 'x', roleId: testRoleId, status: 'ACTIVE' },
  });
  const userB = await prisma.user.create({
    data: { name: `${PREFIX}_UserB`, username: `${PREFIX.toLowerCase()}b`, email: `${PREFIX.toLowerCase()}b@test.local`, passwordHash: 'x', roleId: testRoleId, status: 'ACTIVE' },
  });

  const vehicleA = await prisma.vehicle.create({ data: { vehicleNumber: `${PREFIX}-VEH-A`, vehicleType: 'TRUCK', fuelType: 'DIESEL' } });
  const vehicleB = await prisma.vehicle.create({ data: { vehicleNumber: `${PREFIX}-VEH-B`, vehicleType: 'TRUCK', fuelType: 'DIESEL' } });

  const tripA = await prisma.trip.create({
    data: { tripNumber: `${PREFIX}-TRIP-A`, tripType: 'TRANSFER', vehicleId: vehicleA.id, originName: 'A', destinationName: 'B', status: 'DRAFT', notes: PREFIX },
  });
  const tripB = await prisma.trip.create({
    data: { tripNumber: `${PREFIX}-TRIP-B`, tripType: 'TRANSFER', vehicleId: vehicleB.id, originName: 'C', destinationName: 'D', status: 'DRAFT', notes: PREFIX },
  });

  await prisma.userDataScope.create({ data: { userId: userA.id, scopeType: 'VEHICLE', scopeId: vehicleA.id, accessLevel: 'MANAGE' } });
  await prisma.userDataScope.create({ data: { userId: userA.id, scopeType: 'TRIP', scopeId: tripA.id, accessLevel: 'MANAGE' } });
  await prisma.userDataScope.create({ data: { userId: userA.id, scopeType: 'DRIVER', scopeId: userA.id, accessLevel: 'MANAGE' } });

  await prisma.userDataScope.create({ data: { userId: userB.id, scopeType: 'VEHICLE', scopeId: vehicleB.id, accessLevel: 'VIEW' } });
  await prisma.userDataScope.create({ data: { userId: userB.id, scopeType: 'TRIP', scopeId: tripB.id, accessLevel: 'VIEW' } });
  await prisma.userDataScope.create({ data: { userId: userB.id, scopeType: 'DRIVER', scopeId: userB.id, accessLevel: 'VIEW' } });

  const actorA = await getActorContext(userA.id);
  const actorB = await getActorContext(userB.id);
  const actorSA = await getActorContext(superAdmin.id);

  console.log('\n=== 1. VEHICLE record-level scope ===');
  expectSuccess(() => assertCanReadResource(actorA, 'VEHICLE', rec({ id: vehicleA.id })), 'A reads VehicleA');
  expect403(() => assertCanReadResource(actorA, 'VEHICLE', rec({ id: vehicleB.id })), 'A reads VehicleB');
  expectSuccess(() => assertCanReadResource(actorB, 'VEHICLE', rec({ id: vehicleB.id })), 'B reads VehicleB');
  expect403(() => assertCanReadResource(actorB, 'VEHICLE', rec({ id: vehicleA.id })), 'B reads VehicleA');
  expectSuccess(() => assertCanReadResource(actorSA, 'VEHICLE', rec({ id: vehicleA.id })), 'SA reads VehicleA');
  expectSuccess(() => assertCanReadResource(actorSA, 'VEHICLE', rec({ id: vehicleB.id })), 'SA reads VehicleB');

  console.log('\n=== 2. DRIVER record-level scope ===');
  expectSuccess(() => assertCanReadResource(actorA, 'DRIVER', rec({ id: userA.id })), 'A reads DriverA');
  expect403(() => assertCanReadResource(actorA, 'DRIVER', rec({ id: userB.id })), 'A reads DriverB');
  expectSuccess(() => assertCanReadResource(actorB, 'DRIVER', rec({ id: userB.id })), 'B reads DriverB');
  expect403(() => assertCanReadResource(actorB, 'DRIVER', rec({ id: userA.id })), 'B reads DriverA');

  console.log('\n=== 3. TRIP record-level scope ===');
  expectSuccess(() => assertCanReadResource(actorA, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id })), 'A reads TripA');
  expect403(() => assertCanReadResource(actorA, 'TRIP', rec({ id: tripB.id, vehicleId: vehicleB.id })), 'A reads TripB');
  expectSuccess(() => assertCanReadResource(actorB, 'TRIP', rec({ id: tripB.id, vehicleId: vehicleB.id })), 'B reads TripB');
  expect403(() => assertCanReadResource(actorB, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id })), 'B reads TripA');

  console.log('\n=== 4. FUEL record-level scope ===');
  const fuelA = await prisma.fuelEntry.create({
    data: { vehicleId: vehicleA.id, fuelDate: new Date(), fuelType: 'DIESEL', entryMode: 'QUICK_AMOUNT', totalAmount: 100, status: 'DRAFT', notes: PREFIX, createdById: userA.id },
  });
  const fuelB = await prisma.fuelEntry.create({
    data: { vehicleId: vehicleB.id, fuelDate: new Date(), fuelType: 'DIESEL', entryMode: 'QUICK_AMOUNT', totalAmount: 200, status: 'DRAFT', notes: PREFIX, createdById: userB.id },
  });
  expectSuccess(() => assertCanReadResource(actorA, 'FUEL_ENTRY', rec({ id: fuelA.id, vehicleId: vehicleA.id })), 'A reads FuelA');
  expect403(() => assertCanReadResource(actorA, 'FUEL_ENTRY', rec({ id: fuelB.id, vehicleId: vehicleB.id })), 'A reads FuelB');
  expectSuccess(() => assertCanReadResource(actorB, 'FUEL_ENTRY', rec({ id: fuelB.id, vehicleId: vehicleB.id })), 'B reads FuelB');
  expect403(() => assertCanReadResource(actorB, 'FUEL_ENTRY', rec({ id: fuelA.id, vehicleId: vehicleA.id })), 'B reads FuelA');

  console.log('\n=== 5. EXPENSE record-level scope ===');
  const expA = await prisma.expense.create({
    data: { vehicleId: vehicleA.id, category: 'Fuel', expenseDate: new Date(), amount: 50, status: 'DRAFT', notes: PREFIX, createdById: userA.id },
  });
  const expB = await prisma.expense.create({
    data: { vehicleId: vehicleB.id, category: 'Fuel', expenseDate: new Date(), amount: 75, status: 'DRAFT', notes: PREFIX, createdById: userB.id },
  });
  expectSuccess(() => assertCanReadResource(actorA, 'EXPENSE', rec({ id: expA.id, vehicleId: vehicleA.id })), 'A reads ExpenseA');
  expect403(() => assertCanReadResource(actorA, 'EXPENSE', rec({ id: expB.id, vehicleId: vehicleB.id })), 'A reads ExpenseB');
  expectSuccess(() => assertCanReadResource(actorB, 'EXPENSE', rec({ id: expB.id, vehicleId: vehicleB.id })), 'B reads ExpenseB');
  expect403(() => assertCanReadResource(actorB, 'EXPENSE', rec({ id: expA.id, vehicleId: vehicleA.id })), 'B reads ExpenseA');

  console.log('\n=== 6. DOCUMENT record-level scope ===');
  const docA = await prisma.document.create({
    data: {
      title: `${PREFIX}-DocA`, originalFileName: 'a.pdf', storedFileName: 'a.pdf', mimeType: 'application/pdf',
      fileSizeBytes: 100, storageKey: 'x', documentType: 'GENERAL', documentCategory: 'GENERAL',
      vehicleId: vehicleA.id, uploadedById: userA.id, description: PREFIX,
    },
  });
  const docB = await prisma.document.create({
    data: {
      title: `${PREFIX}-DocB`, originalFileName: 'b.pdf', storedFileName: 'b.pdf', mimeType: 'application/pdf',
      fileSizeBytes: 100, storageKey: 'y', documentType: 'GENERAL', documentCategory: 'GENERAL',
      vehicleId: vehicleB.id, uploadedById: userB.id, description: PREFIX,
    },
  });
  expectSuccess(() => assertCanReadResource(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id })), 'A reads DocA');
  expect403(() => assertCanReadResource(actorA, 'DOCUMENT', rec({ id: docB.id, vehicleId: vehicleB.id })), 'A reads DocB');
  expectSuccess(() => assertCanReadResource(actorB, 'DOCUMENT', rec({ id: docB.id, vehicleId: vehicleB.id })), 'B reads DocB');
  expect403(() => assertCanReadResource(actorB, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id })), 'B reads DocA');

  console.log('\n=== 7. MAINTENANCE record-level scope ===');
  const maintA = await prisma.maintenanceRequest.create({
    data: { vehicleId: vehicleA.id, requestDate: new Date(), category: 'Engine', description: PREFIX, status: 'DRAFT', notes: PREFIX, createdById: userA.id },
  });
  const maintB = await prisma.maintenanceRequest.create({
    data: { vehicleId: vehicleB.id, requestDate: new Date(), category: 'Engine', description: PREFIX, status: 'DRAFT', notes: PREFIX, createdById: userB.id },
  });
  expectSuccess(() => assertCanReadResource(actorA, 'MAINTENANCE', rec({ id: maintA.id, vehicleId: vehicleA.id })), 'A reads MaintA');
  expect403(() => assertCanReadResource(actorA, 'MAINTENANCE', rec({ id: maintB.id, vehicleId: vehicleB.id })), 'A reads MaintB');
  expectSuccess(() => assertCanReadResource(actorB, 'MAINTENANCE', rec({ id: maintB.id, vehicleId: vehicleB.id })), 'B reads MaintB');
  expect403(() => assertCanReadResource(actorB, 'MAINTENANCE', rec({ id: maintA.id, vehicleId: vehicleA.id })), 'B reads MaintA');

  console.log('\n=== 8. REPAIR record-level scope ===');
  const repA = await prisma.repair.create({
    data: { vehicleId: vehicleA.id, repairDate: new Date(), category: 'Engine', description: PREFIX, status: 'OPEN', notes: PREFIX, createdById: userA.id },
  });
  const repB = await prisma.repair.create({
    data: { vehicleId: vehicleB.id, repairDate: new Date(), category: 'Engine', description: PREFIX, status: 'OPEN', notes: PREFIX, createdById: userB.id },
  });
  expectSuccess(() => assertCanReadResource(actorA, 'REPAIR', rec({ id: repA.id, vehicleId: vehicleA.id })), 'A reads RepairA');
  expect403(() => assertCanReadResource(actorA, 'REPAIR', rec({ id: repB.id, vehicleId: vehicleB.id })), 'A reads RepairB');
  expectSuccess(() => assertCanReadResource(actorB, 'REPAIR', rec({ id: repB.id, vehicleId: vehicleB.id })), 'B reads RepairB');
  expect403(() => assertCanReadResource(actorB, 'REPAIR', rec({ id: repA.id, vehicleId: vehicleA.id })), 'B reads RepairA');

  console.log('\n=== 9. Scope access level enforcement ===');
  expect403(() => assertCanUpdateResource(actorB, 'FUEL_ENTRY', rec({ id: fuelB.id, vehicleId: vehicleB.id })), 'B (VIEW) updates FuelB');
  expect403(() => assertCanDeleteResource(actorB, 'FUEL_ENTRY', rec({ id: fuelB.id, vehicleId: vehicleB.id })), 'B (VIEW) deletes FuelB');
  expect403(() => assertCanUpdateResource(actorB, 'TRIP', rec({ id: tripB.id, vehicleId: vehicleB.id })), 'B (VIEW) updates TripB');
  expect403(() => assertCanDeleteResource(actorB, 'TRIP', rec({ id: tripB.id, vehicleId: vehicleB.id })), 'B (VIEW) deletes TripB');

  expectSuccess(() => assertCanUpdateResource(actorA, 'FUEL_ENTRY', rec({ id: fuelA.id, vehicleId: vehicleA.id })), 'A (MANAGE) updates FuelA');
  expectSuccess(() => assertCanDeleteResource(actorA, 'FUEL_ENTRY', rec({ id: fuelA.id, vehicleId: vehicleA.id })), 'A (MANAGE) deletes FuelA');
  expectSuccess(() => assertCanUpdateResource(actorA, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id })), 'A (MANAGE) updates TripA');

  console.log('\n=== 10. Create scope level enforcement ===');
  expectSuccess(() => assertCanCreateResource(actorA, 'FUEL_ENTRY', rec({ vehicleId: vehicleA.id })), 'A (MANAGE) creates Fuel for VehicleA');
  expect403(() => assertCanCreateResource(actorA, 'FUEL_ENTRY', rec({ vehicleId: vehicleB.id })), 'A (MANAGE) creates Fuel for VehicleB');
  expect403(() => assertCanCreateResource(actorB, 'FUEL_ENTRY', rec({ vehicleId: vehicleA.id })), 'B (VIEW) creates Fuel for VehicleA');
  expect403(() => assertCanCreateResource(actorB, 'FUEL_ENTRY', rec({ vehicleId: vehicleB.id })), 'B (VIEW) creates Fuel for VehicleB');

  console.log('\n=== 11. Update target scope validation ===');
  expect403(() => assertCanChangeResourceScope(actorA, 'FUEL_ENTRY', rec({ id: fuelA.id, vehicleId: vehicleA.id }), rec({ vehicleId: vehicleB.id })), 'A moves FuelA to VehicleB');
  expectSuccess(() => assertCanChangeResourceScope(actorA, 'FUEL_ENTRY', rec({ id: fuelA.id, vehicleId: vehicleA.id }), rec({ vehicleId: vehicleA.id })), 'A keeps FuelA on VehicleA');
  expect403(() => assertCanChangeResourceScope(actorA, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id }), rec({ vehicleId: vehicleB.id })), 'A moves TripA to VehicleB');
  expect403(() => assertCanChangeResourceScope(actorA, 'EXPENSE', rec({ id: expA.id, vehicleId: vehicleA.id }), rec({ vehicleId: vehicleB.id })), 'A moves ExpenseA to VehicleB');

  console.log('\n=== 12. Missing permission test ===');
  const userNoPerm = await prisma.user.create({
    data: { name: `${PREFIX}_NoPerm`, username: `${PREFIX.toLowerCase()}noperm`, email: `${PREFIX.toLowerCase()}noperm@test.local`, passwordHash: 'x', roleId: noPermRoleId, status: 'ACTIVE' },
  });
  const actorNoPerm = await getActorContext(userNoPerm.id);
  expect403(() => assertCanReadResource(actorNoPerm, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id })), 'NoPerm reads TripA');
  expect403(() => assertCanCreateResource(actorNoPerm, 'FUEL_ENTRY', rec({ vehicleId: vehicleA.id })), 'NoPerm creates Fuel');
  await prisma.user.delete({ where: { id: userNoPerm.id } });

  console.log('\n=== 13. super_admin global access ===');
  expectSuccess(() => assertCanReadResource(actorSA, 'VEHICLE', rec({ id: vehicleA.id })), 'SA reads VehicleA');
  expectSuccess(() => assertCanReadResource(actorSA, 'VEHICLE', rec({ id: vehicleB.id })), 'SA reads VehicleB');
  expectSuccess(() => assertCanReadResource(actorSA, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id })), 'SA reads TripA');
  expectSuccess(() => assertCanReadResource(actorSA, 'TRIP', rec({ id: tripB.id, vehicleId: vehicleB.id })), 'SA reads TripB');
  expectSuccess(() => assertCanCreateResource(actorSA, 'FUEL_ENTRY', rec({ vehicleId: vehicleA.id })), 'SA creates Fuel');
  expectSuccess(() => assertCanUpdateResource(actorSA, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id })), 'SA updates TripA');

  console.log('\n=== 14. Admin not automatically global ===');
  const adminRole = await prisma.role.findFirst({ where: { key: 'admin' } });
  if (adminRole) {
    const adminUser = await prisma.user.create({
      data: { name: `${PREFIX}_Admin`, username: `${PREFIX.toLowerCase()}admin`, email: `${PREFIX.toLowerCase()}admin@test.local`, passwordHash: 'x', roleId: adminRole.id, status: 'ACTIVE' },
    });
    const actorAdm = await getActorContext(adminUser.id);
    if (!actorAdm.isGlobalUser) pass('Admin without GLOBAL scope is NOT global');
    else fail('Admin is incorrectly global');
    expect403(() => assertCanReadResource(actorAdm, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id })), 'Admin without scope reads TripA');
    await prisma.user.delete({ where: { id: adminUser.id } });
  }

  console.log('\n=== 15. List filtering via scoped where ===');
  const whereA = getScopedWhereForResource(actorA, 'VEHICLE');
  const whereB = getScopedWhereForResource(actorB, 'VEHICLE');
  const vehsA = await prisma.vehicle.findMany({ where: whereA ? { AND: [whereA, { vehicleNumber: { startsWith: PREFIX } }] } : { vehicleNumber: { startsWith: PREFIX } } });
  const vehsB = await prisma.vehicle.findMany({ where: whereB ? { AND: [whereB, { vehicleNumber: { startsWith: PREFIX } }] } : { vehicleNumber: { startsWith: PREFIX } } });
  if (vehsA.length === 1 && vehsA[0].id === vehicleA.id) pass('Vehicle list: A sees VehicleA only');
  else fail(`Vehicle list: A sees ${vehsA.length} (expected 1 VehicleA)`);
  if (vehsB.length === 1 && vehsB[0].id === vehicleB.id) pass('Vehicle list: B sees VehicleB only');
  else fail(`Vehicle list: B sees ${vehsB.length} (expected 1 VehicleB)`);

  const wTripA = getScopedWhereForResource(actorA, 'TRIP');
  const wTripB = getScopedWhereForResource(actorB, 'TRIP');
  const tripsA = await prisma.trip.findMany({ where: wTripA ? { AND: [wTripA, { notes: PREFIX }] } : { notes: PREFIX } });
  const tripsB = await prisma.trip.findMany({ where: wTripB ? { AND: [wTripB, { notes: PREFIX }] } : { notes: PREFIX } });
  if (tripsA.length === 1 && tripsA[0].id === tripA.id) pass('Trip list: A sees TripA only');
  else fail(`Trip list: A sees ${tripsA.length}`);
  if (tripsB.length === 1 && tripsB[0].id === tripB.id) pass('Trip list: B sees TripB only');
  else fail(`Trip list: B sees ${tripsB.length}`);

  const wFuelA = getScopedWhereForResource(actorA, 'FUEL_ENTRY');
  const wFuelB = getScopedWhereForResource(actorB, 'FUEL_ENTRY');
  const fA = await prisma.fuelEntry.findMany({ where: wFuelA ? { AND: [wFuelA, { notes: PREFIX }] } : { notes: PREFIX } });
  const fB = await prisma.fuelEntry.findMany({ where: wFuelB ? { AND: [wFuelB, { notes: PREFIX }] } : { notes: PREFIX } });
  if (fA.length === 1 && fA[0].id === fuelA.id) pass('Fuel list: A sees FuelA only');
  else fail(`Fuel list: A sees ${fA.length}`);
  if (fB.length === 1 && fB[0].id === fuelB.id) pass('Fuel list: B sees FuelB only');
  else fail(`Fuel list: B sees ${fB.length}`);

  await cleanup();

  if (testFailed) {
    console.log('\n=== SOME TESTS FAILED ===');
    process.exit(1);
  }
  console.log('\n=== All module scope tests passed ===');
}

main().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
