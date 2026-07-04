import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { getBoardData, checkConflicts, assignTrip, getRouteEstimate } from './dispatch.service';

export async function getBoardController(req: Request, res: Response) {
  const data = await getBoardData();
  return sendSuccess(res, data);
}

export async function checkConflictsController(req: Request, res: Response) {
  const result = await checkConflicts(req.body);
  return sendSuccess(res, result);
}

export async function assignTripController(req: Request, res: Response) {
  const { tripId, driverId, vehicleId } = req.body;
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
  const { origin, destination } = req.query as Record<string, string>;
  if (!origin || !destination) {
    return sendSuccess(res, { status: 'UNAVAILABLE', message: 'Origin and destination are required' });
  }
  const result = await getRouteEstimate(origin, destination);
  return sendSuccess(res, result);
}
