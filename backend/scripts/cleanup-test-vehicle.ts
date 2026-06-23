const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vehicleId = 'cmqql2gux0017u84w1b0uxcic';

  console.log('Deleting test vehicle and all related records...');

  // Delete compliance records (cascade already, but be explicit)
  await prisma.vehicleComplianceHistory.deleteMany({ where: { vehicleId } });
  await prisma.vehicleComplianceDocument.deleteMany({ where: { vehicleId } });
  await prisma.vehicleRegistrationDetail.deleteMany({ where: { vehicleId } });
  await prisma.vehicleInsuranceDetail.deleteMany({ where: { vehicleId } });
  await prisma.vehiclePermitDetail.deleteMany({ where: { vehicleId } });
  await prisma.vehicleFitnessDetail.deleteMany({ where: { vehicleId } });
  await prisma.vehiclePucDetail.deleteMany({ where: { vehicleId } });
  await prisma.vehicleRoadTaxDetail.deleteMany({ where: { vehicleId } });
  await prisma.vehicleFastagDetail.deleteMany({ where: { vehicleId } });
  await prisma.vehicleGpsDeviceDetail.deleteMany({ where: { vehicleId } });
  console.log('  Compliance records deleted');

  // Delete maintenance and repair records
  await prisma.maintenanceRequest.deleteMany({ where: { vehicleId } });
  await prisma.repair.deleteMany({ where: { vehicleId } });
  console.log('  Maintenance/repair records deleted');

  // Delete fuel and expense records
  await prisma.fuelEntry.deleteMany({ where: { vehicleId } });
  await prisma.expense.deleteMany({ where: { vehicleId } });
  console.log('  Fuel/expense records deleted');

  // Delete trips
  await prisma.trip.deleteMany({ where: { vehicleId } });
  console.log('  Trip records deleted');

  // Delete finance records referencing this vehicle
  await prisma.financeTransaction.deleteMany({ where: { vehicleId } });
  console.log('  Finance records deleted');

  // Delete audit logs referencing this vehicle
  await prisma.auditLog.deleteMany({ where: { entityType: 'vehicle', entityId: vehicleId } });
  console.log('  Audit logs deleted');

  // Finally delete the vehicle
  await prisma.vehicle.delete({ where: { id: vehicleId } });
  console.log('  Vehicle deleted');

  // Also delete TEST-E2E-CMP vehicle if it still exists
  const testCmp = await prisma.vehicle.findFirst({ where: { vehicleNumber: 'TEST-E2E-CMP-1782215458719' } });
  if (testCmp) {
    console.log('\nTEST-E2E-CMP vehicle already deleted by API');
  }

  // Summary
  const count = await prisma.vehicle.count();
  console.log(`\nFinal vehicle count: ${count}`);
  const vehicles = await prisma.vehicle.findMany({ select: { vehicleNumber: true, rcNumber: true, insuranceExpiry: true, fitnessExpiry: true, pollutionExpiry: true, permitExpiry: true } });
  vehicles.forEach(v => console.log(`  ${v.vehicleNumber} | RC: ${v.rcNumber || 'EMPTY'} | Ins: ${v.insuranceExpiry ? 'YES' : 'NULL'} | Fitness: ${v.fitnessExpiry ? 'YES' : 'NULL'} | PUC: ${v.pollutionExpiry ? 'YES' : 'NULL'} | Permit: ${v.permitExpiry ? 'YES' : 'NULL'}`));

  // Count compliance documents
  const docCount = await prisma.vehicleComplianceDocument.count();
  console.log(`\nCompliance documents: ${docCount}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
