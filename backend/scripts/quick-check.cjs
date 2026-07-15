const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const fuel = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS c FROM fuel_entries');
  const adv = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS c FROM driver_advances');
  const stl = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS c FROM driver_settlements');
  const drv = await p.$queryRawUnsafe(`
    SELECT d.id, d.name FROM drivers d 
    WHERE EXISTS (SELECT 1 FROM user_profile_links upl WHERE upl.profile_type='DRIVER' AND upl.profile_id=d.id AND upl.status='ACTIVE')
  `);
  const usr = await p.$queryRawUnsafe('SELECT id, username FROM users');
  console.log('Fuel:', fuel[0].c);
  console.log('Advances:', adv[0].c);
  console.log('Settlements:', stl[0].c);
  console.log('Linked drivers:', drv.length, drv.map(d => d.name));
  console.log('Users:', usr.length, usr.map(u => u.username));
  await p.$disconnect();
}
main().catch(console.error);
