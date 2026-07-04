import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { createNotification } from '../notifications/notifications.service';
import { completeTrip, getTripById, startTrip } from './trips.service';

type AssignmentRow = {
  id: string;
  tripId: string;
  driverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REASSIGNED' | 'CANCELLED';
};

async function linkedUserIdsForDriver(driverId: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ userId: string }>>(
    'SELECT user_id AS "userId" FROM user_profile_links WHERE profile_type::text=$1 AND profile_id=$2 AND status::text=$3',
    'DRIVER',
    driverId,
    'ACTIVE',
  );
  return rows.map((row) => row.userId);
}

async function notifyDriver(driverId: string, title: string, message: string, actionUrl?: string | null) {
  const userIds = await linkedUserIdsForDriver(driverId);
  if (userIds.length === 0) return { skipped: true };
  return createNotification({
    title,
    message,
    category: 'TRIP',
    severity: 'INFO',
    actionUrl,
    recipientPolicy: { type: 'USER', userIds },
  });
}

async function notifyOps(title: string, message: string, actionUrl?: string | null) {
  return createNotification({
    title,
    message,
    category: 'TRIP',
    severity: 'INFO',
    actionUrl,
    recipientPolicy: { type: 'GLOBAL', includeRoles: ['super_admin', 'admin', 'manager', 'supervisor'] },
  });
}

async function openAssignment(tripId: string) {
  const rows = await prisma.$queryRawUnsafe<AssignmentRow[]>(
    'SELECT id, trip_id AS "tripId", driver_id AS "driverId", status FROM trip_driver_assignments WHERE trip_id=$1 AND status IN ($2,$3) ORDER BY created_at DESC LIMIT 1',
    tripId,
    'PENDING',
    'ACCEPTED',
  );
  return rows[0] ?? null;
}

async function pendingAssignmentForDriver(tripId: string, driverId: string) {
  const rows = await prisma.$queryRawUnsafe<AssignmentRow[]>(
    'SELECT id, trip_id AS "tripId", driver_id AS "driverId", status FROM trip_driver_assignments WHERE trip_id=$1 AND driver_id=$2 AND status=$3 ORDER BY created_at DESC LIMIT 1',
    tripId,
    driverId,
    'PENDING',
  );
  return rows[0] ?? null;
}

export async function createPendingDriverAssignment(input: { tripId: string; driverId: string; assignedById?: string | null; reassignedFromId?: string | null; message?: string }) {
  const trip = await getTripById(input.tripId);
  if (trip.driverId !== input.driverId) {
    throw new AppError('Trip driver must match assignment driver', 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      'UPDATE trip_driver_assignments SET status=$1, updated_at=NOW() WHERE trip_id=$2 AND status IN ($3,$4)',
      input.reassignedFromId ? 'REASSIGNED' : 'CANCELLED',
      input.tripId,
      'PENDING',
      'ACCEPTED',
    );
    await tx.$executeRawUnsafe(
      'INSERT INTO trip_driver_assignments (id,trip_id,driver_id,assigned_by_id,status,reassigned_from_id) VALUES ($1,$2,$3,$4,$5,$6)',
      randomUUID(),
      input.tripId,
      input.driverId,
      input.assignedById ?? null,
      'PENDING',
      input.reassignedFromId ?? null,
    );
  });

  await notifyDriver(
    input.driverId,
    'Trip assigned',
    input.message ?? `Trip ${trip.tripNumber} has been assigned to you.`,
    `/driver-portal/trips`,
  );
  return openAssignment(input.tripId);
}

export async function syncAssignmentAfterSchedule(tripId: string, assignedById?: string | null) {
  const trip = await getTripById(tripId);
  if (!trip.driverId) return null;
  return createPendingDriverAssignment({ tripId, driverId: trip.driverId, assignedById });
}

export async function reassignTripDriver(input: { tripId: string; driverId: string; assignedById?: string | null; notes?: string | null }) {
  const trip = await getTripById(input.tripId);
  if (trip.status === 'STARTED' || trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
    throw new AppError('Only draft or scheduled trips can be reassigned', 400);
  }
  if (trip.driverId === input.driverId) {
    throw new AppError('Trip is already assigned to this driver', 400);
  }
  const driver = await prisma.driver.findUnique({ where: { id: input.driverId } });
  if (!driver) throw new AppError('Driver not found', 404);

  const previous = await openAssignment(input.tripId);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      'UPDATE trip_driver_assignments SET status=$1, updated_at=NOW() WHERE trip_id=$2 AND status IN ($3,$4)',
      'REASSIGNED',
      input.tripId,
      'PENDING',
      'ACCEPTED',
    );
    const t = await tx.trip.update({
      where: { id: input.tripId },
      data: { driverId: input.driverId, notes: input.notes ?? trip.notes },
      include: { vehicle: true, driver: true, assistantDriver: true, createdBy: true },
    });
    await tx.tripHistory.create({
      data: {
        tripId: input.tripId,
        action: 'DRIVER_CHANGED',
        fromStatus: trip.status,
        toStatus: trip.status,
        remarks: 'Trip reassigned to another driver',
        metadata: { fromDriverId: trip.driverId, toDriverId: input.driverId } as any,
        createdById: input.assignedById ?? null,
      },
    });
    await tx.$executeRawUnsafe(
      'INSERT INTO trip_driver_assignments (id,trip_id,driver_id,assigned_by_id,status,reassigned_from_id,response_notes) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      randomUUID(),
      input.tripId,
      input.driverId,
      input.assignedById ?? null,
      'PENDING',
      previous?.id ?? null,
      input.notes ?? null,
    );
    return t;
  });

  await notifyDriver(input.driverId, 'Trip reassigned to you', `Trip ${updated.tripNumber} has been reassigned to you.`, '/driver-portal/trips');
  await notifyOps('Trip reassigned', `Trip ${updated.tripNumber} was reassigned to ${driver.name}.`, `/trips/${updated.id}`);
  return updated;
}

