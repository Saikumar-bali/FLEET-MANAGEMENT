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
function rec(fields: Record<string, unknown>) { return fields as Record<string, unknown>; }

async function expect403(fn: () => Promise<void>, label: string) {
  try { await fn(); fail(`${label}: expected 403`); }
  catch (e: any) {
    if (e.statusCode === 403) pass(`${label}: denied — ${e.message}`);
    else fail(`${label}: expected 403 got ${e.statusCode}: ${e.message}`);
  }
}

async function expectSuccess(fn: () => Promise<void>, label: string) {
  try { await fn(); pass(label); }
  catch (e: any) { fail(`${label}: unexpected: ${e.message}`); }
}

async function cleanup() {
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

async function createTestRole(): Promise<string> {
  const role = await prisma.role.create({ data: { name: `${PREFIX}_ROLE`, key: `${PREFIX.toLowerCase()}_role`, status: 'ACTIVE' } });
  const allPerms = [
    'trip_view', 'trip_create', 'trip_update', 'trip_delete',
    'vehicle_view', 'vehicle_create', 'vehicle_update', 'vehicle_delete',
    'driver_view', 'driver_create', 'driver_update', 'driver_delete',
    'fuel_view', 'fuel_create', 'fuel_update', 'fuel_delete',
    'expense_view', 'expense_create', 'expense_update', 'expense_delete',
    'documents_view', 'documents_upload', 'documents_update', 'documents_delete',
    'maintenance_view', 'maintenance_create', 'maintenance_update', 'maintenance_delete',
    'repair_view', 'repair_create', 'repair_update', 'repair_delete',
  ];
  for (const p of allPerms) {
    const perm = await prisma.permission.findFirst({ where: { key: p } });
    if (perm) await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
  }
  return role.id;
}

async function createViewOnlyRole(): Promise<string> {
  const role = await prisma.role.create({ data: { name: `${PREFIX}_VIEW_ONLY`, key: `${PREFIX.toLowerCase()}_viewonly`, status: 'ACTIVE' } });
  const viewPerms = ['trip_view', 'vehicle_view', 'driver_view', 'fuel_view', 'expense_view', 'documents_view', 'maintenance_view', 'repair_view'];
  for (const p of viewPerms) {
    const perm = await prisma.permission.findFirst({ where: { key: p } });
    if (perm) await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
  }
  return role.id;
}

async function main() {
  console.log('=== Module-Level Scope Enforcement Test (Full Wiring) ===\n');

  await cleanup();
  const testRoleId = await createTestRole();
  const viewOnlyRoleId = await createViewOnlyRole();

  const superAdmin = await prisma.user.findFirst({ where: { role: { key: 'super_admin' } }, select: { id: true, name: true } });
  if (!superAdmin) { fail('No super_admin'); return; }

  const userA = await prisma.user.create({
    data: { name: `${PREFIX}_A`, username: `${PREFIX.toLowerCase()}a`, email: `${PREFIX.toLowerCase()}a@test.local`, passwordHash: 'x', roleId: testRoleId, status: 'ACTIVE' },
  });
  const userB = await prisma.user.create({
    data: { name: `${PREFIX}_B`, username: `${PREFIX.toLowerCase()}b`, email: `${PREFIX.toLowerCase()}b@test.local`, passwordHash: 'x', roleId: viewOnlyRoleId, status: 'ACTIVE' },
  });

  const vehicleA = await prisma.vehicle.create({ data: { vehicleNumber: `${PREFIX}-VA`, vehicleType: 'TRUCK', fuelType: 'DIESEL' } });
  const vehicleB = await prisma.vehicle.create({ data: { vehicleNumber: `${PREFIX}-VB`, vehicleType: 'TRUCK', fuelType: 'DIESEL' } });
  const driverA = await prisma.driver.create({ data: { name: `${PREFIX}_DrA`, mobile: `90000${Date.now().toString().slice(-5)}1`, licenseNumber: `LIC-${Date.now()}A` } });
  const driverB = await prisma.driver.create({ data: { name: `${PREFIX}_DrB`, mobile: `90000${Date.now().toString().slice(-5)}2`, licenseNumber: `LIC-${Date.now()}B` } });

  const tripA = await prisma.trip.create({
    data: { tripNumber: `${PREFIX}-TA`, tripType: 'TRANSFER', vehicleId: vehicleA.id, originName: 'A', destinationName: 'B', status: 'DRAFT', notes: PREFIX },
  });
  const tripB = await prisma.trip.create({
    data: { tripNumber: `${PREFIX}-TB`, tripType: 'TRANSFER', vehicleId: vehicleB.id, originName: 'C', destinationName: 'D', status: 'DRAFT', notes: PREFIX },
  });

  await prisma.userDataScope.create({ data: { userId: userA.id, scopeType: 'VEHICLE', scopeId: vehicleA.id, accessLevel: 'MANAGE' } });
  await prisma.userDataScope.create({ data: { userId: userA.id, scopeType: 'DRIVER', scopeId: driverA.id, accessLevel: 'MANAGE' } });
  await prisma.userDataScope.create({ data: { userId: userA.id, scopeType: 'TRIP', scopeId: tripA.id, accessLevel: 'MANAGE' } });
  await prisma.userDataScope.create({ data: { userId: userB.id, scopeType: 'VEHICLE', scopeId: vehicleB.id, accessLevel: 'VIEW' } });

  const actorA = await getActorContext(userA.id);
  const actorB = await getActorContext(userB.id);
  const actorSA = await getActorContext(superAdmin.id);

  console.log('=== 1. Controller wiring: Trip update blocks out-of-scope vehicle ===');
  await expect403(async () => {
    assertCanUpdateResource(actorA, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id }));
    await assertCanChangeResourceScope(actorA, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id }), rec({ vehicleId: vehicleB.id }));
  }, 'Trip move A→B blocked');
  await expectSuccess(async () => {
    assertCanUpdateResource(actorA, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id }));
    await assertCanChangeResourceScope(actorA, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id }), rec({ vehicleId: vehicleA.id }));
  }, 'Trip stays on A ok');

  console.log('\n=== 2. Controller wiring: Fuel update blocks out-of-scope vehicle ===');
  const fuelA = await prisma.fuelEntry.create({
    data: { vehicleId: vehicleA.id, fuelDate: new Date(), fuelType: 'DIESEL', entryMode: 'QUICK_AMOUNT', totalAmount: 100, status: 'DRAFT', notes: PREFIX, createdById: userA.id },
  });
  await expect403(async () => {
    assertCanUpdateResource(actorA, 'FUEL_ENTRY', rec({ id: fuelA.id, vehicleId: vehicleA.id }));
    await assertCanChangeResourceScope(actorA, 'FUEL_ENTRY', rec({ id: fuelA.id, vehicleId: vehicleA.id }), rec({ vehicleId: vehicleB.id }));
  }, 'Fuel move A→B blocked');
  await expectSuccess(async () => {
    assertCanUpdateResource(actorA, 'FUEL_ENTRY', rec({ id: fuelA.id, vehicleId: vehicleA.id }));
    await assertCanChangeResourceScope(actorA, 'FUEL_ENTRY', rec({ id: fuelA.id, vehicleId: vehicleA.id }), rec({ vehicleId: vehicleA.id }));
  }, 'Fuel stays on A ok');

  console.log('\n=== 3. Controller wiring: Expense update blocks out-of-scope ===');
  const expA = await prisma.expense.create({
    data: { vehicleId: vehicleA.id, category: 'Fuel', expenseDate: new Date(), amount: 50, status: 'DRAFT', notes: PREFIX, createdById: userA.id },
  });
  await expect403(async () => {
    assertCanUpdateResource(actorA, 'EXPENSE', rec({ id: expA.id, vehicleId: vehicleA.id }));
    await assertCanChangeResourceScope(actorA, 'EXPENSE', rec({ id: expA.id, vehicleId: vehicleA.id }), rec({ vehicleId: vehicleB.id }));
  }, 'Expense move A→B blocked');
  await expect403(async () => {
    assertCanUpdateResource(actorA, 'EXPENSE', rec({ id: expA.id, vehicleId: vehicleA.id, tripId: tripA.id }));
    await assertCanChangeResourceScope(actorA, 'EXPENSE', rec({ id: expA.id, vehicleId: vehicleA.id, tripId: tripA.id }), rec({ tripId: tripB.id }));
  }, 'Expense trip move blocked');

  console.log('\n=== 4. Controller wiring: Vehicle update blocks identity change ===');
  await expect403(async () => {
    assertCanUpdateResource(actorA, 'VEHICLE', rec({ id: vehicleA.id }));
    await assertCanChangeResourceScope(actorA, 'VEHICLE', rec({ id: vehicleA.id }), rec({ vehicleId: vehicleB.id }));
  }, 'Vehicle identity change blocked');

  console.log('\n=== 5. Controller wiring: Driver update blocks identity change ===');
  await expect403(async () => {
    assertCanUpdateResource(actorA, 'DRIVER', rec({ id: driverA.id }));
    await assertCanChangeResourceScope(actorA, 'DRIVER', rec({ id: driverA.id }), rec({ driverId: driverB.id }));
  }, 'Driver identity change blocked');

  console.log('\n=== 6. VIEW scope cannot update ===');
  await expect403(async () => { assertCanUpdateResource(actorB, 'FUEL_ENTRY', rec({ id: fuelA.id, vehicleId: vehicleA.id })); }, 'B (VIEW) updates FuelA');
  await expect403(async () => { assertCanUpdateResource(actorB, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id })); }, 'B (VIEW) updates TripA');

  console.log('\n=== 7. VIEW scope cannot delete ===');
  await expect403(async () => { assertCanDeleteResource(actorB, 'FUEL_ENTRY', rec({ id: fuelA.id, vehicleId: vehicleA.id })); }, 'B (VIEW) deletes FuelA');

  console.log('\n=== 8. CREATE scope does NOT grant VIEW ===');
  const viewOnlyFuel = await prisma.fuelEntry.create({
    data: { vehicleId: vehicleB.id, fuelDate: new Date(), fuelType: 'DIESEL', entryMode: 'QUICK_AMOUNT', totalAmount: 200, status: 'DRAFT', notes: PREFIX, createdById: userB.id },
  });
  await expectSuccess(async () => { assertCanReadResource(actorB, 'FUEL_ENTRY', rec({ id: viewOnlyFuel.id, vehicleId: vehicleB.id })); }, 'B (VIEW) reads FuelB');
  await expect403(async () => { assertCanUpdateResource(actorB, 'FUEL_ENTRY', rec({ id: viewOnlyFuel.id, vehicleId: vehicleB.id })); }, 'B (VIEW) cannot update FuelB');

  console.log('\n=== 9. Owner bypass only for VIEW ===');
  await expectSuccess(async () => { assertCanReadResource(actorA, 'FUEL_ENTRY', rec({ id: fuelA.id, vehicleId: null, createdById: userA.id })); }, 'Owner reads own fuel');
  await expect403(async () => { assertCanUpdateResource(actorA, 'FUEL_ENTRY', rec({ id: fuelA.id, vehicleId: null, createdById: userA.id })); }, 'Owner cannot update without scope');
  await expect403(async () => { assertCanDeleteResource(actorA, 'FUEL_ENTRY', rec({ id: fuelA.id, vehicleId: null, createdById: userA.id })); }, 'Owner cannot delete without scope');

  console.log('\n=== 10. List filters respect VIEW level only ===');
  const createOnlyRole = await prisma.role.create({ data: { name: `${PREFIX}_CREATE_ONLY`, key: `${PREFIX.toLowerCase()}_createonly`, status: 'ACTIVE' } });
  const createPerm = await prisma.permission.findFirst({ where: { key: 'fuel_create' } });
  if (createPerm) await prisma.rolePermission.create({ data: { roleId: createOnlyRole.id, permissionId: createPerm.id } });
  const createOnlyUser = await prisma.user.create({
    data: { name: `${PREFIX}_CrOnly`, username: `${PREFIX.toLowerCase()}cronly`, email: `${PREFIX.toLowerCase()}cronly@test.local`, passwordHash: 'x', roleId: createOnlyRole.id, status: 'ACTIVE' },
  });
  await prisma.userDataScope.create({ data: { userId: createOnlyUser.id, scopeType: 'VEHICLE', scopeId: vehicleA.id, accessLevel: 'CREATE' } });
  const actorCreateOnly = await getActorContext(createOnlyUser.id);
  const whereCreateOnly = getScopedWhereForResource(actorCreateOnly, 'FUEL_ENTRY');
  const fuelForCreateOnly = await prisma.fuelEntry.findMany({ where: whereCreateOnly ? { AND: [whereCreateOnly, { notes: PREFIX }] } : { notes: PREFIX } });
  if (fuelForCreateOnly.length === 0) pass('CREATE-only scope excluded from list filter');
  else fail(`CREATE-only scope shows ${fuelForCreateOnly.length} records (should be 0)`);

  console.log('\n=== 11. Document linkedEntityId validation ===');
  const docA = await prisma.document.create({
    data: { title: `${PREFIX}-DA`, originalFileName: 'a.pdf', storedFileName: 'a.pdf', mimeType: 'application/pdf', fileSizeBytes: 100, storageKey: 'x', documentType: 'GENERAL', documentCategory: 'GENERAL', vehicleId: vehicleA.id, uploadedById: userA.id, description: PREFIX },
  });
  await expect403(async () => {
    assertCanUpdateResource(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id }));
    await assertCanChangeResourceScope(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id }), rec({ linkedEntityType: 'VEHICLE', linkedEntityId: vehicleB.id }));
  }, 'Doc linkedEntity to VehicleB blocked');
  await expect403(async () => {
    assertCanUpdateResource(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id }));
    await assertCanChangeResourceScope(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id }), rec({ linkedEntityType: 'TRIP', linkedEntityId: tripB.id }));
  }, 'Doc linkedEntity to TripB blocked');
  await expect403(async () => {
    assertCanUpdateResource(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id }));
    await assertCanChangeResourceScope(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id }), rec({ linkedEntityType: 'DRIVER', linkedEntityId: driverB.id }));
  }, 'Doc linkedEntity to DriverB blocked');
  await expect403(async () => {
    assertCanUpdateResource(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id }));
    await assertCanChangeResourceScope(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id }), rec({ linkedEntityType: 'UNKNOWN_TYPE', linkedEntityId: 'x' }));
  }, 'Doc linkedEntity unknown type blocked');
  await expectSuccess(async () => {
    assertCanUpdateResource(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id }));
    await assertCanChangeResourceScope(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id }), rec({ linkedEntityType: 'VEHICLE', linkedEntityId: vehicleA.id }));
  }, 'Doc linkedEntity to VehicleA ok');

  console.log('\n=== 11b. linkedEntityType-only change validation ===');
  await expect403(async () => {
    assertCanUpdateResource(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id, linkedEntityType: 'VEHICLE', linkedEntityId: vehicleA.id }));
    await assertCanChangeResourceScope(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id, linkedEntityType: 'VEHICLE', linkedEntityId: vehicleA.id }), rec({ linkedEntityType: 'TRIP' }));
  }, 'Doc linkedEntityType-only to TRIP blocked (no linkedEntityId)');
  await expect403(async () => {
    assertCanUpdateResource(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id, linkedEntityType: 'VEHICLE', linkedEntityId: vehicleA.id }));
    await assertCanChangeResourceScope(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id, linkedEntityType: 'VEHICLE', linkedEntityId: vehicleA.id }), rec({ linkedEntityType: 'UNKNOWN' }));
  }, 'Doc linkedEntityType-only to UNKNOWN blocked');
  await expect403(async () => {
    assertCanUpdateResource(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id, linkedEntityType: 'VEHICLE', linkedEntityId: vehicleA.id }));
    await assertCanChangeResourceScope(actorA, 'DOCUMENT', rec({ id: docA.id, vehicleId: vehicleA.id, linkedEntityType: 'VEHICLE', linkedEntityId: vehicleA.id }), rec({ linkedEntityType: 'TRIP', linkedEntityId: vehicleA.id }));
  }, 'Doc linkedEntityType to TRIP with Vehicle A id blocked');

  console.log('\n=== 12. super_admin global access ===');
  await expectSuccess(async () => { assertCanReadResource(actorSA, 'VEHICLE', rec({ id: vehicleA.id })); }, 'SA reads VehicleA');
  await expectSuccess(async () => { assertCanReadResource(actorSA, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id })); }, 'SA reads TripA');
  await expectSuccess(async () => { assertCanCreateResource(actorSA, 'FUEL_ENTRY', rec({ vehicleId: vehicleA.id })); }, 'SA creates Fuel');
  await expectSuccess(async () => { assertCanUpdateResource(actorSA, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id })); }, 'SA updates TripA');

  console.log('\n=== 13. Admin view permission allows module read without global mutation access ===');
  const adminRole = await prisma.role.findFirst({ where: { key: 'admin' } });
  if (adminRole) {
    const adminUser = await prisma.user.create({
      data: { name: `${PREFIX}_Adm`, username: `${PREFIX.toLowerCase()}adm`, email: `${PREFIX.toLowerCase()}adm@test.local`, passwordHash: 'x', roleId: adminRole.id, status: 'ACTIVE' },
    });
    const actorAdm = await getActorContext(adminUser.id);
    if (!actorAdm.isGlobalUser) pass('Admin without scope is NOT global');
    else fail('Admin incorrectly global');
    await expectSuccess(async () => { assertCanReadResource(actorAdm, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id })); }, 'Admin with trip_view reads TripA without explicit scope');
    await prisma.user.delete({ where: { id: adminUser.id } });
  }

  console.log('\n=== 14. Missing permission ===');
  const noPermRole = await prisma.role.create({ data: { name: `${PREFIX}_NOPERM`, key: `${PREFIX.toLowerCase()}_noperm`, status: 'ACTIVE' } });
  const noPermUser = await prisma.user.create({
    data: { name: `${PREFIX}_NoP`, username: `${PREFIX.toLowerCase()}nop`, email: `${PREFIX.toLowerCase()}nop@test.local`, passwordHash: 'x', roleId: noPermRole.id, status: 'ACTIVE' },
  });
  const actorNoPerm = await getActorContext(noPermUser.id);
  await expect403(async () => { assertCanReadResource(actorNoPerm, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id })); }, 'NoPerm reads TripA');
  await expect403(async () => { assertCanCreateResource(actorNoPerm, 'FUEL_ENTRY', rec({ vehicleId: vehicleA.id })); }, 'NoPerm creates Fuel');
  await prisma.user.delete({ where: { id: noPermUser.id } });
  await prisma.role.delete({ where: { id: noPermRole.id } });

  console.log('\n=== 15. View permissions allow reads while scopes continue to govern mutations ===');
  await expectSuccess(async () => { assertCanReadResource(actorA, 'VEHICLE', rec({ id: vehicleA.id })); }, 'A reads VehicleA');
  await expectSuccess(async () => { assertCanReadResource(actorA, 'VEHICLE', rec({ id: vehicleB.id })); }, 'A reads VehicleB with vehicle_view');
  await expectSuccess(async () => { assertCanReadResource(actorA, 'DRIVER', rec({ id: driverA.id })); }, 'A reads DriverA');
  await expectSuccess(async () => { assertCanReadResource(actorA, 'DRIVER', rec({ id: driverB.id })); }, 'A reads DriverB with driver_view');
  await expectSuccess(async () => { assertCanReadResource(actorA, 'TRIP', rec({ id: tripA.id, vehicleId: vehicleA.id })); }, 'A reads TripA');
  await expectSuccess(async () => { assertCanReadResource(actorA, 'TRIP', rec({ id: tripB.id, vehicleId: vehicleB.id })); }, 'A reads TripB with trip_view');

  const maintA = await prisma.maintenanceRequest.create({
    data: { vehicleId: vehicleA.id, requestDate: new Date(), category: 'Engine', description: PREFIX, status: 'DRAFT', notes: PREFIX, createdById: userA.id },
  });
  await expectSuccess(async () => { assertCanReadResource(actorA, 'MAINTENANCE', rec({ id: maintA.id, vehicleId: vehicleA.id })); }, 'A reads MaintA');

  const repA = await prisma.repair.create({
    data: { vehicleId: vehicleA.id, repairDate: new Date(), category: 'Engine', description: PREFIX, status: 'OPEN', notes: PREFIX, createdById: userA.id },
  });
  await expectSuccess(async () => { assertCanReadResource(actorA, 'REPAIR', rec({ id: repA.id, vehicleId: vehicleA.id })); }, 'A reads RepairA');

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
