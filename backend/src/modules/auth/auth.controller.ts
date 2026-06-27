import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { getCurrentUser, login, logout, refreshSession } from './auth.service';
import { getEffectivePermissions } from '../permissions/effective-permissions.service';

export async function loginController(req: Request, res: Response) {
  const result = await login(req, req.body.identifier, req.body.password);
  return sendSuccess(res, result, 'Login successful');
}

export async function logoutController(req: Request, res: Response) {
  await logout(req, req.body.refreshToken);
  return sendSuccess(res, null, 'Logout successful');
}

export async function meController(req: Request, res: Response) {
  const result = await getCurrentUser(req.authUser!.id);
  return sendSuccess(res, result);
}

export async function refreshController(req: Request, res: Response) {
  const result = await refreshSession(req, req.body.refreshToken);
  return sendSuccess(res, result, 'Session refreshed');
}

export async function effectivePermissionsController(req: Request, res: Response) {
  const result = await getEffectivePermissions(req.authUser!.id);
  return sendSuccess(res, result);
}
