import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { sendSuccess } from '../../utils/response';

export async function getUserActivityController(req: Request, res: Response) {
  const targetUserId = req.params.id as string;

  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { userId: targetUserId },
        { entityId: targetUserId },
        {
          metadata: {
            string_contains: `"targetUserId":"${targetUserId}"`,
          },
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  sendSuccess(res, logs);
}
