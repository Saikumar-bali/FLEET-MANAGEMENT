import type { AlertModule, AlertSeverity, AlertStatus, AlertTriggerType } from '@prisma/client';

export type AlertWithRule = {
  id: string;
  dedupeKey: string;
  module: AlertModule;
  triggerType: AlertTriggerType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  vehicleId: string | null;
  driverId: string | null;
  tripId: string | null;
  metadata: unknown;
  detectedAt: Date;
  readAt: Date | null;
  resolvedAt: Date | null;
  resolvedById: string | null;
  ruleId: string | null;
  createdAt: Date;
  updatedAt: Date;
  rule?: {
    key: string;
    title: string;
    description: string | null;
  } | null;
};

export type AlertSummary = {
  unreadCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  resolvedToday: number;
  byModule: Array<{ module: AlertModule; count: number }>;
  recentAlerts: AlertWithRule[];
  dueSoonAlerts: AlertWithRule[];
};

export type AlertGenerateResult = {
  scanned: number;
  created: number;
  skipped: number;
  dryRun: boolean;
  durationMs: number;
};

export function entityLinkFor(alert: Pick<AlertWithRule, 'entityType' | 'entityId'>): string | null {
  if (!alert.entityId) return null;
  switch (alert.entityType) {
    case 'Vehicle':
      return `/vehicles/${alert.entityId}`;
    case 'Driver':
      return `/drivers/${alert.entityId}`;
    case 'Trip':
      return `/trips/${alert.entityId}`;
    case 'TripBilling':
      return `/finance/trip-billings`;
    case 'FinanceTransaction':
      return `/finance/transactions`;
    case 'FuelEntry':
      return `/fuel/${alert.entityId}`;
    case 'MaintenanceRequest':
      return `/maintenance/${alert.entityId}`;
    case 'Repair':
      return `/repairs/${alert.entityId}`;
    case 'VehicleComplianceDocument':
      return `/compliance`;
    case 'Document':
      return `/documents`;
    default:
      return '/alerts';
  }
}