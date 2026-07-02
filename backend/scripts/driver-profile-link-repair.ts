import { prisma } from '../src/lib/prisma';

const APPLY = process.env.DRIVER_PROFILE_LINK_REPAIR_APPLY === 'true';

interface RepairCandidate {
  userId: string;
  userName: string;
  userEmail: string;
  driverId: string;
  driverName: string;
  matchType: 'email' | 'mobile' | 'username';
  matchValue: string;
}

async function findDeterministicMatches(): Promise<RepairCandidate[]> {
  const candidates: RepairCandidate[] = [];

  // Match by email
  const drivers = await prisma.driver.findMany({
    select: { id: true, name: true, mobile: true },
  });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, mobile: true, username: true },
  });

  for (const driver of drivers) {
    // Try email match
    const emailUser = users.find(u => u.email && u.email.toLowerCase() === `${driver.mobile}@driver.fleet.local`);
    if (emailUser) {
      candidates.push({
        userId: emailUser.id,
        userName: emailUser.name,
        userEmail: emailUser.email,
        driverId: driver.id,
        driverName: driver.name,
        matchType: 'email',
        matchValue: emailUser.email,
      });
      continue;
    }

    // Try mobile match
    const mobileUser = users.find(u => u.mobile && u.mobile === driver.mobile);
    if (mobileUser) {
      candidates.push({
        userId: mobileUser.id,
        userName: mobileUser.name,
        userEmail: mobileUser.email,
        driverId: driver.id,
        driverName: driver.name,
        matchType: 'mobile',
        matchValue: driver.mobile,
      });
      continue;
    }

    // Try username match with driver name
    const normalizedDriverName = driver.name.toLowerCase().replace(/\s+/g, '');
    const usernameUser = users.find(u => u.username && u.username.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedDriverName);
    if (usernameUser) {
      candidates.push({
        userId: usernameUser.id,
        userName: usernameUser.name,
        userEmail: usernameUser.email,
        driverId: driver.id,
        driverName: driver.name,
        matchType: 'username',
        matchValue: usernameUser.username!,
      });
    }
  }

  return candidates;
}

async function main() {
  console.log('=== Driver Profile Link Repair ===\n');
  console.log(`Mode: ${APPLY ? 'APPLY (will write changes)' : 'DRY-RUN (no changes will be made)'}\n`);

  const candidates = await findDeterministicMatches();

  if (candidates.length === 0) {
    console.log('No deterministic matches found. Nothing to repair.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${candidates.length} deterministic match(es):\n`);

  const existingLinks = await prisma.userProfileLink.findMany({
    where: { profileType: 'DRIVER', status: 'ACTIVE' },
  });

  const existingLinkSet = new Set(existingLinks.map(l => `${l.userId}:${l.profileId}`));

  const newCandidates = candidates.filter(c => !existingLinkSet.has(`${c.userId}:${c.driverId}`));

  if (newCandidates.length === 0) {
    console.log('All matches already have active links. Nothing to repair.');
    await prisma.$disconnect();
    return;
  }

  for (const c of newCandidates) {
    console.log(`  User: ${c.userName} (${c.userEmail})`);
    console.log(`  Driver: ${c.driverName} (${c.driverId})`);
    console.log(`  Match: ${c.matchType} = ${c.matchValue}`);
    console.log('');
  }

  if (!APPLY) {
    console.log(`DRY-RUN complete. ${newCandidates.length} link(s) would be created.`);
    console.log('Set DRIVER_PROFILE_LINK_REPAIR_APPLY=true to apply changes.');
    await prisma.$disconnect();
    return;
  }

  let created = 0;
  for (const c of newCandidates) {
    try {
      await prisma.userProfileLink.create({
        data: {
          userId: c.userId,
          profileType: 'DRIVER',
          profileId: c.driverId,
          isPrimary: false,
          status: 'ACTIVE',
          linkedById: null,
          metadata: { repair: true, matchType: c.matchType, matchValue: c.matchValue },
        },
      });
      created++;
      console.log(`  Created link: ${c.userName} -> ${c.driverName}`);
    } catch (e) {
      console.error(`  Failed to create link for ${c.userName}: ${e}`);
    }
  }

  console.log(`\nRepair complete. Created ${created} link(s).`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Repair failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
