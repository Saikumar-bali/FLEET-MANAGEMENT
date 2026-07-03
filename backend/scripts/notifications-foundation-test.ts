import { randomUUID } from 'crypto';
import { prisma } from '../src/lib/prisma';
import { createNotification, createScheduledReminder, listDeliveryLogs, listNotifications, markAllRead, markRead, resolveRecipients, runDueScheduledReminders, unreadCount } from '../src/modules/notifications/notifications.service';

async function main() {
  const users = await prisma.$queryRawUnsafe<Array<{ id: string; roleKey: string }>>(
    'SELECT u.id,r.key AS "roleKey" FROM users u JOIN roles r ON r.id=u.role_id WHERE u.status=$1 ORDER BY u.created_at ASC LIMIT 5',
    'ACTIVE',
  );

  if (users.length === 0) {
    throw new Error('No active users available for notification test');
  }

  const firstUser = users[0];
  const roleKey = firstUser.roleKey;
  const globalRecipients = await resolveRecipients({ type: 'GLOBAL' });
  if (globalRecipients.length === 0) throw new Error('Global recipient resolver returned no users');

  const roleRecipients = await resolveRecipients({ type: 'ROLE', roleKeys: [roleKey] });
  if (!roleRecipients.some((recipient) => recipient.userId === firstUser.id)) {
    throw new Error('Role recipient resolver did not include expected user');
  }

  const individualRecipients = await resolveRecipients({ type: 'USER', userIds: [firstUser.id] });
  if (individualRecipients.length !== 1) throw new Error('Individual recipient resolver failed');

  const notification = await createNotification({
    title: `CI Alert ${randomUUID()}`,
    message: 'Alerts foundation integration test notification',
    category: 'SYSTEM',
    severity: 'INFO',
    recipientPolicy: { type: 'USER', userIds: [firstUser.id] },
  });

  if (notification.recipientCount !== 1) throw new Error('Notification recipient count mismatch');

  const before = await unreadCount(firstUser.id);
  if (before.unreadCount < 1) throw new Error('Unread count did not increase');

  const inbox = await listNotifications(firstUser.id);
  const found = (inbox.items as Array<{ id: string }>).some((item) => item.id === notification.id);
  if (!found) throw new Error('Notification not found in inbox');

  await markRead(firstUser.id, notification.id);
  const afterOne = await unreadCount(firstUser.id);
  if (afterOne.unreadCount >= before.unreadCount) throw new Error('Mark read did not reduce unread count');

  await markAllRead(firstUser.id);

  const reminder = await createScheduledReminder({
    key: `ci-alert-${randomUUID()}`,
    title: 'CI scheduled alert',
    category: 'SYSTEM',
    dueAt: new Date(),
    remindAt: new Date(Date.now() - 1000),
    recipientPolicy: { type: 'USER', userIds: [firstUser.id] },
  });

  const run = await runDueScheduledReminders();
  if (!run.created.some((created) => created.reminderId === reminder.id)) {
    throw new Error('Due reminder did not create notification');
  }

  const logs = await listDeliveryLogs(25) as Array<{ notificationId: string }>;
  if (logs.length === 0) throw new Error('Delivery log was not written');

  console.log('Notifications foundation test passed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
