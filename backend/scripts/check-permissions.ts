import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const perms = await prisma.permission.findMany({ where: { key: { contains: 'driver_' } }, select: { key: true } });
  perms.forEach(p => console.log(p.key));
  await prisma.$disconnect();
}
main();
