import { prisma } from '../../lib/prisma';
import type { ActorContext } from '../access/actor-context.service';
import { getScopedWhereForResource } from '../access/scoped-enforcement.service';

export class DashboardService {
  /**
   * `actor` is required — this endpoint previously ran fully global,
   * unscoped aggregates for any authenticated user. Every count/aggregate
   * below is now merged with the same getScopedWhereForResource(...) that
   * the list endpoints for that resource already use, so a non-global
   * actor (e.g. a supervisor scoped to specific vehicles) sees dashboard
   * numbers consistent with what they can actually open and view elsewhere
   * in the app — never a fleet-wide total they don't have access to.
   */
  async getOverview(actor: ActorContext) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const vehicleWhere = (extra: Record<string, unknown> = {}) => ({
      ...extra,
      ...(getScopedWhereForResource(actor, 'VEHICLE') ?? {}),
    });
    const driverWhere = (extra: Record<string, unknown> = {}) => ({
      ...extra,
      ...(getScopedWhereForResource(actor, 'DRIVER') ?? {}),
    });
    const tripWhere = (extra: Record<string, unknown> = {}) => ({
      ...extra,
      ...(getScopedWhereForResource(actor, 'TRIP') ?? {}),
    });
    const fuelWhere = (extra: Record<string, unknown> = {}) => ({
      ...extra,
      ...(getScopedWhereForResource(actor, 'FUEL_ENTRY') ?? {}),
    });
    const expenseWhere = (extra: Record<string, unknown> = {}) => ({
      ...extra,
      ...(getScopedWhereForResource(actor, 'EXPENSE') ?? {}),
    });
    const maintenanceWhere = (extra: Record<string, unknown> = {}) => ({
      ...extra,
      ...(getScopedWhereForResource(actor, 'MAINTENANCE') ?? {}),
    });
    const repairWhere = (extra: Record<string, unknown> = {}) => ({
      ...extra,
      ...(getScopedWhereForResource(actor, 'REPAIR') ?? {}),
    });
    const documentWhere = (extra: Record<string, unknown> = {}) => ({
      ...extra,
      ...(getScopedWhereForResource(actor, 'DOCUMENT') ?? {}),
    });

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
      prisma.vehicle.count({ where: vehicleWhere() }),
      prisma.vehicle.count({ where: vehicleWhere({ status: 'AVAILABLE' }) }),
      prisma.driver.count({ where: driverWhere() }),
      prisma.trip.count({ where: tripWhere({ status: 'STARTED' }) }),
      prisma.trip.count({
        where: tripWhere({ status: 'COMPLETED', updatedAt: { gte: startOfMonth } }),
      }),
      prisma.trip.count({ where: tripWhere({ status: 'SCHEDULED' }) }),
      prisma.fuelEntry.aggregate({
        _sum: { totalAmount: true },
        where: fuelWhere({ fuelDate: { gte: startOfMonth, lte: endOfMonth } }),
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: expenseWhere({ expenseDate: { gte: startOfMonth, lte: endOfMonth } }),
      }),
      prisma.maintenanceRequest.count({
        where: maintenanceWhere({ status: { in: ['SUBMITTED', 'APPROVED'] } }),
      }),
      prisma.repair.count({ where: repairWhere({ status: 'IN_PROGRESS' }) }),
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
        where: tripWhere(),
        select: { id: true, tripType: true, status: true, originName: true, destinationName: true, createdAt: true },
      }),
      prisma.fuelEntry.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: fuelWhere(),
        select: { id: true, vehicleId: true, quantityLiters: true, totalAmount: true, fuelDate: true },
      }),
      prisma.expense.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: expenseWhere(),
        select: { id: true, vehicleId: true, category: true, amount: true, notes: true, expenseDate: true },
      }),
      prisma.document.count({ where: documentWhere({ documentStatus: { not: 'DELETED' } }) }),
      prisma.document.count({ where: documentWhere({ documentStatus: 'ACTIVE' }) }),
      prisma.document.count({ where: documentWhere({ documentStatus: 'ARCHIVED' }) }),
      prisma.document.count({ where: documentWhere({ verificationStatus: 'PENDING', documentStatus: 'ACTIVE' }) }),
      prisma.document.count({ where: documentWhere({ verificationStatus: 'REJECTED', documentStatus: 'ACTIVE' }) }),
      prisma.document.count({
        where: documentWhere({
          documentStatus: 'ACTIVE',
          expiryDate: { gte: now, lte: new Date(now.getTime() + 30 * 86400000) },
        }),
      }),
      prisma.document.count({
        where: documentWhere({
          documentStatus: 'ACTIVE',
          expiryDate: { lt: now },
        }),
      }),
      prisma.document.aggregate({
        _sum: { fileSizeBytes: true },
        where: documentWhere({ documentStatus: { not: 'DELETED' } }),
      }),
      prisma.document.groupBy({
        by: ['documentCategory'],
        _count: true,
        where: documentWhere({ documentStatus: { not: 'DELETED' } }),
      }),
      prisma.document.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: documentWhere({ documentStatus: { not: 'DELETED' } }),
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
