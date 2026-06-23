import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import * as complianceService from './vehicle-compliance.service';

export async function getRegistrationController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.getRegistration(String(req.params.vehicleId)));
}

export async function upsertRegistrationController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.upsertRegistration(String(req.params.vehicleId), req.body, req.authUser?.id));
}

export async function listInsuranceController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.listInsurance(String(req.params.vehicleId)));
}

export async function getInsuranceController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.getInsurance(String(req.params.id)));
}

export async function createInsuranceController(req: Request, res: Response) {
  const item = await complianceService.createInsurance(String(req.params.vehicleId), req.body, req.authUser?.id);
  return sendSuccess(res, item, 'Insurance created successfully', 201);
}

export async function updateInsuranceController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.updateInsurance(String(req.params.id), req.body, req.authUser?.id));
}

export async function listPermitsController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.listPermits(String(req.params.vehicleId)));
}

export async function getPermitController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.getPermit(String(req.params.id)));
}

export async function createPermitController(req: Request, res: Response) {
  const item = await complianceService.createPermit(String(req.params.vehicleId), req.body, req.authUser?.id);
  return sendSuccess(res, item, 'Permit created successfully', 201);
}

export async function updatePermitController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.updatePermit(String(req.params.id), req.body, req.authUser?.id));
}

export async function listFitnessController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.listFitness(String(req.params.vehicleId)));
}

export async function getFitnessController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.getFitness(String(req.params.id)));
}

export async function createFitnessController(req: Request, res: Response) {
  const item = await complianceService.createFitness(String(req.params.vehicleId), req.body, req.authUser?.id);
  return sendSuccess(res, item, 'Fitness certificate created successfully', 201);
}

export async function updateFitnessController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.updateFitness(String(req.params.id), req.body, req.authUser?.id));
}

export async function listPucController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.listPuc(String(req.params.vehicleId)));
}

export async function getPucController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.getPuc(String(req.params.id)));
}

export async function createPucController(req: Request, res: Response) {
  const item = await complianceService.createPuc(String(req.params.vehicleId), req.body, req.authUser?.id);
  return sendSuccess(res, item, 'PUC certificate created successfully', 201);
}

export async function updatePucController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.updatePuc(String(req.params.id), req.body, req.authUser?.id));
}

export async function listRoadTaxController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.listRoadTax(String(req.params.vehicleId)));
}

export async function getRoadTaxController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.getRoadTax(String(req.params.id)));
}

export async function createRoadTaxController(req: Request, res: Response) {
  const item = await complianceService.createRoadTax(String(req.params.vehicleId), req.body, req.authUser?.id);
  return sendSuccess(res, item, 'Road tax record created successfully', 201);
}

export async function updateRoadTaxController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.updateRoadTax(String(req.params.id), req.body, req.authUser?.id));
}

export async function getFastagController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.getFastag(String(req.params.vehicleId)));
}

export async function upsertFastagController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.upsertFastag(String(req.params.vehicleId), req.body, req.authUser?.id));
}

export async function getGpsDeviceController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.getGpsDevice(String(req.params.vehicleId)));
}

export async function upsertGpsDeviceController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.upsertGpsDevice(String(req.params.vehicleId), req.body, req.authUser?.id));
}

export async function listComplianceDocumentsController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.listComplianceDocuments({ ...req.query, page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20 }));
}

export async function getComplianceDocumentController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.getComplianceDocument(String(req.params.id)));
}

export async function createComplianceDocumentController(req: Request, res: Response) {
  const item = await complianceService.createComplianceDocument(String(req.params.vehicleId), req.body, req.authUser?.id);
  return sendSuccess(res, item, 'Compliance document created successfully', 201);
}

export async function updateComplianceDocumentController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.updateComplianceDocument(String(req.params.id), req.body, req.authUser?.id));
}

export async function verifyComplianceDocumentController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.verifyComplianceDocument(String(req.params.id), req.body.status, req.body.notes, req.authUser!.id));
}

export async function renewComplianceDocumentController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.renewComplianceDocument(String(req.params.id), req.body, req.authUser!.id));
}

export async function listComplianceHistoryController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.listComplianceHistory(String(req.params.vehicleId), { ...req.query, page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20 }));
}

export async function getComplianceDashboardController(_req: Request, res: Response) {
  return sendSuccess(res, await complianceService.getComplianceDashboard());
}

export async function listExpiringSoonController(req: Request, res: Response) {
  return sendSuccess(res, await complianceService.listExpiringSoon(Number(req.query.days) || 30));
}

export async function listExpiredController(_req: Request, res: Response) {
  return sendSuccess(res, await complianceService.listExpired());
}
