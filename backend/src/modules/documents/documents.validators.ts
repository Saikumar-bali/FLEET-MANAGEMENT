import { z } from 'zod';

export const documentIdParamsSchema = z.object({
  id: z.string().min(1, 'Document id is required'),
});

const documentEntityTypeEnum = z.enum(['VEHICLE', 'DRIVER', 'ASSET']);

export const createDocumentSchema = z.object({
  entityType: documentEntityTypeEnum,
  entityId: z.string().min(1, 'Entity id is required'),
  documentType: z.string().min(1, 'Document type is required'),
  documentNumber: z.string().optional().or(z.literal('')),
  expiryDate: z.string().datetime().optional().nullable(),
  fileUrl: z.string().optional().or(z.literal('')),
  fileName: z.string().optional().or(z.literal('')),
  mimeType: z.string().optional().or(z.literal('')),
  sizeBytes: z.number().int().min(0).optional().nullable(),
});

export const updateDocumentSchema = z.object({
  documentType: z.string().min(1).optional(),
  documentNumber: z.string().optional().or(z.literal('')),
  expiryDate: z.string().datetime().optional().nullable(),
  fileUrl: z.string().optional().or(z.literal('')),
  fileName: z.string().optional().or(z.literal('')),
  mimeType: z.string().optional().or(z.literal('')),
  sizeBytes: z.number().int().min(0).optional().nullable(),
});

export const documentQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  documentType: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
