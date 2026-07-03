import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { listNotifications, markAllRead, markRead, unreadCount } from './notifications.service';

export async function listNotificationsController(req: Request, res: Response) {
  sendSuccess(res, await listNotifications(req.authUser!.id));
}

export async function unreadCountController(req: Request, res: Response) {
  sendSuccess(res, await unreadCount(req.authUser!.id));
}

export async function markReadController(req: Request, res: Response) {
  sendSuccess(res, await markRead(req.authUser!.id, req.params.id));
}

export async function markAllReadController(req: Request, res: Response) {
  sendSuccess(res, await markAllRead(req.authUser!.id));
}
