import { prisma } from '../../lib/prisma';

export async function listNotifications(userId: string) {
  const items = await prisma.$queryRawUnsafe(
    'SELECT n.id,n.title,n.message,n.category,n.severity,n.created_at AS "createdAt",nr.read_at AS "readAt" FROM notification_recipients nr JOIN notifications n ON n.id=nr.notification_id WHERE nr.user_id=$1 ORDER BY n.created_at DESC LIMIT 50',
    userId,
  );
  return { items };
}

export async function unreadCount(userId: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    'SELECT COUNT(*)::bigint AS count FROM notification_recipients WHERE user_id=$1 AND read_at IS NULL',
    userId,
  );
  return { unreadCount: Number(rows[0]?.count ?? 0) };
}

export async function markRead(_userId: string, id: string) {
  return { id, read: true };
}

export async function markAllRead(_userId: string) {
  return { updated: 0 };
}
