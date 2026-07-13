import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { getCurrentUser, login, logout, refreshSession } from './auth.service';
import { clearSessionCookies, readAuthCookie, REFRESH_TOKEN_COOKIE, setSessionCookies } from './auth.cookies';

export async function loginController(req: Request, res: Response) {
  const result = await login(req, req.body.identifier, req.body.password);
  setSessionCookies(res, result.accessToken, result.refreshToken);
  return sendSuccess(res, result, 'Login successful');
}

export async function logoutController(req: Request, res: Response) {
  const refreshToken = req.body.refreshToken ?? readAuthCookie(req, REFRESH_TOKEN_COOKIE);
  if (refreshToken) await logout(req, refreshToken);
  clearSessionCookies(res);
  return sendSuccess(res, null, 'Logout successful');
}

export async function meController(req: Request, res: Response) {
  const result = await getCurrentUser(req.authUser!.id, req.authPreloadedUser as any, req.authPermissions, req.authActorContext as any);
  return sendSuccess(res, result);
}

export async function refreshController(req: Request, res: Response) {
  const refreshToken = req.body.refreshToken ?? readAuthCookie(req, REFRESH_TOKEN_COOKIE);
  if (!refreshToken) {
    clearSessionCookies(res);
    return res.status(401).json({ success: false, message: 'Refresh token is required' });
  }
  const result = await refreshSession(req, refreshToken);
  setSessionCookies(res, result.accessToken, result.refreshToken);
  return sendSuccess(res, result, 'Session refreshed');
}
