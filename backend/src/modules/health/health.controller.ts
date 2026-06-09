import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { checkDatabaseConnection } from '../../config/database';

export async function getHealth(_req: Request, res: Response) {
  const databaseConnected = await checkDatabaseConnection();

  return sendSuccess(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: databaseConnected ? 'connected' : 'disconnected',
  });
}
