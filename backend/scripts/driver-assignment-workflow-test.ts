import { randomUUID } from 'crypto';
import { prisma } from '../src/lib/prisma';
import { createTrip, scheduleTrip } from '../src/modules/trips/trips.service';
import { acceptTripAssignment, endAssignedTrip, reassignTripDriver, rejectTripAssignment, startAcceptedAssignedTrip, syncAssignmentAfterSchedule } from '../src/modules/trips/trip-assignment.service';

async function roleId(key: string) {
  const role = await prisma.role.findUnique({ where: { key } });
  if (!role) throw new Error(`Missing role ${key}`);
  return role.id;
}

async function makeDriver(label: string) {
  const stamp = randomUUID().slice(0, 8);
  const driver = await prisma.driver.create({
    data: { name: `CI Driver ${label} ${stamp}`, mobile: `7${Date.now().toString().slice(-9)}`, licenseNumber: `CI-DL-${label}-${stamp}` },
  });
  const user = await prisma.user.create({
    data: { name: `CI User ${label}`, email: `ci-driver-${label}-${stamp}@fleet.test`, username: `ci-driver-${label}-${stamp}`, passwordHash: 'test', roleId: await roleId('driver') },
  });
  await prisma.userProfileLink.create({ data: { userId: user.id, profileType: 'DRIVER', profileId: driver.id, isPrimary: true, status: 'ACTIVE' } });
  return { driver, user };
}

async function makeVehicle(label: string) {
  const stamp = randomUUID().slice(0, 8);
  return prisma.vehicle.create({ data: { vehicleNumber: `CI-ASSIGN-${label}-${stamp}`, vehicleType: 'TRUCK', fuelType: 'DIESEL' } });
}

async function assignmentStatus(tripId: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ status: string; driverId: string }>>(
    'SELECT status, driver_id AS "driverId" FROM trip_driver_assignments WHERE trip_id=$1 ORDER BY created_at DESC LIMIT 1',
    tripId,
  );
  return rows[0];
}

async function tripAlertLogCount() {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    'SELECT COUNT(*)::bigint AS count FROM notification_delivery_logs dl JOIN notifications n ON n.id=dl.notification_id WHERE n.category=$1',
    'TRIP',
  );
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  const manager = await prisma.user.findFirst({ where: { role: { key: { in: ['manager', 'admin', 'super_admin'] } } } });
  if (!manager) throw new Error('Missing manager/admin user');

  const beforeLogs = await tripAlertLogCount();
  const first = await makeDriver('A');
  const second = await makeDriver('B');
  const vehicle = await makeVehicle('A');
  const vehicle2 = await makeVehicle('B');

  const trip = await createTrip({ tripType: 'DELIVERY', vehicleId: vehicle.id, driverId: first.driver.id, originName: 'Depot', destinationName: 'Customer', createdById: manager.id });
  await scheduleTrip(trip.id, { plannedStartAt: new Date().toISOString(), driverId: first.driver.id }, manager.id);
  await syncAssignmentAfterSchedule(trip.id, manager.id);

  const pending = await assignmentStatus(trip.id);
  if (pending?.status !== 'PENDING') throw new Error('Assignment was not pending after schedule');

  await acceptTripAssignment({ tripId: trip.id, driverId: first.driver.id, userId: first.user.id, notes: 'Accepted in CI' });
  const accepted = await assignmentStatus(trip.id);
  if (accepted?.status !== 'ACCEPTED') throw new Error('Assignment was not accepted');

  const started = await startAcceptedAssignedTrip({ tripId: trip.id, driverId: first.driver.id, userId: first.user.id, startOdometer: 100 });
  if (started.status !== 'STARTED') throw new Error('Accepted assignment did not start trip');

  const completed = await endAssignedTrip({ tripId: trip.id, driverId: first.driver.id, userId: first.user.id, endOdometer: 150 });
  if (completed.status !== 'COMPLETED') throw new Error('Assigned trip did not complete');

  const trip2 = await createTrip({ tripType: 'DELIVERY', vehicleId: vehicle2.id, driverId: first.driver.id, originName: 'Depot', destinationName: 'Customer B', createdById: manager.id });
  await scheduleTrip(trip2.id, { plannedStartAt: new Date().toISOString(), driverId: first.driver.id }, manager.id);
  await syncAssignmentAfterSchedule(trip2.id, manager.id);
  await reassignTripDriver({ tripId: trip2.id, driverId: second.driver.id, assignedById: manager.id, notes: 'CI reassign' });
  const reassigned = await assignmentStatus(trip2.id);
  if (reassigned?.status !== 'PENDING' || reassigned.driverId !== second.driver.id) throw new Error('Reassign did not create new pending assignment');

  const rejectedTrip = await rejectTripAssignment({ tripId: trip2.id, driverId: second.driver.id, userId: second.user.id, notes: 'Rejected in CI' });
  if (rejectedTrip.driverId !== null) throw new Error('Rejected trip still has a driver assigned');
  const rejected = await assignmentStatus(trip2.id);
  if (rejected?.status !== 'REJECTED') throw new Error('Assignment was not rejected');

  const afterLogs = await tripAlertLogCount();
  if (afterLogs <= beforeLogs) throw new Error('Trip assignment workflow did not create alert delivery logs');

  console.log('Driver assignment workflow test passed');
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
