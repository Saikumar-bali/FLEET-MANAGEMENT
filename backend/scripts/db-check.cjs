const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$queryRaw`SELECT 1 as ok`.then(r => {
  console.log('DB OK:', JSON.stringify(r));
  p.$disconnect();
}).catch(e => {
  console.log('DB FAIL:', e.message);
  p.$disconnect();
});
