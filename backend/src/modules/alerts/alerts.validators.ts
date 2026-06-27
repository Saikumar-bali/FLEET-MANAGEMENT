import { z } from 'zod';

const alertSeverity = z.enum(['INFO', 'WARNING', 'CRITICAL']);
const alertStatus = z.enum(['UNREAD', 'READ', 'RESOLVED', 'DISMISSED']);
const alertModule = z.enum([
  'VEHICLE',
  'DRIVER',
  'TRIP',
  'FUEL',
  'DOCUMENTS',
  'COMPLIANCE',
  'FINANCE',
  'MAINTENANCE',
  'REPAIR',
  'SYSTEM',
]);

export const listAlertsQuerySchema = z.object({
  search: z.string().optional(),
  status: alertStatus.optional(),
  module: alertModule.optional(),
  severity: alertSeverity.optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  tripId: z.string().optional(),
  entityType: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const alertIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const bulkResolveSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  action: z.enum(['read', 'resolve', 'dismiss']),
});

export const generateAlertsSchema = z.object({
  dryRun: z.boolean().optional().default(false),
});

export const alertRuleIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listAlertRulesQuerySchema = z.object({
  search: z.string().optional(),
  module: alertModule.optional(),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const updateAlertRuleSchema = z.object({
  severity: alertSeverity.optional(),
  isActive: z.boolean().optional(),
  thresholdDays: z.number().int().min(0).nullable().optional(),
  thresholdValue: z.number().min(0).nullable().optional(),
  description: z.string().optional(),
});

export type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>;
export type BulkResolveInput = z.infer<typeof bulkResolveSchema>;
export type GenerateAlertsInput = z.infer<typeof generateAlertsSchema>;
export type ListAlertRulesQuery = z.infer<typeof listAlertRulesQuerySchema>;
export type UpdateAlertRuleInput = z.infer<typeof updateAlertRuleSchema>;