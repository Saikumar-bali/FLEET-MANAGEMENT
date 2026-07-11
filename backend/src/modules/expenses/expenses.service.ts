import { Prisma, WorkflowRecordStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { assertEditable, assertTransition, dateRange, validateReferences, workflowInclude } from '../workflow-records/workflow-records.service';
import { createNotification } from '../notifications/notifications.service';

type ExpenseInput = {
  vehicleId: string;
  tripId?: string | null;
  driverId?: string | null;
  category: string;
  expenseDate: string;
  amount: number;
  vendor?: string | null;
  receiptNumber?: string | null;
  notes?: string | null;
};

function expenseData(input: Partial<ExpenseInput>) {
  return {
    vehicleId: input.vehicleId,
    tripId: input.tripId === undefined ? undefined : input.tripId,
    driverId: input.driverId === undefined ? undefined : input.driverId,
    category: input.category,
    expenseDate: input.expenseDate ? new Date(input.expenseDate) : undefined,
    amount: input.amount,
    vendor: input.vendor,
    receiptNumber: input.receiptNumber,
    notes: input.notes,
  };
}

export async function listExpenses(query: any, extraWhere?: Record<string, unknown>) {
  const where: Prisma.ExpenseWhereInput = {};
  if (query.search) where.OR = [
    { category: { contains: query.search, mode: 'insensitive' } },
    { vendor: { contains: query.search, mode: 'insensitive' } },
    { receiptNumber: { contains: query.search, mode: 'insensitive' } },
  ];
  if (query.vehicleId) where.vehicleId = query.vehicleId;
  if (query.tripId) where.tripId = query.tripId;
  if (query.driverId) where.driverId = query.driverId;
  if (query.status) where.status = query.status;
  where.expenseDate = dateRange(query.dateFrom, query.dateTo);
  if (extraWhere) { where.AND = where.AND ? [...(Array.isArray(where.AND) ? where.AND : [where.AND]), extraWhere] : [extraWhere]; }
  const [items, total] = await Promise.all([
    prisma.expense.findMany({ where, include: workflowInclude, orderBy: { expenseDate: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.expense.count({ where }),
  ]);
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getExpense(id: string) {
  const item = await prisma.expense.findUnique({ where: { id }, include: workflowInclude });
  if (!item) throw new AppError('Expense not found', 404);
  return item;
}

export async function createExpense(input: ExpenseInput & { createdById?: string | null }) {
  await validateReferences(input.vehicleId, input.tripId, input.driverId);
  return prisma.expense.create({ data: { ...expenseData(input), vehicleId: input.vehicleId, category: input.category, expenseDate: new Date(input.expenseDate), amount: input.amount, createdById: input.createdById ?? null }, include: workflowInclude });
}

export async function updateExpense(id: string, input: Partial<ExpenseInput>, canApprove: boolean) {
  const existing = await getExpense(id);
  assertEditable(existing.status, canApprove);
  await validateReferences(input.vehicleId ?? existing.vehicleId, input.tripId === undefined ? existing.tripId : input.tripId, input.driverId === undefined ? existing.driverId : input.driverId);
  return prisma.expense.update({ where: { id }, data: expenseData(input), include: workflowInclude });
}

export async function transitionExpense(id: string, status: WorkflowRecordStatus, userId?: string | null, notes?: string | null) {
  const existing = await getExpense(id);
  assertTransition(existing.status, status);
  const item = await prisma.expense.update({
    where: { id },
    data: { status, notes: notes === undefined ? existing.notes : notes, approvedById: status === 'APPROVED' ? userId ?? null : undefined, approvedAt: status === 'APPROVED' ? new Date() : undefined },
    include: workflowInclude,
  });

  try {
    if (status === 'SUBMITTED') {
      await createNotification({ title: 'Expense Submitted', message: `Expense ₹${existing.amount} (${existing.category}) needs review`, category: 'EXPENSE', severity: 'INFO', actionUrl: `/expenses`, recipientPolicy: { type: 'ROLE', roleKeys: ['admin', 'manager', 'finance'] }, createdById: userId ?? null });
    } else if (status === 'APPROVED' && existing.driverId) {
      await createNotification({ title: 'Expense Approved', message: `Your expense ₹${existing.amount} (${existing.category}) has been approved`, category: 'EXPENSE', severity: 'SUCCESS', actionUrl: `/driver-portal/expenses`, recipientPolicy: { type: 'USER', userIds: [existing.driverId] }, createdById: userId ?? null });
    } else if (status === 'REJECTED' && existing.driverId) {
      await createNotification({ title: 'Expense Rejected', message: `Your expense ₹${existing.amount} (${existing.category}) was rejected${notes ? ': ' + notes : ''}`, category: 'EXPENSE', severity: 'WARNING', actionUrl: `/driver-portal/expenses`, recipientPolicy: { type: 'USER', userIds: [existing.driverId] }, createdById: userId ?? null });
    }
  } catch {}

  return item;
}
