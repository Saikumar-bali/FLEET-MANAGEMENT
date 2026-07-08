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
      vehicleStatusGroups,
      driversCount,
      tripStatusGroups,
      fuelAgg,
      expenseAgg,
      maintenanceOpen,
      repairsOpen,
      complianceStatusGroups,
      complianceExpiring7,
      complianceExpiring30,
      recentTrips,
      recentFuel,
      recentExpenses,
      docStatusGroups,
      docVerificationGroups,
      expiringDocs30,
      expiredDocs,
      storageUsageAgg,
      docsByCategory,
      recentDocuments,
    ] = await Promise.all([
      // Vehicle: 1 query replaces 2
      prisma.vehicle.groupBy({ by: ['status'], _count: true, where: vehicleWhere() }),
      prisma.driver.count({ where: driverWhere() }),
      // Trip: 1 query replaces 3
      prisma.trip.groupBy({ by: ['status'], _count: true, where: tripWhere() }),
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
      // Compliance: 1 query replaces 3
      prisma.vehicleComplianceDocument.groupBy({ by: ['status'], _count: true }),
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
      // Document: 2 queries replace 7 (groupBy status + verification)
      prisma.document.groupBy({
        by: ['documentStatus'],
        _count: true,
        where: documentWhere({ documentStatus: { not: 'DELETED' } }),
      }),
      prisma.document.groupBy({
        by: ['verificationStatus'],
        _count: true,
        where: documentWhere({ documentStatus: 'ACTIVE' }),
      }),
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

    // Derive vehicle counts from groupBy
    const vehicleCountMap = new Map(vehicleStatusGroups.map(g => [g.status, g._count]));
    const totalVehicles = Array.from(vehicleCountMap.values()).reduce((sum: number, c: number) => sum + c, 0);
    const activeVehicles = vehicleCountMap.get('AVAILABLE') ?? 0;
    const inactiveVehicles = totalVehicles - activeVehicles;

    // Derive trip counts from groupBy
    const tripCountMap = new Map(tripStatusGroups.map(g => [g.status, g._count]));
    const activeTrips = tripCountMap.get('STARTED') ?? 0;
    const pendingTrips = tripCountMap.get('SCHEDULED') ?? 0;
    // completedTripsThisMonth needs the scoped filter, use the count directly
    const completedTripsThisMonth = await prisma.trip.count({
      where: tripWhere({ status: 'COMPLETED', updatedAt: { gte: startOfMonth } }),
    });

    // Derive compliance counts from groupBy
    const complianceCountMap = new Map(complianceStatusGroups.map(g => [g.status, g._count]));
    const complianceExpired = complianceCountMap.get('EXPIRED') ?? 0;

    // Derive document counts from groupBy
    const docStatusMap = new Map(docStatusGroups.map(g => [g.documentStatus, g._count]));
    const totalDocuments = Array.from(docStatusMap.values()).reduce((sum: number, c: number) => sum + c, 0);
    const activeDocuments = docStatusMap.get('ACTIVE') ?? 0;
    const archivedDocuments = docStatusMap.get('ARCHIVED') ?? 0;

    const docVerificationMap = new Map(docVerificationGroups.map(g => [g.verificationStatus, g._count]));
    const unverifiedDocuments = docVerificationMap.get('PENDING') ?? 0;
    const rejectedDocuments = docVerificationMap.get('REJECTED') ?? 0;

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
