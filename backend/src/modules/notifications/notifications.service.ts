import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';

export type RecipientPolicy = { type: 'USER'; userIds: string[] } | { type: 'ROLE'; roleKeys: string[] } | { type: 'GLOBAL'; includeRoles?: string[]; excludeRoles?: string[] };

export async function resolveRecipients(policy: RecipientPolicy) {
  if (policy.type === 'USER') {
    if (policy.userIds.length === 0) return [];
    return prisma.$queryRaw<Array<{ userId: string; roleKey: string }>>(Prisma.sql`SELECT u.id AS "userId", r.key AS "roleKey" FROM users u JOIN roles r ON r.id = u.role_id WHERE u.status = 'ACTIVE' AND u.id IN (${Prisma.join(policy.userIds)})`);
  }
  const include = policy.type === 'ROLE' ? policy.roleKeys : policy.includeRoles;
  const exclude = policy.type === 'GLOBAL' ? policy.excludeRoles : undefined;
  const includeSql = include?.length ? Prisma.sql`AND r.key IN (${Prisma.join(include)})` : Prisma.empty;
  const excludeSql = exclude?.length ? Prisma.sql`AND r.key NOT IN (${Prisma.join(exclude)})` : Prisma.empty;
  return prisma.$queryRaw<Array<{ userId: string; roleKey: string }>>(Prisma.sql`SELECT u.id AS "userId", r.key AS "roleKey" FROM users u JOIN roles r ON r.id = u.role_id WHERE u.status = 'ACTIVE' AND r.status = 'ACTIVE' ${includeSql} ${excludeSql}`);
}

export async function createNotification(input: { title: string; message: string; category?: string; severity?: string; actionUrl?: string | null; recipientPolicy: RecipientPolicy; createdById?: string | null }) {
  const id = randomUUID();
  const recipients = await resolveRecipients(input.recipientPolicy);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`INSERT INTO notifications (id,title,message,category,severity,action_url,created_by_id) VALUES (${id},${input.title},${input.message},${input.category ?? 'SYSTEM'},${input.severity ?? 'INFO'},${input.actionUrl ?? null},${input.createdById ?? null})`);
    for (const r of recipients) {
      await tx.$executeRaw(Prisma.sql`INSERT INTO notification_recipients (id,notification_id,user_id,role_key) VALUES (${randomUUID()},${id},${r.userId},${r.roleKey}) ON CONFLICT (notification_id,user_id) DO NOTHING`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO notification_delivery_logs (id,notification_id,user_id,channel,status,provider,delivered_at) VALUES (${randomUUID()},${id},${r.userId},'IN_APP','DELIVERED','in_app',NOW())`);
    }
  });
  return { id, recipientCount: recipients.length };
}

export async function listNotifications(userId: string) {
  const items = await prisma.$queryRaw(Prisma.sql`SELECT n.id,n.title,n.message,n.category,n.severity,n.action_url AS "actionUrl",n.created_at AS "createdAt",nr.read_at AS "readAt" FROM notification_recipients nr JOIN notifications n ON n.id=nr.notification_id WHERE nr.user_id=${userId} AND nr.archived_at IS NULL ORDER BY n.created_at DESC LIMIT 50`);
  return { items };
}

export async function unreadCount(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS count FROM notification_recipients WHERE user_id=${userId} AND read_at IS NULL AND archived_at IS NULL`);
  return { unreadCount: Number(rows[0]?.count ?? 0) };
}

export async function markRead(userId: string, id: string) {
  await prisma.$executeRaw(Prisma.sql`UPDATE notification_recipients SET read_at=COALESCE(read_at,NOW()) WHERE user_id=${userId} AND notification_id=${id}`);
  return { id, read: true };
}

export async function markAllRead(userId: string) {
  const updated = await prisma.$executeRaw(Prisma.sql`UPDATE notification_recipients SET read_at=COALESCE(read_at,NOW()) WHERE user_id=${userId} AND read_at IS NULL`);
  return { updated };
}
