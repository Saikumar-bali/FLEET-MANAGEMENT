import { z } from 'zod';

const financeAccountTypeEnum = z.enum(['CASH', 'BANK', 'WALLET', 'CREDIT', 'OTHER']);
const financeCategoryTypeEnum = z.enum(['INCOME', 'EXPENSE']);
const financeCategoryModuleEnum = z.enum(['TRIP', 'FUEL', 'EXPENSE', 'MAINTENANCE', 'REPAIR', 'COMPLIANCE', 'DRIVER', 'GENERAL']);
const vendorTypeEnum = z.enum(['FUEL_STATION', 'WORKSHOP', 'INSURANCE', 'PERMIT_AGENT', 'RTO_AGENT', 'GPS_VENDOR', 'GENERAL']);
const financeTransactionTypeEnum = z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT']);
const financeSourceModuleEnum = z.enum(['TRIP', 'FUEL', 'EXPENSE', 'MAINTENANCE', 'REPAIR', 'COMPLIANCE', 'DRIVER', 'MANUAL']);
const paymentModeEnum = z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'CREDIT', 'OTHER']);
const tripBillingPaymentStatusEnum = z.enum(['UNBILLED', 'BILLED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']);
const financePaymentStatusEnum = z.enum(['PENDING', 'PAID', 'PARTIAL', 'FAILED', 'CANCELLED']);

// ─── Finance Account ───
export const createFinanceAccountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: financeAccountTypeEnum,
  accountNumberMasked: z.string().optional(),
  bankName: z.string().optional(),
  openingBalance: z.number().optional(),
});

export const updateFinanceAccountSchema = z.object({
  name: z.string().min(1).optional(),
  type: financeAccountTypeEnum.optional(),
  accountNumberMasked: z.string().optional(),
  bankName: z.string().optional(),
  openingBalance: z.number().optional(),
  isActive: z.boolean().optional(),
});

// ─── Finance Category ───
export const createFinanceCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: financeCategoryTypeEnum,
  module: financeCategoryModuleEnum,
});

// ─── Vendor ───
export const createVendorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  vendorType: vendorTypeEnum,
  phone: z.string().optional(),
  email: z.string().email().optional(),
  gstin: z.string().optional(),
  address: z.string().optional(),
});

export const updateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  vendorType: vendorTypeEnum.optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  gstin: z.string().optional(),
  address: z.string().optional(),
});

// ─── Customer ───
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  gstin: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  gstin: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
});

// ─── Trip Billing ───
export const createTripBillingSchema = z.object({
  tripId: z.string().min(1, 'Trip ID is required'),
  customerId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().datetime(),
  billingAmount: z.number().min(0),
  taxAmount: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const updateTripBillingSchema = z.object({
  customerId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().datetime().optional(),
  billingAmount: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// ─── Finance Transaction ───
export const createFinanceTransactionSchema = z.object({
  transactionType: financeTransactionTypeEnum,
  sourceModule: financeSourceModuleEnum,
  sourceId: z.string().optional(),
  vehicleId: z.string().optional(),
  tripId: z.string().optional(),
  driverId: z.string().optional(),
  vendorId: z.string().optional(),
  customerId: z.string().optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  amount: z.number(),
  taxAmount: z.number().min(0).optional(),
  transactionDate: z.string().datetime(),
  paymentMode: paymentModeEnum,
  referenceNumber: z.string().optional(),
  description: z.string().optional(),
});

// ─── Payment Record ───
export const createPaymentRecordSchema = z.object({
  transactionId: z.string().optional(),
  tripBillingId: z.string().optional(),
  accountId: z.string().optional(),
  vendorId: z.string().optional(),
  customerId: z.string().optional(),
  amount: z.number().min(0),
  paymentDate: z.string().datetime(),
  paymentMode: paymentModeEnum,
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePaymentRecordSchema = z.object({
  transactionId: z.string().optional(),
  tripBillingId: z.string().optional(),
  accountId: z.string().optional(),
  vendorId: z.string().optional(),
  customerId: z.string().optional(),
  amount: z.number().min(0).optional(),
  paymentDate: z.string().datetime().optional(),
  paymentMode: paymentModeEnum.optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Query schemas ───
export const financeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  type: z.string().optional(),
  module: z.string().optional(),
  status: z.string().optional(),
  vehicleId: z.string().optional(),
  tripId: z.string().optional(),
  driverId: z.string().optional(),
  vendorId: z.string().optional(),
  customerId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  paymentMode: z.string().optional(),
  paymentStatus: z.string().optional(),
});

export const pnlQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
});

// ─── ID params ───
export const idParamsSchema = z.object({ id: z.string().min(1) });
