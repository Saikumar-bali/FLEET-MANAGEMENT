import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.vehicleComplianceDocument.findMany({
    select: { id: true, documentNumber: true, complianceType: true, status: true, vehicleId: true },
  });
  console.log('\n=== Compliance Documents ===');
  docs.forEach((d: any) => console.log(`${d.documentNumber || 'NO-NUMBER'} | ${d.complianceType} | ${d.status} | vehicle: ${d.vehicleId}`));
  console.log(`Total: ${docs.length}`);

  const vehicles = await prisma.vehicle.findMany({
    select: {
      id: true, vehicleNumber: true, rcNumber: true,
      insuranceExpiry: true, fitnessExpiry: true, pollutionExpiry: true, permitExpiry: true,
    },
  });
  console.log('\n=== Vehicle Expiry Fields ===');
  vehicles.forEach((v: any) => console.log(`${v.vehicleNumber} | RC: ${v.rcNumber || 'EMPTY'} | Ins: ${v.insuranceExpiry || 'NULL'} | Fitness: ${v.fitnessExpiry || 'NULL'} | PUC: ${v.pollutionExpiry || 'NULL'} | Permit: ${v.permitExpiry || 'NULL'}`));

  console.log('\n=== Compliance Record Counts ===');
  console.log(`Insurance: ${await prisma.vehicleInsuranceDetail.count()}`);
  console.log(`Permits: ${await prisma.vehiclePermitDetail.count()}`);
  console.log(`Fitness: ${await prisma.vehicleFitnessDetail.count()}`);
  console.log(`PUC: ${await prisma.vehiclePucDetail.count()}`);
  console.log(`Road Tax: ${await prisma.vehicleRoadTaxDetail.count()}`);
  console.log(`FASTag: ${await prisma.vehicleFastagDetail.count()}`);
  console.log(`GPS: ${await prisma.vehicleGpsDeviceDetail.count()}`);

  const history = await prisma.vehicleComplianceHistory.findMany({ select: { id: true, action: true, vehicleId: true } });
  console.log(`\nCompliance History: ${history.length} entries`);

  const testDocs = docs.filter((d: any) => d.documentNumber?.includes('TEST'));
  const testHistory = history.filter((h: any) => h.id?.includes('TEST') || h.action?.includes('TEST'));
  console.log(`\nTEST compliance docs: ${testDocs.length}`);
  testDocs.forEach((d: any) => console.log(`  ${d.documentNumber} (${d.id})`));
  console.log(`TEST history: ${testHistory.length}`);
  testHistory.forEach((h: any) => console.log(`  ${h.id} | ${h.action}`));

  // Also check MaintenanceRequest and Repair for TEST entries
  const testMaint = await prisma.maintenanceRequest.findMany({ where: { id: { contains: 'TEST' } }, select: { id: true } });
  const testRepair = await prisma.repair.findMany({ where: { id: { contains: 'TEST' } }, select: { id: true } });
  console.log(`\nTEST maintenance requests: ${testMaint.length}`);
  testMaint.forEach((m: any) => console.log(`  ${m.id}`));
  console.log(`TEST repairs: ${testRepair.length}`);
  testRepair.forEach((r: any) => console.log(`  ${r.id}`));

  // Check all compliance doc documentNumbers for TEST patterns
  const allDocs = await prisma.vehicleComplianceDocument.findMany({ select: { documentNumber: true } });
  const testPatterns = allDocs.filter((d: any) => d.documentNumber?.startsWith('TEST-'));
  console.log(`\nAll TEST-pattern document numbers: ${testPatterns.length}`);
  testPatterns.forEach((d: any) => console.log(`  ${d.documentNumber}`));

  await (prisma as any).$disconnect();
}

main().catch((e: any) => { console.error(e); process.exit(1); });
