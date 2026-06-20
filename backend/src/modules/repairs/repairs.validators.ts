import { z } from 'zod';

export const repairIdParamsSchema = z.object({ id: z.string().min(1) });
const repairStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

const repairFields = {
  vehicleId: z.string().min(1, 'Vehicle is required'),
  tripId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  repairDate: z.string().datetime(),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  estimatedCost: z.number().min(0).optional().nullable(),
  actualCost: z.number().min(0).optional().nullable(),
  provider: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
};

export const createRepairSchema = z.object(repairFields);
export const updateRepairSchema = z.object({
  ...Object.fromEntries(Object.entries(repairFields).map(([key, value]) => [key, value.optional()])),
});
export const repairActionSchema = z.object({ notes: z.string().optional().nullable() });
export const repairQuerySchema = z.object({
  search: z.string().optional(),
  vehicleId: z.string().optional(),
  tripId: z.string().optional(),
  driverId: z.string().optional(),
  status: repairStatusEnum.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
