import { PrismaClient } from '@prisma/client';
import { getActorContext } from '../src/modules/access/actor-context.service';
import {
  assertCanReadResource,
  assertCanCreateResource,
  assertCanUpdateResource,
  assertCanDeleteResource,
  getScopedWhereForResource,
} from '../src/modules/access/scoped-enforcement.service';
import { RESOURCE_MAP } from '../src/modules/access/resource-scope-map';
import { prisma } from '../src/lib/prisma';

const PREFIX = 'PHASE_MODULE_SCOPE_TEST';

function log(msg: string) { console.log(`  ${msg}`); }
function pass(msg: string) { console.log(`  PASS ${msg}`); }
function fail(msg: string) { console.log(`  FAIL ${msg}`); process.exitCode = 1; }

function makeRecord(fields: Record<string, unknown>) {
  return fields as Record<string, unknown>;
}

async function cleanup() {
  console.log('\n=== Cleanup ===');

  const prefix = `${PREFIX}%`;

  await prisma.fuelEntry.deleteMany({ where: { notes: { contains: PREFIX } } });
  await prisma.expense.deleteMany({ where: { notes: { contains: PREFIX } } });
  await prisma.trip.deleteMany({ where: { notes: { contains: PREFIX } } });
  await prisma.document.deleteMany({ where: { description: { contains: PREFIX } } });

  const testUsers = await prisma.user.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true },
  });
  for (const u of testUsers) {
    await prisma.userPermissionOverride.deleteMany({ where: { userId: u.id } });
    await prisma.userDataScope.deleteMany({ where: { userId: u.id } });
  }
  await prisma.user.deleteMany({ where: { name: { startsWith: PREFIX } } });

  const testVehicles = await prisma.vehicle.findMany({
    where: { vehicleNumber: { startsWith: PREFIX } },
    select: { id: true },
  });
  for (const v of testVehicles) {
    await prisma.trip.deleteMany({ where: { vehicleId: v.id } });
    await prisma.fuelEntry.deleteMany({ where: { vehicleId: v.id } });
    await prisma.expense.deleteMany({ where: { vehicleId: v.id } });
    await prisma.document.deleteMany({ where: { vehicleId: v.id } });
  }
  await prisma.vehicle.deleteMany({ where: { vehicleNumber: { startsWith: PREFIX } } });

  const testDrivers = await prisma.driver.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true },
  });
  await prisma.driver.deleteMany({ where: { name: { startsWith: PREFIX } } });

  pass('Cleanup complete');
}

