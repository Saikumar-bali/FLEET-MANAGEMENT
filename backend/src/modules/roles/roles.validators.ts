import { z } from 'zod';

export const roleIdParamsSchema = z.object({
  id: z.string().min(1, 'Role id is required'),
});

export const createRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  key: z.string().min(2, 'Role key must be at least 2 characters').regex(/^[a-z0-9_]+$/, 'Role key must use lowercase letters, numbers, or underscores'),
  description: z.string().max(255, 'Description is too long').optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').optional(),
  key: z.string().min(2, 'Role key must be at least 2 characters').regex(/^[a-z0-9_]+$/, 'Role key must use lowercase letters, numbers, or underscores').optional(),
  description: z.string().max(255, 'Description is too long').optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const assignPermissionsSchema = z.object({
  permissionKeys: z.array(z.string().min(1)).min(1, 'At least one permission is required'),
});
