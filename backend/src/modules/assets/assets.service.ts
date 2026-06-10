import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import type { Prisma } from '@prisma/client';

// Asset Categories
export async function listAssetCategories() {
  return prisma.assetCategory.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { assets: true } },
    },
  });
}

export async function createAssetCategory(input: {
  name: string;
  key: string;
  description?: string | null;
  status?: string;
}) {
  const existing = await prisma.assetCategory.findUnique({
    where: { key: input.key },
  });

  if (existing) {
    throw new AppError('Asset category key already exists', 400);
  }

  return prisma.assetCategory.create({
    data: {
      name: input.name,
      key: input.key,
      description: input.description || null,
      status: (input.status as any) ?? 'ACTIVE',
    },
  });
}

export async function updateAssetCategory(
  categoryId: string,
  input: {
    name?: string;
    key?: string;
    description?: string | null;
    status?: string;
  },
) {
  const category = await prisma.assetCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new AppError('Asset category not found', 404);
  }

  if (input.key && input.key !== category.key) {
    const existing = await prisma.assetCategory.findUnique({
      where: { key: input.key },
    });

    if (existing) {
      throw new AppError('Asset category key already exists', 400);
    }
  }

  return prisma.assetCategory.update({
    where: { id: categoryId },
    data: {
      name: input.name,
      key: input.key,
      description: input.description === '' ? null : input.description,
      status: input.status as any,
    },
  });
}

// Assets
export async function listAssets(query: {
  search?: string;
  status?: string;
  categoryId?: string;
  page: number;
  limit: number;
}) {
  const where: Prisma.AssetWhereInput = {};

  if (query.search) {
    where.OR = [
      { assetCode: { contains: query.search, mode: 'insensitive' } },
      { name: { contains: query.search, mode: 'insensitive' } },
      { serialNumber: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.status) {
    where.currentStatus = query.status as any;
  }

  if (query.categoryId) {
    where.assetCategoryId = query.categoryId;
  }

  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        assetCategory: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.asset.count({ where }),
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

export async function getAssetById(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      assetCategory: true,
    },
  });

  if (!asset) {
    throw new AppError('Asset not found', 404);
  }

  return asset;
}

export async function createAsset(input: {
  assetCode: string;
  name: string;
  assetCategoryId: string;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  purchaseAmount?: number | null;
  currentStatus?: string;
  notes?: string | null;
}) {
  const existingCode = await prisma.asset.findUnique({
    where: { assetCode: input.assetCode },
  });

  if (existingCode) {
    throw new AppError('Asset code already exists', 400);
  }

  if (input.serialNumber) {
    const existingSerial = await prisma.asset.findUnique({
      where: { serialNumber: input.serialNumber },
    });

    if (existingSerial) {
      throw new AppError('Serial number already exists', 400);
    }
  }

  const category = await prisma.assetCategory.findUnique({
    where: { id: input.assetCategoryId },
  });

  if (!category) {
    throw new AppError('Asset category not found', 404);
  }

  return prisma.asset.create({
    data: {
      assetCode: input.assetCode,
      name: input.name,
      assetCategoryId: input.assetCategoryId,
      serialNumber: input.serialNumber || null,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
      purchaseAmount: input.purchaseAmount ?? null,
      currentStatus: (input.currentStatus as any) ?? 'AVAILABLE',
      notes: input.notes || null,
    },
    include: {
      assetCategory: true,
    },
  });
}

export async function updateAsset(
  assetId: string,
  input: {
    assetCode?: string;
    name?: string;
    assetCategoryId?: string;
    serialNumber?: string | null;
    purchaseDate?: string | null;
    purchaseAmount?: number | null;
    currentStatus?: string;
    notes?: string | null;
  },
) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    throw new AppError('Asset not found', 404);
  }

  if (input.assetCode && input.assetCode !== asset.assetCode) {
    const existing = await prisma.asset.findUnique({
      where: { assetCode: input.assetCode },
    });

    if (existing) {
      throw new AppError('Asset code already exists', 400);
    }
  }

  if (input.serialNumber && input.serialNumber !== asset.serialNumber) {
    const existingSerial = await prisma.asset.findUnique({
      where: { serialNumber: input.serialNumber },
    });

    if (existingSerial) {
      throw new AppError('Serial number already exists', 400);
    }
  }

  if (input.assetCategoryId) {
    const category = await prisma.assetCategory.findUnique({
      where: { id: input.assetCategoryId },
    });

    if (!category) {
      throw new AppError('Asset category not found', 404);
    }
  }

  return prisma.asset.update({
    where: { id: assetId },
    data: {
      assetCode: input.assetCode,
      name: input.name,
      assetCategoryId: input.assetCategoryId,
      serialNumber: input.serialNumber === '' ? null : input.serialNumber,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : input.purchaseDate === '' ? null : undefined,
      purchaseAmount: input.purchaseAmount ?? undefined,
      currentStatus: input.currentStatus as any,
      notes: input.notes === '' ? null : input.notes,
    },
    include: {
      assetCategory: true,
    },
  });
}

export async function updateAssetStatus(assetId: string, status: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    throw new AppError('Asset not found', 404);
  }

  return prisma.asset.update({
    where: { id: assetId },
    data: { currentStatus: status as any },
    include: {
      assetCategory: true,
    },
  });
}
