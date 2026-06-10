import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import type { Prisma } from '@prisma/client';

export async function listDocuments(query: {
  entityType?: string;
  entityId?: string;
  documentType?: string;
  page: number;
  limit: number;
}) {
  const where: Prisma.DocumentWhereInput = {};

  if (query.entityType) {
    where.entityType = query.entityType as any;
  }

  if (query.entityId) {
    where.entityId = query.entityId;
  }

  if (query.documentType) {
    where.documentType = query.documentType;
  }

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.document.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function createDocument(input: {
  entityType: string;
  entityId: string;
  documentType: string;
  documentNumber?: string | null;
  expiryDate?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedById?: string | null;
}) {
  return prisma.document.create({
    data: {
      entityType: input.entityType as any,
      entityId: input.entityId,
      documentType: input.documentType,
      documentNumber: input.documentNumber || null,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      fileUrl: input.fileUrl || null,
      fileName: input.fileName || null,
      mimeType: input.mimeType || null,
      sizeBytes: input.sizeBytes ?? null,
      uploadedById: input.uploadedById || null,
    },
  });
}

export async function updateDocument(
  documentId: string,
  input: {
    documentType?: string;
    documentNumber?: string | null;
    expiryDate?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
  },
) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  return prisma.document.update({
    where: { id: documentId },
    data: {
      documentType: input.documentType,
      documentNumber: input.documentNumber === '' ? null : input.documentNumber,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : input.expiryDate === '' ? null : undefined,
      fileUrl: input.fileUrl === '' ? null : input.fileUrl,
      fileName: input.fileName === '' ? null : input.fileName,
      mimeType: input.mimeType === '' ? null : input.mimeType,
      sizeBytes: input.sizeBytes ?? undefined,
    },
  });
}

export async function deleteDocument(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  await prisma.document.delete({
    where: { id: documentId },
  });

  return document;
}
