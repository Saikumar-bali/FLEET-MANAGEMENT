const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  // Test resolveRecipients query
  const adminId = 'cmrekcq4n0002u8qcmn87hwfq';
  
  // Test USER policy
  const userRecipients = await p.$queryRawUnsafe(
    'SELECT u.id AS "userId", r.key AS "roleKey" FROM users u JOIN roles r ON r.id=u.role_id WHERE u.status::text=$1 AND u.id = ANY($2)',
    'ACTIVE',
    [adminId]
  );
  console.log('USER policy recipients:', userRecipients.length);
  
  // Test ROLE policy  
  const roleRecipients = await p.$queryRawUnsafe(
    'SELECT u.id AS "userId", r.key AS "roleKey" FROM users u JOIN roles r ON r.id=u.role_id WHERE u.status::text=$1 AND r.status::text=$1 AND r.key = ANY($2)',
    'ACTIVE',
    ['super_admin', 'admin', 'finance']
  );
  console.log('ROLE policy recipients:', roleRecipients.length);
  for (const r of roleRecipients) {
    console.log(`  ${r.userId} role=${r.roleKey}`);
  }
  
  // Check: does admin user have status ACTIVE?
  const adminUser = await p.$queryRawUnsafe(
    'SELECT id, username, status, role_id FROM users WHERE username=$1',
    'admin'
  );
  console.log('\nAdmin user:', adminUser);
  
  // Check: does admin role have status ACTIVE?
  const adminRole = await p.$queryRawUnsafe(
    "SELECT id, name, key, status FROM roles WHERE key='super_admin'"
  );
  console.log('Admin role:', adminRole);
  
  // Try creating a notification directly
  const { randomUUID } = require('crypto');
  const notifId = randomUUID();
  try {
    await p.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'INSERT INTO notifications (id,title,message,category,severity,created_by_id) VALUES ($1,$2,$3,$4,$5,$6)',
        notifId, 'Test Notification', 'Testing direct insert', 'SYSTEM', 'INFO', adminId
      );
      for (const r of roleRecipients) {
        await tx.$executeRawUnsafe(
          'INSERT INTO notification_recipients (id,notification_id,user_id,recipient_kind,role_key) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (notification_id,user_id) DO NOTHING',
          randomUUID(), notifId, r.userId, 'ROLE', r.roleKey
        );
      }
    });
    console.log('\nDirect insert SUCCESS, notifId:', notifId);
  } catch (e) {
    console.log('\nDirect insert FAILED:', e.message);
  }
  
  // Verify
  const verify = await p.$queryRawUnsafe(
    'SELECT n.title, nr.user_id FROM notification_recipients nr JOIN notifications n ON n.id=nr.notification_id WHERE n.id=$1',
    notifId
  );
  console.log('Verification:', verify);
  
  await p.$disconnect();
}
main().catch(console.error);
