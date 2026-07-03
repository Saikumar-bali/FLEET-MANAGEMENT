import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { getDriverIdForUser } from '../user-profile-links/user-profile-links.service';
import { AppError } from '../../utils/appError';
import {
  acceptTripAssignment,
  endAssignedTrip,
  reassignTripDriver,
  rejectTripAssignment,
  startAcceptedAssignedTrip,
  syncAssignmentAfterSchedule,
} from './trip-assignment.service';

async function requireLinkedDriverId(userId: string) {
  const driverId = await getDriverIdForUser(userId);
  if (!driverId) throw new AppError('No linked driver profile found', 404);
  return driverId;
}

export async function createAssignmentAfterScheduleController(req: Request, res: Response) {
  const assignment = await syncAssignmentAfterSchedule(String(req.params.id), req.authUser?.id);
  return sendSuccess(res, assignment, 'Trip assignment synced');
}

export async function reassignTripDriverController(req: Request, res: Response) {
  const trip = await reassignTripDriver({
    tripId: String(req.params.id),
    driverId: String(req.body.driverId),
    assignedById: req.authUser?.id,
    notes: req.body.notes ?? null,
  });
  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'trip.reassign_driver',
    entityType: 'trip',
    entityId: trip.id,
    metadata: { tripNumber: trip.tripNumber, driverId: req.body.driverId },
  });
  return sendSuccess(res, trip, 'Trip reassigned successfully');
}

export async function driverAcceptTripAssignmentController(req: Request, res: Response) {
  const driverId = await requireLinkedDriverId(req.authUser!.id);
  const trip = await acceptTripAssignment({
    tripId: String(req.params.id),
    driverId,
    userId: req.authUser?.id,
    notes: req.body?.notes ?? null,
  });
  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'driver.trip_assignment.accept',
    entityType: 'trip',
    entityId: trip.id,
    metadata: { driverId },
  });
  return sendSuccess(res, trip, 'Trip assignment accepted');
}

export async function driverRejectTripAssignmentController(req: Request, res: Response) {
  const driverId = await requireLinkedDriverId(req.authUser!.id);
  const trip = await rejectTripAssignment({
    tripId: String(req.params.id),
    driverId,
    userId: req.authUser?.id,
    notes: req.body?.notes ?? null,
  });
  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'driver.trip_assignment.reject',
    entityType: 'trip',
    entityId: trip.id,
    metadata: { driverId },
  });
  return sendSuccess(res, trip, 'Trip assignment rejected');
}

export async function driverStartAssignedTripController(req: Request, res: Response) {
  const driverId = await requireLinkedDriverId(req.authUser!.id);
  const trip = await startAcceptedAssignedTrip({
    tripId: String(req.params.id),
    driverId,
    userId: req.authUser?.id,
    startOdometer: req.body?.startOdometer,
    notes: req.body?.notes ?? null,
  });
  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'driver.assigned_trip.start',
    entityType: 'trip',
    entityId: trip.id,
    metadata: { driverId, startOdometer: req.body?.startOdometer },
  });
  return sendSuccess(res, trip, 'Trip started');
}

export async function driverEndAssignedTripController(req: Request, res: Response) {
  const driverId = await requireLinkedDriverId(req.authUser!.id);
  const trip = await endAssignedTrip({
    tripId: String(req.params.id),
    driverId,
    userId: req.authUser?.id,
    endOdometer: req.body?.endOdometer,
    distanceKm: req.body?.distanceKm,
    notes: req.body?.notes ?? null,
  });
  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'driver.assigned_trip.end',
    entityType: 'trip',
    entityId: trip.id,
    metadata: { driverId, endOdometer: req.body?.endOdometer, distanceKm: req.body?.distanceKm },
  });
  return sendSuccess(res, trip, 'Trip completed');
}
