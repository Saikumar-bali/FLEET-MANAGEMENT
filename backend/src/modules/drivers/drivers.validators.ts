import { z } from 'zod';

export const driverIdParamsSchema = z.object({
  id: z.string().min(1, 'Driver id is required'),
});

const driverStatusEnum = z.enum(['AVAILABLE', 'ON_TRIP', 'ON_LEAVE', 'SUSPENDED', 'INACTIVE']);

export const createDriverSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().min(10, 'Mobile must be at least 10 characters').max(20, 'Mobile is too long'),
  alternateMobile: z.string().max(20, 'Alternate mobile is too long').optional().or(z.literal('')),
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseExpiry: z.string().datetime().optional().nullable(),
  address: z.string().optional().or(z.literal('')),
  emergencyContact: z.string().optional().or(z.literal('')),
  experienceYears: z.number().int().min(0).optional().nullable(),
  status: driverStatusEnum.default('AVAILABLE'),
  createUserAccount: z.boolean().optional().default(false),
});

export const updateDriverSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  mobile: z.string().min(10).max(20).optional(),
  alternateMobile: z.string().max(20).optional().or(z.literal('')),
  licenseNumber: z.string().min(1).optional(),
  licenseExpiry: z.string().datetime().optional().nullable(),
  address: z.string().optional().or(z.literal('')),
  emergencyContact: z.string().optional().or(z.literal('')),
  experienceYears: z.number().int().min(0).optional().nullable(),
  status: driverStatusEnum.optional(),
});

export const updateDriverStatusSchema = z.object({
  status: driverStatusEnum,
});

export const driverQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
