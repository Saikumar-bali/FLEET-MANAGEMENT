import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const vehicles = await p.vehicle.findMany({ where: { vehicleNumber: { contains: 'TEST' } } });
  console.log('Found', vehicles.length, 'vehicles with TEST');
  vehicles.forEach(v => console.log(v.id, v.vehicleNumber));

  const ph7 = await p.vehicle.findMany({ where: { vehicleNumber: { contains: 'PH7' } } });
  console.log('Found', ph7.length, 'vehicles with PH7');
  ph7.forEach(v => console.log(v.id, v.vehicleNumber));

  await p.$disconnect();
}

main().catch(e => { console.error(e); p.$disconnect(); });
