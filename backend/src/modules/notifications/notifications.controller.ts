import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createNotification, listNotifications, markAllRead, markRead, resolveRecipients, unreadCount } from './notifications.service';

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

export async function createNotificationController(req: Request, res: Response) {
  sendSuccess(res, await createNotification({ ...req.body, createdById: req.authUser!.id }), 'Notification created', 201);
}

export async function testResolverController(req: Request, res: Response) {
  sendSuccess(res, { recipients: await resolveRecipients(req.body.recipientPolicy) });
}
