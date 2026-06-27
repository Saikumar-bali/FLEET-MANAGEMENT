import {
  AlertModule,
  AlertSeverity,
  AlertStatus,
  AlertTriggerType,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { AlertGenerateResult } from './alerts.types';

const DAY_MS = 86400000;

const HIGH_FUEL_AMOUNT = 15000;
const FUEL_DAYS_TO_CHECK_RECEIPT = 3;
const FUEL_HIGH_AMOUNT_LOOKBACK_DAYS = 7;
const MAINTENANCE_OPEN_DAYS = 14;
const REPAIR_IN_PROGRESS_DAYS = 21;
const DOCUMENT_PENDING_VERIFICATION_DAYS = 7;
const BILLING_OVERDUE_CRITICAL_DAYS = 30;
const PENDING_PAYMENT_DAYS = 15;

type UpsertInput = {
  dedupeKey: string;
  ruleId: string;
  module: AlertModule;
  triggerType: AlertTriggerType;
  severity: AlertSeverity;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  vehicleId?: string | null;
  driverId?: string | null;
  tripId?: string | null;
  metadata?: Record<string, unknown>;
};

type Candidate = Omit<UpsertInput, 'ruleId'>;

function dateBucket(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dedupeKey(module: AlertModule, entityType: string, entityId: string, ruleKey: string, date: Date) {
  const base = `${module.toLowerCase()}:${entityType.toLowerCase()}:${entityId}:${ruleKey}:${dateBucket(date)}`;
  return base.slice(0, 200);
}

async function upsertAlert(input: UpsertInput, dryRun: boolean) {
  if (dryRun) {
    const existing = await prisma.alert.findUnique({ where: { dedupeKey: input.dedupeKey } });
    if (existing && (existing.status === AlertStatus.RESOLVED || existing.status === AlertStatus.DISMISSED)) {
      return { created: false, skipped: true };
    }
    return { created: true, skipped: false };
  }
  const existing = await prisma.alert.findUnique({ where: { dedupeKey: input.dedupeKey } });
  if (existing && (existing.status === AlertStatus.RESOLVED || existing.status === AlertStatus.DISMISSED)) {
    return { created: false, skipped: true };
  }
  await prisma.alert.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: {
      dedupeKey: input.dedupeKey,
      ruleId: input.ruleId,
      module: input.module,
      triggerType: input.triggerType,
      severity: input.severity,
      status: AlertStatus.UNREAD,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
      vehicleId: input.vehicleId ?? null,
      driverId: input.driverId ?? null,
      tripId: input.tripId ?? null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      detectedAt: new Date(),
    },
    update: {},
  });
  return { created: true, skipped: false };
}

type RuleRunner = {
  key: string;
  run: (ruleIdByKey: Map<string, string>) => Promise<Candidate[]>;
};

async function runVehicleExpiryRule(
  ruleKey: string,
  module: AlertModule,
  field: 'insuranceExpiry' | 'fitnessExpiry' | 'pollutionExpiry' | 'permitExpiry',
  entityType: 'Vehicle',
): Promise<Candidate[]> {
  const where = { [field]: { not: null } } as Prisma.VehicleWhereInput;
  const vehicles = await prisma.vehicle.findMany({ where });
  const out: Candidate[] = [];
  for (const v of vehicles) {
    const expiry = (v as any)[field] as Date | null;
    if (!expiry) continue;
    const diffDays = Math.floor((expiry.getTime() - Date.now()) / DAY_MS);
    if (diffDays > 30) continue;
    const severity: AlertSeverity =
      diffDays < 0 || diffDays <= 7 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
    out.push({
      dedupeKey: dedupeKey(module, entityType, v.id, ruleKey, expiry),
      module,
      triggerType: AlertTriggerType.EXPIRY,
      severity,
      title: ruleKey,
      message: `${v.vehicleNumber}: expiry ${expiry.toISOString().slice(0, 10)} (${diffDays < 0 ? `${-diffDays}d overdue` : `${diffDays}d remaining`})`,
      entityType,
      entityId: v.id,
      vehicleId: v.id,
      metadata: { expiryDate: expiry.toISOString(), daysRemaining: diffDays },
    });
  }
  return out;
}

