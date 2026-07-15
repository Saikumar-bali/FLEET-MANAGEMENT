const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  // Check user_profile_links for the driver
  const links = await p.$queryRawUnsafe(
    'SELECT * FROM user_profile_links WHERE driver_id = $1',
    'cmrel7uk40000l204dlx280vh'
  );
  console.log('Profile links for driver cmrel7uk40000l204dlx280vh:', JSON.stringify(links));
  
  // Check all user_profile_links
  const all = await p.$queryRawUnsafe('SELECT * FROM user_profile_links LIMIT 10');
  console.log('\nAll profile links:', JSON.stringify(all));
  
  await p.$disconnect();
}
main().catch(console.error);
