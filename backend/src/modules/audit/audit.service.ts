import type { Request } from 'express';
import { prisma } from '../../lib/prisma';

type AuditInput = {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createAuditLog(req: Request | null, input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
    },
  });
}
