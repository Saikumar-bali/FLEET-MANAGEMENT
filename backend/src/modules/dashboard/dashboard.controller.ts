import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { DashboardService } from './dashboard.service';

const service = new DashboardService();

export async function getDashboardOverview(_req: Request, res: Response) {
  const result = await service.getOverview();
  return sendSuccess(res, result);
}
