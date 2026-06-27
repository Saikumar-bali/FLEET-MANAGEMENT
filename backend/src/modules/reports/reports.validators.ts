import { z } from 'zod';

const dateRange = {
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
};

export const dateRangeQuerySchema = z.object({
  ...dateRange,
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const complianceExpiryQuerySchema = z.object({
  daysToExpire: z.coerce.number().int().min(1).max(365).default(30),
  vehicleId: z.string().optional(),
});

export const reportKeyParamSchema = z.object({
  key: z.enum([
    'vehicle-utilization',
    'trip-summary',
    'fuel-summary',
    'fuel-missing-receipts',
    'finance-pnl',
    'compliance-expiry',
    'document-verification',
    'maintenance-summary',
  ]),
});

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
export type ComplianceExpiryQuery = z.infer<typeof complianceExpiryQuerySchema>;
export type ReportKeyParam = z.infer<typeof reportKeyParamSchema>;