async function runDriverLicenseRule(ruleKey: string): Promise<Candidate[]> {
  const drivers = await prisma.driver.findMany({
    where: { licenseExpiry: { not: null } },
    select: { id: true, name: true, licenseExpiry: true },
  });
  const out: Candidate[] = [];
  for (const d of drivers) {
    if (!d.licenseExpiry) continue;
    const diffDays = Math.floor((d.licenseExpiry.getTime() - Date.now()) / DAY_MS);
    if (diffDays > 30) continue;
    const severity: AlertSeverity =
      diffDays < 0 || diffDays <= 7 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
    out.push({
      dedupeKey: dedupeKey(AlertModule.DRIVER, 'Driver', d.id, ruleKey, d.licenseExpiry),
      module: AlertModule.DRIVER,
      triggerType: AlertTriggerType.EXPIRY,
      severity,
      title: ruleKey,
      message: `${d.name}: license expiry ${d.licenseExpiry.toISOString().slice(0, 10)} (${diffDays < 0 ? `${-diffDays}d overdue` : `${diffDays}d remaining`})`,
      entityType: 'Driver',
      entityId: d.id,
      driverId: d.id,
      metadata: { expiryDate: d.licenseExpiry.toISOString(), daysRemaining: diffDays },
    });
  }
  return out;
}

