import { Prisma, WorkflowRecordStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { assertEditable, assertTransition, dateRange, validateReferences, workflowInclude } from '../workflow-records/workflow-records.service';

type FuelInput = {
  vehicleId: string;
  tripId?: string | null;
  driverId?: string | null;
  fuelDate: string;
  odometerReading?: number | null;
  fuelType: string;
  quantityLiters: number;
  pricePerLiter: number;
  totalAmount?: number;
  stationName?: string | null;
  receiptNumber?: string | null;
  notes?: string | null;
};

function calculatedTotal(quantity: number, price: number) {
  return Math.round(quantity * price * 100) / 100;
}

function fuelData(input: Partial<FuelInput>) {
  const total = input.quantityLiters !== undefined && input.pricePerLiter !== undefined
    ? calculatedTotal(input.quantityLiters, input.pricePerLiter)
    : undefined;
  if (input.totalAmount !== undefined && total !== undefined && Math.abs(input.totalAmount - total) > 0.01) {
    throw new AppError('Total amount must equal quantity liters multiplied by price per liter', 400);
  }
  return {
    vehicleId: input.vehicleId,
    tripId: input.tripId === undefined ? undefined : input.tripId,
    driverId: input.driverId === undefined ? undefined : input.driverId,
    fuelDate: input.fuelDate ? new Date(input.fuelDate) : undefined,
    odometerReading: input.odometerReading,
    fuelType: input.fuelType,
    quantityLiters: input.quantityLiters,
    pricePerLiter: input.pricePerLiter,
    totalAmount: total ?? input.totalAmount,
    stationName: input.stationName,
    receiptNumber: input.receiptNumber,
    notes: input.notes,
  };
}

export async function listFuel(query: any) {
  const where: Prisma.FuelEntryWhereInput = {};
  if (query.search) where.OR = [
    { stationName: { contains: query.search, mode: 'insensitive' } },
    { receiptNumber: { contains: query.search, mode: 'insensitive' } },
    { notes: { contains: query.search, mode: 'insensitive' } },
  ];
  if (query.vehicleId) where.vehicleId = query.vehicleId;
  if (query.tripId) where.tripId = query.tripId;
  if (query.driverId) where.driverId = query.driverId;
  if (query.status) where.status = query.status;
  where.fuelDate = dateRange(query.dateFrom, query.dateTo);
  const [items, total] = await Promise.all([
    prisma.fuelEntry.findMany({ where, include: workflowInclude, orderBy: { fuelDate: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.fuelEntry.count({ where }),
  ]);
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getFuel(id: string) {
  const item = await prisma.fuelEntry.findUnique({ where: { id }, include: workflowInclude });
  if (!item) throw new AppError('Fuel entry not found', 404);
  return item;
}

export async function createFuel(input: FuelInput & { createdById?: string | null }) {
  await validateReferences(input.vehicleId, input.tripId, input.driverId);
  return prisma.fuelEntry.create({ data: { ...fuelData(input), vehicleId: input.vehicleId, fuelDate: new Date(input.fuelDate), fuelType: input.fuelType, quantityLiters: input.quantityLiters, pricePerLiter: input.pricePerLiter, totalAmount: calculatedTotal(input.quantityLiters, input.pricePerLiter), createdById: input.createdById ?? null }, include: workflowInclude });
}

export async function updateFuel(id: string, input: Partial<FuelInput>, canApprove: boolean) {
  const existing = await getFuel(id);
  assertEditable(existing.status, canApprove);
  const vehicleId = input.vehicleId ?? existing.vehicleId;
  const tripId = input.tripId === undefined ? existing.tripId : input.tripId;
  const driverId = input.driverId === undefined ? existing.driverId : input.driverId;
  await validateReferences(vehicleId, tripId, driverId);
  const quantity = input.quantityLiters ?? Number(existing.quantityLiters);
  const price = input.pricePerLiter ?? Number(existing.pricePerLiter);
  return prisma.fuelEntry.update({ where: { id }, data: { ...fuelData(input), totalAmount: calculatedTotal(quantity, price) }, include: workflowInclude });
}

export async function transitionFuel(id: string, status: WorkflowRecordStatus, userId?: string | null, notes?: string | null) {
  const existing = await getFuel(id);
  assertTransition(existing.status, status);
  return prisma.fuelEntry.update({
    where: { id },
    data: { status, notes: notes === undefined ? existing.notes : notes, approvedById: status === 'APPROVED' ? userId ?? null : undefined, approvedAt: status === 'APPROVED' ? new Date() : undefined },
    include: workflowInclude,
  });
}
