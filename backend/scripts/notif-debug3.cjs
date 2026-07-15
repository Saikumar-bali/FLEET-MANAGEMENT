const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  // Check if notification tables exist
  const tables = await p.$queryRawUnsafe(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%notif%'"
  );
  console.log('Notification tables:', tables);
  
  // Check notifications
  const notifs = await p.$queryRawUnsafe('SELECT id, title, message, category, severity, created_by_id AS "createdById", created_at AS "createdAt" FROM notifications ORDER BY created_at DESC LIMIT 5');
  console.log('\nNotifications:', notifs.length);
  for (const n of notifs) {
    console.log(`  ${n.title}: ${n.message?.substring(0, 80)}`);
  }
  
  // Check notification recipients for admin
  const adminId = 'cmrekcq4n0002u8qcmn87hwfq';
  const adminNotifs = await p.$queryRawUnsafe(
    'SELECT n.title, nr.read_at AS "readAt" FROM notification_recipients nr JOIN notifications n ON n.id=nr.notification_id WHERE nr.user_id=$1 ORDER BY n.created_at DESC LIMIT 10',
    adminId
  );
  console.log('\nAdmin notification recipients:', adminNotifs.length);
  for (const n of adminNotifs) {
    console.log(`  ${n.title} read=${n.readAt}`);
  }
  
  // Check driver notifications
  const driverId = 'cmrelztnz0005l204dv7g2bp8';
  const driverNotifs = await p.$queryRawUnsafe(
    'SELECT n.title, nr.read_at AS "readAt" FROM notification_recipients nr JOIN notifications n ON n.id=nr.notification_id WHERE nr.user_id=$1 ORDER BY n.created_at DESC LIMIT 10',
    driverId
  );
  console.log('\nDriver notification recipients:', driverNotifs.length);
  for (const n of driverNotifs) {
    console.log(`  ${n.title} read=${n.readAt}`);
  }
  
  await p.$disconnect();
}
main().catch(console.error);
