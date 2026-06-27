import { prisma } from '../../lib/prisma';
import type {
  ComplianceExpiryRow,
  DocumentVerificationRow,
  FuelMissingReceiptRow,
  FuelSummaryRow,
  MaintenanceSummaryRow,
  TripSummaryRow,
  VehicleUtilizationRow,
} from './reports.types';
import type { ComplianceExpiryQuery, DateRangeQuery } from './reports.validators';

function dateFilter(q: { dateFrom?: string; dateTo?: string }) {
  if (!q.dateFrom && !q.dateTo) return undefined;
  return {
    ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
    ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
  };
}

export class ReportsService {
  async vehicleUtilization(query: DateRangeQuery): Promise<{ rows: VehicleUtilizationRow[]; summary: any }> {
    const fuelDate = dateFilter(query);
    const maintenanceDate = fuelDate;
    const repairDate = fuelDate;
    const tripDate = fuelDate;

    const vehicles = await prisma.vehicle.findMany({
      select: { id: true, vehicleNumber: true, createdAt: true },
    });

    const rows: VehicleUtilizationRow[] = [];

    for (const v of vehicles) {
      const [trips, fuelAgg, maintenanceAgg, repairAgg] = await Promise.all([
        prisma.trip.findMany({
          where: {
            vehicleId: v.id,
            ...(tripDate ? { plannedStartAt: tripDate } : {}),
          },
          select: { distanceKm: true, actualStartAt: true, actualEndAt: true, status: true },
        }),
        prisma.fuelEntry.aggregate({
          where: { vehicleId: v.id, ...(fuelDate ? { fuelDate } : {}) },
          _sum: { totalAmount: true },
        }),
        prisma.maintenanceRequest.aggregate({
          where: { vehicleId: v.id, ...(maintenanceDate ? { requestDate: maintenanceDate } : {}) },
          _sum: { actualCost: true, estimatedCost: true },
        }),
        prisma.repair.aggregate({
          where: { vehicleId: v.id, ...(repairDate ? { repairDate } : {}) },
          _sum: { actualCost: true, estimatedCost: true },
        }),
      ]);

      const tripCount = trips.length;
      const totalDistanceKm = trips.reduce((s, t) => s + Number(t.distanceKm ?? 0), 0);
      const totalFuelCost = Number(fuelAgg._sum.totalAmount ?? 0);
      const totalMaintenanceCost = Number(maintenanceAgg._sum.actualCost ?? maintenanceAgg._sum.estimatedCost ?? 0);
      const totalRepairCost = Number(repairAgg._sum.actualCost ?? repairAgg._sum.estimatedCost ?? 0);

      const activeDays = new Set<string>();
      for (const t of trips) {
        if (t.actualStartAt) activeDays.add(t.actualStartAt.toISOString().slice(0, 10));
      }
      const totalDays = Math.max(
        1,
        Math.ceil(
          (Date.now() -
            (query.dateFrom ? new Date(query.dateFrom).getTime() : v.createdAt.getTime())) /
            86400000,
        ),
      );
      const utilizationPct = Math.min(100, Math.round((activeDays.size / totalDays) * 1000) / 10);

      rows.push({
        vehicleId: v.id,
        vehicleNumber: v.vehicleNumber,
        tripCount,
        totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
        totalFuelCost: Math.round(totalFuelCost * 100) / 100,
        totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
        totalRepairCost: Math.round(totalRepairCost * 100) / 100,
        utilizationPct,
      });
    }

    rows.sort((a, b) => b.tripCount - a.tripCount);

    return {
      rows,
      summary: {
        vehicleCount: rows.length,
        totalTrips: rows.reduce((s, r) => s + r.tripCount, 0),
        totalFuelCost: rows.reduce((s, r) => s + r.totalFuelCost, 0),
        totalMaintenanceCost: rows.reduce((s, r) => s + r.totalMaintenanceCost, 0),
        totalRepairCost: rows.reduce((s, r) => s + r.totalRepairCost, 0),
        avgUtilizationPct:
          rows.length === 0 ? 0 : Math.round((rows.reduce((s, r) => s + r.utilizationPct, 0) / rows.length) * 10) / 10,
      },
    };
  }

