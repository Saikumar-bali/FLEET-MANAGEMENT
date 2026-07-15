const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const f = await p.fuelEntry.findFirst({ orderBy: { createdAt: 'desc' } });
  console.log('fuel driverId:', f.driverId, 'createdById:', f.createdById);
  
  const user = await p.user.findFirst({ where: { username: 'aanand' } });
  console.log('user id:', user.id);
  
  const driver = await p.driver.findFirst({ where: { name: { contains: 'aanand', mode: 'insensitive' } } });
  if (driver) {
    console.log('driver id:', driver.id);
  } else {
    // Try to find driver by mobile or other means
    const drivers = await p.driver.findMany({ take: 5 });
    for (const d of drivers) {
      console.log('driver:', d.id, d.name);
    }
  }
  await p.$disconnect();
}
main().catch(console.error);
