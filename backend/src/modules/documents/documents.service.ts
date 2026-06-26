import * as crypto from 'crypto';
import * as path from 'path';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { getStorageProvider } from '../../lib/storage/storage.service';
import type { Prisma } from '@prisma/client';
import type { DocumentUploadInput, DocumentUpdateInput, DocumentListQuery } from './documents.types';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const BLOCKED_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'pif', 'vbs', 'js', 'ws', 'wsh',
  'ps1', 'sh', 'bash', 'csh', 'ksh', 'php', 'py', 'rb', 'pl',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function generateDocumentNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `DOC-${dateStr}-${random}`;
}

export function sanitizeFileName(fileName: string): string {
  const base = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 200);
}

export function validateFileType(mimeType: string, originalName: string): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new AppError(`File type ${mimeType} is not allowed. Allowed: PDF, JPEG, PNG, WebP`, 400);
  }
  const ext = path.extname(originalName).toLowerCase().replace('.', '');
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    throw new AppError(`File extension .${ext} is blocked for security`, 400);
  }
}

export function validateFileSize(sizeBytes: number): void {
  if (sizeBytes > MAX_FILE_SIZE) {
    throw new AppError(`File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB`, 400);
  }
}

export async function listDocuments(query: DocumentListQuery) {
  const where: Prisma.DocumentWhereInput = {
    documentStatus: { not: 'DELETED' },
  };

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
      { documentNumber: { contains: query.search, mode: 'insensitive' } },
      { originalFileName: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.documentType) where.documentType = query.documentType as any;
  if (query.documentCategory) where.documentCategory = query.documentCategory as any;
  if (query.linkedEntityType) where.linkedEntityType = query.linkedEntityType as any;
  if (query.linkedEntityId) where.linkedEntityId = query.linkedEntityId;
  if (query.vehicleId) where.vehicleId = query.vehicleId;
  if (query.driverId) where.driverId = query.driverId;
  if (query.tripId) where.tripId = query.tripId;
  if (query.customerId) where.customerId = query.customerId;
  if (query.vendorId) where.vendorId = query.vendorId;
  if (query.fuelEntryId) where.fuelEntryId = query.fuelEntryId;
  if (query.status) where.documentStatus = query.status as any;
  if (query.verificationStatus) where.verificationStatus = query.verificationStatus as any;
  if (query.uploadedById) where.uploadedById = query.uploadedById;

  if (query.expiringBefore) {
    where.expiryDate = { lte: new Date(query.expiringBefore), not: null };
  }

  const page = query.page || 1;
  const limit = query.limit || 20;
  const sortField = query.sort || 'createdAt';
  const sortOrder = query.order === 'asc' ? 'asc' : 'desc';

  const orderBy: Prisma.DocumentOrderByWithRelationInput = {
    [sortField]: sortOrder,
  };

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        verifiedBy: { select: { id: true, name: true } },
        vehicle: { select: { id: true, vehicleNumber: true } },
        driver: { select: { id: true, name: true } },
        trip: { select: { id: true, tripNumber: true } },
      },
    }),
    prisma.document.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getDocumentById(id: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      verifiedBy: { select: { id: true, name: true } },
      vehicle: { select: { id: true, vehicleNumber: true } },
      driver: { select: { id: true, name: true } },
      trip: { select: { id: true, tripNumber: true } },
      customer: { select: { id: true, name: true } },
      vendor: { select: { id: true, name: true } },
    },
  });

  if (!doc || doc.documentStatus === 'DELETED') {
    throw new AppError('Document not found', 404);
  }

  let fileUrl: string | null = null;
  try {
    const storage = getStorageProvider();
    fileUrl = await storage.getSignedViewUrl(doc.storageKey, doc.mimeType);
  } catch (err: any) {
    console.error('[getDocumentById] Failed to generate signed URL:', err?.message ?? err);
  }

  return { ...doc, fileUrl };
}

