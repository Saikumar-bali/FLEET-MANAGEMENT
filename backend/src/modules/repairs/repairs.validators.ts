import { z } from 'zod';

export const repairIdParamsSchema = z.object({ id: z.string().min(1) });

const statusEnum = z.enum(['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

const repairFields = {
  maintenanceRequestId: z.string().optional().nullable(),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  assignedMechanicId: z.string().optional().nullable(),
  vendorName: z.string().optional().nullable(),
  repairType: z.string().min(1, 'Repair type is required'),
  repairNotes: z.string().optional().nullable(),
  laborCost: z.number().min(0).optional().nullable(),
  partsCost: z.number().min(0).optional().nullable(),
  totalCost: z.number().min(0).optional().nullable(),
  startedAt: z.string().datetime().optional().nullable(),
};

function totalCostRefine(data: Record<string, unknown>) {
  const labor = data.laborCost;
  const parts = data.partsCost;
  const total = data.totalCost;
  if (typeof labor === 'number' && typeof parts === 'number' && typeof total === 'number') {
    return Math.abs(total - (labor + parts)) < 0.01;
  }
  return true;
}

export const createRepairSchema = z.object(repairFields).refine(totalCostRefine, { message: 'totalCost must equal laborCost + partsCost when both are provided' });

export const updateRepairSchema = z.object({
  ...Object.fromEntries(Object.entries(repairFields).map(([key, value]) => [key, value.optional()])),
}).refine(totalCostRefine, { message: 'totalCost must equal laborCost + partsCost when both are provided' });

export const repairActionSchema = z.object({ notes: z.string().optional().nullable() });

export const repairQuerySchema = z.object({
  search: z.string().optional(),
  vehicleId: z.string().optional(),
  maintenanceRequestId: z.string().optional(),
  assignedMechanicId: z.string().optional(),
  status: statusEnum.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
