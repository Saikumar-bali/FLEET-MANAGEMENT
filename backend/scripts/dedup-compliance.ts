const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vehicles = await prisma.vehicle.findMany({ select: { id: true, vehicleNumber: true } });
  
  for (const v of vehicles) {
    const docs = await prisma.vehicleComplianceDocument.findMany({
      where: { vehicleId: v.id },
      orderBy: { createdAt: 'asc' },
    });

    // Group by complianceType, keep only the first (oldest) of each type
    const seen = new Set<string>();
    const toDelete: string[] = [];
    for (const doc of docs) {
      if (seen.has(doc.complianceType)) {
        toDelete.push(doc.id);
      } else {
        seen.add(doc.complianceType);
      }
    }

    if (toDelete.length > 0) {
      await prisma.vehicleComplianceDocument.deleteMany({ where: { id: { in: toDelete } } });
      console.log(`${v.vehicleNumber}: deleted ${toDelete.length} duplicate docs, kept ${seen.size}`);
    } else {
      console.log(`${v.vehicleNumber}: no duplicates (${docs.length} docs)`);
    }
  }

  // Also deduplicate compliance records (insurance, permit, fitness, etc.)
  const models = [
    { name: 'vehicleInsuranceDetail', find: 'policyNumber' },
    { name: 'vehiclePermitDetail', find: 'permitNumber' },
    { name: 'vehicleFitnessDetail', find: 'certificateNumber' },
    { name: 'vehiclePucDetail', find: 'certificateNumber' },
    { name: 'vehicleRoadTaxDetail', find: 'receiptNumber' },
  ];

  for (const m of models) {
    for (const v of vehicles) {
      const records = await prisma[m.name].findMany({
        where: { vehicleId: v.id },
        orderBy: { createdAt: 'asc' },
      });
      if (records.length > 1) {
        const toDelete = records.slice(1).map((r) => r.id);
        await prisma[m.name].deleteMany({ where: { id: { in: toDelete } } });
        console.log(`${v.vehicleNumber} ${m.name}: deleted ${toDelete.length} duplicates`);
      }
    }
  }

  // Final counts
  const docCount = await prisma.vehicleComplianceDocument.count();
  const insCount = await prisma.vehicleInsuranceDetail.count();
  const permitCount = await prisma.vehiclePermitDetail.count();
  const fitCount = await prisma.vehicleFitnessDetail.count();
  const pucCount = await prisma.vehiclePucDetail.count();
  const rtCount = await prisma.vehicleRoadTaxDetail.count();
  const faCount = await prisma.vehicleFastagDetail.count();
  const gpsCount = await prisma.vehicleGpsDeviceDetail.count();
  const histCount = await prisma.vehicleComplianceHistory.count();
  const vCount = await prisma.vehicle.count();

  console.log(`\n=== Final Counts ===`);
  console.log(`Vehicles: ${vCount}`);
  console.log(`Documents: ${docCount}`);
  console.log(`Insurance: ${insCount}, Permits: ${permitCount}, Fitness: ${fitCount}, PUC: ${pucCount}`);
  console.log(`RoadTax: ${rtCount}, FASTag: ${faCount}, GPS: ${gpsCount}`);
  console.log(`History: ${histCount}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
