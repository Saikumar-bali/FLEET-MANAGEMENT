import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import {
  approveBilling,
  listPodBillingChain,
  rejectBilling,
  rejectPod,
  uploadTripPod,
  verifyPod,
} from './pod-billing.service';

export async function uploadTripPodController(req: Request, res: Response) {
  const result = await uploadTripPod(req, String(req.params.id), req.file, req.body as Record<string, unknown>);
  return sendSuccess(res, result, 'POD uploaded successfully', 201);
}

export async function listPodBillingChainController(req: Request, res: Response) {
  const result = await listPodBillingChain(req.query as Record<string, unknown>);
  return sendSuccess(res, result);
}

export async function verifyPodController(req: Request, res: Response) {
  const result = await verifyPod(req, String(req.params.id), req.body as Record<string, unknown>);
  return sendSuccess(res, result, 'POD verified and billing draft prepared');
}

export async function rejectPodController(req: Request, res: Response) {
  const result = await rejectPod(req, String(req.params.id), String(req.body.reason || ''));
  return sendSuccess(res, result, 'POD rejected');
}

export async function approveBillingController(req: Request, res: Response) {
  const result = await approveBilling(req, String(req.params.id), req.body.notes ? String(req.body.notes) : undefined);
  return sendSuccess(res, result, 'Billing approved');
}

export async function rejectBillingController(req: Request, res: Response) {
  const result = await rejectBilling(req, String(req.params.id), String(req.body.reason || ''));
  return sendSuccess(res, result, 'Billing rejected');
}
