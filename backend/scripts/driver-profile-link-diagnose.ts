import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== Driver Profile Link Diagnosis ===\n');

  const [totalDrivers, totalUsers, totalLinks] = await Promise.all([
    prisma.driver.count(),
    prisma.user.count(),
    prisma.userProfileLink.count({ where: { profileType: 'DRIVER' } }),
  ]);

  console.log(`Total drivers: ${totalDrivers}`);
  console.log(`Total users: ${totalUsers}`);
  console.log(`Total driver profile links: ${totalLinks}\n`);

  // Drivers with linked user account
  const links = await prisma.userProfileLink.findMany({
    where: { profileType: 'DRIVER' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const linkedDriverIds = new Set(links.filter(l => l.status === 'ACTIVE').map(l => l.profileId));
  const linkedUserIds = new Set(links.filter(l => l.status === 'ACTIVE').map(l => l.userId));

  console.log(`Drivers with linked user account: ${linkedDriverIds.size}`);
  console.log(`Drivers without linked user account: ${totalDrivers - linkedDriverIds.size}`);

  if (linkedDriverIds.size > 0) {
    console.log('  Linked drivers:');
    for (const link of links.filter(l => l.status === 'ACTIVE')) {
      const driver = await prisma.driver.findUnique({
        where: { id: link.profileId },
        select: { id: true, name: true },
      });
      console.log(`    ${driver?.name ?? 'UNKNOWN'} (${link.profileId}) -> ${link.user.name} (${link.user.email}) [${link.isPrimary ? 'primary' : 'secondary'}]`);
    }
  }

  console.log(`\nUsers linked to drivers: ${linkedUserIds.size}`);

  // Duplicate active driver links
  const duplicateCheck = await prisma.$queryRawUnsafe<{ userId: string; profileId: string; count: bigint }[]>(
    `SELECT user_id as "userId", profile_id as "profileId", COUNT(*) as count
     FROM user_profile_links
     WHERE profile_type = 'DRIVER' AND status = 'ACTIVE'
     GROUP BY user_id, profile_id
     HAVING COUNT(*) > 1`
  );

  if (duplicateCheck.length > 0) {
    console.log(`\nDuplicate active driver links: ${duplicateCheck.length}`);
    for (const d of duplicateCheck) {
      console.log(`  User ${d.userId} -> Driver ${d.profileId}: ${d.count} active links`);
    }
  } else {
    console.log('\nDuplicate active driver links: 0');
  }

  // Broken links where driver does not exist
  const brokenDriverLinks = links.filter(l => l.status === 'ACTIVE');
  const existingDriverIds = new Set(
    (await prisma.driver.findMany({ select: { id: true } })).map(d => d.id)
  );
  const brokenByMissingDriver = brokenDriverLinks.filter(l => !existingDriverIds.has(l.profileId));

  if (brokenByMissingDriver.length > 0) {
    console.log(`\nBroken links (driver does not exist): ${brokenByMissingDriver.length}`);
    for (const l of brokenByMissingDriver) {
      console.log(`  Link ${l.id}: User ${l.userId} -> Driver ${l.profileId} (NOT FOUND)`);
    }
  } else {
    console.log('\nBroken links (driver does not exist): 0');
  }

  // Broken links where user does not exist
  const existingUserIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map(u => u.id)
  );
  const brokenByMissingUser = brokenDriverLinks.filter(l => !existingUserIds.has(l.userId));

  if (brokenByMissingUser.length > 0) {
    console.log(`\nBroken links (user does not exist): ${brokenByMissingUser.length}`);
    for (const l of brokenByMissingUser) {
      console.log(`  Link ${l.id}: User ${l.userId} (NOT FOUND) -> Driver ${l.profileId}`);
    }
  } else {
    console.log('\nBroken links (user does not exist): 0');
  }

  console.log('\n=== Diagnosis Complete ===');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Diagnosis failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
