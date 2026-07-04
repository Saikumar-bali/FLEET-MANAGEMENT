import type { Request } from 'express';
import { prisma } from '../../lib/prisma';
import { createNotification } from '../notifications/notifications.service';

type AuditInput = {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

async function emitAuditDrivenNotification(input: AuditInput) {
  if (input.action !== 'driver.trip.create') return;

  const tripNumber = typeof input.metadata?.tripNumber === 'string' ? input.metadata.tripNumber : 'new trip';
  await createNotification({
    title: 'Driver created trip',
    message: `Driver created trip ${tripNumber}.`,
    category: 'TRIP',
    severity: 'INFO',
    actionUrl: input.entityId ? `/trips/${input.entityId}` : '/trips',
    recipientPolicy: { type: 'GLOBAL', includeRoles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    createdById: input.userId ?? null,
  });
}

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

  await emitAuditDrivenNotification(input);
}
