const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing notification tables...');
  
  // Check if tables exist
  try {
    const count = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM notifications`;
    console.log('notifications table:', count[0].count, 'rows');
  } catch (e) {
    console.log('notifications table ERROR:', e.message.substring(0, 200));
  }
  
  try {
    const count = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM notification_recipients`;
    console.log('notification_recipients table:', count[0].count, 'rows');
  } catch (e) {
    console.log('notification_recipients table ERROR:', e.message.substring(0, 200));
  }
  
  // Test the raw SQL used in createNotification
  try {
    const result = await prisma.$queryRawUnsafe(
      'SELECT u.id AS "userId", r.key AS "roleKey" FROM users u JOIN roles r ON r.id=u.role_id WHERE u.status::text=$1 AND r.status::text=$1 AND r.key = ANY($2)',
      'ACTIVE',
      ['admin', 'manager', 'finance'],
    );
    console.log('Recipient query result:', result.length, 'recipients');
    for (const r of result) {
      console.log(`  ${r.userId.substring(0,12)} (${r.roleKey})`);
    }
  } catch (e) {
    console.log('Recipient query ERROR:', e.message.substring(0, 200));
  }

  await prisma.$disconnect();
}

main().catch(console.error);
