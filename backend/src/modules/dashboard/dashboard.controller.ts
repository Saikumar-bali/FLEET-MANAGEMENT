import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { DashboardService } from './dashboard.service';

const service = new DashboardService();

export async function getDashboardOverview(req: Request, res: Response) {
  // Reuse actor context from auth middleware (avoids re-querying DB)
  const actor = req.authActorContext!;
  const result = await service.getOverview(actor);
  return sendSuccess(res, result);
}
