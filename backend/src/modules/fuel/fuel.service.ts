import { Prisma, WorkflowRecordStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { assertEditable, assertTransition, dateRange, validateReferences, workflowInclude } from '../workflow-records/workflow-records.service';
import { createNotification } from '../notifications/notifications.service';
import { approveOperationalExpense, reverseOperationalExpense } from '../staff-finance/staff-finance.service';

type FuelInput = {
  vehicleId: string;
  tripId?: string | null;
  driverId?: string | null;
  fuelDate: string;
  odometerReading?: number | null;
  fuelType: string;
  entryMode?: string;
  quantityLiters?: number | null;
  pricePerLiter?: number | null;
  totalAmount?: number;
  stationName?: string | null;
  receiptNumber?: string | null;
  paymentMode?: string | null;
  paymentSource?: 'STAFF_WALLET' | 'COMPANY_ACCOUNT' | 'CORPORATE_CARD' | 'VENDOR_CREDIT' | 'PERSONAL_MONEY';
  financeAccountId?: string | null;
  notes?: string | null;
  createdById?: string | null;
};

function calculatedTotal(quantity: number, price: number) {
  return Math.round(quantity * price * 100) / 100;
}

function validateFuelInput(input: FuelInput) {
  const mode = input.entryMode || 'FULL_DETAILS';

  if (mode === 'QUICK_AMOUNT') {
    if (!input.totalAmount || input.totalAmount <= 0) {
      throw new AppError('Total amount is required and must be greater than 0 for QUICK_AMOUNT mode', 400);
    }
  } else if (mode === 'FULL_DETAILS') {
    if (!input.quantityLiters || input.quantityLiters <= 0) {
      throw new AppError('Quantity liters is required for FULL_DETAILS mode', 400);
    }
    if (!input.pricePerLiter || input.pricePerLiter <= 0) {
      throw new AppError('Price per liter is required for FULL_DETAILS mode', 400);
    }
    if (input.totalAmount !== undefined) {
      const expected = calculatedTotal(input.quantityLiters, input.pricePerLiter);
      if (Math.abs(input.totalAmount - expected) > 0.01) {
        throw new AppError('Total amount must equal quantity liters multiplied by price per liter', 400);
      }
    }
  } else if (mode === 'RECEIPT_ASSISTED') {
    if (!input.totalAmount || input.totalAmount <= 0) {
      throw new AppError('Total amount is required for RECEIPT_ASSISTED mode', 400);
    }
  }
}

function buildFuelData(input: FuelInput) {
  const mode = input.entryMode || 'FULL_DETAILS';
  let totalAmount: number | undefined;
  let quantityLiters: number | null | undefined = input.quantityLiters ?? undefined;
  let pricePerLiter: number | null | undefined = input.pricePerLiter ?? undefined;

  if (mode === 'FULL_DETAILS' && quantityLiters !== undefined && pricePerLiter !== undefined && quantityLiters != null && pricePerLiter != null) {
    totalAmount = calculatedTotal(quantityLiters, pricePerLiter);
    if (input.totalAmount !== undefined && Math.abs(input.totalAmount - totalAmount) > 0.01) {
      throw new AppError('Total amount must equal quantity liters multiplied by price per liter', 400);
    }
  } else {
    totalAmount = input.totalAmount;
  }

  return {
    vehicleId: input.vehicleId,
    tripId: input.tripId === undefined ? undefined : input.tripId,
    driverId: input.driverId === undefined ? undefined : input.driverId,
    fuelDate: input.fuelDate ? new Date(input.fuelDate) : undefined,
    odometerReading: input.odometerReading,
    fuelType: input.fuelType,
    entryMode: (mode as any),
    quantityLiters: quantityLiters,
    pricePerLiter: pricePerLiter,
    totalAmount: totalAmount,
    stationName: input.stationName,
    receiptNumber: input.receiptNumber,
    paymentMode: input.paymentMode,
    paymentSource: input.paymentSource,
    financeAccountId: input.financeAccountId,
    notes: input.notes,
  };
}

export async function listFuel(query: any, extraWhere?: Record<string, unknown>) {
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
  if (query.entryMode) where.entryMode = query.entryMode;
  where.fuelDate = dateRange(query.dateFrom, query.dateTo);
  if (extraWhere) { where.AND = where.AND ? [...(Array.isArray(where.AND) ? where.AND : [where.AND]), extraWhere] : [extraWhere]; }
  const [items, total] = await Promise.all([
    prisma.fuelEntry.findMany({ where, include: workflowInclude, orderBy: { fuelDate: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.fuelEntry.count({ where }),
  ]);
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getFuel(id: string) {
  const item = await prisma.fuelEntry.findUnique({ where: { id }, include: { ...workflowInclude, documents: true } });
  if (!item) throw new AppError('Fuel entry not found', 404);
  return item;
}

export async function createFuel(input: FuelInput) {
  await validateReferences(input.vehicleId, input.tripId, input.driverId);
  validateFuelInput(input);
  const data = buildFuelData(input);
  return prisma.fuelEntry.create({
    data: { ...data, vehicleId: input.vehicleId, fuelDate: new Date(input.fuelDate), fuelType: input.fuelType, totalAmount: data.totalAmount!, createdById: input.createdById ?? null },
    include: workflowInclude,
  });
}

export async function updateFuel(id: string, input: Partial<FuelInput>, canApprove: boolean) {
  const existing = await getFuel(id);
  assertEditable(existing.status, canApprove);
  const vehicleId = input.vehicleId ?? existing.vehicleId;
  const tripId = input.tripId === undefined ? existing.tripId : input.tripId;
  const driverId = input.driverId === undefined ? existing.driverId : input.driverId;
  await validateReferences(vehicleId, tripId, driverId);

  const mergedInput: FuelInput = {
    vehicleId,
    tripId,
    driverId,
    fuelDate: input.fuelDate ?? existing.fuelDate.toISOString(),
    odometerReading: input.odometerReading ?? existing.odometerReading,
    fuelType: input.fuelType ?? existing.fuelType,
    entryMode: input.entryMode ?? existing.entryMode,
    quantityLiters: input.quantityLiters !== undefined ? input.quantityLiters : existing.quantityLiters != null ? Number(existing.quantityLiters) : null,
    pricePerLiter: input.pricePerLiter !== undefined ? input.pricePerLiter : existing.pricePerLiter != null ? Number(existing.pricePerLiter) : null,
    totalAmount: input.totalAmount !== undefined ? input.totalAmount : (input.quantityLiters !== undefined || input.pricePerLiter !== undefined) ? undefined : Number(existing.totalAmount),
    stationName: input.stationName !== undefined ? input.stationName : existing.stationName,
    receiptNumber: input.receiptNumber !== undefined ? input.receiptNumber : existing.receiptNumber,
    paymentMode: input.paymentMode !== undefined ? input.paymentMode : existing.paymentMode,
    paymentSource: input.paymentSource !== undefined ? input.paymentSource : existing.paymentSource,
    financeAccountId: input.financeAccountId !== undefined ? input.financeAccountId : existing.financeAccountId,
    notes: input.notes !== undefined ? input.notes : existing.notes,
  };

  if (input.entryMode || input.quantityLiters !== undefined || input.pricePerLiter !== undefined || input.totalAmount !== undefined) {
    validateFuelInput(mergedInput);
  }

  const data = buildFuelData(mergedInput);
  return prisma.fuelEntry.update({ where: { id }, data, include: workflowInclude });
}

export async function transitionFuel(id: string, status: WorkflowRecordStatus, userId?: string | null, notes?: string | null) {
  const existing = await getFuel(id);
  assertTransition(existing.status, status);
  const item = status === 'APPROVED'
    ? await approveOperationalExpense('FUEL', id, userId, notes).then(() => getFuel(id))
    : status === 'CANCELLED' && existing.status === 'APPROVED'
      ? await reverseOperationalExpense('FUEL', id, userId, notes).then(() => getFuel(id))
    : await prisma.fuelEntry.update({
        where: { id },
        data: { status, notes: notes === undefined ? existing.notes : notes },
        include: workflowInclude,
      });

  try {
    if (status === 'SUBMITTED') {
      createNotification({ title: 'Fuel Entry Submitted', message: `Fuel entry for ${existing.vehicleId ? 'vehicle' : 'trip'} needs review — ₹${existing.totalAmount}`, category: 'FUEL', severity: 'INFO', actionUrl: `/fuel`, recipientPolicy: { type: 'ROLE', roleKeys: ['super_admin', 'admin', 'manager', 'finance'] }, createdById: userId ?? null }).catch(() => {});
    } else if (status === 'APPROVED' && existing.driverId) {
      const driverUser = await prisma.$queryRawUnsafe<Array<{ userId: string }>>("SELECT user_id AS \"userId\" FROM user_profile_links WHERE profile_type = $1::\"ProfileType\" AND profile_id = $2 AND status = $3::\"UserProfileLinkStatus\" AND user_id IS NOT NULL LIMIT 1", 'DRIVER', existing.driverId, 'ACTIVE');
      if (driverUser.length > 0) {
        createNotification({ title: 'Fuel Entry Approved', message: `Your fuel entry ₹${existing.totalAmount} has been approved`, category: 'FUEL', severity: 'SUCCESS', actionUrl: `/driver-portal/fuel`, recipientPolicy: { type: 'USER', userIds: [driverUser[0].userId] }, createdById: userId ?? null }).catch(() => {});
      }
    } else if (status === 'REJECTED' && existing.driverId) {
      const driverUser = await prisma.$queryRawUnsafe<Array<{ userId: string }>>("SELECT user_id AS \"userId\" FROM user_profile_links WHERE profile_type = $1::\"ProfileType\" AND profile_id = $2 AND status = $3::\"UserProfileLinkStatus\" AND user_id IS NOT NULL LIMIT 1", 'DRIVER', existing.driverId, 'ACTIVE');
      if (driverUser.length > 0) {
        createNotification({ title: 'Fuel Entry Rejected', message: `Your fuel entry ₹${existing.totalAmount} was rejected${notes ? ': ' + notes : ''}`, category: 'FUEL', severity: 'WARNING', actionUrl: `/driver-portal/fuel`, recipientPolicy: { type: 'USER', userIds: [driverUser[0].userId] }, createdById: userId ?? null }).catch(() => {});
      }
    }
  } catch {}

  return item;
}
