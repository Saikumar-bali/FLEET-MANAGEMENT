const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Delete test-pattern compliance documents
  const deleted = await prisma.vehicleComplianceDocument.deleteMany({
    where: {
      OR: [
        { documentNumber: { contains: '1782215458719' } },
        { documentNumber: { contains: '1782215457853' } },
        { documentNumber: { startsWith: 'TEST-' } },
        { documentNumber: { startsWith: 'SOON-' } },
        { documentNumber: { startsWith: 'EXP-' } },
        { documentNumber: { startsWith: 'DOC-' } },
        { documentNumber: null },
      ],
    },
  });
  console.log(`Deleted ${deleted.count} test compliance documents`);

  // Also clean up old compliance history with test IDs
  const histDeleted = await prisma.vehicleComplianceHistory.deleteMany({
    where: {
      OR: [
        { id: { contains: '1782215458719' } },
        { id: { contains: '1782215457853' } },
      ],
    },
  });
  console.log(`Deleted ${histDeleted.count} test history entries`);

  // Verify remaining documents
  const docs = await prisma.vehicleComplianceDocument.findMany({
    select: { documentNumber: true, complianceType: true, status: true, vehicleId: true },
    orderBy: { vehicleId: 'asc' },
  });
  console.log(`\nRemaining documents: ${docs.length}`);
  docs.forEach(d => console.log(`  ${d.documentNumber || 'NO-NUMBER'} | ${d.complianceType} | ${d.status}`));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
