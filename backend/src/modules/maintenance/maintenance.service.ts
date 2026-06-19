import { MaintenanceStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

type MaintenanceInput = {
  vehicleId: string;
  driverId?: string | null;
  issueTitle: string;
  issueDescription?: string | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  odometerReading?: number | null;
  reportedAt?: string;
};

const maintenanceInclude = {
  vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true } },
  driver: { select: { id: true, name: true, status: true } },
  createdBy: { select: { id: true, name: true, username: true } },
  approvedBy: { select: { id: true, name: true, username: true } },
  repairs: {
    select: { id: true, repairType: true, status: true, totalCost: true, assignedMechanicId: true, createdAt: true },
  },
};

const editableStatuses: MaintenanceStatus[] = ['DRAFT'];
const approvableStatuses: MaintenanceStatus[] = ['SUBMITTED'];
const transitionMap: Record<string, MaintenanceStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

function assertTransition(current: MaintenanceStatus, next: MaintenanceStatus) {
  const allowed = transitionMap[current];
  if (!allowed || !allowed.includes(next)) {
    throw new AppError(`Cannot transition from ${current} to ${next}`, 400);
  }
}

export async function listMaintenance(query: any) {
  const where: any = {};
  if (query.search) {
    where.OR = [
      { issueTitle: { contains: query.search, mode: 'insensitive' } },
      { issueDescription: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.vehicleId) where.vehicleId = query.vehicleId;
  if (query.driverId) where.driverId = query.driverId;
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.dateFrom || query.dateTo) {
    where.reportedAt = {};
    if (query.dateFrom) where.reportedAt.gte = new Date(query.dateFrom);
    if (query.dateTo) where.reportedAt.lte = new Date(query.dateTo);
  }
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.maintenanceRequest.findMany({ where, include: maintenanceInclude, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.maintenanceRequest.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getMaintenance(id: string) {
  const item = await prisma.maintenanceRequest.findUnique({ where: { id }, include: maintenanceInclude });
  if (!item) throw new AppError('Maintenance request not found', 404);
  return item;
}

export async function createMaintenance(input: MaintenanceInput & { createdById?: string | null }) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) throw new AppError('Vehicle not found', 400);
  if (input.driverId) {
    const driver = await prisma.driver.findUnique({ where: { id: input.driverId } });
    if (!driver) throw new AppError('Driver not found', 400);
  }
  return prisma.maintenanceRequest.create({
    data: {
      vehicleId: input.vehicleId,
      driverId: input.driverId || null,
      issueTitle: input.issueTitle,
      issueDescription: input.issueDescription || null,
      priority: (input.priority as any) || 'MEDIUM',
      odometerReading: input.odometerReading ?? null,
      reportedAt: input.reportedAt ? new Date(input.reportedAt) : new Date(),
      createdById: input.createdById || null,
    },
    include: maintenanceInclude,
  });
}

export async function updateMaintenance(id: string, input: Partial<MaintenanceInput>) {
  const existing = await getMaintenance(id);
  if (!editableStatuses.includes(existing.status)) {
    throw new AppError('Maintenance request cannot be edited in current status', 400);
  }
  if (input.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!vehicle) throw new AppError('Vehicle not found', 400);
  }
  return prisma.maintenanceRequest.update({
    where: { id },
    data: {
      ...(input.vehicleId !== undefined && { vehicleId: input.vehicleId }),
      ...(input.driverId !== undefined && { driverId: input.driverId || null }),
      ...(input.issueTitle !== undefined && { issueTitle: input.issueTitle }),
      ...(input.issueDescription !== undefined && { issueDescription: input.issueDescription || null }),
      ...(input.priority !== undefined && { priority: input.priority as any }),
      ...(input.odometerReading !== undefined && { odometerReading: input.odometerReading }),
    },
    include: maintenanceInclude,
  });
}

export async function transitionMaintenance(id: string, status: MaintenanceStatus, userId?: string | null, notes?: string | null) {
  const existing = await getMaintenance(id);
  assertTransition(existing.status, status);
  const data: any = { status, notes: notes ?? undefined };
  if (status === 'APPROVED' || status === 'REJECTED') {
    data.approvedById = userId || null;
    if (status === 'APPROVED') data.approvedAt = new Date();
  }
  return prisma.maintenanceRequest.update({ where: { id }, data, include: maintenanceInclude });
}
