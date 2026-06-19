import { z } from 'zod';

export const maintenanceIdParamsSchema = z.object({ id: z.string().min(1) });

const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const statusEnum = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED']);

const maintenanceFields = {
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().optional().nullable(),
  issueTitle: z.string().min(1, 'Issue title is required'),
  issueDescription: z.string().optional().nullable(),
  priority: priorityEnum.optional().default('MEDIUM'),
  odometerReading: z.number().int().min(0).optional().nullable(),
  reportedAt: z.string().datetime().optional().default(() => new Date().toISOString()),
};

export const createMaintenanceSchema = z.object(maintenanceFields);
export const updateMaintenanceSchema = z.object({
  ...Object.fromEntries(Object.entries(maintenanceFields).map(([key, value]) => [key, value.optional()])),
});

export const maintenanceActionSchema = z.object({ notes: z.string().optional().nullable() });
export const maintenanceAssignSchema = z.object({ assignedById: z.string().min(1) });

export const maintenanceQuerySchema = z.object({
  search: z.string().optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