export async function uploadDocument(
  file: Express.Multer.File,
  input: DocumentUploadInput,
  uploadedById: string,
) {
  validateFileType(file.mimetype, file.originalname);
  validateFileSize(file.size);

  if (input.vehicleId) {
    const exists = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!exists) throw new AppError('Vehicle not found', 400);
  }
  if (input.driverId) {
    const exists = await prisma.driver.findUnique({ where: { id: input.driverId } });
    if (!exists) throw new AppError('Driver not found', 400);
  }
  if (input.tripId) {
    const exists = await prisma.trip.findUnique({ where: { id: input.tripId } });
    if (!exists) throw new AppError('Trip not found', 400);
  }
  if (input.customerId) {
    const exists = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!exists) throw new AppError('Customer not found', 400);
  }
  if (input.vendorId) {
    const exists = await prisma.vendor.findUnique({ where: { id: input.vendorId } });
    if (!exists) throw new AppError('Vendor not found', 400);
  }
  if (input.fuelEntryId) {
    const exists = await prisma.fuelEntry.findUnique({ where: { id: input.fuelEntryId } });
    if (!exists) throw new AppError('Fuel entry not found', 400);
  }

  const storage = getStorageProvider();
  const docNumber = generateDocumentNumber();
  const safeOriginal = sanitizeFileName(file.originalname);
  const ext = path.extname(safeOriginal);
  const storedFileName = `${docNumber}${ext}`;
  const storageKey = `documents/${new Date().toISOString().slice(0, 7)}/${storedFileName}`;

  const result = await storage.uploadFile(file.buffer, storageKey, file.mimetype);

  let tags: string[] = [];
  if (input.tags) {
    try {
      tags = JSON.parse(input.tags);
    } catch {
      tags = input.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }

  let metadata: Prisma.InputJsonValue | undefined;
  if (input.metadata) {
    try {
      metadata = JSON.parse(input.metadata) as Prisma.InputJsonValue;
    } catch {
      metadata = undefined;
    }
  }

  const doc = await prisma.document.create({
    data: {
      documentNumber: docNumber,
      title: input.title,
      description: input.description,
      originalFileName: safeOriginal,
      storedFileName,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      fileExtension: ext.replace('.', ''),
      storageProvider: result.storageProvider,
      storageBucket: result.storageBucket,
      storageKey: result.storageKey,
      checksumSha256: result.checksumSha256,
      documentType: input.documentType as any,
      documentCategory: input.documentCategory as any,
      linkedEntityType: input.linkedEntityType as any || null,
      linkedEntityId: input.linkedEntityId || null,
      vehicleId: input.vehicleId || null,
      driverId: input.driverId || null,
      tripId: input.tripId || null,
      customerId: input.customerId || null,
      vendorId: input.vendorId || null,
      financeTransactionId: input.financeTransactionId || null,
      tripBillingId: input.tripBillingId || null,
      maintenanceRequestId: input.maintenanceRequestId || null,
      repairId: input.repairId || null,
      fuelEntryId: input.fuelEntryId || null,
      issueDate: input.issueDate ? new Date(input.issueDate) : null,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      tags,
      metadata,
      uploadedById,
    },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      vehicle: { select: { id: true, vehicleNumber: true } },
      driver: { select: { id: true, name: true } },
      trip: { select: { id: true, tripNumber: true } },
    },
  });

  return doc;
}

export async function updateDocument(documentId: string, input: DocumentUpdateInput) {
  const existing = await prisma.document.findUnique({ where: { id: documentId } });
  if (!existing || existing.documentStatus === 'DELETED') {
    throw new AppError('Document not found', 404);
  }

  let tags: string[] | undefined;
  if (input.tags !== undefined) {
    try {
      tags = JSON.parse(input.tags);
    } catch {
      tags = input.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }

  let metadata: Prisma.InputJsonValue | undefined;
  if (input.metadata !== undefined) {
    try {
      metadata = JSON.parse(input.metadata) as Prisma.InputJsonValue;
    } catch {
      metadata = undefined;
    }
  }

  const doc = await prisma.document.update({
    where: { id: documentId },
    data: {
      title: input.title,
      description: input.description,
      documentType: input.documentType as any || undefined,
      documentCategory: input.documentCategory as any || undefined,
      linkedEntityType: input.linkedEntityType as any || undefined,
      linkedEntityId: input.linkedEntityId,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      tripId: input.tripId,
      customerId: input.customerId,
      vendorId: input.vendorId,
      issueDate: input.issueDate ? new Date(input.issueDate) : undefined,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
      tags,
      metadata,
    },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      vehicle: { select: { id: true, vehicleNumber: true } },
      driver: { select: { id: true, name: true } },
      trip: { select: { id: true, tripNumber: true } },
    },
  });

  return doc;
}

export async function verifyDocument(documentId: string, verificationStatus: string, verifiedById: string, notes?: string) {
  const existing = await prisma.document.findUnique({ where: { id: documentId } });
  if (!existing || existing.documentStatus === 'DELETED') {
    throw new AppError('Document not found', 404);
  }

  const doc = await prisma.document.update({
    where: { id: documentId },
    data: {
      verificationStatus: verificationStatus as any,
      verifiedById,
      verifiedAt: new Date(),
      metadata: notes ? { verificationNotes: notes } : undefined,
    },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      verifiedBy: { select: { id: true, name: true } },
    },
  });

  return doc;
}

export async function archiveDocument(documentId: string) {
  const existing = await prisma.document.findUnique({ where: { id: documentId } });
  if (!existing || existing.documentStatus === 'DELETED') {
    throw new AppError('Document not found', 404);
  }

  const doc = await prisma.document.update({
    where: { id: documentId },
    data: {
      documentStatus: 'ARCHIVED',
      archivedAt: new Date(),
    },
  });

  return doc;
}

export async function deleteDocument(documentId: string) {
  const existing = await prisma.document.findUnique({ where: { id: documentId } });
  if (!existing || existing.documentStatus === 'DELETED') {
    throw new AppError('Document not found', 404);
  }

  const doc = await prisma.document.update({
    where: { id: documentId },
    data: {
      documentStatus: 'DELETED',
      deletedAt: new Date(),
    },
  });

  return doc;
}

export async function getDocumentFileStream(documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.documentStatus === 'DELETED') {
    throw new AppError('Document not found', 404);
  }

  const storage = getStorageProvider();
  const filePath = storage instanceof Object && 'getFilePath' in storage
    ? (storage as any).getFilePath(doc.storageKey)
    : null;

  if (filePath) {
    const fs = await import('fs');
    if (!fs.existsSync(filePath)) {
      throw new AppError('File not found in storage', 404);
    }
    return { stream: fs.createReadStream(filePath), doc };
  }

  const url = await storage.getDownloadUrl(doc.storageKey, doc.mimeType);
  return { url, doc };
}
