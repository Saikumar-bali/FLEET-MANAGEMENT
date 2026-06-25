import { prisma } from '../../lib/prisma';

export class DashboardService {
  async getOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      totalVehicles,
      activeVehicles,
      driversCount,
      activeTrips,
      completedTripsThisMonth,
      pendingTrips,
      fuelAgg,
      expenseAgg,
      maintenanceOpen,
      repairsOpen,
      complianceExpired,
      complianceExpiring7,
      complianceExpiring30,
      recentTrips,
      recentFuel,
      recentExpenses,
      totalDocuments,
      activeDocuments,
      archivedDocuments,
      unverifiedDocuments,
      rejectedDocuments,
      expiringDocs30,
      expiredDocs,
      storageUsageAgg,
      docsByCategory,
      recentDocuments,
    ] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
      prisma.driver.count(),
      prisma.trip.count({ where: { status: 'STARTED' } }),
      prisma.trip.count({
        where: { status: 'COMPLETED', updatedAt: { gte: startOfMonth } },
      }),
      prisma.trip.count({ where: { status: 'SCHEDULED' } }),
      prisma.fuelEntry.aggregate({
        _sum: { totalAmount: true },
        where: { fuelDate: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { expenseDate: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.maintenanceRequest.count({
        where: { status: { in: ['SUBMITTED', 'APPROVED'] } },
      }),
      prisma.repair.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.vehicleComplianceDocument.count({
        where: { status: 'EXPIRED' },
      }),
      prisma.vehicleComplianceDocument.count({
        where: {
          status: { in: ['ACTIVE', 'VERIFIED'] },
          validTo: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) },
        },
      }),
      prisma.vehicleComplianceDocument.count({
        where: {
          status: { in: ['ACTIVE', 'VERIFIED'] },
          validTo: { gte: now, lte: new Date(now.getTime() + 30 * 86400000) },
        },
      }),
      prisma.trip.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, tripType: true, status: true, originName: true, destinationName: true, createdAt: true },
      }),
      prisma.fuelEntry.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, vehicleId: true, quantityLiters: true, totalAmount: true, fuelDate: true },
      }),
      prisma.expense.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, vehicleId: true, category: true, amount: true, notes: true, expenseDate: true },
      }),
      prisma.document.count({ where: { documentStatus: { not: 'DELETED' } } }),
      prisma.document.count({ where: { documentStatus: 'ACTIVE' } }),
      prisma.document.count({ where: { documentStatus: 'ARCHIVED' } }),
      prisma.document.count({ where: { verificationStatus: 'PENDING', documentStatus: 'ACTIVE' } }),
      prisma.document.count({ where: { verificationStatus: 'REJECTED', documentStatus: 'ACTIVE' } }),
      prisma.document.count({
        where: {
          documentStatus: 'ACTIVE',
          expiryDate: { gte: now, lte: new Date(now.getTime() + 30 * 86400000) },
        },
      }),
      prisma.document.count({
        where: {
          documentStatus: 'ACTIVE',
          expiryDate: { lt: now },
        },
      }),
      prisma.document.aggregate({
        _sum: { fileSizeBytes: true },
        where: { documentStatus: { not: 'DELETED' } },
      }),
      prisma.document.groupBy({
        by: ['documentCategory'],
        _count: true,
        where: { documentStatus: { not: 'DELETED' } },
      }),
      prisma.document.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: { documentStatus: { not: 'DELETED' } },
        select: {
          id: true, title: true, documentType: true, documentCategory: true,
          fileSizeBytes: true, documentStatus: true, verificationStatus: true,
          createdAt: true,
          uploadedBy: { select: { name: true } },
        },
      }),
    ]);

    const inactiveVehicles = totalVehicles - activeVehicles;

    return {
      totalVehicles,
      activeVehicles,
      inactiveVehicles,
      driversCount,
      activeTrips,
      completedTripsThisMonth,
      pendingTrips,
      fuelCostThisMonth: fuelAgg._sum?.totalAmount ?? 0,
      expensesThisMonth: expenseAgg._sum?.amount ?? 0,
      maintenanceOpen,
      repairsOpen,
      complianceExpired,
      complianceExpiring7,
      complianceExpiring30,
      recentTrips,
      recentFuel: recentFuel.map((f) => ({
        ...f,
        totalAmount: Number(f.totalAmount),
        quantityLiters: Number(f.quantityLiters),
      })),
      recentExpenses: recentExpenses.map((e) => ({
        ...e,
        amount: Number(e.amount),
      })),
      totalDocuments,
      activeDocuments,
      archivedDocuments,
      unverifiedDocuments,
      rejectedDocuments,
      expiringDocuments30: expiringDocs30,
      expiredDocuments: expiredDocs,
      storageUsageBytes: Number(storageUsageAgg._sum?.fileSizeBytes ?? 0),
      documentsByCategory: docsByCategory.map((d) => ({
        category: d.documentCategory,
        count: d._count,
      })),
      recentDocuments,
    };
  }
}