export async function acceptTripAssignment(input: { tripId: string; driverId: string; userId?: string | null; notes?: string | null }) {
  const trip = await getTripById(input.tripId);
  if (trip.driverId !== input.driverId) throw new AppError('Trip is not assigned to your driver profile', 403);
  const assignment = await pendingAssignmentForDriver(input.tripId, input.driverId);
  if (!assignment) throw new AppError('No pending assignment found for this trip', 400);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      'UPDATE trip_driver_assignments SET status=$1, responded_at=NOW(), response_notes=$2, updated_at=NOW() WHERE id=$3',
      'ACCEPTED',
      input.notes ?? null,
      assignment.id,
    );
    await tx.tripHistory.create({
      data: {
        tripId: input.tripId,
        action: 'UPDATED',
        fromStatus: trip.status,
        toStatus: trip.status,
        remarks: 'Driver accepted trip assignment',
        metadata: { driverId: input.driverId, assignmentId: assignment.id } as any,
        createdById: input.userId ?? null,
      },
    });
  });

  await notifyOps('Trip assignment accepted', `Driver accepted trip ${trip.tripNumber}.`, `/trips/${trip.id}`);
  return getTripById(input.tripId);
}

export async function rejectTripAssignment(input: { tripId: string; driverId: string; userId?: string | null; notes?: string | null }) {
  const trip = await getTripById(input.tripId);
  if (trip.driverId !== input.driverId) throw new AppError('Trip is not assigned to your driver profile', 403);
  const assignment = await pendingAssignmentForDriver(input.tripId, input.driverId);
  if (!assignment) throw new AppError('No pending assignment found for this trip', 400);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      'UPDATE trip_driver_assignments SET status=$1, responded_at=NOW(), response_notes=$2, updated_at=NOW() WHERE id=$3',
      'REJECTED',
      input.notes ?? null,
      assignment.id,
    );
    const t = await tx.trip.update({ where: { id: input.tripId }, data: { driverId: null }, include: { vehicle: true, driver: true, assistantDriver: true, createdBy: true } });
    await tx.tripHistory.create({
      data: {
        tripId: input.tripId,
        action: 'DRIVER_CHANGED',
        fromStatus: trip.status,
        toStatus: trip.status,
        remarks: 'Driver rejected trip assignment',
        metadata: { driverId: input.driverId, assignmentId: assignment.id, notes: input.notes ?? null } as any,
        createdById: input.userId ?? null,
      },
    });
    return t;
  });

  await notifyOps('Trip assignment rejected', `Driver rejected trip ${trip.tripNumber}. Reassignment is required.`, `/trips/${trip.id}`);
  return updated;
}

export async function startAcceptedAssignedTrip(input: { tripId: string; driverId: string; userId?: string | null; startOdometer?: number; notes?: string | null }) {
  const assignment = await openAssignment(input.tripId);
  if (!assignment || assignment.driverId !== input.driverId || assignment.status !== 'ACCEPTED') {
    throw new AppError('Driver must accept this assignment before starting the trip', 400);
  }
  const trip = await startTrip(input.tripId, { startOdometer: input.startOdometer, notes: input.notes }, input.userId);
  await notifyOps('Trip started', `Driver started trip ${trip.tripNumber}.`, `/trips/${trip.id}`);
  return trip;
}

export async function endAssignedTrip(input: { tripId: string; driverId: string; userId?: string | null; endOdometer?: number; distanceKm?: number; notes?: string | null }) {
  const tripBefore = await getTripById(input.tripId);
  if (tripBefore.driverId !== input.driverId) throw new AppError('Trip is not assigned to your driver profile', 403);
  const trip = await completeTrip(input.tripId, { endOdometer: input.endOdometer, distanceKm: input.distanceKm, notes: input.notes }, input.userId);
  await notifyOps('Trip completed', `Driver completed trip ${trip.tripNumber}.`, `/trips/${trip.id}`);
  return trip;
}
