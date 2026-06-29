import { prisma } from '../../lib/prisma';

type AccessActivityInput = {
  actorId: string;
  action: string;
  targetUserId: string;
  details?: Record<string, unknown>;
};

export async function recordAccessActivity(input: AccessActivityInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.actorId,
      action: input.action,
      entityType: 'user_permission_override',
      entityId: input.targetUserId,
      metadata: input.details ? JSON.parse(JSON.stringify(input.details)) : undefined,
    },
  });
}