const RULES: RuleRunner[] = [
  {
    key: 'vehicle.insurance.expiry',
    run: () => runVehicleExpiryRule('vehicle.insurance.expiry', AlertModule.VEHICLE, 'insuranceExpiry', 'Vehicle'),
  },
  {
    key: 'vehicle.fitness.expiry',
    run: () => runVehicleExpiryRule('vehicle.fitness.expiry', AlertModule.VEHICLE, 'fitnessExpiry', 'Vehicle'),
  },
  {
    key: 'vehicle.pollution.expiry',
    run: () => runVehicleExpiryRule('vehicle.pollution.expiry', AlertModule.VEHICLE, 'pollutionExpiry', 'Vehicle'),
  },
  {
    key: 'vehicle.permit.expiry',
    run: () => runVehicleExpiryRule('vehicle.permit.expiry', AlertModule.VEHICLE, 'permitExpiry', 'Vehicle'),
  },
  {
    key: 'driver.license.expiry',
    run: () => runDriverLicenseRule('driver.license.expiry'),
  },
  {
    key: 'document.expiry',
    async run() {
      const cutoff = new Date(Date.now() + 30 * DAY_MS);
      const docs = await prisma.document.findMany({
        where: {
          documentStatus: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          expiryDate: { not: null, lte: cutoff },
        },
        select: {
          id: true,
          title: true,
          expiryDate: true,
          vehicleId: true,
          driverId: true,
          tripId: true,
        },
      });
      const out: Candidate[] = [];
      for (const d of docs) {
        if (!d.expiryDate) continue;
        const diffDays = Math.floor((d.expiryDate.getTime() - Date.now()) / DAY_MS);
        const severity: AlertSeverity =
          diffDays < 0 || diffDays <= 7 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
        out.push({
          dedupeKey: dedupeKey(AlertModule.DOCUMENTS, 'Document', d.id, 'document.expiry', d.expiryDate),
          module: AlertModule.DOCUMENTS,
          triggerType: AlertTriggerType.EXPIRY,
          severity,
          title: 'document.expiry',
          message: `${d.title}: expiry ${d.expiryDate.toISOString().slice(0, 10)} (${diffDays < 0 ? `${-diffDays}d overdue` : `${diffDays}d remaining`})`,
          entityType: 'Document',
          entityId: d.id,
          vehicleId: d.vehicleId,
          driverId: d.driverId,
          tripId: d.tripId,
          metadata: { expiryDate: d.expiryDate.toISOString(), daysRemaining: diffDays },
        });
      }
      return out;
    },
  },
  {
    key: 'document.pending_verification',
    async run() {
      const cutoff = new Date(Date.now() - DOCUMENT_PENDING_VERIFICATION_DAYS * DAY_MS);
      const docs = await prisma.document.findMany({
        where: {
          documentStatus: 'ACTIVE',
          verificationStatus: 'PENDING',
          createdAt: { lte: cutoff },
        },
        select: { id: true, title: true, createdAt: true, vehicleId: true, driverId: true, tripId: true },
      });
      return docs.map((d) => ({
        dedupeKey: dedupeKey(AlertModule.DOCUMENTS, 'Document', d.id, 'document.pending_verification', d.createdAt),
        module: AlertModule.DOCUMENTS,
        triggerType: AlertTriggerType.THRESHOLD,
        severity: AlertSeverity.INFO,
        title: 'document.pending_verification',
        message: `${d.title}: pending verification since ${d.createdAt.toISOString().slice(0, 10)}`,
        entityType: 'Document',
        entityId: d.id,
        vehicleId: d.vehicleId,
        driverId: d.driverId,
        tripId: d.tripId,
        metadata: { pendingSince: d.createdAt.toISOString() },
      }));
    },
  },
  {
    key: 'document.rejected',
    async run() {
      const docs = await prisma.document.findMany({
        where: {
          documentStatus: 'ACTIVE',
          verificationStatus: 'REJECTED',
        },
        select: { id: true, title: true, updatedAt: true, vehicleId: true, driverId: true, tripId: true },
      });
      return docs.map((d) => ({
        dedupeKey: dedupeKey(AlertModule.DOCUMENTS, 'Document', d.id, 'document.rejected', d.updatedAt),
        module: AlertModule.DOCUMENTS,
        triggerType: AlertTriggerType.STATUS_CHANGE,
        severity: AlertSeverity.WARNING,
        title: 'document.rejected',
        message: `${d.title}: verification rejected on ${d.updatedAt.toISOString().slice(0, 10)}`,
        entityType: 'Document',
        entityId: d.id,
        vehicleId: d.vehicleId,
        driverId: d.driverId,
        tripId: d.tripId,
        metadata: { rejectedAt: d.updatedAt.toISOString() },
      }));
    },
  },
  {
    key: 'compliance.expiring_30d',
    async run() {
      const cutoff = new Date(Date.now() + 30 * DAY_MS);
      const docs = await prisma.vehicleComplianceDocument.findMany({
        where: {
          status: { in: ['ACTIVE', 'VERIFIED'] },
          validTo: { not: null, lte: cutoff },
        },
        select: { id: true, vehicleId: true, validTo: true, complianceType: true },
      });
      const byVehicle = new Map<string, Array<{ validTo: Date }>>();
      for (const d of docs) {
        if (!d.vehicleId || !d.validTo) continue;
        const list = byVehicle.get(d.vehicleId) ?? [];
        list.push({ validTo: d.validTo });
        byVehicle.set(d.vehicleId, list);
      }
      const out: Candidate[] = [];
      for (const [vehicleId, list] of byVehicle) {
        const earliest = list
          .map((d) => d.validTo)
          .sort((a, b) => a.getTime() - b.getTime())[0];
        out.push({
          dedupeKey: dedupeKey(AlertModule.COMPLIANCE, 'Vehicle', vehicleId, 'compliance.expiring_30d', earliest),
          module: AlertModule.COMPLIANCE,
          triggerType: AlertTriggerType.EXPIRY,
          severity: AlertSeverity.WARNING,
          title: 'compliance.expiring_30d',
          message: `${list.length} compliance document(s) expiring within 30 days`,
          entityType: 'Vehicle',
          entityId: vehicleId,
          vehicleId,
          metadata: { count: list.length, earliestExpiry: earliest.toISOString() },
        });
      }
      return out;
    },
  },
  {
    key: 'fuel.missing_receipt',
    async run() {
      const cutoff = new Date(Date.now() - FUEL_DAYS_TO_CHECK_RECEIPT * DAY_MS);
      const entries = await prisma.fuelEntry.findMany({
        where: {
          status: 'APPROVED',
          totalAmount: { gt: 0 },
          fuelDate: { lte: cutoff },
          OR: [{ receiptNumber: null }, { receiptNumber: '' }],
        },
        select: { id: true, vehicleId: true, fuelDate: true, totalAmount: true, documents: { select: { id: true } } },
      });
      const out: Candidate[] = [];
      for (const e of entries) {
        if (e.documents.length > 0) continue;
        out.push({
          dedupeKey: dedupeKey(AlertModule.FUEL, 'FuelEntry', e.id, 'fuel.missing_receipt', e.fuelDate),
          module: AlertModule.FUEL,
          triggerType: AlertTriggerType.MISSING_DOCUMENT,
          severity: AlertSeverity.WARNING,
          title: 'fuel.missing_receipt',
          message: `Fuel entry ${e.id} on ${e.fuelDate.toISOString().slice(0, 10)} has no receipt`,
          entityType: 'FuelEntry',
          entityId: e.id,
          vehicleId: e.vehicleId,
          metadata: { fuelDate: e.fuelDate.toISOString(), totalAmount: Number(e.totalAmount) },
        });
      }
      return out;
    },
  },
  {
    key: 'fuel.high_amount',
    async run() {
      const cutoff = new Date(Date.now() - FUEL_HIGH_AMOUNT_LOOKBACK_DAYS * DAY_MS);
      const entries = await prisma.fuelEntry.findMany({
        where: {
          status: 'APPROVED',
          totalAmount: { gt: HIGH_FUEL_AMOUNT },
          fuelDate: { lte: cutoff },
        },
        select: { id: true, vehicleId: true, fuelDate: true, totalAmount: true },
      });
      return entries.map((e) => ({
        dedupeKey: dedupeKey(AlertModule.FUEL, 'FuelEntry', e.id, 'fuel.high_amount', e.fuelDate),
        module: AlertModule.FUEL,
        triggerType: AlertTriggerType.THRESHOLD,
        severity: AlertSeverity.WARNING,
        title: 'fuel.high_amount',
        message: `Fuel entry ${e.id}: ₹${Number(e.totalAmount).toFixed(2)} exceeds ${HIGH_FUEL_AMOUNT}`,
        entityType: 'FuelEntry',
        entityId: e.id,
        vehicleId: e.vehicleId,
        metadata: { totalAmount: Number(e.totalAmount), threshold: HIGH_FUEL_AMOUNT },
      }));
    },
  },
  {
    key: 'trip.billing_overdue',
    async run() {
      const now = new Date();
      const billings = await prisma.tripBilling.findMany({
        where: {
          paymentStatus: { in: ['BILLED', 'PARTIALLY_PAID'] },
          dueDate: { lt: now, not: null },
        },
        select: { id: true, tripId: true, dueDate: true, balanceAmount: true },
      });
      const out: Candidate[] = [];
      for (const b of billings) {
        if (!b.dueDate) continue;
        const overdueDays = Math.floor((now.getTime() - b.dueDate.getTime()) / DAY_MS);
        const severity: AlertSeverity =
          overdueDays >= BILLING_OVERDUE_CRITICAL_DAYS ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
        out.push({
          dedupeKey: dedupeKey(AlertModule.FINANCE, 'TripBilling', b.id, 'trip.billing_overdue', b.dueDate),
          module: AlertModule.FINANCE,
          triggerType: AlertTriggerType.OVERDUE,
          severity,
          title: 'trip.billing_overdue',
          message: `Trip billing ${b.id}: ${overdueDays}d overdue, balance ₹${Number(b.balanceAmount).toFixed(2)}`,
          entityType: 'TripBilling',
          entityId: b.id,
          tripId: b.tripId,
          metadata: { dueDate: b.dueDate.toISOString(), overdueDays, balance: Number(b.balanceAmount) },
        });
      }
      return out;
    },
  },
  {
    key: 'finance.pending_payment',
    async run() {
      const cutoff = new Date(Date.now() - PENDING_PAYMENT_DAYS * DAY_MS);
      const txns = await prisma.financeTransaction.findMany({
        where: {
          paymentStatus: 'PENDING',
          transactionDate: { lte: cutoff },
        },
        select: { id: true, transactionNumber: true, transactionDate: true, totalAmount: true },
      });
      return txns.map((t) => ({
        dedupeKey: dedupeKey(AlertModule.FINANCE, 'FinanceTransaction', t.id, 'finance.pending_payment', t.transactionDate),
        module: AlertModule.FINANCE,
        triggerType: AlertTriggerType.OVERDUE,
        severity: AlertSeverity.WARNING,
        title: 'finance.pending_payment',
        message: `Transaction ${t.transactionNumber}: pending since ${t.transactionDate.toISOString().slice(0, 10)}`,
        entityType: 'FinanceTransaction',
        entityId: t.id,
        metadata: { transactionDate: t.transactionDate.toISOString(), totalAmount: Number(t.totalAmount) },
      }));
    },
  },
  {
    key: 'maintenance.open_old',
    async run() {
      const cutoff = new Date(Date.now() - MAINTENANCE_OPEN_DAYS * DAY_MS);
      const items = await prisma.maintenanceRequest.findMany({
        where: {
          status: { in: ['SUBMITTED', 'APPROVED'] },
          completedDate: null,
          requestDate: { lte: cutoff },
        },
        select: { id: true, vehicleId: true, requestDate: true },
      });
      return items.map((m) => ({
        dedupeKey: dedupeKey(AlertModule.MAINTENANCE, 'MaintenanceRequest', m.id, 'maintenance.open_old', m.requestDate),
        module: AlertModule.MAINTENANCE,
        triggerType: AlertTriggerType.OVERDUE,
        severity: AlertSeverity.WARNING,
        title: 'maintenance.open_old',
        message: `Maintenance ${m.id}: open since ${m.requestDate.toISOString().slice(0, 10)}`,
        entityType: 'MaintenanceRequest',
        entityId: m.id,
        vehicleId: m.vehicleId,
        metadata: { requestDate: m.requestDate.toISOString() },
      }));
    },
  },
  {
    key: 'repair.in_progress_long',
    async run() {
      const cutoff = new Date(Date.now() - REPAIR_IN_PROGRESS_DAYS * DAY_MS);
      const items = await prisma.repair.findMany({
        where: {
          status: 'IN_PROGRESS',
          repairDate: { lte: cutoff },
        },
        select: { id: true, vehicleId: true, repairDate: true },
      });
      return items.map((r) => ({
        dedupeKey: dedupeKey(AlertModule.REPAIR, 'Repair', r.id, 'repair.in_progress_long', r.repairDate),
        module: AlertModule.REPAIR,
        triggerType: AlertTriggerType.THRESHOLD,
        severity: AlertSeverity.WARNING,
        title: 'repair.in_progress_long',
        message: `Repair ${r.id}: in progress since ${r.repairDate.toISOString().slice(0, 10)}`,
        entityType: 'Repair',
        entityId: r.id,
        vehicleId: r.vehicleId,
        metadata: { repairDate: r.repairDate.toISOString() },
      }));
    },
  },
];

export async function generateAlerts(dryRun = false): Promise<AlertGenerateResult> {
  const start = Date.now();
  const rules = await prisma.alertRule.findMany({ where: { isActive: true } });
  const ruleIdByKey = new Map<string, string>();
  for (const r of rules) ruleIdByKey.set(r.key, r.id);

  let scanned = 0;
  let created = 0;
  let skipped = 0;

  for (const rule of RULES) {
    const candidates = await rule.run(ruleIdByKey);
    scanned += candidates.length;
    for (const c of candidates) {
      const ruleId = ruleIdByKey.get(rule.key);
      if (!ruleId) continue;
      const result = await upsertAlert({ ...c, ruleId }, dryRun);
      if (result.created) created += 1;
      if (result.skipped) skipped += 1;
    }
  }

  return {
    scanned,
    created,
    skipped,
    dryRun,
    durationMs: Date.now() - start,
  };
}