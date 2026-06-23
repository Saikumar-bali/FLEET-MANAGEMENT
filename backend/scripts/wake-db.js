const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$queryRaw`SELECT 1`.then(() => {
  console.log('DB connected');
  return p.$disconnect();
}).catch(e => {
  console.log('DB error:', e.message?.substring(0, 200));
  process.exit(1);
});
