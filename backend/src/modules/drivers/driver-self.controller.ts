import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import {
  getMyTrips, getMyTripById, createMyTrip,
  startMyTrip, endMyTrip, cancelMyTrip,
  getMyFuelEntries, createMyFuelEntry,
  getMyExpenses, createMyExpense,
  getMyDocuments, getMyVehicle,
  createMyMaintenanceReport, createMyRepairReport,
} from './driver-self.service';

export async function getMyTripsController(req: Request, res: Response) {
  const result = await getMyTrips(req.authUser!.id, {
    status: req.query.status as string | undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  return sendSuccess(res, result);
}

export async function getMyTripController(req: Request, res: Response) {
  const trip = await getMyTripById(req.authUser!.id, String(req.params.tripId));
  return sendSuccess(res, trip);
}

export async function createMyTripController(req: Request, res: Response) {
  const result = await createMyTrip(req.authUser!, req.body);
  await createAuditLog(req, {
    userId: req.authUser?.id, action: 'driver.trip.create',
    entityType: 'trip', entityId: result.id,
    metadata: { tripNumber: result.tripNumber, vehicleId: result.vehicleId },
  });
  return sendSuccess(res, result, 'Trip created', 201);
}

export async function startMyTripController(req: Request, res: Response) {
  const trip = await startMyTrip(req.authUser!.id, String(req.params.tripId));
  await createAuditLog(req, { userId: req.authUser?.id, action: 'driver.trip.start', entityType: 'trip', entityId: trip.id, metadata: { driverId: req.authUser?.userDriverId } });
  return sendSuccess(res, trip, 'Trip started');
}

export async function endMyTripController(req: Request, res: Response) {
  const trip = await endMyTrip(req.authUser!.id, String(req.params.tripId));
  await createAuditLog(req, { userId: req.authUser?.id, action: 'driver.trip.end', entityType: 'trip', entityId: trip.id, metadata: { driverId: req.authUser?.userDriverId } });
  return sendSuccess(res, trip, 'Trip completed');
}

export async function cancelMyTripController(req: Request, res: Response) {
  const trip = await cancelMyTrip(req.authUser!.id, String(req.params.tripId));
  await createAuditLog(req, { userId: req.authUser?.id, action: 'driver.trip.cancel', entityType: 'trip', entityId: trip.id, metadata: { driverId: req.authUser?.userDriverId } });
  return sendSuccess(res, trip, 'Trip cancelled');
}

export async function getMyFuelEntriesController(req: Request, res: Response) {
  const result = await getMyFuelEntries(req.authUser!.id, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  return sendSuccess(res, result);
}

export async function createMyFuelEntryController(req: Request, res: Response) {
  const result = await createMyFuelEntry(req.authUser!.id, req.body);
  await createAuditLog(req, { userId: req.authUser?.id, action: 'driver.fuel.create', entityType: 'fuel_entry', entityId: result.id, metadata: { driverId: req.authUser?.userDriverId, vehicleId: result.vehicleId } });
  return sendSuccess(res, result, 'Fuel entry created', 201);
}

export async function getMyExpensesController(req: Request, res: Response) {
  const result = await getMyExpenses(req.authUser!.id, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  return sendSuccess(res, result);
}

export async function createMyExpenseController(req: Request, res: Response) {
  const result = await createMyExpense(req.authUser!.id, req.body);
  await createAuditLog(req, { userId: req.authUser?.id, action: 'driver.expense.create', entityType: 'expense', entityId: result.id, metadata: { driverId: req.authUser?.userDriverId, vehicleId: result.vehicleId } });
  return sendSuccess(res, result, 'Expense created', 201);
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

export async function createMyMaintenanceReportController(req: Request, res: Response) {
  const result = await createMyMaintenanceReport(req.authUser!.id, req.body);
  await createAuditLog(req, { userId: req.authUser?.id, action: 'driver.maintenance.create', entityType: 'maintenance_request', entityId: result.id, metadata: { driverId: req.authUser?.userDriverId, vehicleId: result.vehicleId } });
  return sendSuccess(res, result, 'Maintenance request created', 201);
}

export async function createMyRepairReportController(req: Request, res: Response) {
  const result = await createMyRepairReport(req.authUser!.id, req.body);
  await createAuditLog(req, { userId: req.authUser?.id, action: 'driver.repair.create', entityType: 'repair', entityId: result.id, metadata: { driverId: req.authUser?.userDriverId, vehicleId: result.vehicleId } });
  return sendSuccess(res, result, 'Repair request created', 201);
}
