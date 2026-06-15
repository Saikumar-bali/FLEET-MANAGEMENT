import { z } from 'zod';

export const fuelIdParamsSchema = z.object({ id: z.string().min(1) });
const statusEnum = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED']);

const fuelFields = {
  vehicleId: z.string().min(1, 'Vehicle is required'),
  tripId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  fuelDate: z.string().datetime(),
  odometerReading: z.number().int().min(0).optional().nullable(),
  fuelType: z.string().min(1),
  quantityLiters: z.number().positive(),
  pricePerLiter: z.number().positive(),
  totalAmount: z.number().positive().optional(),
  stationName: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
};

export const createFuelSchema = z.object(fuelFields);
export const updateFuelSchema = z.object({
  ...Object.fromEntries(Object.entries(fuelFields).map(([key, value]) => [key, value.optional()])),
});
export const fuelActionSchema = z.object({ notes: z.string().optional().nullable() });
export const fuelQuerySchema = z.object({
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
