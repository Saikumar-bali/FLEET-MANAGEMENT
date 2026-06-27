import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import {
  getMyTrips,
  getMyFuelEntries,
  getMyExpenses,
  getMyDocuments,
  getMyVehicle,
  createMyTrip,
} from './driver-self.service';

export async function getMyTripsController(req: Request, res: Response) {
  const result = await getMyTrips(req.authUser!.id, {
    status: req.query.status as string | undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  return sendSuccess(res, result);
}

export async function createMyTripController(req: Request, res: Response) {
  const result = await createMyTrip(req.authUser!, req.body);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'driver.trip.create',
    entityType: 'trip',
    entityId: result.id,
    metadata: { tripNumber: result.tripNumber, origin: req.body.originName, destination: req.body.destinationName },
  });

  return sendSuccess(res, result, 'Trip created successfully', 201);
}

export async function getMyFuelEntriesController(req: Request, res: Response) {
  const result = await getMyFuelEntries(req.authUser!.id, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  return sendSuccess(res, result);
}

export async function getMyExpensesController(req: Request, res: Response) {
  const result = await getMyExpenses(req.authUser!.id, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  return sendSuccess(res, result);
}

export async function getMyDocumentsController(req: Request, res: Response) {
  const result = await getMyDocuments(req.authUser!.id, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  return sendSuccess(res, result);
}

export async function getMyVehicleController(req: Request, res: Response) {
  const result = await getMyVehicle(req.authUser!.id);
  return sendSuccess(res, result);
}
