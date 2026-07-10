import { z } from 'zod';

const paymentModeEnum = z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'OTHER']);
const settlementStatusEnum = z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'SETTLED', 'REJECTED', 'NEEDS_CHANGES', 'CANCELLED']);
const advanceStatusEnum = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'ISSUED', 'PARTIALLY_SETTLED', 'SETTLED', 'REJECTED', 'NEEDS_CHANGES', 'CANCELLED']);

const optionalId = z.string().min(1).optional().nullable();
const positiveMoney = z.coerce.number().finite().gt(0, 'Amount must be greater than 0');
const nonNegativeMoney = z.coerce.number().finite().min(0, 'Amount cannot be negative');
const optionalDate = z.string().datetime().optional().nullable().or(z.string().min(1).optional().nullable());
const queryBoolean = z.union([z.boolean(), z.string()]).optional().transform((val) => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'boolean') return val;
  return val.toLowerCase() === 'true' || val === '1';
});

export const idParamsSchema = z.object({ id: z.string().min(1) });

export const driverAdvanceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: advanceStatusEnum.optional(),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
  tripId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  overdueOnly: queryBoolean,
});

export const driverAdvanceReportQuerySchema = z.object({
  status: advanceStatusEnum.optional(),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const driverSettlementQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: settlementStatusEnum.optional(),
  advanceId: z.string().optional(),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
  tripId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const createDriverAdvanceSchema = z.object({
  driverId: z.string().min(1, 'driverId is required'),
  vehicleId: optionalId,
  tripId: optionalId,
  accountId: optionalId,
  amount: positiveMoney,
  paymentMode: paymentModeEnum.default('CASH'),
  dueDate: optionalDate,
  purpose: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateDriverAdvanceSchema = z.object({
  driverId: z.string().min(1).optional(),
  vehicleId: optionalId,
  tripId: optionalId,
  accountId: optionalId,
  amount: positiveMoney.optional(),
  paymentMode: paymentModeEnum.optional(),
  dueDate: optionalDate,
  purpose: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const issueDriverAdvanceSchema = z.object({
  accountId: optionalId,
  paymentMode: paymentModeEnum.optional(),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const transitionAdvanceSchema = z.object({
  reason: z.string().max(1000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const cancelDriverAdvanceSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(1000),
});

export const createDriverSettlementSchema = z.object({
  returnedCashAmount: nonNegativeMoney.default(0),
  adjustmentAmount: z.coerce.number().finite().default(0),
  notes: z.string().max(2000).optional().nullable(),
  includeApprovedFuel: z.boolean().default(true),
  includeApprovedExpenses: z.boolean().default(true),
});

export const transitionSettlementSchema = z.object({
  reason: z.string().max(1000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const settleDriverSettlementSchema = z.object({
  accountId: optionalId,
  returnedCashAmount: nonNegativeMoney.optional(),
  paymentMode: paymentModeEnum.default('CASH'),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const cashReturnSchema = z.object({
  amount: positiveMoney,
  paymentMode: paymentModeEnum.default('CASH'),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});
