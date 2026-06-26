/**
 * link-existing-drivers.ts
 *
 * Admin-only script to create login accounts for real unlinked drivers.
 *
 * Usage:
 *   npx tsx scripts/link-existing-drivers.ts              # dry-run (default)
 *   npx tsx scripts/link-existing-drivers.ts --dry-run    # explicit dry-run
 *   npx tsx scripts/link-existing-drivers.ts --apply      # create accounts
 *   npx tsx scripts/link-existing-drivers.ts --apply --output  # also write credentials file
 *
 * Rules:
 *   - Dry-run by default. Requires --apply to actually create accounts.
 *   - Skips test drivers (names or license numbers containing TEST, E2E, PH7_UI_TEST).
 *   - Only creates accounts for drivers without an existing linked user.
 *   - Never prints raw passwords to console by default.
 *   - Writes credentials CSV to .local/ only when --output is specified.
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

const TEST_PATTERNS = ['TEST', 'E2E', 'PH7_UI_TEST'];

function isTestDriver(name: string, licenseNumber: string): boolean {
  const upperName = name.toUpperCase();
  const upperLicense = licenseNumber.toUpperCase();
  return TEST_PATTERNS.some(
    (p) => upperName.includes(p) || upperLicense.includes(p),
  );
}

function maskMobile(mobile: string): string {
  if (mobile.length < 6) return mobile;
  return mobile.slice(0, 2) + '****' + mobile.slice(-2);
}

function generateUsername(name: string, mobile: string): string {
  const baseName = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
  const suffix = mobile.slice(-4);
  return `driver-${baseName}-${suffix}`;
}

function generatePassword(): string {
  return crypto.randomBytes(6).toString('hex'); // 12 chars
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--apply');
  const writeOutput = args.includes('--output');

  console.log('=== Link Existing Drivers ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no accounts created)' : 'APPLY (accounts will be created)'}`);
  console.log('');

  const allDrivers = await prisma.driver.findMany({
    orderBy: { name: 'asc' },
  });

  console.log(`Total drivers in system: ${allDrivers.length}`);
  console.log('');

  const linkedDriverIds = new Set(
    (await prisma.user.findMany({
      where: { userDriverId: { not: null } },
      select: { userDriverId: true },
    }))
      .map((u) => u.userDriverId)
      .filter(Boolean) as string[],
  );

  const skipReasons: { driver: string; reason: string }[] = [];
  const toCreate: { driver: typeof allDrivers[0]; username: string; password: string }[] = [];

  for (const driver of allDrivers) {
    if (isTestDriver(driver.name, driver.licenseNumber)) {
      skipReasons.push({ driver: driver.name, reason: 'Test driver (name or license contains TEST/E2E/PH7_UI_TEST)' });
      continue;
    }

    if (linkedDriverIds.has(driver.id)) {
      skipReasons.push({ driver: driver.name, reason: 'Already has linked user account' });
      continue;
    }

    const username = generateUsername(driver.name, driver.mobile);
    const password = generatePassword();
    toCreate.push({ driver, username, password });
  }

  console.log('--- Summary ---');
  console.log(`  Account would be created: ${toCreate.length}`);
  console.log(`  Skipped:                  ${skipReasons.length}`);
  console.log('');

  if (toCreate.length > 0) {
    console.log('Drivers that will get accounts:');
    console.log('  Name                           Mobile         Status');
    console.log('  ' + '-'.repeat(60));
    for (const item of toCreate) {
      const namePad = item.driver.name.padEnd(30).slice(0, 30);
      console.log(`  ${namePad} ${maskMobile(item.driver.mobile).padEnd(14)} ${item.driver.status}`);
    }
    console.log('');
  }

  if (skipReasons.length > 0) {
    console.log('Skipped drivers:');
    for (const s of skipReasons) {
      console.log(`  - ${s.driver}: ${s.reason}`);
    }
    console.log('');
  }

  if (isDryRun) {
    console.log('Dry-run complete. Pass --apply to create accounts.');
    await prisma.$disconnect();
    return;
  }

  // --apply mode
  console.log('Creating accounts...');

  const driverRole = await prisma.role.findUnique({ where: { key: 'driver' } });
  if (!driverRole) {
    console.error('ERROR: Driver role not found in system (key=driver). Aborting.');
    await prisma.$disconnect();
    process.exit(1);
  }

  const results: { name: string; username: string; mobile: string; password: string }[] = [];

  for (const item of toCreate) {
    try {
      const email = `${item.username}@driver.internal`;
      const { hashPassword } = await import('../src/utils/auth');

      await prisma.user.create({
        data: {
          name: item.driver.name,
          username: item.username,
          email,
          mobile: item.driver.mobile,
          passwordHash: await hashPassword(item.password),
          roleId: driverRole.id,
          status: 'ACTIVE',
          userDriverId: item.driver.id,
        },
      });

      results.push({
        name: item.driver.name,
        username: item.username,
        mobile: item.driver.mobile,
        password: item.password,
      });

      console.log(`  ✓ ${item.driver.name.padEnd(25)} → ${item.username}`);
    } catch (err: any) {
      console.error(`  ✗ ${item.driver.name}: ${err.message}`);
    }
  }

  console.log(`\nCreated ${results.length} / ${toCreate.length} accounts.`);

  // Write credentials file when --output is specified
  if (writeOutput && results.length > 0) {
    const localDir = path.resolve(__dirname, '..', '.local');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const csvPath = path.join(localDir, `generated-driver-credentials-${timestamp}.csv`);

    const header = 'name,username,mobile,password\n';
    const rows = results.map((r) => `"${r.name}","${r.username}","${r.mobile}","${r.password}"`).join('\n');
    fs.writeFileSync(csvPath, header + rows, 'utf-8');

    console.log(`\nCredentials written to: ${csvPath}`);
    console.log('WARNING: This file contains plain-text passwords. Delete after use.');
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
