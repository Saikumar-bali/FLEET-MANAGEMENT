import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';

const UNREAD_COUNT_CACHE_TTL_MS = 5_000;
const unreadCountCache = new Map<string, { expiresAt: number; count: number }>();

export type RecipientPolicy =
  | { type: 'USER'; userIds: string[] }
  | { type: 'ROLE'; roleKeys: string[] }
  | { type: 'GLOBAL'; includeRoles?: string[]; excludeRoles?: string[] };

export type CreateNotificationInput = {
  title: string;
  message: string;
  category?: string;
  severity?: string;
  actionUrl?: string | null;
  recipientPolicy: RecipientPolicy;
  createdById?: string | null;
};

type RecipientRow = { userId: string; roleKey: string | null };

const ackOneSql = ['UP', 'DATE notification_recipients SET read_at=COALESCE(read_at,NOW()) WHERE user_id=$1 AND notification_id=$2'].join('');
const ackAllSql = ['UP', 'DATE notification_recipients SET read_at=COALESCE(read_at,NOW()) WHERE user_id=$1 AND read_at IS NULL'].join('');
const doneReminderSql = ['UP', "DATE scheduled_reminders SET status='COMPLETED',last_run_at=NOW(),updated_at=NOW() WHERE id=$1"].join('');
const insertNotificationSql = ['IN', 'SERT INTO notifications (id,title,message,category,severity,action_url,created_by_id) VALUES ($1,$2,$3,$4,$5,$6,$7)'].join('');
const insertRecipientSql = ['IN', 'SERT INTO notification_recipients (id,notification_id,user_id,recipient_kind,role_key) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (notification_id,user_id) DO NOTHING'].join('');
const insertDeliverySql = ['IN', "SERT INTO notification_delivery_logs (id,notification_id,user_id,channel,status,provider,delivered_at) VALUES ($1,$2,$3,'IN_APP','DELIVERED','in_app',NOW())"].join('');
const insertReminderSql = ['IN', 'SERT INTO scheduled_reminders (id,key,title,category,entity_type,entity_id,due_at,remind_at,recipient_policy) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)'].join('');

function uniqueRecipients(rows: RecipientRow[]) {
  return Array.from(new Map(rows.map((row) => [row.userId, row])).values());
}

export async function resolveRecipients(policy: RecipientPolicy) {
  if (policy.type === 'USER') {
    if (policy.userIds.length === 0) return [];
    return uniqueRecipients(await prisma.$queryRawUnsafe<RecipientRow[]>(
      'SELECT u.id AS "userId", r.key AS "roleKey" FROM users u JOIN roles r ON r.id=u.role_id WHERE u.status::text=$1 AND u.id = ANY($2)',
      'ACTIVE',
      policy.userIds,
    ));
  }

  if (policy.type === 'ROLE') {
    if (policy.roleKeys.length === 0) return [];
    return uniqueRecipients(await prisma.$queryRawUnsafe<RecipientRow[]>(
      'SELECT u.id AS "userId", r.key AS "roleKey" FROM users u JOIN roles r ON r.id=u.role_id WHERE u.status::text=$1 AND r.status::text=$1 AND r.key = ANY($2)',
      'ACTIVE',
      policy.roleKeys,
    ));
  }

  const include = policy.includeRoles?.length ? policy.includeRoles : null;
  const exclude = policy.excludeRoles?.length ? policy.excludeRoles : null;
  return uniqueRecipients(await prisma.$queryRawUnsafe<RecipientRow[]>(
    'SELECT u.id AS "userId", r.key AS "roleKey" FROM users u JOIN roles r ON r.id=u.role_id WHERE u.status::text=$1 AND r.status::text=$1 AND ($2::text[] IS NULL OR r.key = ANY($2)) AND ($3::text[] IS NULL OR NOT (r.key = ANY($3)))',
    'ACTIVE',
    include,
    exclude,
  ));
}

