import { z } from 'zod';

// Asset Category schemas
export const assetCategoryIdParamsSchema = z.object({
  id: z.string().min(1, 'Asset category id is required'),
});

const assetCategoryStatusEnum = z.enum(['ACTIVE', 'INACTIVE']);

export const createAssetCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  key: z.string().min(2, 'Key must be at least 2 characters')
    .regex(/^[a-z0-9_]+$/, 'Key must use lowercase letters, numbers, or underscores'),
  description: z.string().optional().or(z.literal('')),
  status: assetCategoryStatusEnum.default('ACTIVE'),
});

export const updateAssetCategorySchema = z.object({
  name: z.string().min(2).optional(),
  key: z.string().min(2).regex(/^[a-z0-9_]+$/, 'Key must use lowercase letters, numbers, or underscores').optional(),
  description: z.string().optional().or(z.literal('')),
  status: assetCategoryStatusEnum.optional(),
});

// Asset schemas
export const assetIdParamsSchema = z.object({
  id: z.string().min(1, 'Asset id is required'),
});

const assetStatusEnum = z.enum(['AVAILABLE', 'ASSIGNED', 'DAMAGED', 'LOST', 'UNDER_REPAIR', 'RETIRED']);

export const createAssetSchema = z.object({
  assetCode: z.string().min(1, 'Asset code is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  assetCategoryId: z.string().min(1, 'Asset category is required'),
  serialNumber: z.string().optional().or(z.literal('')),
  purchaseDate: z.string().datetime().optional().nullable(),
  purchaseAmount: z.number().min(0).optional().nullable(),
  currentStatus: assetStatusEnum.default('AVAILABLE'),
  notes: z.string().optional().or(z.literal('')),
});

export const updateAssetSchema = z.object({
  assetCode: z.string().min(1).optional(),
  name: z.string().min(2).optional(),
  assetCategoryId: z.string().min(1).optional(),
  serialNumber: z.string().optional().or(z.literal('')),
  purchaseDate: z.string().datetime().optional().nullable(),
  purchaseAmount: z.number().min(0).optional().nullable(),
  currentStatus: assetStatusEnum.optional(),
  notes: z.string().optional().or(z.literal('')),
});

export const updateAssetStatusSchema = z.object({
  currentStatus: assetStatusEnum,
});

export const assetQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  categoryId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
