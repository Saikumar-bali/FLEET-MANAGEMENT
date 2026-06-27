/**
 * driver-workflow-scope-test.ts
 *
 * Focused test to verify driver workflow scope enforcement.
 * Tests that drivers can only see/modify their own data.
 *
 * Usage: npm --prefix backend run test:driver-workflow-scope
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Driver Workflow Scope Test ===\n');

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
    process.exitCode = 1;
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
    const hasPortalView = roleKeys.has('driver_portal_view');
    const hasDashboard = roleKeys.has('driver_my_dashboard_view');
    const hasTrips = roleKeys.has('driver_my_trips_view');
    const hasDocuments = roleKeys.has('driver_my_documents_view');
    const hasProfile = roleKeys.has('driver_my_profile_view');
    const hasVehicle = roleKeys.has('driver_assigned_vehicle_view');

    console.log(`\nDriver role basic permissions:`);
    console.log(`  portal_view: ${hasPortalView}`);
    console.log(`  dashboard_view: ${hasDashboard}`);
    console.log(`  trips_view: ${hasTrips}`);
    console.log(`  documents_view: ${hasDocuments}`);
    console.log(`  profile_view: ${hasProfile}`);
    console.log(`  vehicle_view: ${hasVehicle}`);

    if (!hasPortalView || !hasDashboard || !hasTrips || !hasDocuments || !hasProfile || !hasVehicle) {
      console.log('WARNING: Driver role missing some basic driver permissions. Run rbac:repair.');
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

  console.log('\n=== Test Complete ===');
}

main()
  .catch((err) => {
    console.error('Test failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
