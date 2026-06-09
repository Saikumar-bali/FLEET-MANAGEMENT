import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { listPermissions } from './permissions.service';

export async function listPermissionsController(_req: Request, res: Response) {
  const permissions = await listPermissions();
  return sendSuccess(res, permissions);
}