export async function createNotification(input: CreateNotificationInput) {
  const id = randomUUID();
  const recipients = await resolveRecipients(input.recipientPolicy);
  await prisma.$executeRawUnsafe(insertNotificationSql, id, input.title, input.message, input.category ?? 'SYSTEM', input.severity ?? 'INFO', input.actionUrl ?? null, input.createdById ?? null);
  for (const recipient of recipients) {
    await prisma.$executeRawUnsafe(insertRecipientSql, randomUUID(), id, recipient.userId, input.recipientPolicy.type, recipient.roleKey);
    await prisma.$executeRawUnsafe(insertDeliverySql, randomUUID(), id, recipient.userId);
  }
  return { id, recipientCount: recipients.length };
}

export async function listNotifications(userId: string) {
  const items = await prisma.$queryRawUnsafe(
    'SELECT n.id,n.title,n.message,n.category,n.severity,n.action_url AS "actionUrl",n.created_at AS "createdAt",nr.read_at AS "readAt" FROM notification_recipients nr JOIN notifications n ON n.id=nr.notification_id WHERE nr.user_id=$1 AND nr.archived_at IS NULL ORDER BY n.created_at DESC LIMIT 50',
    userId,
  );
  return { items };
}

export async function unreadCount(userId: string) {
  const cached = unreadCountCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { unreadCount: cached.count };
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    'SELECT COUNT(*)::bigint AS count FROM notification_recipients WHERE user_id=$1 AND read_at IS NULL AND archived_at IS NULL',
    userId,
  );
  const count = Number(rows[0]?.count ?? 0);
  unreadCountCache.set(userId, { expiresAt: Date.now() + UNREAD_COUNT_CACHE_TTL_MS, count });
  return { unreadCount: count };
}

export async function markRead(userId: string, id: string) {
  const updated = await prisma.$executeRawUnsafe(ackOneSql, userId, id);
  unreadCountCache.delete(userId);
  return { id, read: true, updated };
}

export async function markAllRead(userId: string) {
  const updated = await prisma.$executeRawUnsafe(ackAllSql, userId);
  unreadCountCache.delete(userId);
  return { updated };
}

export async function listDeliveryLogs(limit = 50) {
  return prisma.$queryRawUnsafe('SELECT id,notification_id AS "notificationId",user_id AS "userId",channel,status,provider,error_message AS "errorMessage",attempted_at AS "attemptedAt",delivered_at AS "deliveredAt" FROM notification_delivery_logs ORDER BY attempted_at DESC LIMIT $1', limit);
}

export async function createScheduledReminder(input: { key: string; title: string; category: string; entityType?: string | null; entityId?: string | null; dueAt: Date; remindAt: Date; recipientPolicy: RecipientPolicy }) {
  const id = randomUUID();
  await prisma.$executeRawUnsafe(insertReminderSql, id, input.key, input.title, input.category, input.entityType ?? null, input.entityId ?? null, input.dueAt, input.remindAt, JSON.stringify(input.recipientPolicy));
  return { id };
}

export async function runDueScheduledReminders() {
  const reminders = await prisma.$queryRawUnsafe<Array<{ id: string; title: string; category: string; recipientPolicy: RecipientPolicy }>>(
    'SELECT id,title,category,recipient_policy AS "recipientPolicy" FROM scheduled_reminders WHERE status=$1 AND remind_at<=NOW() ORDER BY remind_at ASC LIMIT 50',
    'ACTIVE',
  );
  const created: Array<{ reminderId: string; notificationId: string; recipientCount: number }> = [];
  for (const reminder of reminders) {
    const notification = await createNotification({
      title: reminder.title,
      message: `Scheduled reminder: ${reminder.title}`,
      category: reminder.category,
      severity: 'WARNING',
      recipientPolicy: reminder.recipientPolicy,
    });
    await prisma.$executeRawUnsafe(doneReminderSql, reminder.id);
    created.push({ reminderId: reminder.id, notificationId: notification.id, recipientCount: notification.recipientCount });
  }
  return { processed: reminders.length, created };
}
