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
    };
  }
}
