import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import {
  getMyTrips,
  getMyFuelEntries,
  getMyExpenses,
  getMyDocuments,
  getMyVehicle,
} from './driver-self.service';

export async function getMyTripsController(req: Request, res: Response) {
  const result = await getMyTrips(req.authUser!.id, {
    status: req.query.status as string | undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  return sendSuccess(res, result);
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
