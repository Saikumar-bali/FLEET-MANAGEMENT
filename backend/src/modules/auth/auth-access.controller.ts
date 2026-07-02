import { Request, Response } from 'express';
import { getEffectivePermissions } from '../access/effective-permissions.service';
import { sendSuccess } from '../../utils/response';

export async function effectivePermissionsController(req: Request, res: Response) {
  const userId = req.authUser!.id;
  const result = await getEffectivePermissions(userId);
  sendSuccess(res, result);
}
