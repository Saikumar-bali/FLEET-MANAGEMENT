const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  // Check recent notifications
  const notifs = await p.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
  console.log('Recent notifications:', notifs.length);
  for (const n of notifs) {
    console.log(`  id=${n.id} title=${n.title} recipientPolicy=${JSON.stringify(n.recipientPolicy)}`);
  }
  
  // Check notifications for admin user
  const adminNotifs = await p.notification.findMany({ 
    where: { recipients: { some: { userId: 'cmrekcq4n0002u8qcmn87hwfq' } } },
    orderBy: { createdAt: 'desc' }, take: 10 
  });
  console.log('\nAdmin notifications:', adminNotifs.length);
  for (const n of adminNotifs) {
    console.log(`  ${n.title}: ${n.message}`);
  }
  
  // Check driver notifications
  const driverNotifs = await p.notification.findMany({ 
    where: { recipients: { some: { userId: 'cmrelztnz0005l204dv7g2bp8' } } },
    orderBy: { createdAt: 'desc' }, take: 10 
  });
  console.log('\nDriver notifications:', driverNotifs.length);
  for (const n of driverNotifs) {
    console.log(`  ${n.title}: ${n.message}`);
  }
  
  await p.$disconnect();
}
main().catch(console.error);
