import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { isDbInitialized } from '../../config/database';

export function getHealth(_req: Request, res: Response) {
  return sendSuccess(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: isDbInitialized() ? 'connected' : 'disconnected',
  });
}
