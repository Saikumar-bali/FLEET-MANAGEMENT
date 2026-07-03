import { Prisma, RepairStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { dateRange, validateReferences } from '../workflow-records/workflow-records.service';

const repairInclude = {
  vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true } },
  trip: { select: { id: true, tripNumber: true, vehicleId: true } },
  driver: { select: { id: true, name: true, status: true } },
  createdBy: { select: { id: true, name: true, username: true } },
  closedBy: { select: { id: true, name: true, username: true } },
  assignedTo: { select: { id: true, name: true, username: true } },
};

type RepairInput = {
  vehicleId: string;
  tripId?: string | null;
  driverId?: string | null;
  repairDate: string;
  category: string;
  description: string;
  estimatedCost?: number | null;
  actualCost?: number | null;
  provider?: string | null;
  invoiceNumber?: string | null;
  notes?: string | null;
  assignedToId?: string | null;
};

function repairData(input: Partial<RepairInput>) {
  return {
    vehicleId: input.vehicleId,
    tripId: input.tripId === undefined ? undefined : input.tripId,
    driverId: input.driverId === undefined ? undefined : input.driverId,
    repairDate: input.repairDate ? new Date(input.repairDate) : undefined,
    category: input.category,
    description: input.description,
    estimatedCost: input.estimatedCost,
    actualCost: input.actualCost,
    provider: input.provider,
    invoiceNumber: input.invoiceNumber,
    notes: input.notes,
    assignedToId: input.assignedToId === undefined ? undefined : input.assignedToId,
  };
}

const allowedRepairTransitions: Record<RepairStatus, RepairStatus[]> = {
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function assertRepairTransition(current: RepairStatus, next: RepairStatus) {
  if (!allowedRepairTransitions[current].includes(next)) {
    throw new AppError(`Cannot transition ${current} repair to ${next}`, 400);
  }
}

async function hasActiveRepairForVehicle(vehicleId: string, excludeRepairId?: string): Promise<boolean> {
  const where: Prisma.RepairWhereInput = {
    vehicleId,
    status: { in: ['OPEN', 'IN_PROGRESS'] },
  };
  if (excludeRepairId) where.id = { not: excludeRepairId };
  const count = await prisma.repair.count({ where });
  return count > 0;
}

async function releaseVehicleIfNoActiveRepair(vehicleId: string) {
  const hasActive = await hasActiveRepairForVehicle(vehicleId);
  if (!hasActive) {
    await prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'AVAILABLE' } });
  }
}

export async function listRepairs(query: any, extraWhere?: Record<string, unknown>) {
  const where: Prisma.RepairWhereInput = {};
  if (query.search) where.OR = [
    { category: { contains: query.search, mode: 'insensitive' } },
    { description: { contains: query.search, mode: 'insensitive' } },
    { provider: { contains: query.search, mode: 'insensitive' } },
    { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
    { notes: { contains: query.search, mode: 'insensitive' } },
  ];
  if (query.vehicleId) where.vehicleId = query.vehicleId;
  if (query.tripId) where.tripId = query.tripId;
  if (query.driverId) where.driverId = query.driverId;
  if (query.assignedToId) where.assignedToId = query.assignedToId;
  if (query.status) where.status = query.status;
  where.repairDate = dateRange(query.dateFrom, query.dateTo);
  if (extraWhere) { where.AND = where.AND ? [...(Array.isArray(where.AND) ? where.AND : [where.AND]), extraWhere] : [extraWhere]; }
  const [items, total] = await Promise.all([
    prisma.repair.findMany({ where, include: repairInclude, orderBy: { repairDate: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.repair.count({ where }),
  ]);
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getRepair(id: string) {
  const item = await prisma.repair.findUnique({ where: { id }, include: repairInclude });
  if (!item) throw new AppError('Repair not found', 404);
  return item;
}

export async function createRepair(input: RepairInput & { createdById?: string | null }) {
  await validateReferences(input.vehicleId, input.tripId, input.driverId);
  return prisma.repair.create({
    data: {
      ...repairData(input),
      vehicleId: input.vehicleId,
      repairDate: new Date(input.repairDate),
      category: input.category,
      description: input.description,
      createdById: input.createdById ?? null,
    },
    include: repairInclude,
  });
}

export async function updateRepair(id: string, input: Partial<RepairInput>) {
  const existing = await getRepair(id);
  if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
    throw new AppError(`${existing.status.toLowerCase()} repairs cannot be edited`, 400);
  }
  const vehicleId = input.vehicleId ?? existing.vehicleId;
  const tripId = input.tripId === undefined ? existing.tripId : input.tripId;
  const driverId = input.driverId === undefined ? existing.driverId : input.driverId;
  await validateReferences(vehicleId, tripId, driverId);
  return prisma.repair.update({ where: { id }, data: repairData(input), include: repairInclude });
}

export async function transitionRepair(id: string, status: RepairStatus, userId?: string | null, notes?: string | null) {
  const existing = await getRepair(id);
  assertRepairTransition(existing.status, status);

  if (status === 'IN_PROGRESS') {
    return prisma.$transaction(async (tx) => {
      await tx.repair.update({
        where: { id },
        data: { status, notes: notes === undefined ? existing.notes : notes },
      });
      await tx.vehicle.update({ where: { id: existing.vehicleId }, data: { status: 'UNDER_REPAIR' } });
      return prisma.repair.findUnique({ where: { id }, include: repairInclude });
    });
  }

  if (status === 'COMPLETED' || status === 'CANCELLED') {
    return prisma.$transaction(async (tx) => {
      await tx.repair.update({
        where: { id },
        data: {
          status,
          notes: notes === undefined ? existing.notes : notes,
          closedById: userId ?? null,
          closedAt: new Date(),
        },
      });
      const hasActive = await tx.repair.count({
        where: {
          vehicleId: existing.vehicleId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          id: { not: id },
        },
      });
      if (!hasActive) {
        await tx.vehicle.update({ where: { id: existing.vehicleId }, data: { status: 'AVAILABLE' } });
      }
      return prisma.repair.findUnique({ where: { id }, include: repairInclude });
    });
  }

  return prisma.repair.update({
    where: { id },
    data: { status, notes: notes === undefined ? existing.notes : notes },
    include: repairInclude,
  });
}
