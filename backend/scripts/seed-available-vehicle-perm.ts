import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  await p.permission.upsert({
    where: { key: 'driver_available_vehicle_select' },
    update: {},
    create: { key: 'driver_available_vehicle_select', module: 'driver_portal', action: 'available_vehicle_select', description: 'Driver portal: select from available vehicles' },
  });
  console.log('Seeded: driver_available_vehicle_select');
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
