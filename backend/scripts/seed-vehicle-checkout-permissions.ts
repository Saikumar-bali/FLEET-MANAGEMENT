import { prisma } from '../src/lib/prisma';

const MISSING_PERMISSIONS = [
  { key: 'driver_vehicle_self_checkout', module: 'driver_portal', action: 'vehicle_self_checkout', description: 'Driver portal: self-checkout a vehicle' },
  { key: 'driver_vehicle_return', module: 'driver_portal', action: 'vehicle_return', description: 'Driver portal: return a checked-out vehicle' },
  { key: 'driver_vehicle_checkout_view_own', module: 'driver_portal', action: 'vehicle_checkout_view_own', description: 'Driver portal: view own vehicle checkouts' },
];

async function main() {
  console.log('Seeding missing vehicle checkout permissions...\n');

  for (const perm of MISSING_PERMISSIONS) {
    const existing = await prisma.permission.findUnique({ where: { key: perm.key } });
    if (existing) {
      console.log(`  EXISTS: ${perm.key}`);
    } else {
      await prisma.permission.create({ data: perm });
      console.log(`  CREATED: ${perm.key}`);
    }
  }

  console.log('\nDone.');
}

main()
  .catch((err) => { console.error('Failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
