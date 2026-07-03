import { Prisma, WorkflowRecordStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { assertEditable, assertTransition, dateRange, validateReferences, workflowInclude } from '../workflow-records/workflow-records.service';

// workflowInclude is shared with fuel/expenses, which have no assignedToId —
// extend it locally rather than adding assignedTo to the shared include.
const maintenanceInclude = {
  ...workflowInclude,
  assignedTo: { select: { id: true, name: true, username: true } },
};

type MaintenanceInput = {
  vehicleId: string;
  tripId?: string | null;
  driverId?: string | null;
  requestDate: string;
  priority?: string;
  category: string;
  description: string;
  estimatedCost?: number | null;
  actualCost?: number | null;
  scheduledDate?: string | null;
  completedDate?: string | null;
  notes?: string | null;
  assignedToId?: string | null;
};

function maintenanceData(input: Partial<MaintenanceInput>) {
  return {
    vehicleId: input.vehicleId,
    tripId: input.tripId === undefined ? undefined : input.tripId,
    driverId: input.driverId === undefined ? undefined : input.driverId,
    requestDate: input.requestDate ? new Date(input.requestDate) : undefined,
    priority: input.priority as any,
    category: input.category,
    description: input.description,
    estimatedCost: input.estimatedCost,
    actualCost: input.actualCost,
    scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
    completedDate: input.completedDate ? new Date(input.completedDate) : undefined,
    notes: input.notes,
    assignedToId: input.assignedToId === undefined ? undefined : input.assignedToId,
  };
}

export async function listMaintenance(query: any, extraWhere?: Record<string, unknown>) {
  const where: Prisma.MaintenanceRequestWhereInput = {};
  if (query.search) where.OR = [
    { category: { contains: query.search, mode: 'insensitive' } },
    { description: { contains: query.search, mode: 'insensitive' } },
    { notes: { contains: query.search, mode: 'insensitive' } },
  ];
  if (query.vehicleId) where.vehicleId = query.vehicleId;
  if (query.tripId) where.tripId = query.tripId;
  if (query.driverId) where.driverId = query.driverId;
  if (query.assignedToId) where.assignedToId = query.assignedToId;
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  where.requestDate = dateRange(query.dateFrom, query.dateTo);
  if (extraWhere) { where.AND = where.AND ? [...(Array.isArray(where.AND) ? where.AND : [where.AND]), extraWhere] : [extraWhere]; }
  const [items, total] = await Promise.all([
    prisma.maintenanceRequest.findMany({ where, include: maintenanceInclude, orderBy: { requestDate: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.maintenanceRequest.count({ where }),
  ]);
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getMaintenance(id: string) {
  const item = await prisma.maintenanceRequest.findUnique({ where: { id }, include: maintenanceInclude });
  if (!item) throw new AppError('Maintenance request not found', 404);
  return item;
}

export async function createMaintenance(input: MaintenanceInput & { createdById?: string | null }) {
  await validateReferences(input.vehicleId, input.tripId, input.driverId);
  return prisma.maintenanceRequest.create({
    data: {
      ...maintenanceData(input),
      vehicleId: input.vehicleId,
      requestDate: new Date(input.requestDate),
      category: input.category,
      description: input.description,
      priority: (input.priority as any) ?? 'MEDIUM',
      createdById: input.createdById ?? null,
    },
    include: maintenanceInclude,
  });
}

export async function updateMaintenance(id: string, input: Partial<MaintenanceInput>, canApprove: boolean) {
  const existing = await getMaintenance(id);
  assertEditable(existing.status, canApprove);
  const vehicleId = input.vehicleId ?? existing.vehicleId;
  const tripId = input.tripId === undefined ? existing.tripId : input.tripId;
  const driverId = input.driverId === undefined ? existing.driverId : input.driverId;
  await validateReferences(vehicleId, tripId, driverId);
  return prisma.maintenanceRequest.update({ where: { id }, data: maintenanceData(input), include: maintenanceInclude });
}

export async function transitionMaintenance(id: string, status: WorkflowRecordStatus, userId?: string | null, notes?: string | null) {
  const existing = await getMaintenance(id);
  assertTransition(existing.status, status);
  return prisma.maintenanceRequest.update({
    where: { id },
    data: {
      status,
      notes: notes === undefined ? existing.notes : notes,
      approvedById: status === 'APPROVED' ? userId ?? null : undefined,
      approvedAt: status === 'APPROVED' ? new Date() : undefined,
      completedDate: status === 'APPROVED' ? new Date() : undefined,
    },
    include: maintenanceInclude,
  });
}
