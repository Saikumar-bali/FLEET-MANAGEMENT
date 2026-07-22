import { Prisma, WorkflowRecordStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { assertEditable, assertTransition, dateRange, validateReferences, workflowInclude } from '../workflow-records/workflow-records.service';
import { createNotification } from '../notifications/notifications.service';
import { approveOperationalExpense, reverseOperationalExpense } from '../staff-finance/staff-finance.service';

type ExpenseInput = {
  vehicleId: string;
  tripId?: string | null;
  driverId?: string | null;
  category: string;
  expenseDate: string;
  amount: number;
  vendor?: string | null;
  receiptNumber?: string | null;
  paymentSource?: 'STAFF_WALLET' | 'COMPANY_ACCOUNT' | 'CORPORATE_CARD' | 'VENDOR_CREDIT' | 'PERSONAL_MONEY';
  financeAccountId?: string | null;
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
    paymentSource: input.paymentSource,
    financeAccountId: input.financeAccountId,
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
  const item = status === 'APPROVED'
    ? await approveOperationalExpense('EXPENSE', id, userId, notes).then(() => getExpense(id))
    : status === 'CANCELLED' && existing.status === 'APPROVED'
      ? await reverseOperationalExpense('EXPENSE', id, userId, notes).then(() => getExpense(id))
    : await prisma.expense.update({
        where: { id },
        data: { status, notes: notes === undefined ? existing.notes : notes },
        include: workflowInclude,
      });

  try {
    if (status === 'SUBMITTED') {
      createNotification({ title: 'Expense Submitted', message: `Expense ₹${existing.amount} (${existing.category}) needs review`, category: 'EXPENSE', severity: 'INFO', actionUrl: `/expenses`, recipientPolicy: { type: 'ROLE', roleKeys: ['super_admin', 'admin', 'manager', 'finance'] }, createdById: userId ?? null }).catch(() => {});
    } else if (status === 'APPROVED' && existing.driverId) {
      const driverUser = await prisma.$queryRawUnsafe<Array<{ userId: string }>>("SELECT user_id AS \"userId\" FROM user_profile_links WHERE profile_type = $1::\"ProfileType\" AND profile_id = $2 AND status = $3::\"UserProfileLinkStatus\" AND user_id IS NOT NULL LIMIT 1", 'DRIVER', existing.driverId, 'ACTIVE');
      if (driverUser.length > 0) {
        createNotification({ title: 'Expense Approved', message: `Your expense ₹${existing.amount} (${existing.category}) has been approved`, category: 'EXPENSE', severity: 'SUCCESS', actionUrl: `/driver-portal/expenses`, recipientPolicy: { type: 'USER', userIds: [driverUser[0].userId] }, createdById: userId ?? null }).catch(() => {});
      }
    } else if (status === 'REJECTED' && existing.driverId) {
      const driverUser = await prisma.$queryRawUnsafe<Array<{ userId: string }>>("SELECT user_id AS \"userId\" FROM user_profile_links WHERE profile_type = $1::\"ProfileType\" AND profile_id = $2 AND status = $3::\"UserProfileLinkStatus\" AND user_id IS NOT NULL LIMIT 1", 'DRIVER', existing.driverId, 'ACTIVE');
      if (driverUser.length > 0) {
        createNotification({ title: 'Expense Rejected', message: `Your expense ₹${existing.amount} (${existing.category}) was rejected${notes ? ': ' + notes : ''}`, category: 'EXPENSE', severity: 'WARNING', actionUrl: `/driver-portal/expenses`, recipientPolicy: { type: 'USER', userIds: [driverUser[0].userId] }, createdById: userId ?? null }).catch(() => {});
      }
    }
  } catch {}

  return item;
}
