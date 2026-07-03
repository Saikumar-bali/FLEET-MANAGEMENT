import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { getActorContext } from '../access/actor-context.service';
import { DashboardService } from './dashboard.service';

const service = new DashboardService();

export async function getDashboardOverview(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const result = await service.getOverview(actor);
  return sendSuccess(res, result);
}
