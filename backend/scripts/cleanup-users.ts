import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
});

const RESERVED_USERNAMES = new Set([
  'admin',
  'opsadmin',
  'manager',
  'supervisor',
  'driver',
  'assistantdriver',
  'collector',
  'mechanic',
  'finance',
  'viewer',
]);

async function main() {
  console.log('Connecting to database...');
  await prisma.$connect();

  const allUsers = await prisma.user.findMany({
    select: { id: true, username: true, email: true, name: true },
  });

  const toDelete = allUsers.filter(
    (u) => !RESERVED_USERNAMES.has(u.username ?? ''),
  );

  if (toDelete.length === 0) {
    console.log('No non-reserved users found to delete.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${toDelete.length} user(s) to delete:\n`);
  for (const u of toDelete) {
    console.log(`  - ${u.name} (${u.username ?? 'no username'}, ${u.email})`);
  }

  console.log('\nDeleting related records...');

  for (const u of toDelete) {
    await prisma.refreshToken.deleteMany({ where: { userId: u.id } });
    await prisma.auditLog.deleteMany({ where: { userId: u.id } });
    await prisma.assetAssignment.deleteMany({ where: { assignedById: u.id } });
    await prisma.assetHistory.deleteMany({ where: { createdById: u.id } });

    await prisma.user.delete({ where: { id: u.id } });
    console.log(`  Deleted user: ${u.name} (${u.id})`);
  }

  console.log(`\nDone. Deleted ${toDelete.length} user(s).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
