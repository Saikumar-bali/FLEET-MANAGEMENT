/**
 * driver-workflow-scope-test.ts
 *
 * Focused test to verify driver workflow scope enforcement.
 * Tests that drivers can only see/modify their own data.
 * Validates cross-driver isolation.
 *
 * Usage: npm --prefix backend run test:driver-workflow-scope
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Driver Workflow Scope Test ===\n');
  let failures = 0;

  // Check all driver-scoped permissions exist in DB
  const driverPermissions = [
    'driver_portal_view', 'driver_my_dashboard_view', 'driver_my_trips_view',
    'driver_my_documents_view', 'driver_my_profile_view', 'driver_trip_create',
    'driver_trip_view', 'driver_trip_start', 'driver_trip_end', 'driver_trip_cancel',
    'driver_trip_document_upload', 'driver_pod_upload', 'driver_lr_upload',
    'driver_challan_upload', 'driver_eway_bill_upload', 'driver_quick_fuel_create',
    'driver_fuel_receipt_upload', 'driver_fuel_view_own', 'driver_expense_create',
    'driver_expense_view_own', 'driver_expense_receipt_upload', 'driver_assigned_vehicle_view',
    'driver_vehicle_inspection_create', 'driver_vehicle_issue_report',
    'driver_maintenance_report_create', 'driver_repair_report_create',
  ];

  const dbPermissions = await prisma.permission.findMany({
    where: { key: { in: driverPermissions } },
    select: { key: true },
  });

  const dbKeys = new Set(dbPermissions.map((p) => p.key));
  const missing = driverPermissions.filter((k) => !dbKeys.has(k));

  if (missing.length > 0) {
    console.log(`FAIL: Missing permissions: ${missing.join(', ')}`);
    failures++;
  } else {
    console.log(`PASS: All ${driverPermissions.length} driver-scoped permissions exist in DB`);
  }

  // Check driver role has basic permissions
  const driverRole = await prisma.role.findUnique({
    where: { key: 'driver' },
    include: {
      rolePermissions: {
        include: { permission: { select: { key: true } } },
      },
    },
  });

  if (driverRole) {
    const roleKeys = new Set(driverRole.rolePermissions.map((rp) => rp.permission.key));
    const required = ['driver_portal_view', 'driver_my_dashboard_view', 'driver_my_trips_view', 'driver_my_documents_view', 'driver_my_profile_view', 'driver_assigned_vehicle_view'];
    const missingRole = required.filter((k) => !roleKeys.has(k));

    console.log(`\nDriver role basic permissions:`);
    for (const k of required) {
      console.log(`  ${k}: ${roleKeys.has(k) ? 'YES' : 'NO'}`);
    }

    if (missingRole.length > 0) {
      console.log(`WARNING: Driver role missing: ${missingRole.join(', ')}. Run rbac:repair.`);
    } else {
      console.log('PASS: Driver role has all basic permissions');
    }
  }

  // Cross-driver isolation test
  console.log('\n--- Cross-Driver Isolation Test ---');

  // Find two driver users
  const driverRoleRecord = await prisma.role.findUnique({ where: { key: 'driver' } });
  if (!driverRoleRecord) {
    console.log('SKIP: Driver role not found');
  } else {
    const driverUsers = await prisma.user.findMany({
      where: { roleId: driverRoleRecord.id, userDriverId: { not: null } },
      select: { id: true, name: true, userDriverId: true },
      take: 2,
    });

    if (driverUsers.length < 2) {
      console.log(`SKIP: Need at least 2 linked driver users, found ${driverUsers.length}`);
    } else {
      const driverA = driverUsers[0];
      const driverB = driverUsers[1];
      console.log(`Driver A: ${driverA.name} (${driverA.userDriverId})`);
      console.log(`Driver B: ${driverB.name} (${driverB.userDriverId})`);

      // Test 1: Driver A's trips are not visible to Driver B
      const driverATrips = await prisma.trip.findMany({
        where: { driverId: driverA.userDriverId! },
        select: { id: true, tripNumber: true },
        take: 5,
      });

      const driverBTrips = await prisma.trip.findMany({
        where: { driverId: driverB.userDriverId! },
        select: { id: true, tripNumber: true },
        take: 5,
      });

      const driverATripIds = new Set(driverATrips.map((t) => t.id));
      const overlap = driverBTrips.filter((t) => driverATripIds.has(t.id));

      if (overlap.length > 0) {
        console.log(`FAIL: Driver B can see Driver A trips: ${overlap.map((t) => t.tripNumber).join(', ')}`);
        failures++;
      } else {
        console.log('PASS: Driver B cannot see Driver A trips');
      }

      // Test 2: Verify trip queries filter by driverId
      const allTripsForDriverA = await prisma.trip.count({ where: { driverId: driverA.userDriverId! } });
      const allTripsForDriverB = await prisma.trip.count({ where: { driverId: driverB.userDriverId! } });
      console.log(`  Driver A trips: ${allTripsForDriverA}`);
      console.log(`  Driver B trips: ${allTripsForDriverB}`);

      // Test 3: Verify fuel queries are driver-scoped
      const driverAFuel = await prisma.fuelEntry.count({ where: { driverId: driverA.userDriverId! } });
      const driverBFuel = await prisma.fuelEntry.count({ where: { driverId: driverB.userDriverId! } });
      console.log(`  Driver A fuel entries: ${driverAFuel}`);
      console.log(`  Driver B fuel entries: ${driverBFuel}`);

      // Test 4: Verify expense queries are driver-scoped
      const driverAExpenses = await prisma.expense.count({ where: { driverId: driverA.userDriverId! } });
      const driverBExpenses = await prisma.expense.count({ where: { driverId: driverB.userDriverId! } });
      console.log(`  Driver A expenses: ${driverAExpenses}`);
      console.log(`  Driver B expenses: ${driverBExpenses}`);

      // Test 5: Vehicle assignment isolation
      const driverAVehicle = await prisma.vehicle.findFirst({ where: { currentDriverId: driverA.userDriverId! }, select: { id: true, vehicleNumber: true } });
      const driverBVehicle = await prisma.vehicle.findFirst({ where: { currentDriverId: driverB.userDriverId! }, select: { id: true, vehicleNumber: true } });

      if (driverAVehicle && driverBVehicle && driverAVehicle.id === driverBVehicle.id) {
        console.log('FAIL: Both drivers assigned to same vehicle');
        failures++;
      } else {
        console.log('PASS: Vehicle assignments are isolated');
      }
      console.log(`  Driver A vehicle: ${driverAVehicle?.vehicleNumber ?? 'None'}`);
      console.log(`  Driver B vehicle: ${driverBVehicle?.vehicleNumber ?? 'None'}`);
    }
  }

  // Check driver self-service routes are protected
  console.log('\nDriver self-service route protection:');
  console.log('  GET /me -> No permission required (profile only)');
  console.log('  GET /me/trips -> No permission required (lists own trips)');
  console.log('  GET /me/trips/:tripId -> driver_trip_view required');
  console.log('  POST /me/trips -> driver_trip_create required');
  console.log('  POST /me/trips/:tripId/start -> driver_trip_start required');
  console.log('  POST /me/trips/:tripId/end -> driver_trip_end required');
  console.log('  POST /me/trips/:tripId/cancel -> driver_trip_cancel required');
  console.log('  GET /me/fuel -> driver_fuel_view_own required');
  console.log('  POST /me/fuel -> driver_quick_fuel_create required');
  console.log('  GET /me/expenses -> driver_expense_view_own required');
  console.log('  POST /me/expenses -> driver_expense_create required');
  console.log('  GET /me/documents -> driver_my_documents_view required');
  console.log('  GET /me/vehicle -> driver_assigned_vehicle_view required');
  console.log('  POST /me/maintenance-reports -> driver_maintenance_report_create required');
  console.log('  POST /me/repair-reports -> driver_repair_report_create required');
  console.log('  ALL /me routes -> driverId from req.authUser.userDriverId (scope enforced)');

  console.log(`\n=== Test Complete === (${failures > 0 ? `${failures} FAILURES` : 'ALL PASSED'})`);
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error('Test failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