  async tripSummary(query: DateRangeQuery): Promise<{ rows: TripSummaryRow[] }> {
    const tripDate = dateFilter(query);
    const where: any = {
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      ...(query.driverId ? { driverId: query.driverId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(tripDate ? { plannedStartAt: tripDate } : {}),
    };
    const trips = await prisma.trip.findMany({
      where,
      orderBy: { plannedStartAt: 'desc' },
      take: query.limit ?? 100,
      include: {
        vehicle: { select: { vehicleNumber: true } },
        driver: { select: { name: true } },
      },
    });
    const rows: TripSummaryRow[] = trips.map((t) => ({
      tripId: t.id,
      tripNumber: t.tripNumber,
      vehicleNumber: t.vehicle?.vehicleNumber ?? null,
      driverName: t.driver?.name ?? null,
      status: t.status,
      tripType: t.tripType,
      startDate: t.actualStartAt?.toISOString() ?? t.plannedStartAt?.toISOString() ?? null,
      endDate: t.actualEndAt?.toISOString() ?? t.plannedEndAt?.toISOString() ?? null,
      distanceKm: Number(t.distanceKm ?? 0),
    }));
    return { rows };
  }

  async fuelSummary(query: DateRangeQuery): Promise<{ rows: FuelSummaryRow[]; summary: any }> {
    const fuelDate = dateFilter(query);
    const where: any = {
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      ...(query.driverId ? { driverId: query.driverId } : {}),
      ...(fuelDate ? { fuelDate } : {}),
    };
    const grouped = await prisma.fuelEntry.groupBy({
      by: ['vehicleId'],
      where,
      _count: { _all: true },
      _sum: { totalAmount: true, quantityLiters: true },
    });
    const vehicles = await prisma.vehicle.findMany({
      where: { id: { in: grouped.map((g) => g.vehicleId) } },
      select: { id: true, vehicleNumber: true },
    });
    const byId = new Map(vehicles.map((v) => [v.id, v.vehicleNumber]));
    const rows: FuelSummaryRow[] = grouped.map((g) => {
      const totalAmount = Number(g._sum.totalAmount ?? 0);
      const totalLiters = Number(g._sum.quantityLiters ?? 0);
      return {
        vehicleId: g.vehicleId,
        vehicleNumber: byId.get(g.vehicleId) ?? g.vehicleId,
        entryCount: g._count._all,
        totalLiters: Math.round(totalLiters * 1000) / 1000,
        totalAmount: Math.round(totalAmount * 100) / 100,
        avgPricePerLiter: totalLiters > 0 ? Math.round((totalAmount / totalLiters) * 100) / 100 : 0,
      };
    });
    rows.sort((a, b) => b.totalAmount - a.totalAmount);
    return {
      rows,
      summary: {
        vehicleCount: rows.length,
        totalEntries: rows.reduce((s, r) => s + r.entryCount, 0),
        totalAmount: rows.reduce((s, r) => s + r.totalAmount, 0),
        totalLiters: rows.reduce((s, r) => s + r.totalLiters, 0),
      },
    };
  }

  async fuelMissingReceipts(query: DateRangeQuery): Promise<{ rows: FuelMissingReceiptRow[]; summary: any }> {
    const fuelDate = dateFilter(query);
    const entries = await prisma.fuelEntry.findMany({
      where: {
        totalAmount: { gt: 0 },
        ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
        ...(fuelDate ? { fuelDate } : {}),
        OR: [{ receiptNumber: null }, { receiptNumber: '' }],
        documents: { none: {} },
      },
      orderBy: { fuelDate: 'desc' },
      take: query.limit ?? 100,
      include: { vehicle: { select: { vehicleNumber: true } } },
    });
    const rows: FuelMissingReceiptRow[] = entries.map((e) => ({
      fuelEntryId: e.id,
      vehicleNumber: e.vehicle?.vehicleNumber ?? e.vehicleId,
      fuelDate: e.fuelDate.toISOString().slice(0, 10),
      totalAmount: Number(e.totalAmount),
      stationName: e.stationName,
      receiptNumber: e.receiptNumber,
    }));
    return {
      rows,
      summary: {
        count: rows.length,
        totalAmount: rows.reduce((s, r) => s + r.totalAmount, 0),
      },
    };
  }

  async complianceExpiry(query: ComplianceExpiryQuery): Promise<{ rows: ComplianceExpiryRow[]; summary: any }> {
    const cutoff = new Date(Date.now() + query.daysToExpire * 86400000);
    const docs = await prisma.vehicleComplianceDocument.findMany({
      where: {
        validTo: { not: null, lte: cutoff },
        ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      },
      orderBy: { validTo: 'asc' },
      include: { vehicle: { select: { vehicleNumber: true } } },
    });
    const rows: ComplianceExpiryRow[] = docs.map((d) => {
      const daysToExpire = d.validTo ? Math.floor((d.validTo.getTime() - Date.now()) / 86400000) : 0;
      return {
        id: d.id,
        vehicleId: d.vehicleId,
        vehicleNumber: d.vehicle?.vehicleNumber ?? d.vehicleId,
        complianceType: d.complianceType,
        validTo: d.validTo?.toISOString().slice(0, 10) ?? '',
        daysToExpire,
        status: d.status,
      };
    });
    return {
      rows,
      summary: {
        count: rows.length,
        criticalCount: rows.filter((r) => r.daysToExpire < 0 || r.daysToExpire <= 7).length,
        warningCount: rows.filter((r) => r.daysToExpire > 7 && r.daysToExpire <= 30).length,
      },
    };
  }

  async documentVerification(query: DateRangeQuery): Promise<{ rows: DocumentVerificationRow[]; summary: any }> {
    const created = dateFilter(query);
    const grouped = await prisma.document.groupBy({
      by: ['documentStatus', 'verificationStatus'],
      where: {
        ...(created ? { createdAt: created } : {}),
      },
      _count: { _all: true },
    });
    const rows: DocumentVerificationRow[] = grouped.map((g) => ({
      documentStatus: g.documentStatus,
      verificationStatus: g.verificationStatus,
      count: g._count._all,
    }));
    rows.sort((a, b) => b.count - a.count);
    return {
      rows,
      summary: {
        total: rows.reduce((s, r) => s + r.count, 0),
        pending: rows.filter((r) => r.verificationStatus === 'PENDING').reduce((s, r) => s + r.count, 0),
        verified: rows.filter((r) => r.verificationStatus === 'VERIFIED').reduce((s, r) => s + r.count, 0),
        rejected: rows.filter((r) => r.verificationStatus === 'REJECTED').reduce((s, r) => s + r.count, 0),
      },
    };
  }

  async maintenanceSummary(query: DateRangeQuery): Promise<{ rows: MaintenanceSummaryRow[]; summary: any }> {
    const reqDate = dateFilter(query);
    const grouped = await prisma.maintenanceRequest.groupBy({
      by: ['status'],
      where: {
        ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
        ...(reqDate ? { requestDate: reqDate } : {}),
      },
      _count: { _all: true },
      _sum: { actualCost: true, estimatedCost: true },
    });
    const rows: MaintenanceSummaryRow[] = grouped.map((g) => ({
      status: g.status,
      count: g._count._all,
      totalEstimatedCost: Math.round(Number(g._sum.estimatedCost ?? 0) * 100) / 100,
      totalActualCost: Math.round(Number(g._sum.actualCost ?? 0) * 100) / 100,
    }));
    rows.sort((a, b) => b.count - a.count);
    return {
      rows,
      summary: {
        total: rows.reduce((s, r) => s + r.count, 0),
        open: rows
          .filter((r) => r.status === 'SUBMITTED' || r.status === 'APPROVED')
          .reduce((s, r) => s + r.count, 0),
        totalActualCost: rows.reduce((s, r) => s + r.totalActualCost, 0),
      },
    };
  }
}