import { z } from 'zod';

export const createStaffProfileSchema = z.object({
  profileType: z.string().min(1, 'Profile type is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateStaffProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const staffProfileQuerySchema = z.object({
  profileType: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const staffProfileIdParamsSchema = z.object({
  id: z.string().min(1),
});
