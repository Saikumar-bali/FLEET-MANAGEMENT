const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  // Check roles
  const roles = await p.role.findMany();
  console.log('Roles:');
  for (const r of roles) {
    console.log(`  id=${r.id} name=${r.name} key=${r.key} status=${r.status}`);
  }
  
  // Check users and their roles
  const users = await p.user.findMany({ include: { role: true } });
  console.log('\nUsers:');
  for (const u of users) {
    console.log(`  ${u.username}: userId=${u.id} roleId=${u.roleId} roleKey=${u.role?.key}`);
  }
  
  // Check notification policies
  const policies = await p.notificationPolicy.findMany();
  console.log('\nPolicies:');
  for (const pol of policies) {
    console.log(`  id=${pol.id} key=${pol.key} target=${JSON.stringify(pol.target)}`);
  }
  
  // Check recent notifications
  const notifs = await p.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
  console.log('\nRecent notifications:');
  for (const n of notifs) {
    console.log(`  ${n.title} policyId=${n.policyId} recipientPolicy=${JSON.stringify(n.recipientPolicy)}`);
  }
  
  await p.$disconnect();
}
main().catch(console.error);
