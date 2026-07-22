import { z } from 'zod';

const id = z.string().min(1);
const money = z.coerce.number().finite().min(0);
const positiveMoney = z.coerce.number().finite().gt(0);
const paymentMode = z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'CREDIT', 'OTHER']);

export const financeIdParamsSchema = z.object({ id });
export const walletUserParamsSchema = z.object({ userId: id });
export const staffFinanceListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  beneficiaryUserId: z.string().optional(),
  tripId: z.string().optional(),
});

export const createStaffAdvanceSchema = z.object({
  beneficiaryUserId: id,
  contextType: z.enum(['TRIP', 'REPAIR', 'MAINTENANCE', 'PURCHASE', 'OTHER']),
  contextId: id,
  tripId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  targetAllowance: positiveMoney,
  fundingMode: z.enum(['USE_EXISTING_BALANCE', 'PRESERVE_EXISTING_BALANCE']).default('USE_EXISTING_BALANCE'),
  paymentMode: paymentMode.default('CASH'),
  dueDate: z.string().datetime().optional().nullable(),
  purpose: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const transitionSchema = z.object({ reason: z.string().max(2000).optional().nullable(), notes: z.string().max(2000).optional().nullable() });
export const fundStaffAdvanceSchema = z.object({ accountId: z.string().optional().nullable(), paymentMode: paymentMode.optional() });
export const cancelStaffAdvanceSchema = z.object({ reason: z.string().min(1).max(2000) });
export const createStaffSettlementSchema = z.object({
  advanceId: id,
  disposition: z.enum(['RETURN', 'CARRY_FORWARD']),
  declaredReturnAmount: money.optional(),
  notes: z.string().max(2000).optional().nullable(),
});
export const confirmStaffSettlementSchema = z.object({
  accountId: z.string().optional().nullable(),
  paymentMode: paymentMode.optional(),
  referenceNumber: z.string().max(200).optional().nullable(),
  proofDocumentId: z.string().optional().nullable(),
});

export const allowancePolicySchema = z.object({
  name: z.string().min(2).max(120),
  tripType: z.enum(['TRANSFER', 'DELIVERY', 'PICKUP', 'SERVICE', 'INTERNAL']).optional().nullable(),
  baseAmount: money.default(0),
  perKmAmount: money.default(0),
  maxAmount: money.optional().nullable(),
  autoApproveThreshold: money.optional().nullable(),
  fundingMode: z.enum(['USE_EXISTING_BALANCE', 'PRESERVE_EXISTING_BALANCE']).default('USE_EXISTING_BALANCE'),
  accountId: z.string().optional().nullable(),
  paymentMode: paymentMode.default('CASH'),
  autoFund: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
export const updateAllowancePolicySchema = allowancePolicySchema.partial();
