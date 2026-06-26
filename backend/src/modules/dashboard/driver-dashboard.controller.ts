import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { getDriverDashboard } from './driver-dashboard.service';

export async function getDriverDashboardController(req: Request, res: Response) {
  const result = await getDriverDashboard({
    userDriverId: req.authUser?.userDriverId ?? undefined,
    queryDriverId: req.query.driverId as string | undefined,
    roleKey: req.authUser?.role?.key ?? '',
  });
  return sendSuccess(res, result);
}
