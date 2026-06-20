import { RepairStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

type RepairInput = {
  maintenanceRequestId?: string | null;
  vehicleId: string;
  assignedMechanicId?: string | null;
  vendorName?: string | null;
  repairType: string;
  repairNotes?: string | null;
  laborCost?: number | null;
  partsCost?: number | null;
  totalCost?: number | null;
  startedAt?: string | null;
};

const repairInclude = {
  vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true } },
  maintenanceRequest: { select: { id: true, issueTitle: true, status: true } },
  assignedMechanic: { select: { id: true, name: true, username: true } },
  createdBy: { select: { id: true, name: true, username: true } },
  completedBy: { select: { id: true, name: true, username: true } },
};

const editableStatuses: RepairStatus[] = ['DRAFT'];
const transitionMap: Record<string, RepairStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function assertTransition(current: RepairStatus, next: RepairStatus) {
  const allowed = transitionMap[current];
  if (!allowed || !allowed.includes(next)) {
    throw new AppError(`Cannot transition from ${current} to ${next}`, 400);
  }
}

function calculateTotal(input: { laborCost?: number | null; partsCost?: number | null; totalCost?: number | null }): number | null {
  if (input.laborCost !== undefined && input.laborCost !== null && input.partsCost !== undefined && input.partsCost !== null) {
    return Math.round((input.laborCost + input.partsCost) * 100) / 100;
  }
  if (input.totalCost !== undefined && input.totalCost !== null) {
    return Math.round(input.totalCost * 100) / 100;
  }
  return null;
}

export async function listRepairs(query: any) {
  const where: any = {};
  if (query.search) {
    where.OR = [
      { repairType: { contains: query.search, mode: 'insensitive' } },
      { repairNotes: { contains: query.search, mode: 'insensitive' } },
      { vendorName: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.vehicleId) where.vehicleId = query.vehicleId;
  if (query.maintenanceRequestId) where.maintenanceRequestId = query.maintenanceRequestId;
  if (query.assignedMechanicId) where.assignedMechanicId = query.assignedMechanicId;
  if (query.status) where.status = query.status;
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
    if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
  }
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.repair.findMany({ where, include: repairInclude, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.repair.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getRepair(id: string) {
  const item = await prisma.repair.findUnique({ where: { id }, include: repairInclude });
  if (!item) throw new AppError('Repair not found', 404);
  return item;
}

export async function createRepair(input: RepairInput & { createdById?: string | null }) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) throw new AppError('Vehicle not found', 400);
  if (input.maintenanceRequestId) {
    const maint = await prisma.maintenanceRequest.findUnique({ where: { id: input.maintenanceRequestId } });
    if (!maint) throw new AppError('Maintenance request not found', 400);
    if (maint.vehicleId !== input.vehicleId) throw new AppError('Maintenance request vehicle must match repair vehicle', 400);
  }
  if (input.assignedMechanicId) {
    const mechanic = await prisma.user.findUnique({ where: { id: input.assignedMechanicId } });
    if (!mechanic) throw new AppError('Assigned mechanic not found', 400);
  }
  const total = calculateTotal(input);
  return prisma.repair.create({
    data: {
      vehicleId: input.vehicleId,
      maintenanceRequestId: input.maintenanceRequestId || null,
      assignedMechanicId: input.assignedMechanicId || null,
      vendorName: input.vendorName || null,
      repairType: input.repairType,
      repairNotes: input.repairNotes || null,
      laborCost: input.laborCost ?? null,
      partsCost: input.partsCost ?? null,
      totalCost: total,
      startedAt: input.startedAt ? new Date(input.startedAt) : null,
      createdById: input.createdById || null,
    },
    include: repairInclude,
  });
}

export async function updateRepair(id: string, input: Partial<RepairInput>) {
  const existing = await getRepair(id);
  if (!editableStatuses.includes(existing.status)) {
    throw new AppError('Repair cannot be edited in current status', 400);
  }
  const data: any = {};
  const finalVehicleId = input.vehicleId !== undefined ? input.vehicleId : existing.vehicleId;
  if (input.vehicleId !== undefined) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!vehicle) throw new AppError('Vehicle not found', 400);
    data.vehicleId = input.vehicleId;
  }
  if (input.maintenanceRequestId !== undefined) {
    if (input.maintenanceRequestId) {
      const maint = await prisma.maintenanceRequest.findUnique({ where: { id: input.maintenanceRequestId } });
      if (!maint) throw new AppError('Maintenance request not found', 400);
      if (maint.vehicleId !== finalVehicleId) throw new AppError('Maintenance request vehicle must match repair vehicle', 400);
      data.maintenanceRequestId = input.maintenanceRequestId;
    } else {
      data.maintenanceRequestId = null;
    }
  }
  if (input.assignedMechanicId !== undefined) {
    if (input.assignedMechanicId) {
      const mechanic = await prisma.user.findUnique({ where: { id: input.assignedMechanicId } });
      if (!mechanic) throw new AppError('Assigned mechanic not found', 400);
    }
    data.assignedMechanicId = input.assignedMechanicId || null;
  }
  if (input.vendorName !== undefined) data.vendorName = input.vendorName || null;
  if (input.repairType !== undefined) data.repairType = input.repairType;
  if (input.repairNotes !== undefined) data.repairNotes = input.repairNotes || null;
  if (input.laborCost !== undefined) data.laborCost = input.laborCost;
  if (input.partsCost !== undefined) data.partsCost = input.partsCost;
  if (input.laborCost !== undefined || input.partsCost !== undefined || input.totalCost !== undefined) {
    data.totalCost = calculateTotal({ laborCost: data.laborCost ?? existing.laborCost?.toNumber(), partsCost: data.partsCost ?? existing.partsCost?.toNumber(), totalCost: input.totalCost });
  }
  return prisma.repair.update({ where: { id }, data, include: repairInclude });
}

export async function transitionRepair(id: string, status: RepairStatus, userId?: string | null, notes?: string | null) {
  const existing = await getRepair(id);
  assertTransition(existing.status, status);
  const data: any = { status };
  if (status === 'COMPLETED') {
    data.completedById = userId || null;
    data.completedAt = new Date();
  }
  if (status === 'IN_PROGRESS') {
    data.startedAt = new Date();
  }
  return prisma.repair.update({ where: { id }, data, include: repairInclude });
}
