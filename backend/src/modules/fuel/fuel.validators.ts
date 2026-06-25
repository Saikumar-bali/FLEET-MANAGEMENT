import { z } from 'zod';

export const fuelIdParamsSchema = z.object({ id: z.string().min(1) });
const statusEnum = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED']);
const entryModeEnum = z.enum(['QUICK_AMOUNT', 'FULL_DETAILS', 'RECEIPT_ASSISTED']);

const baseFuelFields = {
  vehicleId: z.string().min(1, 'Vehicle is required'),
  tripId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  fuelDate: z.string().datetime(),
  odometerReading: z.number().int().min(0).optional().nullable(),
  fuelType: z.string().min(1),
  stationName: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  paymentMode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
};

export const createFuelSchema = z.discriminatedUnion('entryMode', [
  z.object({
    ...baseFuelFields,
    entryMode: z.literal('QUICK_AMOUNT'),
    totalAmount: z.number().positive('Total amount must be greater than 0'),
    quantityLiters: z.number().positive().optional().nullable(),
    pricePerLiter: z.number().positive().optional().nullable(),
  }),
  z.object({
    ...baseFuelFields,
    entryMode: z.literal('FULL_DETAILS'),
    quantityLiters: z.number().positive('Quantity is required'),
    pricePerLiter: z.number().positive('Price per liter is required'),
    totalAmount: z.number().positive().optional(),
  }),
  z.object({
    ...baseFuelFields,
    entryMode: z.literal('RECEIPT_ASSISTED'),
    totalAmount: z.number().positive('Total amount must be greater than 0'),
    quantityLiters: z.number().positive().optional().nullable(),
    pricePerLiter: z.number().positive().optional().nullable(),
  }),
]);

export const updateFuelSchema = z.object({
  ...Object.fromEntries(Object.entries(baseFuelFields).map(([key, value]) => [key, value.optional()])),
  entryMode: entryModeEnum.optional(),
  totalAmount: z.number().positive().optional(),
  quantityLiters: z.number().positive().optional().nullable(),
  pricePerLiter: z.number().positive().optional().nullable(),
  paymentMode: z.string().optional().nullable(),
});

export const fuelActionSchema = z.object({ notes: z.string().optional().nullable() });

export const fuelQuerySchema = z.object({
  search: z.string().optional(),
  vehicleId: z.string().optional(),
  tripId: z.string().optional(),
  driverId: z.string().optional(),
  status: statusEnum.optional(),
  entryMode: entryModeEnum.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
