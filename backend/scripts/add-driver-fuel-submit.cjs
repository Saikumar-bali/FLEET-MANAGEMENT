const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const driverRole = await prisma.role.findFirst({ where: { key: 'driver' } });
  if (!driverRole) { console.error('Driver role not found'); return; }
  console.log(`Driver role: ${driverRole.id}`);

  const fuelSubmit = await prisma.permission.findFirst({ where: { key: 'fuel_submit' } });
  if (!fuelSubmit) { console.error('fuel_submit permission not found'); return; }
  console.log(`fuel_submit: ${fuelSubmit.id}`);

  const expenseSubmit = await prisma.permission.findFirst({ where: { key: 'expense_submit' } });
  if (!expenseSubmit) { console.error('expense_submit permission not found'); return; }
  console.log(`expense_submit: ${expenseSubmit.id}`);

  // Add fuel_submit
  const existing1 = await prisma.rolePermission.findFirst({ where: { roleId: driverRole.id, permissionId: fuelSubmit.id } });
  if (!existing1) {
    await prisma.rolePermission.create({ data: { roleId: driverRole.id, permissionId: fuelSubmit.id } });
    console.log('Added fuel_submit to driver role');
  } else {
    console.log('fuel_submit already exists for driver role');
  }

  // Add expense_submit
  const existing2 = await prisma.rolePermission.findFirst({ where: { roleId: driverRole.id, permissionId: expenseSubmit.id } });
  if (!existing2) {
    await prisma.rolePermission.create({ data: { roleId: driverRole.id, permissionId: expenseSubmit.id } });
    console.log('Added expense_submit to driver role');
  } else {
    console.log('expense_submit already exists for driver role');
  }

  // Verify
  const perms = await prisma.rolePermission.findMany({ where: { roleId: driverRole.id }, include: { permission: true } });
  console.log(`\nDriver role now has ${perms.length} permissions:`);
  for (const p of perms) {
    console.log(`  - ${p.permission.key}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