async function main() {
  console.log('=== Module-Level Scope Enforcement Test ===\n');

  await cleanup();

  console.log('1. Creating test resources...');

  const superAdmin = await prisma.user.findFirst({
    where: { role: { key: 'super_admin' } },
    select: { id: true, name: true, role: true },
  });
  if (!superAdmin) { fail('No super_admin found'); return; }
  pass(`super_admin: ${superAdmin.name} (${superAdmin.id})`);

  const driverRole = await prisma.role.findFirst({ where: { key: 'driver' } });
  if (!driverRole) { fail('Driver role not found'); return; }

  const userA = await prisma.user.create({
    data: {
      name: `${PREFIX}_UserA`, username: `${PREFIX.toLowerCase()}a`, email: `${PREFIX.toLowerCase()}a@test.local`,
      passwordHash: 'hashed', roleId: driverRole.id, status: 'ACTIVE',
    },
  });
  pass(`UserA: ${userA.id}`);

  const userB = await prisma.user.create({
    data: {
      name: `${PREFIX}_UserB`, username: `${PREFIX.toLowerCase()}b`, email: `${PREFIX.toLowerCase()}b@test.local`,
      passwordHash: 'hashed', roleId: driverRole.id, status: 'ACTIVE',
    },
  });
  pass(`UserB: ${userB.id}`);

  const vehicleA = await prisma.vehicle.create({
    data: { vehicleNumber: `${PREFIX}-VEH-A`, vehicleType: 'TRUCK', fuelType: 'DIESEL' },
  });
  const vehicleB = await prisma.vehicle.create({
    data: { vehicleNumber: `${PREFIX}-VEH-B`, vehicleType: 'TRUCK', fuelType: 'DIESEL' },
  });
  pass(`VehicleA: ${vehicleA.id}, VehicleB: ${vehicleB.id}`);

  const tripA = await prisma.trip.create({
    data: {
      tripNumber: `${PREFIX}-TRIP-A-001`, tripType: 'TRANSFER', vehicleId: vehicleA.id,
      originName: 'City A', destinationName: 'City B', status: 'DRAFT',
      notes: PREFIX,
    },
  });
  const tripB = await prisma.trip.create({
    data: {
      tripNumber: `${PREFIX}-TRIP-B-001`, tripType: 'TRANSFER', vehicleId: vehicleB.id,
      originName: 'City C', destinationName: 'City D', status: 'DRAFT',
      notes: PREFIX,
    },
  });
  pass(`TripA: ${tripA.id}, TripB: ${tripB.id}`);

  console.log('\n2. Granting permissions and scopes...');

  const perms = ['trip_view', 'vehicle_view', 'fuel_view', 'expense_view', 'document_view'];
  for (const p of perms) {
    const perm = await prisma.permission.findFirst({ where: { key: p } });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: driverRole.id, permissionId: perm.id } },
        create: { roleId: driverRole.id, permissionId: perm.id },
        update: {},
      });
    }
  }
  pass('Role permissions granted');

  await prisma.userDataScope.create({
    data: { userId: userA.id, scopeType: 'VEHICLE', scopeId: vehicleA.id, accessLevel: 'VIEW' },
  });
  await prisma.userDataScope.create({
    data: { userId: userA.id, scopeType: 'TRIP', scopeId: tripA.id, accessLevel: 'VIEW' },
  });

  await prisma.userDataScope.create({
    data: { userId: userB.id, scopeType: 'VEHICLE', scopeId: vehicleB.id, accessLevel: 'VIEW' },
  });
  await prisma.userDataScope.create({
    data: { userId: userB.id, scopeType: 'TRIP', scopeId: tripB.id, accessLevel: 'VIEW' },
  });

  await prisma.userDataScope.create({
    data: { userId: userA.id, scopeType: 'DRIVER', scopeId: userA.id, accessLevel: 'VIEW' },
  });
  await prisma.userDataScope.create({
    data: { userId: userB.id, scopeType: 'DRIVER', scopeId: userB.id, accessLevel: 'VIEW' },
  });

  pass('Scopes granted');

  console.log('\n3. Testing scoped access...');

  const actorA = await getActorContext(userA.id);
  const actorB = await getActorContext(userB.id);
  const actorAdmin = await getActorContext(superAdmin.id);

  const whereA_trip = getScopedWhereForResource(actorA, 'TRIP');
  const whereB_trip = getScopedWhereForResource(actorB, 'TRIP');

  console.log('\n  --- Trip list filtering ---');
  const tripsA = await prisma.trip.findMany({ where: whereA_trip ? { AND: [whereA_trip, { notes: PREFIX }] } : { notes: PREFIX } });
  const tripsB = await prisma.trip.findMany({ where: whereB_trip ? { AND: [whereB_trip, { notes: PREFIX }] } : { notes: PREFIX } });

  if (tripsA.length === 1 && tripsA[0].id === tripA.id) {
    pass('UserA sees only TripA');
  } else {
    fail(`UserA sees ${tripsA.length} trips (expected 1: TripA). Found: ${tripsA.map(t => t.id).join(', ')}`);
  }

  if (tripsB.length === 1 && tripsB[0].id === tripB.id) {
    pass('UserB sees only TripB');
  } else {
    fail(`UserB sees ${tripsB.length} trips (expected 1: TripB). Found: ${tripsB.map(t => t.id).join(', ')}`);
  }

  console.log('\n  --- Record-level access (cross-account denial) ---');
  try {
    assertCanReadResource(actorA, 'TRIP', makeRecord({ id: tripB.id, vehicleId: vehicleB.id, createdById: null }));
    fail('UserA should NOT be able to read TripB');
  } catch (e: any) {
    if (e.statusCode === 403) pass('UserA denied access to TripB (403)');
    else fail(`UserA got unexpected error: ${e.message}`);
  }

  try {
    assertCanReadResource(actorB, 'TRIP', makeRecord({ id: tripA.id, vehicleId: vehicleA.id, createdById: null }));
    fail('UserB should NOT be able to read TripA');
  } catch (e: any) {
    if (e.statusCode === 403) pass('UserB denied access to TripA (403)');
    else fail(`UserB got unexpected error: ${e.message}`);
  }

  console.log('\n  --- super_admin global access ---');
  try {
    assertCanReadResource(actorAdmin, 'TRIP', makeRecord({ id: tripA.id, vehicleId: vehicleA.id, createdById: null }));
    assertCanReadResource(actorAdmin, 'TRIP', makeRecord({ id: tripB.id, vehicleId: vehicleB.id, createdById: null }));
    pass('super_admin can read both trips');
  } catch (e: any) {
    fail(`super_admin denied: ${e.message}`);
  }

  console.log('\n  --- Create-time scope validation ---');
  try {
    assertCanCreateResource(actorA, 'FUEL_ENTRY', makeRecord({ vehicleId: vehicleB.id }));
    fail('UserA should NOT create fuel for vehicleB');
  } catch (e: any) {
    if (e.statusCode === 403) pass('UserA denied creating fuel for vehicleB (403)');
    else fail(`UserA create fuel got unexpected: ${e.message}`);
  }

  try {
    assertCanCreateResource(actorA, 'FUEL_ENTRY', makeRecord({ vehicleId: vehicleA.id }));
    pass('UserA can create fuel for vehicleA');
  } catch (e: any) {
    fail(`UserA create fuel for vehicleA denied: ${e.message}`);
  }

  console.log('\n  --- admin not automatically global ---');
  const adminRole = await prisma.role.findFirst({ where: { key: 'admin' } });
  if (adminRole) {
    const adminUser = await prisma.user.create({
      data: {
        name: `${PREFIX}_Admin`, username: `${PREFIX.toLowerCase()}admin`, email: `${PREFIX.toLowerCase()}admin@test.local`,
        passwordHash: 'hashed', roleId: adminRole.id, status: 'ACTIVE',
      },
    });
    const actorAdminTest = await getActorContext(adminUser.id);
    if (!actorAdminTest.isGlobalUser) {
      pass('Admin without GLOBAL scope is NOT global');
    } else {
      fail('Admin is incorrectly global');
    }

    try {
      assertCanReadResource(actorAdminTest, 'TRIP', makeRecord({ id: tripA.id, vehicleId: vehicleA.id, createdById: null }));
      fail('Admin without scope should NOT read trips');
    } catch (e: any) {
      if (e.statusCode === 403) pass('Admin without scope denied (403)');
      else fail(`Admin got unexpected: ${e.message}`);
    }

    await prisma.user.delete({ where: { id: adminUser.id } });
  }

  console.log('\n  --- Permission check (missing permission) ---');
  const userNoPerms = await prisma.user.create({
    data: {
      name: `${PREFIX}_NoPerms`, username: `${PREFIX.toLowerCase()}noperms`, email: `${PREFIX.toLowerCase()}noperms@test.local`,
      passwordHash: 'hashed', roleId: driverRole.id, status: 'ACTIVE',
    },
  });
  const actorNoPerms = await getActorContext(userNoPerms.id);

  try {
    assertCanReadResource(actorNoPerms, 'TRIP', makeRecord({ id: tripA.id, vehicleId: vehicleA.id, createdById: null }));
    fail('User without trip_view should NOT read trips');
  } catch (e: any) {
    if (e.statusCode === 403) pass('User without trip_view denied (403)');
    else fail(`User without perms got unexpected: ${e.message}`);
  }

  await prisma.user.delete({ where: { id: userNoPerms.id } });

  console.log('\n  --- Fuel list filtering ---');
  const fuelA = await prisma.fuelEntry.create({
    data: {
      vehicleId: vehicleA.id, fuelDate: new Date(), fuelType: 'DIESEL', entryMode: 'QUICK_AMOUNT',
      totalAmount: 100, status: 'DRAFT', notes: PREFIX, createdById: userA.id,
    },
  });
  const fuelB = await prisma.fuelEntry.create({
    data: {
      vehicleId: vehicleB.id, fuelDate: new Date(), fuelType: 'DIESEL', entryMode: 'QUICK_AMOUNT',
      totalAmount: 200, status: 'DRAFT', notes: PREFIX, createdById: userB.id,
    },
  });

  const whereA_fuel = getScopedWhereForResource(actorA, 'FUEL_ENTRY');
  const whereB_fuel = getScopedWhereForResource(actorB, 'FUEL_ENTRY');

  const fuelsA = await prisma.fuelEntry.findMany({ where: whereA_fuel ? { AND: [whereA_fuel, { notes: PREFIX }] } : { notes: PREFIX } });
  const fuelsB = await prisma.fuelEntry.findMany({ where: whereB_fuel ? { AND: [whereB_fuel, { notes: PREFIX }] } : { notes: PREFIX } });

  if (fuelsA.length === 1 && fuelsA[0].id === fuelA.id) {
    pass('UserA sees only FuelA');
  } else {
    fail(`UserA sees ${fuelsA.length} fuel entries (expected 1: FuelA)`);
  }

  if (fuelsB.length === 1 && fuelsB[0].id === fuelB.id) {
    pass('UserB sees only FuelB');
  } else {
    fail(`UserB sees ${fuelsB.length} fuel entries (expected 1: FuelB)`);
  }

  console.log('\n  --- Expense list filtering ---');
  const expenseA = await prisma.expense.create({
    data: {
      vehicleId: vehicleA.id, category: 'Fuel', expenseDate: new Date(), amount: 50,
      status: 'DRAFT', notes: PREFIX, createdById: userA.id,
    },
  });
  const expenseB = await prisma.expense.create({
    data: {
      vehicleId: vehicleB.id, category: 'Fuel', expenseDate: new Date(), amount: 75,
      status: 'DRAFT', notes: PREFIX, createdById: userB.id,
    },
  });

  const whereA_exp = getScopedWhereForResource(actorA, 'EXPENSE');
  const whereB_exp = getScopedWhereForResource(actorB, 'EXPENSE');

  const expA = await prisma.expense.findMany({ where: whereA_exp ? { AND: [whereA_exp, { notes: PREFIX }] } : { notes: PREFIX } });
  const expB = await prisma.expense.findMany({ where: whereB_exp ? { AND: [whereB_exp, { notes: PREFIX }] } : { notes: PREFIX } });

  if (expA.length === 1 && expA[0].id === expenseA.id) {
    pass('UserA sees only ExpenseA');
  } else {
    fail(`UserA sees ${expA.length} expenses (expected 1: ExpenseA)`);
  }

  if (expB.length === 1 && expB[0].id === expenseB.id) {
    pass('UserB sees only ExpenseB');
  } else {
    fail(`UserB sees ${expB.length} expenses (expected 1: ExpenseB)`);
  }

  console.log('\n  --- Vehicle list filtering ---');
  const whereA_veh = getScopedWhereForResource(actorA, 'VEHICLE');
  const whereB_veh = getScopedWhereForResource(actorB, 'VEHICLE');

  const vehsA = await prisma.vehicle.findMany({ where: whereA_veh ? { AND: [whereA_veh, { vehicleNumber: { startsWith: PREFIX } }] } : { vehicleNumber: { startsWith: PREFIX } } });
  const vehsB = await prisma.vehicle.findMany({ where: whereB_veh ? { AND: [whereB_veh, { vehicleNumber: { startsWith: PREFIX } }] } : { vehicleNumber: { startsWith: PREFIX } } });

  if (vehsA.length === 1 && vehsA[0].id === vehicleA.id) {
    pass('UserA sees only VehicleA');
  } else {
    fail(`UserA sees ${vehsA.length} vehicles (expected 1: VehicleA)`);
  }

  if (vehsB.length === 1 && vehsB[0].id === vehicleB.id) {
    pass('UserB sees only VehicleB');
  } else {
    fail(`UserB sees ${vehsB.length} vehicles (expected 1: VehicleB)`);
  }

  await cleanup();

  console.log('\n=== All module scope tests passed ===');
}

main().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
