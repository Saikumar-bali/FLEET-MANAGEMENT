import {
  AssetCategoryStatus,
  AssetAssignmentHolderType,
  AssetAssignmentStatus,
  AssetHistoryAction,
  AssetStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

type DbClient = Prisma.TransactionClient | typeof prisma;

type HolderSummary = {
  type: AssetAssignmentHolderType;
  id: string;
  label: string;
  secondary: string | null;
};

type AssetHistoryInput = {
  assetId: string;
  action: AssetHistoryAction;
  fromHolderType?: AssetAssignmentHolderType | null;
  fromHolderId?: string | null;
  toHolderType?: AssetAssignmentHolderType | null;
  toHolderId?: string | null;
  remarks?: string | null;
  proofUrl?: string | null;
  createdById?: string | null;
};

const assetBaseInclude = {
  assetCategory: true,
} satisfies Prisma.AssetInclude;

const assignmentInclude = {
  assignedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
    },
  },
} satisfies Prisma.AssetAssignmentInclude;

const historyInclude = {
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
    },
  },
} satisfies Prisma.AssetHistoryInclude;

function normalizeOptionalText(value?: string | null) {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function ensureAssetCategoryExists(assetCategoryId: string) {
  const category = await prisma.assetCategory.findUnique({
    where: { id: assetCategoryId },
  });

  if (!category) {
    throw new AppError('Asset category not found', 404);
  }
}

async function getHolderSummary(
  db: DbClient,
  holderType: AssetAssignmentHolderType,
  holderId: string,
): Promise<HolderSummary> {
  if (holderType === AssetAssignmentHolderType.VEHICLE) {
    const vehicle = await db.vehicle.findUnique({
      where: { id: holderId },
      select: {
        id: true,
        vehicleNumber: true,
        brand: true,
        model: true,
      },
    });

    if (!vehicle) {
      throw new AppError('Selected vehicle was not found', 400);
    }

    const secondaryParts = [vehicle.brand, vehicle.model].filter(Boolean);

    return {
      type: holderType,
      id: vehicle.id,
      label: vehicle.vehicleNumber,
      secondary: secondaryParts.length > 0 ? secondaryParts.join(' ') : null,
    };
  }

  if (holderType === AssetAssignmentHolderType.DRIVER) {
    const driver = await db.driver.findUnique({
      where: { id: holderId },
      select: {
        id: true,
        name: true,
        mobile: true,
      },
    });

    if (!driver) {
      throw new AppError('Selected driver was not found', 400);
    }

    return {
      type: holderType,
      id: driver.id,
      label: driver.name,
      secondary: driver.mobile,
    };
  }

  const user = await db.user.findUnique({
    where: { id: holderId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    throw new AppError('Selected user was not found', 400);
  }

  return {
    type: holderType,
    id: user.id,
    label: user.name,
    secondary: user.email,
  };
}

async function createAssetHistory(db: DbClient, input: AssetHistoryInput) {
  return db.assetHistory.create({
    data: {
      assetId: input.assetId,
      action: input.action,
      fromHolderType: input.fromHolderType ?? null,
      fromHolderId: input.fromHolderId ?? null,
      toHolderType: input.toHolderType ?? null,
      toHolderId: input.toHolderId ?? null,
      remarks: normalizeOptionalText(input.remarks) ?? null,
      proofUrl: normalizeOptionalText(input.proofUrl) ?? null,
      createdById: input.createdById ?? null,
    },
  });
}

async function getAssetOrThrow(db: DbClient, assetId: string) {
  const asset = await db.asset.findUnique({
    where: { id: assetId },
    include: assetBaseInclude,
  });

  if (!asset) {
    throw new AppError('Asset not found', 404);
  }

  return asset;
}

async function getActiveAssignment(db: DbClient, assetId: string) {
  return db.assetAssignment.findFirst({
    where: {
      assetId,
      status: AssetAssignmentStatus.ACTIVE,
    },
    include: assignmentInclude,
    orderBy: {
      assignedAt: 'desc',
    },
  });
}

async function enrichAssignment<T extends {
  assignedToType: AssetAssignmentHolderType;
  assignedToId: string;
  assignedBy: { id: string; name: string; email: string; username: string | null } | null;
}>(db: DbClient, assignment: T) {
  const holder = await getHolderSummary(db, assignment.assignedToType, assignment.assignedToId);

  return {
    ...assignment,
    holder,
  };
}

async function enrichHistoryRecord<T extends {
  fromHolderType: AssetAssignmentHolderType | null;
  fromHolderId: string | null;
  toHolderType: AssetAssignmentHolderType | null;
  toHolderId: string | null;
  createdBy: { id: string; name: string; email: string; username: string | null } | null;
}>(db: DbClient, history: T) {
  const [fromHolder, toHolder] = await Promise.all([
    history.fromHolderType && history.fromHolderId
      ? getHolderSummary(db, history.fromHolderType, history.fromHolderId)
      : Promise.resolve(null),
    history.toHolderType && history.toHolderId
      ? getHolderSummary(db, history.toHolderType, history.toHolderId)
      : Promise.resolve(null),
  ]);

  return {
    ...history,
    fromHolder,
    toHolder,
  };
}

function assertAssetCanBeAssigned(assetStatus: string) {
  if (assetStatus === 'LOST' || assetStatus === 'RETIRED') {
    throw new AppError('This asset cannot be assigned in its current status', 400);
  }
}

function assertAssetCanReceiveStatus(assetStatus: string, nextStatus: string) {
  if (assetStatus === 'RETIRED' && nextStatus !== 'RETIRED') {
    throw new AppError('Retired assets cannot be moved back into active circulation', 400);
  }
}

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
      description: normalizeOptionalText(input.description) ?? null,
      status: (input.status as AssetCategoryStatus) ?? 'ACTIVE',
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
      description: input.description === undefined ? undefined : normalizeOptionalText(input.description),
      status: input.status as AssetCategoryStatus | undefined,
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
    where.currentStatus = query.status as AssetStatus;
  }

  if (query.categoryId) {
    where.assetCategoryId = query.categoryId;
  }

  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: assetBaseInclude,
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
  const asset = await getAssetOrThrow(prisma, assetId);
  const currentAssignment = await getActiveAssignment(prisma, assetId);

  return {
    ...asset,
    currentAssignment: currentAssignment ? await enrichAssignment(prisma, currentAssignment) : null,
  };
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
  createdById?: string | null;
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

  await ensureAssetCategoryExists(input.assetCategoryId);

  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.create({
      data: {
        assetCode: input.assetCode,
        name: input.name,
        assetCategoryId: input.assetCategoryId,
        serialNumber: normalizeOptionalText(input.serialNumber) ?? null,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
        purchaseAmount: input.purchaseAmount ?? null,
        currentStatus: (input.currentStatus as AssetStatus) ?? 'AVAILABLE',
        notes: normalizeOptionalText(input.notes) ?? null,
      },
      include: assetBaseInclude,
    });

    await createAssetHistory(tx, {
      assetId: asset.id,
      action: AssetHistoryAction.CREATED,
      remarks: input.notes,
      createdById: input.createdById ?? null,
    });

    return asset;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
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
    updatedById?: string | null;
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

  const nextSerialNumber = normalizeOptionalText(input.serialNumber);
  if (nextSerialNumber && nextSerialNumber !== asset.serialNumber) {
    const existingSerial = await prisma.asset.findUnique({
      where: { serialNumber: nextSerialNumber },
    });

    if (existingSerial) {
      throw new AppError('Serial number already exists', 400);
    }
  }

  if (input.assetCategoryId) {
    await ensureAssetCategoryExists(input.assetCategoryId);
  }

  return prisma.$transaction(async (tx) => {
    const updatedAsset = await tx.asset.update({
      where: { id: assetId },
      data: {
        assetCode: input.assetCode,
        name: input.name,
        assetCategoryId: input.assetCategoryId,
        serialNumber: input.serialNumber === undefined ? undefined : nextSerialNumber,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : input.purchaseDate === '' ? null : undefined,
        purchaseAmount: input.purchaseAmount ?? undefined,
        currentStatus: input.currentStatus as AssetStatus | undefined,
        notes: input.notes === undefined ? undefined : normalizeOptionalText(input.notes),
      },
      include: assetBaseInclude,
    });

    await createAssetHistory(tx, {
      assetId: updatedAsset.id,
      action: AssetHistoryAction.UPDATED,
      remarks: input.notes,
      createdById: input.updatedById ?? null,
    });

    return updatedAsset;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function updateAssetStatus(params: {
  assetId: string;
  status: string;
  performedById?: string | null;
  notes?: string | null;
  proofUrl?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const asset = await getAssetOrThrow(tx, params.assetId);
    const activeAssignment = await getActiveAssignment(tx, params.assetId);
    assertAssetCanReceiveStatus(asset.currentStatus, params.status);

    if (params.status === 'ASSIGNED') {
      throw new AppError('Use the assign action to place an asset with a holder', 400);
    }

    if (params.status === 'AVAILABLE' && activeAssignment) {
      throw new AppError('Return the asset before marking it as available', 400);
    }

    if (params.status === 'RETIRED' && activeAssignment) {
      throw new AppError('Return or transfer the asset before retiring it', 400);
    }

    let historyAction: AssetHistoryAction | null = null;

    if (params.status === 'DAMAGED') {
      historyAction = AssetHistoryAction.DAMAGED;
    } else if (params.status === 'LOST') {
      historyAction = AssetHistoryAction.LOST;
    } else if (params.status === 'RETIRED') {
      historyAction = AssetHistoryAction.RETIRED;
    } else if (params.status === 'UNDER_REPAIR' && asset.currentStatus === 'DAMAGED') {
      historyAction = AssetHistoryAction.REPAIRED;
    } else if (params.status !== asset.currentStatus) {
      historyAction = AssetHistoryAction.UPDATED;
    }

    if ((params.status === 'DAMAGED' || params.status === 'LOST') && activeAssignment) {
      await tx.assetAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          status: params.status === 'DAMAGED' ? AssetAssignmentStatus.DAMAGED : AssetAssignmentStatus.LOST,
          returnedAt: new Date(),
          notes: normalizeOptionalText(params.notes) ?? activeAssignment.notes,
        },
      });
    }

    const updatedAsset = await tx.asset.update({
      where: { id: params.assetId },
      data: {
        currentStatus: params.status as AssetStatus,
      },
      include: assetBaseInclude,
    });

    if (historyAction) {
      await createAssetHistory(tx, {
        assetId: params.assetId,
        action: historyAction,
        fromHolderType: activeAssignment?.assignedToType ?? null,
        fromHolderId: activeAssignment?.assignedToId ?? null,
        remarks: params.notes,
        proofUrl: params.proofUrl,
        createdById: params.performedById ?? null,
      });
    }

    return updatedAsset;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function listAssetAssignments(assetId: string) {
  await getAssetOrThrow(prisma, assetId);

  const assignments = await prisma.assetAssignment.findMany({
    where: { assetId },
    include: assignmentInclude,
    orderBy: [{ status: 'asc' }, { assignedAt: 'desc' }],
  });

  return Promise.all(assignments.map((assignment) => enrichAssignment(prisma, assignment)));
}

export async function listAssetHistory(assetId: string) {
  await getAssetOrThrow(prisma, assetId);

  const history = await prisma.assetHistory.findMany({
    where: { assetId },
    include: historyInclude,
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(history.map((entry) => enrichHistoryRecord(prisma, entry)));
}

export async function assignAsset(params: {
  assetId: string;
  assignedToType: AssetAssignmentHolderType;
  assignedToId: string;
  notes?: string | null;
  assignedById?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const asset = await getAssetOrThrow(tx, params.assetId);
    assertAssetCanBeAssigned(asset.currentStatus);

    const activeAssignment = await getActiveAssignment(tx, params.assetId);
    if (activeAssignment) {
      throw new AppError('This asset is already assigned', 400);
    }

    await getHolderSummary(tx, params.assignedToType, params.assignedToId);

    const assignment = await tx.assetAssignment.create({
      data: {
        assetId: params.assetId,
        assignedToType: params.assignedToType,
        assignedToId: params.assignedToId,
        assignedById: params.assignedById ?? null,
        notes: normalizeOptionalText(params.notes) ?? null,
      },
      include: assignmentInclude,
    });

    await tx.asset.update({
      where: { id: params.assetId },
      data: {
        currentStatus: 'ASSIGNED',
      },
    });

    await createAssetHistory(tx, {
      assetId: params.assetId,
      action: AssetHistoryAction.ASSIGNED,
      toHolderType: params.assignedToType,
      toHolderId: params.assignedToId,
      remarks: params.notes,
      createdById: params.assignedById ?? null,
    });

    return enrichAssignment(tx, assignment);
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function returnAsset(params: {
  assetId: string;
  notes?: string | null;
  proofUrl?: string | null;
  performedById?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    await getAssetOrThrow(tx, params.assetId);
    const activeAssignment = await getActiveAssignment(tx, params.assetId);

    if (!activeAssignment) {
      throw new AppError('This asset does not have an active assignment', 400);
    }

    const returnedAssignment = await tx.assetAssignment.update({
      where: { id: activeAssignment.id },
      data: {
        status: AssetAssignmentStatus.RETURNED,
        returnedAt: new Date(),
        notes: normalizeOptionalText(params.notes) ?? activeAssignment.notes,
      },
      include: assignmentInclude,
    });

    await tx.asset.update({
      where: { id: params.assetId },
      data: {
        currentStatus: 'AVAILABLE',
      },
    });

    await createAssetHistory(tx, {
      assetId: params.assetId,
      action: AssetHistoryAction.RETURNED,
      fromHolderType: activeAssignment.assignedToType,
      fromHolderId: activeAssignment.assignedToId,
      remarks: params.notes,
      proofUrl: params.proofUrl,
      createdById: params.performedById ?? null,
    });

    return enrichAssignment(tx, returnedAssignment);
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function transferAsset(params: {
  assetId: string;
  assignedToType: AssetAssignmentHolderType;
  assignedToId: string;
  notes?: string | null;
  proofUrl?: string | null;
  performedById?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const asset = await getAssetOrThrow(tx, params.assetId);
    assertAssetCanBeAssigned(asset.currentStatus);

    const activeAssignment = await getActiveAssignment(tx, params.assetId);

    if (!activeAssignment) {
      throw new AppError('Transfer requires an active assignment', 400);
    }

    if (
      activeAssignment.assignedToType === params.assignedToType
      && activeAssignment.assignedToId === params.assignedToId
    ) {
      throw new AppError('Choose a different holder for the transfer', 400);
    }

    await getHolderSummary(tx, params.assignedToType, params.assignedToId);

    await tx.assetAssignment.update({
      where: { id: activeAssignment.id },
      data: {
        status: AssetAssignmentStatus.TRANSFERRED,
        returnedAt: new Date(),
        notes: normalizeOptionalText(params.notes) ?? activeAssignment.notes,
      },
    });

    const nextAssignment = await tx.assetAssignment.create({
      data: {
        assetId: params.assetId,
        assignedToType: params.assignedToType,
        assignedToId: params.assignedToId,
        assignedById: params.performedById ?? null,
        notes: normalizeOptionalText(params.notes) ?? null,
      },
      include: assignmentInclude,
    });

    await tx.asset.update({
      where: { id: params.assetId },
      data: {
        currentStatus: 'ASSIGNED',
      },
    });

    await createAssetHistory(tx, {
      assetId: params.assetId,
      action: AssetHistoryAction.TRANSFERRED,
      fromHolderType: activeAssignment.assignedToType,
      fromHolderId: activeAssignment.assignedToId,
      toHolderType: params.assignedToType,
      toHolderId: params.assignedToId,
      remarks: params.notes,
      proofUrl: params.proofUrl,
      createdById: params.performedById ?? null,
    });

    return enrichAssignment(tx, nextAssignment);
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function markAssetDamaged(params: {
  assetId: string;
  notes?: string | null;
  proofUrl?: string | null;
  performedById?: string | null;
}) {
  return updateAssetStatus({
    assetId: params.assetId,
    status: 'DAMAGED',
    notes: params.notes,
    proofUrl: params.proofUrl,
    performedById: params.performedById,
  });
}

export async function markAssetLost(params: {
  assetId: string;
  notes?: string | null;
  proofUrl?: string | null;
  performedById?: string | null;
}) {
  return updateAssetStatus({
    assetId: params.assetId,
    status: 'LOST',
    notes: params.notes,
    proofUrl: params.proofUrl,
    performedById: params.performedById,
  });
}
