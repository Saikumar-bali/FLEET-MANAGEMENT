import { z } from 'zod';

export const expenseIdParamsSchema = z.object({ id: z.string().min(1) });
const statusEnum = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED']);
const paymentSourceEnum = z.enum(['STAFF_WALLET', 'COMPANY_ACCOUNT', 'CORPORATE_CARD', 'VENDOR_CREDIT', 'PERSONAL_MONEY']);

const expenseFields = {
  vehicleId: z.string().min(1, 'Vehicle is required'),
  tripId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  category: z.string().min(1),
  expenseDate: z.string().datetime(),
  amount: z.number().positive(),
  vendor: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  paymentSource: paymentSourceEnum.default('COMPANY_ACCOUNT'),
  financeAccountId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
};

export const createExpenseSchema = z.object(expenseFields);
export const updateExpenseSchema = z.object({
  ...Object.fromEntries(Object.entries(expenseFields).map(([key, value]) => [key, value.optional()])),
});
export const expenseActionSchema = z.object({ notes: z.string().optional().nullable() });
export const expenseQuerySchema = z.object({
  search: z.string().optional(),
  vehicleId: z.string().optional(),
  tripId: z.string().optional(),
  driverId: z.string().optional(),
  status: statusEnum.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
