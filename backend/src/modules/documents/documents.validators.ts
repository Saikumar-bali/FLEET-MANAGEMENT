import { z } from 'zod';

export const documentIdParamsSchema = z.object({
  id: z.string().min(1, 'Document id is required'),
});

export const uploadDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional(),
  documentType: z.string().min(1, 'Document type is required'),
  documentCategory: z.string().min(1, 'Document category is required'),
  linkedEntityType: z.string().optional(),
  linkedEntityId: z.string().optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  tripId: z.string().optional(),
  customerId: z.string().optional(),
  vendorId: z.string().optional(),
  financeTransactionId: z.string().optional(),
  tripBillingId: z.string().optional(),
  maintenanceRequestId: z.string().optional(),
  repairId: z.string().optional(),
  fuelEntryId: z.string().optional(),
  staffProfileId: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  tags: z.string().optional(),
  metadata: z.string().optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  documentType: z.string().min(1).optional(),
  documentCategory: z.string().min(1).optional(),
  linkedEntityType: z.string().optional(),
  linkedEntityId: z.string().optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  tripId: z.string().optional(),
  customerId: z.string().optional(),
  vendorId: z.string().optional(),
  fuelEntryId: z.string().optional(),
  staffProfileId: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  tags: z.string().optional(),
  metadata: z.string().optional(),
});

export const documentQuerySchema = z.object({
  search: z.string().optional(),
  documentType: z.string().optional(),
  documentCategory: z.string().optional(),
  linkedEntityType: z.string().optional(),
  linkedEntityId: z.string().optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  tripId: z.string().optional(),
  customerId: z.string().optional(),
  vendorId: z.string().optional(),
  fuelEntryId: z.string().optional(),
  staffProfileId: z.string().optional(),
  status: z.string().optional(),
  verificationStatus: z.string().optional(),
  expiringBefore: z.string().optional(),
  uploadedById: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional().default('createdAt'),
  order: z.string().optional().default('desc'),
});

export const verifyDocumentSchema = z.object({
  verificationStatus: z.enum(['VERIFIED', 'REJECTED']),
  notes: z.string().max(2000).optional(),
});
