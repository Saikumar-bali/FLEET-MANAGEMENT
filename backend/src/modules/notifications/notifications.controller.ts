import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { listNotifications, markAllRead, markRead, unreadCount } from './notifications.service';

export async function listNotificationsController(req: Request, res: Response) {
  const userId = req.authUser?.id ?? '';
  return sendSuccess(res, await listNotifications(userId));
}

export async function unreadCountController(req: Request, res: Response) {
  const userId = req.authUser?.id ?? '';
  return sendSuccess(res, await unreadCount(userId));
}

export async function markReadController(req: Request, res: Response) {
  const userId = req.authUser?.id ?? '';
  const notificationId = String(req.params.id ?? '');
  return sendSuccess(res, await markRead(userId, notificationId));
}

export async function markAllReadController(req: Request, res: Response) {
  const userId = req.authUser?.id ?? '';
  return sendSuccess(res, await markAllRead(userId));
}
