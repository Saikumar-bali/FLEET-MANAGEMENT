import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { getActorContext } from '../access/actor-context.service';
import { getScopedWhereForResource, assertCanReadResource, assertCanCreateResource, assertCanUpdateResource, assertCanDeleteResource, assertCanChangeResourceScope } from '../access/scoped-enforcement.service';
import type { ResourceType } from '../access/resource-scope-map';
import { syncAssignmentAfterSchedule } from './trip-assignment.service';
import {
  cancelTrip,
  completeTrip,
  createTrip,
  getTripHistory,
  getTripById,
  listTrips,
  scheduleTrip,
  startTrip,
  updateTrip,
} from './trips.service';

const RESOURCE: ResourceType = 'TRIP';

export async function listTripsController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const scopedWhere = getScopedWhereForResource(actor, RESOURCE);

  const result = await listTrips({
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    tripType: req.query.tripType as string | undefined,
    vehicleId: req.query.vehicleId as string | undefined,
    driverId: req.query.driverId as string | undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    extraWhere: scopedWhere as Record<string, unknown> | undefined,
  });
  return sendSuccess(res, result);
}

export async function getTripController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const trip = await getTripById(String(req.params.id));
  assertCanReadResource(actor, RESOURCE, trip as unknown as Record<string, unknown>);
  return sendSuccess(res, trip);
}

export async function createTripController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  assertCanCreateResource(actor, RESOURCE, req.body);

  const trip = await createTrip({
    ...req.body,
    createdById: req.authUser?.id,
  });

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'trip.create',
    entityType: 'trip',
    entityId: trip.id,
    metadata: { tripNumber: trip.tripNumber, tripType: trip.tripType },
  });

  return sendSuccess(res, trip, 'Trip created successfully', 201);
}

export async function updateTripController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getTripById(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);
  await assertCanChangeResourceScope(actor, RESOURCE, existing as unknown as Record<string, unknown>, req.body);

  const trip = await updateTrip(String(req.params.id), req.body, req.authUser?.id);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'trip.update',
    entityType: 'trip',
    entityId: trip.id,
    metadata: { tripNumber: trip.tripNumber },
  });

  return sendSuccess(res, trip, 'Trip updated successfully');
}

export async function scheduleTripController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getTripById(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);
  await assertCanChangeResourceScope(actor, RESOURCE, existing as unknown as Record<string, unknown>, req.body);

  const trip = await scheduleTrip(String(req.params.id), req.body, req.authUser?.id);
  const assignment = await syncAssignmentAfterSchedule(trip.id, req.authUser?.id);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'trip.schedule',
    entityType: 'trip',
    entityId: trip.id,
    metadata: { tripNumber: trip.tripNumber, assignmentId: assignment?.id ?? null },
  });

  return sendSuccess(res, { trip, assignment }, 'Trip scheduled successfully');
}

export async function startTripController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getTripById(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);

  const trip = await startTrip(String(req.params.id), req.body, req.authUser?.id);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'trip.start',
    entityType: 'trip',
    entityId: trip.id,
    metadata: { tripNumber: trip.tripNumber, startOdometer: req.body.startOdometer },
  });

  return sendSuccess(res, trip, 'Trip started successfully');
}

export async function completeTripController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getTripById(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);

  const trip = await completeTrip(String(req.params.id), req.body, req.authUser?.id);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'trip.complete',
    entityType: 'trip',
    entityId: trip.id,
    metadata: { tripNumber: trip.tripNumber, endOdometer: req.body.endOdometer, distanceKm: req.body.distanceKm },
  });

  return sendSuccess(res, trip, 'Trip completed successfully');
}

export async function cancelTripController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getTripById(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);

  const trip = await cancelTrip(String(req.params.id), req.body, req.authUser?.id);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'trip.cancel',
    entityType: 'trip',
    entityId: trip.id,
    metadata: { tripNumber: trip.tripNumber },
  });

  return sendSuccess(res, trip, 'Trip cancelled successfully');
}

export async function getTripHistoryController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const trip = await getTripById(String(req.params.id));
  assertCanReadResource(actor, RESOURCE, trip as unknown as Record<string, unknown>);

  const history = await getTripHistory(String(req.params.id));
  return sendSuccess(res, history);
}
