import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing all trips...');

  const result = await prisma.$transaction(async (tx) => {
    // Nullify optional tripId references
    await tx.fuelEntry.updateMany({ where: { tripId: { not: null } }, data: { tripId: null } });
    await tx.expense.updateMany({ where: { tripId: { not: null } }, data: { tripId: null } });
    await tx.document.updateMany({ where: { tripId: { not: null } }, data: { tripId: null } });
    await tx.maintenanceRequest.updateMany({ where: { tripId: { not: null } }, data: { tripId: null } });
    await tx.repair.updateMany({ where: { tripId: { not: null } }, data: { tripId: null } });
    await tx.vehicleIssue.updateMany({ where: { tripId: { not: null } }, data: { tripId: null } });
    await tx.vehicleInspection.updateMany({ where: { tripId: { not: null } }, data: { tripId: null } });

    // Delete records with required tripId FK
    await tx.tripBilling.deleteMany();
    await tx.financeTransaction.deleteMany({ where: { tripId: { not: null } } });

    // Delete trip history (has onDelete: Cascade but explicit for safety)
    await tx.tripHistory.deleteMany();

    // Delete all trips
    const count = await tx.trip.deleteMany();

    return count;
  });

  console.log(`Deleted ${result.count} trips.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
