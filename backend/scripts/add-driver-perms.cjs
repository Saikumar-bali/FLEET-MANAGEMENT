const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const driverRole = await prisma.role.findFirst({ where: { key: 'driver' } });
  const perms = ['fuel_update', 'expense_update'];
  for (const key of perms) {
    const perm = await prisma.permission.findFirst({ where: { key } });
    if (!perm) { console.log(key + ' NOT FOUND'); continue; }
    const exists = await prisma.rolePermission.findFirst({ where: { roleId: driverRole.id, permissionId: perm.id } });
    if (!exists) {
      await prisma.rolePermission.create({ data: { roleId: driverRole.id, permissionId: perm.id } });
      console.log('Added ' + key);
    } else {
      console.log(key + ' already exists');
    }
  }
  const allPerms = await prisma.rolePermission.findMany({ where: { roleId: driverRole.id }, include: { permission: true } });
  console.log('Driver now has ' + allPerms.length + ' perms');
  await prisma.$disconnect();
}
main();
