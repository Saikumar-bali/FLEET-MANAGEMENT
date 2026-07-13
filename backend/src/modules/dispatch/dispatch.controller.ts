import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { AppError } from '../../utils/appError';
import { prisma } from '../../lib/prisma';

import type { ActorContext } from '../access/actor-context.service';
import { can } from '../access/access-policy.service';
import { getScopedWhereForResource, assertCanReadResource, assertCanUpdateResource, assertCanChangeResourceScope } from '../access/scoped-enforcement.service';
import { getBoardData, checkConflicts, assignTrip, getRouteEstimate, getDispatchTargets } from './dispatch.service';

function assertPermission(actor: ActorContext, permission: string) {
  if (!can(actor, permission)) {
    throw new AppError(`Access denied: missing permission ${permission}`, 403);
  }
}

export async function getBoardController(req: Request, res: Response) {
  const actor = req.authActorContext!;
  assertPermission(actor, 'trip_view');
  assertPermission(actor, 'vehicle_view');
  assertPermission(actor, 'driver_view');

  const data = await getBoardData({
    tripWhere: getScopedWhereForResource(actor, 'TRIP') as any,
    vehicleWhere: getScopedWhereForResource(actor, 'VEHICLE') as any,
    driverWhere: getScopedWhereForResource(actor, 'DRIVER') as any,
  });
  return sendSuccess(res, data);
}

export async function checkConflictsController(req: Request, res: Response) {
  const actor = req.authActorContext!;
  assertPermission(actor, 'trip_view');

  const { tripId, driverId, vehicleId } = req.body;
  if (tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new AppError('Trip not found', 404);
    assertCanReadResource(actor, 'TRIP', trip as unknown as Record<string, unknown>);
  }
  if (driverId) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new AppError('Driver not found', 404);
    assertCanReadResource(actor, 'DRIVER', driver as unknown as Record<string, unknown>);
  }
  if (vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    assertCanReadResource(actor, 'VEHICLE', vehicle as unknown as Record<string, unknown>);
  }

  const result = await checkConflicts(req.body);
  return sendSuccess(res, result);
}

export async function assignTripController(req: Request, res: Response) {
  const actor = req.authActorContext!;
  const { tripId, driverId, vehicleId } = req.body;

  if (!tripId || !driverId || !vehicleId) {
    throw new AppError('tripId, driverId, and vehicleId are required', 400);
  }

  const targets = await getDispatchTargets(tripId, driverId, vehicleId);
  assertCanUpdateResource(actor, 'TRIP', targets.trip as unknown as Record<string, unknown>);
  assertCanUpdateResource(actor, 'DRIVER', targets.driver as unknown as Record<string, unknown>);
  assertCanUpdateResource(actor, 'VEHICLE', targets.vehicle as unknown as Record<string, unknown>);
  await assertCanChangeResourceScope(actor, 'TRIP', targets.trip as unknown as Record<string, unknown>, { driverId, vehicleId });

  const trip = await assignTrip(tripId, driverId, vehicleId, req.authUser!.id);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'dispatch.assign',
    entityType: 'trip',
    entityId: trip.id,
    metadata: { tripNumber: trip.tripNumber, driverId, vehicleId },
  });

  return sendSuccess(res, trip, 'Trip assigned successfully');
}

export async function getRouteEstimateController(req: Request, res: Response) {
  const actor = req.authActorContext!;
  assertPermission(actor, 'trip_view');

  const { origin, destination } = req.query as Record<string, string>;
  if (!origin || !destination) {
    return sendSuccess(res, { status: 'UNAVAILABLE', message: 'Origin and destination are required' });
  }
  const result = await getRouteEstimate(origin, destination);
  return sendSuccess(res, result);
}
