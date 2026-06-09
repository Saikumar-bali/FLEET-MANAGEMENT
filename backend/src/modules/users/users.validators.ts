import { z } from 'zod';

export const userIdParamsSchema = z.object({
  id: z.string().min(1, 'User id is required'),
});

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('A valid email is required').transform((value) => value.toLowerCase()),
  mobile: z.string().max(20, 'Mobile number is too long').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId: z.string().min(1, 'Role is required'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  mobile: z.string().max(20, 'Mobile number is too long').optional().or(z.literal('')),
  roleId: z.string().min(1, 'Role is required').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
});

export const updateUserPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
