import { Prisma, WorkflowRecordStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

export type RecordKind = 'fuel' | 'expense' | 'maintenance';

export const workflowInclude = {
  vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true } },
  trip: { select: { id: true, tripNumber: true, vehicleId: true } },
  driver: { select: { id: true, name: true, status: true } },
  createdBy: { select: { id: true, name: true, username: true } },
  approvedBy: { select: { id: true, name: true, username: true } },
};

export async function validateReferences(vehicleId: string, tripId?: string | null, driverId?: string | null) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new AppError('Vehicle not found', 404);

  if (tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new AppError('Trip not found', 404);
    if (trip.vehicleId !== vehicleId) throw new AppError('Trip vehicle must match the selected vehicle', 400);
  }

  if (driverId) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new AppError('Driver not found', 404);
  }
}

export function assertEditable(status: WorkflowRecordStatus, hasApprovePermission: boolean) {
  if (status === 'APPROVED' && !hasApprovePermission) {
    throw new AppError('Approved records require approve permission to edit', 403);
  }
  if (status === 'REJECTED' || status === 'CANCELLED') {
    throw new AppError(`${status.toLowerCase()} records cannot be edited`, 400);
  }
}

export function assertTransition(current: WorkflowRecordStatus, next: WorkflowRecordStatus) {
  const allowed: Record<WorkflowRecordStatus, WorkflowRecordStatus[]> = {
    DRAFT: ['SUBMITTED', 'CANCELLED'],
    SUBMITTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
    APPROVED: ['CANCELLED'],
    REJECTED: ['CANCELLED'],
    CANCELLED: [],
  };
  if (!allowed[current].includes(next)) {
    throw new AppError(`Cannot transition ${current} record to ${next}`, 400);
  }
}

export function dateRange(dateFrom?: string, dateTo?: string): Prisma.DateTimeFilter | undefined {
  if (!dateFrom && !dateTo) return undefined;
  return {
    gte: dateFrom ? new Date(dateFrom) : undefined,
    lte: dateTo ? new Date(dateTo) : undefined,
  };
}
