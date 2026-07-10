import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { getDriverIdForUser } from '../user-profile-links/user-profile-links.service';

type DbClient = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  financeAccount: { update(args: any): Promise<unknown> };
};

type ListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  driverId?: string;
  vehicleId?: string;
  tripId?: string;
  advanceId?: string;
  dateFrom?: string;
  dateTo?: string;
  overdueOnly?: boolean | string;
};

type CreateAdvanceInput = {
  driverId: string;
  vehicleId?: string | null;
  tripId?: string | null;
  accountId?: string | null;
  amount: number;
  paymentMode: string;
  dueDate?: string | Date | null;
  purpose?: string | null;
  notes?: string | null;
  createdById?: string | null;
};

type CreateSettlementInput = {
  returnedCashAmount?: number;
  adjustmentAmount?: number;
  notes?: string | null;
  includeApprovedFuel?: boolean;
  includeApprovedExpenses?: boolean;
  createdById?: string | null;
  actorDriverId?: string | null;
};

type SettleInput = {
  accountId?: string | null;
  returnedCashAmount?: number;
  paymentMode?: string;
  referenceNumber?: string | null;
  notes?: string | null;
  userId?: string | null;
};

type AnyRow = Record<string, any>;
type AdvanceRow = AnyRow & { id: string; advance_number: string; driver_id: string; vehicle_id: string | null; trip_id: string | null; account_id: string | null; payment_mode: string; status: string };
type SettlementRow = AnyRow & { id: string; settlement_number: string; advance_id: string; driver_id: string; vehicle_id: string | null; trip_id: string | null; status: string };
type SpendRow = { id: string; amount: unknown };

const ACTIVE_ADVANCE_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'ISSUED', 'PARTIALLY_SETTLED', 'NEEDS_CHANGES'];

const ADVANCE_SELECT = `
  SELECT da.*,
    d.name AS driver_name,
    v.vehicle_number,
    t.trip_number,
    fa.name AS account_name,
    CASE WHEN da.due_date IS NOT NULL AND da.due_date < NOW() AND da.status IN ('ISSUED','PARTIALLY_SETTLED') AND da.balance_amount > 0 THEN true ELSE false END AS is_overdue
  FROM driver_advances da
  JOIN drivers d ON d.id = da.driver_id
  LEFT JOIN vehicles v ON v.id = da.vehicle_id
  LEFT JOIN trips t ON t.id = da.trip_id
  LEFT JOIN finance_accounts fa ON fa.id = da.account_id
`;

const SETTLEMENT_SELECT = `
  SELECT ds.*,
    da.advance_number,
    da.issued_amount AS advance_issued_amount,
    da.amount AS advance_amount,
    d.name AS driver_name,
    v.vehicle_number,
    t.trip_number
  FROM driver_settlements ds
  JOIN driver_advances da ON da.id = ds.advance_id
  JOIN drivers d ON d.id = ds.driver_id
  LEFT JOIN vehicles v ON v.id = ds.vehicle_id
  LEFT JOIN trips t ON t.id = ds.trip_id
`;

function id() { return randomUUID(); }
function sequence(prefix: string) { return `${prefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`; }
function money(value: unknown): number { return value == null ? 0 : Number(value); }
function asDate(value?: string | Date | null): Date | null { return value ? (value instanceof Date ? value : new Date(value)) : null; }

function normalizeAdvance(row: AnyRow) {
  return {
    id: String(row.id),
    advanceNumber: row.advance_number,
    driverId: row.driver_id,
    driverName: row.driver_name,
    vehicleId: row.vehicle_id,
    vehicleNumber: row.vehicle_number,
    tripId: row.trip_id,
    tripNumber: row.trip_number,
    accountId: row.account_id,
    accountName: row.account_name,
    amount: money(row.amount),
    issuedAmount: money(row.issued_amount),
    settledAmount: money(row.settled_amount),
    returnedAmount: money(row.returned_amount),
    balanceAmount: money(row.balance_amount),
    paymentMode: row.payment_mode,
    dueDate: row.due_date,
    isOverdue: Boolean(row.is_overdue),
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    reviewedAt: row.reviewed_at,
    issuedAt: row.issued_at,
    purpose: row.purpose,
    notes: row.notes,
    status: row.status,
    approvedById: row.approved_by_id,
    reviewedById: row.reviewed_by_id,
    issuedById: row.issued_by_id,
    createdById: row.created_by_id,
    cancelledById: row.cancelled_by_id,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
    reviewComments: row.review_comments,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeSettlement(row: AnyRow) {
  return {
    id: String(row.id),
    settlementNumber: row.settlement_number,
    advanceId: row.advance_id,
    advanceNumber: row.advance_number,
    advanceAmount: money(row.advance_amount),
    advanceIssuedAmount: money(row.advance_issued_amount),
    driverId: row.driver_id,
    driverName: row.driver_name,
    vehicleId: row.vehicle_id,
    vehicleNumber: row.vehicle_number,
    tripId: row.trip_id,
    tripNumber: row.trip_number,
    submittedFuelTotal: money(row.submitted_fuel_total),
    approvedFuelTotal: money(row.approved_fuel_total),
    submittedExpenseTotal: money(row.submitted_expense_total),
    approvedExpenseTotal: money(row.approved_expense_total),
    returnedCashAmount: money(row.returned_cash_amount),
    adjustmentAmount: money(row.adjustment_amount),
    totalApprovedSpend: money(row.total_approved_spend),
    settlementTotal: money(row.settlement_total),
    balanceDueFromDriver: money(row.balance_due_from_driver),
    reimbursementDueToDriver: money(row.reimbursement_due_to_driver),
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    settledAt: row.settled_at,
    reviewedById: row.reviewed_by_id,
    settledById: row.settled_by_id,
    createdById: row.created_by_id,
    reviewComments: row.review_comments,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function queryOne<T>(db: DbClient, sql: string, ...params: unknown[]): Promise<T | null> {
  const rows = await db.$queryRawUnsafe<T[]>(sql, ...params);
  return rows[0] ?? null;
}

function pagination(query: ListQuery) {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);
  return { page, limit, offset: (page - 1) * limit };
}

function addFilter(clauses: string[], params: unknown[], sql: string, value: unknown) {
  params.push(value);
  clauses.push(sql.replace('?', `$${params.length}`));
}

async function getAdvanceRow(idValue: string, db: DbClient = prisma): Promise<AdvanceRow> {
  const row = await queryOne<AdvanceRow>(db, `${ADVANCE_SELECT} WHERE da.id = $1`, idValue);
  if (!row) throw new AppError('Driver advance not found', 404);
  return row;
}

async function getSettlementRow(idValue: string, db: DbClient = prisma): Promise<SettlementRow> {
  const row = await queryOne<SettlementRow>(db, `${SETTLEMENT_SELECT} WHERE ds.id = $1`, idValue);
  if (!row) throw new AppError('Driver settlement not found', 404);
  return row;
}

async function validateReferences(driverId: string, vehicleId?: string | null, tripId?: string | null, accountId?: string | null) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new AppError('Driver not found', 404);
  if (vehicleId && !(await prisma.vehicle.findUnique({ where: { id: vehicleId } }))) throw new AppError('Vehicle not found', 404);
  if (tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new AppError('Trip not found', 404);
    if (trip.driverId && trip.driverId !== driverId) throw new AppError('Trip does not belong to selected driver', 409);
    if (vehicleId && trip.vehicleId !== vehicleId) throw new AppError('Trip vehicle does not match selected vehicle', 409);
  }
  if (accountId) {
    const account = await prisma.financeAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new AppError('Finance account not found', 404);
    if (!account.isActive) throw new AppError('Finance account is inactive', 400);
  }
}

async function assertNoActiveAdvance(driverId: string, excludeId?: string) {
  const params: unknown[] = [driverId, ACTIVE_ADVANCE_STATUSES];
  let extra = '';
  if (excludeId) { params.push(excludeId); extra = `AND id <> $${params.length}`; }
  const active = await queryOne<{ advance_number: string; status: string }>(
    prisma,
    `SELECT advance_number, status FROM driver_advances
     WHERE driver_id=$1 AND status = ANY($2)
       AND (balance_amount > 0 OR status IN ('DRAFT','SUBMITTED','APPROVED','NEEDS_CHANGES')) ${extra}
     ORDER BY created_at DESC LIMIT 1`,
    ...params,
  );
  if (active) throw new AppError(`Driver already has an active advance (${active.advance_number}, ${active.status}). Settle/cancel it before issuing another advance.`, 409);
}

async function insertHistory(db: DbClient, input: { settlementId?: string | null; advanceId?: string | null; action: string; fromStatus?: string | null; toStatus?: string | null; remarks?: string | null; createdById?: string | null; oldValues?: unknown; newValues?: unknown }) {
  await db.$executeRawUnsafe(
    `INSERT INTO driver_settlement_history
      (id, settlement_id, advance_id, action, from_status, to_status, old_values, new_values, remarks, created_by_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10)`,
    id(), input.settlementId ?? null, input.advanceId ?? null, input.action, input.fromStatus ?? null, input.toStatus ?? null,
    input.oldValues === undefined ? null : JSON.stringify(input.oldValues),
    input.newValues === undefined ? null : JSON.stringify(input.newValues),
    input.remarks ?? null, input.createdById ?? null,
  );
}

async function createFinanceTransfer(db: DbClient, input: { sourceId: string; vehicleId?: string | null; tripId?: string | null; driverId: string; accountId?: string | null; amount: number; paymentMode: string; referenceNumber?: string | null; description: string; createdById?: string | null; direction: 'OUT' | 'IN' }) {
  if (input.amount <= 0) return null;
  const txnId = id();
  await db.$executeRawUnsafe(
    `INSERT INTO finance_transactions
      (id, transaction_number, transaction_type, source_module, source_id, vehicle_id, trip_id, driver_id, account_id,
       amount, tax_amount, total_amount, transaction_date, payment_mode, payment_status, reference_number, description, created_by_id, created_at, updated_at)
     VALUES ($1,$2,'TRANSFER','DRIVER',$3,$4,$5,$6,$7,$8,0,$8,NOW(),$9::"PaymentMode",'PAID',$10,$11,$12,NOW(),NOW())`,
    txnId, sequence('TXN-DRV'), input.sourceId, input.vehicleId ?? null, input.tripId ?? null, input.driverId,
    input.accountId ?? null, input.amount, input.paymentMode, input.referenceNumber ?? null, input.description, input.createdById ?? null,
  );
  if (input.accountId) {
    await db.financeAccount.update({ where: { id: input.accountId }, data: { currentBalance: input.direction === 'OUT' ? { decrement: input.amount } : { increment: input.amount } } });
  }
  return txnId;
}

async function transitionAdvance(idValue: string, allowedFrom: string[], toStatus: string, action: string, userId?: string | null, remarks?: string | null, extraUpdate = '', extraParams: unknown[] = []) {
  const existing = await getAdvanceRow(idValue);
  if (!allowedFrom.includes(existing.status)) throw new AppError(`Cannot move advance from ${existing.status} to ${toStatus}`, 409);
  await prisma.$executeRawUnsafe(
    `UPDATE driver_advances SET status=$2, review_comments=COALESCE($3, review_comments), updated_at=NOW() ${extraUpdate} WHERE id=$1`,
    idValue, toStatus, remarks ?? null, ...extraParams,
  );
  await insertHistory(prisma, { advanceId: idValue, action, fromStatus: existing.status, toStatus, remarks: remarks ?? null, createdById: userId ?? null });
  return getDriverAdvance(idValue);
}

export async function listDriverAdvances(query: ListQuery, ownDriverId?: string) {
  const { page, limit, offset } = pagination(query);
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (ownDriverId) addFilter(clauses, params, 'da.driver_id = ?', ownDriverId);
  if (query.driverId) addFilter(clauses, params, 'da.driver_id = ?', query.driverId);
  if (query.vehicleId) addFilter(clauses, params, 'da.vehicle_id = ?', query.vehicleId);
  if (query.tripId) addFilter(clauses, params, 'da.trip_id = ?', query.tripId);
  if (query.status) addFilter(clauses, params, 'da.status = ?', query.status);
  if (query.search) { params.push(`%${query.search}%`); clauses.push(`(da.advance_number ILIKE $${params.length} OR d.name ILIKE $${params.length} OR COALESCE(v.vehicle_number, '') ILIKE $${params.length})`); }
  if (query.dateFrom) addFilter(clauses, params, 'da.created_at >= ?', new Date(query.dateFrom));
  if (query.dateTo) addFilter(clauses, params, 'da.created_at <= ?', new Date(query.dateTo));
  if (query.overdueOnly === true || query.overdueOnly === 'true') clauses.push(`da.due_date IS NOT NULL AND da.due_date < NOW() AND da.status IN ('ISSUED','PARTIALLY_SETTLED') AND da.balance_amount > 0`);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await prisma.$queryRawUnsafe<AdvanceRow[]>(`${ADVANCE_SELECT} ${where} ORDER BY da.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, ...params, limit, offset);
  const countRow = await queryOne<{ count: number }>(prisma, `SELECT COUNT(*)::int AS count FROM driver_advances da JOIN drivers d ON d.id = da.driver_id LEFT JOIN vehicles v ON v.id = da.vehicle_id ${where}`, ...params);
  const total = Number(countRow?.count ?? 0);
  return { items: rows.map(normalizeAdvance), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getDriverAdvance(idValue: string, ownDriverId?: string) {
  const row = await getAdvanceRow(idValue);
  if (ownDriverId && row.driver_id !== ownDriverId) throw new AppError('Driver advance not found', 404);
  const settlements = await prisma.$queryRawUnsafe<SettlementRow[]>(`${SETTLEMENT_SELECT} WHERE ds.advance_id = $1 ORDER BY ds.created_at DESC`, idValue);
  const history = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT * FROM driver_settlement_history WHERE advance_id=$1 ORDER BY created_at ASC`, idValue);
  return { ...normalizeAdvance(row), settlements: settlements.map(normalizeSettlement), history };
}

export async function createDriverAdvance(input: CreateAdvanceInput) {
  await validateReferences(input.driverId, input.vehicleId, input.tripId, input.accountId);
  await assertNoActiveAdvance(input.driverId);
  const advanceId = id();
  const rows = await prisma.$queryRawUnsafe<AdvanceRow[]>(
    `INSERT INTO driver_advances (id, advance_number, driver_id, vehicle_id, trip_id, account_id, amount, payment_mode, due_date, purpose, notes, status, created_by_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'DRAFT',$12) RETURNING *`,
    advanceId, sequence('ADV'), input.driverId, input.vehicleId ?? null, input.tripId ?? null, input.accountId ?? null,
    input.amount, input.paymentMode, asDate(input.dueDate), input.purpose ?? null, input.notes ?? null, input.createdById ?? null,
  );
  await insertHistory(prisma, { advanceId, action: 'ADVANCE_CREATED', toStatus: 'DRAFT', createdById: input.createdById ?? null, newValues: rows[0] });
  return getDriverAdvance(advanceId);
}

export async function updateDriverAdvance(idValue: string, input: Partial<CreateAdvanceInput>, userId?: string | null) {
  const existing = await getAdvanceRow(idValue);
  if (!['DRAFT', 'NEEDS_CHANGES'].includes(existing.status)) throw new AppError('Only draft or needs-changes advances can be edited', 409);
  const nextDriverId = input.driverId ?? existing.driver_id;
  await validateReferences(nextDriverId, input.vehicleId === undefined ? existing.vehicle_id : input.vehicleId, input.tripId === undefined ? existing.trip_id : input.tripId, input.accountId === undefined ? existing.account_id : input.accountId);
  await assertNoActiveAdvance(nextDriverId, idValue);
  await prisma.$executeRawUnsafe(
    `UPDATE driver_advances SET driver_id=COALESCE($2, driver_id), vehicle_id=$3, trip_id=$4, account_id=$5, amount=COALESCE($6, amount), payment_mode=COALESCE($7, payment_mode), due_date=$8, purpose=$9, notes=$10, updated_at=NOW() WHERE id=$1`,
    idValue, input.driverId ?? null, input.vehicleId === undefined ? existing.vehicle_id : input.vehicleId, input.tripId === undefined ? existing.trip_id : input.tripId,
    input.accountId === undefined ? existing.account_id : input.accountId, input.amount ?? null, input.paymentMode ?? null,
    input.dueDate === undefined ? existing.due_date : asDate(input.dueDate), input.purpose === undefined ? existing.purpose : input.purpose, input.notes === undefined ? existing.notes : input.notes,
  );
  await insertHistory(prisma, { advanceId: idValue, action: 'ADVANCE_UPDATED', fromStatus: existing.status, toStatus: existing.status, createdById: userId ?? null, oldValues: existing, newValues: input });
  return getDriverAdvance(idValue);
}

export async function submitDriverAdvance(idValue: string, userId?: string | null) { return transitionAdvance(idValue, ['DRAFT', 'NEEDS_CHANGES'], 'SUBMITTED', 'ADVANCE_SUBMITTED', userId, null, ', submitted_at=NOW()'); }
export async function approveDriverAdvance(idValue: string, userId?: string | null, remarks?: string | null) { return transitionAdvance(idValue, ['SUBMITTED'], 'APPROVED', 'ADVANCE_APPROVED', userId, remarks, ', approved_at=NOW(), approved_by_id=$4, reviewed_at=NOW(), reviewed_by_id=$4', [userId ?? null]); }
export async function rejectDriverAdvance(idValue: string, userId?: string | null, remarks?: string | null) { return transitionAdvance(idValue, ['SUBMITTED', 'APPROVED'], 'REJECTED', 'ADVANCE_REJECTED', userId, remarks, ', reviewed_at=NOW(), reviewed_by_id=$4', [userId ?? null]); }
export async function requestDriverAdvanceChanges(idValue: string, userId?: string | null, remarks?: string | null) { return transitionAdvance(idValue, ['SUBMITTED'], 'NEEDS_CHANGES', 'ADVANCE_NEEDS_CHANGES', userId, remarks, ', reviewed_at=NOW(), reviewed_by_id=$4', [userId ?? null]); }

export async function issueDriverAdvance(idValue: string, input: { accountId?: string | null; paymentMode?: string; referenceNumber?: string | null; notes?: string | null; userId?: string | null }) {
  const existing = await getAdvanceRow(idValue);
  if (existing.status !== 'APPROVED') throw new AppError('Only approved advances can be issued', 409);
  const accountId = input.accountId === undefined ? existing.account_id : input.accountId;
  const paymentMode = input.paymentMode ?? existing.payment_mode;
  await validateReferences(existing.driver_id, existing.vehicle_id, existing.trip_id, accountId);
  await prisma.$transaction(async (tx: any) => {
    await createFinanceTransfer(tx, { sourceId: existing.id, vehicleId: existing.vehicle_id, tripId: existing.trip_id, driverId: existing.driver_id, accountId, amount: money(existing.amount), paymentMode, referenceNumber: input.referenceNumber ?? null, description: `Driver advance issued: ${existing.advance_number}`, createdById: input.userId ?? null, direction: 'OUT' });
    await tx.$executeRawUnsafe(`UPDATE driver_advances SET account_id=$2, payment_mode=$3, issued_amount=amount, balance_amount=amount, issued_at=NOW(), issued_by_id=$4, status='ISSUED', notes=COALESCE($5, notes), updated_at=NOW() WHERE id=$1`, idValue, accountId ?? null, paymentMode, input.userId ?? null, input.notes ?? null);
    await insertHistory(tx, { advanceId: idValue, action: 'ADVANCE_ISSUED', fromStatus: existing.status, toStatus: 'ISSUED', createdById: input.userId ?? null, newValues: { accountId, paymentMode } });
  });
  return getDriverAdvance(idValue);
}

export async function cancelDriverAdvance(idValue: string, reason: string, userId?: string | null) {
  const existing = await getAdvanceRow(idValue);
  if (['SETTLED', 'CANCELLED'].includes(existing.status)) throw new AppError('Advance cannot be cancelled in current status', 409);
  const openSettlements = await queryOne<{ count: number }>(prisma, `SELECT COUNT(*)::int AS count FROM driver_settlements WHERE advance_id=$1 AND status NOT IN ('CANCELLED','REJECTED')`, idValue);
  if (Number(openSettlements?.count ?? 0) > 0) throw new AppError('Cannot cancel advance with active settlements', 409);
  await prisma.$transaction(async (tx: any) => {
    if (['ISSUED', 'PARTIALLY_SETTLED'].includes(existing.status) && money(existing.balance_amount) > 0) {
      await createFinanceTransfer(tx, { sourceId: existing.id, vehicleId: existing.vehicle_id, tripId: existing.trip_id, driverId: existing.driver_id, accountId: existing.account_id, amount: money(existing.balance_amount), paymentMode: existing.payment_mode, referenceNumber: null, description: `Driver advance cancellation reversal: ${existing.advance_number}`, createdById: userId ?? null, direction: 'IN' });
    }
    await tx.$executeRawUnsafe(`UPDATE driver_advances SET status='CANCELLED', balance_amount=0, issued_amount=0, settled_amount=0, returned_amount=0, cancelled_by_id=$2, cancelled_at=NOW(), cancellation_reason=$3, updated_at=NOW() WHERE id=$1`, idValue, userId ?? null, reason);
    await insertHistory(tx, { advanceId: idValue, action: 'ADVANCE_CANCELLED', fromStatus: existing.status, toStatus: 'CANCELLED', remarks: reason, createdById: userId ?? null });
  });
  return getDriverAdvance(idValue);
}

async function getApprovedFuelRows(db: DbClient, driverId: string, vehicleId?: string | null, tripId?: string | null) {
  const clauses = [`fe.driver_id = $1`, `fe.status = 'APPROVED'`, `NOT EXISTS (SELECT 1 FROM driver_settlement_lines dsl WHERE dsl.fuel_entry_id = fe.id)`];
  const params: unknown[] = [driverId];
  if (vehicleId) addFilter(clauses, params, 'fe.vehicle_id = ?', vehicleId);
  if (tripId) addFilter(clauses, params, 'fe.trip_id = ?', tripId);
  return db.$queryRawUnsafe<SpendRow[]>(`SELECT fe.id, fe.total_amount AS amount FROM fuel_entries fe WHERE ${clauses.join(' AND ')} ORDER BY fe.fuel_date ASC`, ...params);
}

async function getApprovedExpenseRows(db: DbClient, driverId: string, vehicleId?: string | null, tripId?: string | null) {
  const clauses = [`e.driver_id = $1`, `e.status = 'APPROVED'`, `NOT EXISTS (SELECT 1 FROM driver_settlement_lines dsl WHERE dsl.expense_id = e.id)`];
  const params: unknown[] = [driverId];
  if (vehicleId) addFilter(clauses, params, 'e.vehicle_id = ?', vehicleId);
  if (tripId) addFilter(clauses, params, 'e.trip_id = ?', tripId);
  return db.$queryRawUnsafe<SpendRow[]>(`SELECT e.id, e.amount FROM expenses e WHERE ${clauses.join(' AND ')} ORDER BY e.expense_date ASC`, ...params);
}

async function recalculateSettlement(idValue: string, db: DbClient = prisma) {
  const settlement = await getSettlementRow(idValue, db);
  const totals = await db.$queryRawUnsafe<Array<{ line_type: string; total: unknown }>>(`SELECT line_type, COALESCE(SUM(COALESCE(approved_amount, amount)), 0) AS total FROM driver_settlement_lines WHERE settlement_id=$1 GROUP BY line_type`, idValue);
  const byType = new Map<string, number>(totals.map((row) => [row.line_type, money(row.total)]));
  const approvedFuelTotal = byType.get('FUEL') ?? 0;
  const approvedExpenseTotal = byType.get('EXPENSE') ?? 0;
  const returnedCashAmount = byType.get('CASH_RETURN') ?? 0;
  const adjustmentAmount = byType.get('ADJUSTMENT') ?? money(settlement.adjustment_amount);
  const totalApprovedSpend = approvedFuelTotal + approvedExpenseTotal;
  const settlementTotal = totalApprovedSpend + returnedCashAmount + adjustmentAmount;
  const issued = money(settlement.advance_issued_amount);
  const balanceDueFromDriver = Math.max(issued - settlementTotal, 0);
  const reimbursementDueToDriver = Math.max(settlementTotal - issued, 0);
  await db.$executeRawUnsafe(`UPDATE driver_settlements SET submitted_fuel_total=$2, approved_fuel_total=$2, submitted_expense_total=$3, approved_expense_total=$3, returned_cash_amount=$4, adjustment_amount=$5, total_approved_spend=$6, settlement_total=$7, balance_due_from_driver=$8, reimbursement_due_to_driver=$9, updated_at=NOW() WHERE id=$1`, idValue, approvedFuelTotal, approvedExpenseTotal, returnedCashAmount, adjustmentAmount, totalApprovedSpend, settlementTotal, balanceDueFromDriver, reimbursementDueToDriver);
  return getSettlementRow(idValue, db);
}

export async function createDriverSettlement(advanceId: string, input: CreateSettlementInput) {
  const advance = await getAdvanceRow(advanceId);
  if (!['ISSUED', 'PARTIALLY_SETTLED'].includes(advance.status)) throw new AppError('Advance must be issued before settlement', 409);
  if (input.actorDriverId && input.actorDriverId !== advance.driver_id) throw new AppError('Advance does not belong to your driver profile', 404);
  const activeSettlement = await queryOne<{ id: string }>(prisma, `SELECT id FROM driver_settlements WHERE advance_id=$1 AND status IN ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','NEEDS_CHANGES') LIMIT 1`, advanceId);
  if (activeSettlement) throw new AppError('Advance already has an active settlement', 409);
  const settlementId = id();
  await prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe(`INSERT INTO driver_settlements (id, settlement_number, advance_id, driver_id, vehicle_id, trip_id, adjustment_amount, notes, status, created_by_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'DRAFT',$9)`, settlementId, sequence('SET'), advanceId, advance.driver_id, advance.vehicle_id, advance.trip_id, input.adjustmentAmount ?? 0, input.notes ?? null, input.createdById ?? null);
    if (input.includeApprovedFuel !== false) for (const row of await getApprovedFuelRows(tx, advance.driver_id, advance.vehicle_id, advance.trip_id)) await tx.$executeRawUnsafe(`INSERT INTO driver_settlement_lines (id, settlement_id, line_type, fuel_entry_id, amount, approved_amount, description) VALUES ($1,$2,'FUEL',$3,$4,$4,'Approved fuel spend')`, id(), settlementId, row.id, money(row.amount));
    if (input.includeApprovedExpenses !== false) for (const row of await getApprovedExpenseRows(tx, advance.driver_id, advance.vehicle_id, advance.trip_id)) await tx.$executeRawUnsafe(`INSERT INTO driver_settlement_lines (id, settlement_id, line_type, expense_id, amount, approved_amount, description) VALUES ($1,$2,'EXPENSE',$3,$4,$4,'Approved expense spend')`, id(), settlementId, row.id, money(row.amount));
    if ((input.returnedCashAmount ?? 0) > 0) await tx.$executeRawUnsafe(`INSERT INTO driver_settlement_lines (id, settlement_id, line_type, amount, approved_amount, description) VALUES ($1,$2,'CASH_RETURN',$3,$3,'Cash returned by driver')`, id(), settlementId, input.returnedCashAmount);
    if ((input.adjustmentAmount ?? 0) !== 0) await tx.$executeRawUnsafe(`INSERT INTO driver_settlement_lines (id, settlement_id, line_type, amount, approved_amount, description) VALUES ($1,$2,'ADJUSTMENT',$3,$3,'Manual settlement adjustment')`, id(), settlementId, input.adjustmentAmount);
    await recalculateSettlement(settlementId, tx);
    await insertHistory(tx, { settlementId, advanceId, action: 'SETTLEMENT_CREATED', toStatus: 'DRAFT', createdById: input.createdById ?? null });
  });
  return getDriverSettlement(settlementId, input.actorDriverId ?? undefined);
}

export async function listDriverSettlements(query: ListQuery, ownDriverId?: string) {
  const { page, limit, offset } = pagination(query);
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (ownDriverId) addFilter(clauses, params, 'ds.driver_id = ?', ownDriverId);
  if (query.advanceId) addFilter(clauses, params, 'ds.advance_id = ?', query.advanceId);
  if (query.driverId) addFilter(clauses, params, 'ds.driver_id = ?', query.driverId);
  if (query.vehicleId) addFilter(clauses, params, 'ds.vehicle_id = ?', query.vehicleId);
  if (query.tripId) addFilter(clauses, params, 'ds.trip_id = ?', query.tripId);
  if (query.status) addFilter(clauses, params, 'ds.status = ?', query.status);
  if (query.search) { params.push(`%${query.search}%`); clauses.push(`(ds.settlement_number ILIKE $${params.length} OR da.advance_number ILIKE $${params.length} OR d.name ILIKE $${params.length})`); }
  if (query.dateFrom) addFilter(clauses, params, 'ds.created_at >= ?', new Date(query.dateFrom));
  if (query.dateTo) addFilter(clauses, params, 'ds.created_at <= ?', new Date(query.dateTo));
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await prisma.$queryRawUnsafe<SettlementRow[]>(`${SETTLEMENT_SELECT} ${where} ORDER BY ds.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, ...params, limit, offset);
  const countRow = await queryOne<{ count: number }>(prisma, `SELECT COUNT(*)::int AS count FROM driver_settlements ds JOIN driver_advances da ON da.id = ds.advance_id JOIN drivers d ON d.id = ds.driver_id LEFT JOIN vehicles v ON v.id = ds.vehicle_id ${where}`, ...params);
  const total = Number(countRow?.count ?? 0);
  return { items: rows.map(normalizeSettlement), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getDriverSettlement(idValue: string, ownDriverId?: string) {
  const row = await getSettlementRow(idValue);
  if (ownDriverId && row.driver_id !== ownDriverId) throw new AppError('Driver settlement not found', 404);
  const lines = await prisma.$queryRawUnsafe<Array<Record<string, any>>>(`SELECT dsl.*, fe.receipt_number AS fuel_receipt_number, e.category AS expense_category FROM driver_settlement_lines dsl LEFT JOIN fuel_entries fe ON fe.id = dsl.fuel_entry_id LEFT JOIN expenses e ON e.id = dsl.expense_id WHERE dsl.settlement_id=$1 ORDER BY dsl.created_at ASC`, idValue);
  const history = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT * FROM driver_settlement_history WHERE settlement_id=$1 ORDER BY created_at ASC`, idValue);
  return { ...normalizeSettlement(row), lines: lines.map((line) => ({ ...line, amount: money(line.amount), approved_amount: line.approved_amount == null ? null : money(line.approved_amount) })), history };
}

async function transitionSettlement(idValue: string, allowedFrom: string[], toStatus: string, action: string, userId?: string | null, remarks?: string | null, extraUpdate = '', extraParams: unknown[] = []) {
  const existing = await getSettlementRow(idValue);
  if (!allowedFrom.includes(existing.status)) throw new AppError(`Cannot move settlement from ${existing.status} to ${toStatus}`, 409);
  await prisma.$executeRawUnsafe(`UPDATE driver_settlements SET status=$2, review_comments=COALESCE($3, review_comments), updated_at=NOW() ${extraUpdate} WHERE id=$1`, idValue, toStatus, remarks ?? null, ...extraParams);
  await insertHistory(prisma, { settlementId: idValue, advanceId: existing.advance_id, action, fromStatus: existing.status, toStatus, remarks: remarks ?? null, createdById: userId ?? null });
  return getDriverSettlement(idValue);
}

export async function submitDriverSettlement(idValue: string, userId?: string | null, ownDriverId?: string) { const existing = await getSettlementRow(idValue); if (ownDriverId && existing.driver_id !== ownDriverId) throw new AppError('Driver settlement not found', 404); await recalculateSettlement(idValue); return transitionSettlement(idValue, ['DRAFT', 'NEEDS_CHANGES'], 'SUBMITTED', 'SETTLEMENT_SUBMITTED', userId, null, ', submitted_at=NOW()'); }
export async function reviewDriverSettlement(idValue: string, userId?: string | null, remarks?: string | null) { return transitionSettlement(idValue, ['SUBMITTED'], 'UNDER_REVIEW', 'SETTLEMENT_REVIEW_STARTED', userId, remarks, ', reviewed_at=NOW(), reviewed_by_id=COALESCE(reviewed_by_id, $4)', [userId ?? null]); }
export async function approveDriverSettlement(idValue: string, userId?: string | null, remarks?: string | null) { await recalculateSettlement(idValue); return transitionSettlement(idValue, ['SUBMITTED', 'UNDER_REVIEW'], 'APPROVED', 'SETTLEMENT_APPROVED', userId, remarks, ', reviewed_at=NOW(), reviewed_by_id=$4', [userId ?? null]); }
export async function rejectDriverSettlement(idValue: string, userId?: string | null, remarks?: string | null) { return transitionSettlement(idValue, ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'], 'REJECTED', 'SETTLEMENT_REJECTED', userId, remarks, ', reviewed_at=NOW(), reviewed_by_id=$4', [userId ?? null]); }
export async function requestSettlementChanges(idValue: string, userId?: string | null, remarks?: string | null) { return transitionSettlement(idValue, ['SUBMITTED', 'UNDER_REVIEW'], 'NEEDS_CHANGES', 'SETTLEMENT_NEEDS_CHANGES', userId, remarks, ', reviewed_at=NOW(), reviewed_by_id=$4', [userId ?? null]); }
export async function cancelDriverSettlement(idValue: string, userId?: string | null, remarks?: string | null) { return transitionSettlement(idValue, ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'NEEDS_CHANGES'], 'CANCELLED', 'SETTLEMENT_CANCELLED', userId, remarks); }

export async function addCashReturn(idValue: string, amount: number, userId?: string | null, ownDriverId?: string, notes?: string | null) {
  const existing = await getSettlementRow(idValue);
  if (ownDriverId && existing.driver_id !== ownDriverId) throw new AppError('Driver settlement not found', 404);
  if (['SETTLED', 'CANCELLED', 'REJECTED'].includes(existing.status)) throw new AppError('Cannot add cash return to closed settlement', 409);
  await prisma.$executeRawUnsafe(`INSERT INTO driver_settlement_lines (id, settlement_id, line_type, amount, approved_amount, description) VALUES ($1,$2,'CASH_RETURN',$3,$3,$4)`, id(), idValue, amount, notes ?? 'Cash returned by driver');
  await recalculateSettlement(idValue);
  await insertHistory(prisma, { settlementId: idValue, advanceId: existing.advance_id, action: 'CASH_RETURN_ADDED', fromStatus: existing.status, toStatus: existing.status, remarks: notes ?? null, createdById: userId ?? null, newValues: { amount } });
  return getDriverSettlement(idValue, ownDriverId);
}

export async function settleDriverSettlement(idValue: string, input: SettleInput) {
  const existing = await getSettlementRow(idValue);
  if (existing.status !== 'APPROVED') throw new AppError('Only approved settlements can be settled', 409);
  if ((input.returnedCashAmount ?? 0) > 0) await addCashReturn(idValue, input.returnedCashAmount!, input.userId ?? null, undefined, input.notes ?? null);
  const finalRow = await recalculateSettlement(idValue);
  const accountId = input.accountId ?? null;
  const paymentMode = input.paymentMode ?? 'CASH';
  await prisma.$transaction(async (tx: any) => {
    if (money(finalRow.returned_cash_amount) > 0) await createFinanceTransfer(tx, { sourceId: finalRow.id, vehicleId: finalRow.vehicle_id, tripId: finalRow.trip_id, driverId: finalRow.driver_id, accountId, amount: money(finalRow.returned_cash_amount), paymentMode, referenceNumber: input.referenceNumber ?? null, description: `Driver advance cash returned: ${finalRow.settlement_number}`, createdById: input.userId ?? null, direction: 'IN' });
    if (money(finalRow.reimbursement_due_to_driver) > 0) await createFinanceTransfer(tx, { sourceId: finalRow.id, vehicleId: finalRow.vehicle_id, tripId: finalRow.trip_id, driverId: finalRow.driver_id, accountId, amount: money(finalRow.reimbursement_due_to_driver), paymentMode, referenceNumber: input.referenceNumber ?? null, description: `Driver reimbursement from settlement: ${finalRow.settlement_number}`, createdById: input.userId ?? null, direction: 'OUT' });
    await tx.$executeRawUnsafe(`UPDATE driver_settlements SET status='SETTLED', settled_at=NOW(), settled_by_id=$2, notes=COALESCE($3, notes), updated_at=NOW() WHERE id=$1`, idValue, input.userId ?? null, input.notes ?? null);
    await tx.$executeRawUnsafe(`WITH totals AS (SELECT advance_id, COALESCE(SUM(total_approved_spend),0) AS spend, COALESCE(SUM(returned_cash_amount),0) AS returned, COALESCE(SUM(settlement_total),0) AS settled_total FROM driver_settlements WHERE advance_id=$1 AND status='SETTLED' GROUP BY advance_id) UPDATE driver_advances da SET settled_amount=totals.spend, returned_amount=totals.returned, balance_amount=GREATEST(da.issued_amount - totals.settled_total, 0), status=CASE WHEN GREATEST(da.issued_amount - totals.settled_total, 0) = 0 THEN 'SETTLED' ELSE 'PARTIALLY_SETTLED' END, updated_at=NOW() FROM totals WHERE da.id=totals.advance_id AND da.id=$1`, finalRow.advance_id);
    await insertHistory(tx, { settlementId: idValue, advanceId: finalRow.advance_id, action: 'SETTLEMENT_SETTLED', fromStatus: existing.status, toStatus: 'SETTLED', remarks: input.notes ?? null, createdById: input.userId ?? null, newValues: normalizeSettlement(finalRow) });
  });
  return getDriverSettlement(idValue);
}

export async function getDriverAdvanceReport(query: ListQuery = {}) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (query.driverId) addFilter(clauses, params, 'da.driver_id = ?', query.driverId);
  if (query.vehicleId) addFilter(clauses, params, 'da.vehicle_id = ?', query.vehicleId);
  if (query.status) addFilter(clauses, params, 'da.status = ?', query.status);
  if (query.dateFrom) addFilter(clauses, params, 'da.created_at >= ?', new Date(query.dateFrom));
  if (query.dateTo) addFilter(clauses, params, 'da.created_at <= ?', new Date(query.dateTo));
  const whereClauses = [...clauses, "da.status != 'CANCELLED'"];
  const where = `WHERE ${whereClauses.join(' AND ')}`;
  const summary = await queryOne<Record<string, unknown>>(prisma, `SELECT COUNT(*)::int AS total_advances, COALESCE(SUM(amount),0) AS total_requested, COALESCE(SUM(issued_amount),0) AS total_issued, COALESCE(SUM(settled_amount),0) AS total_spent_settled, COALESCE(SUM(returned_amount),0) AS total_returned, COALESCE(SUM(balance_amount),0) AS total_outstanding, COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < NOW() AND status IN ('ISSUED','PARTIALLY_SETTLED') AND balance_amount > 0)::int AS overdue_count FROM driver_advances da ${where}`, ...params);
  const byDriver = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT d.id AS driver_id, d.name AS driver_name, COUNT(*)::int AS total_advances, COALESCE(SUM(da.issued_amount),0) AS total_issued, COALESCE(SUM(da.settled_amount),0) AS total_spent_settled, COALESCE(SUM(da.returned_amount),0) AS total_returned, COALESCE(SUM(da.balance_amount),0) AS total_outstanding, COUNT(*) FILTER (WHERE da.due_date IS NOT NULL AND da.due_date < NOW() AND da.status IN ('ISSUED','PARTIALLY_SETTLED') AND da.balance_amount > 0)::int AS overdue_count FROM driver_advances da JOIN drivers d ON d.id = da.driver_id ${where} GROUP BY d.id, d.name ORDER BY total_outstanding DESC, d.name ASC`, ...params);
  return {
    summary: { totalAdvances: Number(summary?.total_advances ?? 0), totalRequested: money(summary?.total_requested), totalIssued: money(summary?.total_issued), totalSpentSettled: money(summary?.total_spent_settled), totalReturned: money(summary?.total_returned), totalOutstanding: money(summary?.total_outstanding), overdueCount: Number(summary?.overdue_count ?? 0) },
    byDriver: byDriver.map((row) => ({ driverId: row.driver_id, driverName: row.driver_name, totalAdvances: Number(row.total_advances ?? 0), totalIssued: money(row.total_issued), totalSpentSettled: money(row.total_spent_settled), totalReturned: money(row.total_returned), totalOutstanding: money(row.total_outstanding), overdueCount: Number(row.overdue_count ?? 0) })),
  };
}

export async function getOwnDriverId(userId: string) {
  const driverId = await getDriverIdForUser(userId);
  if (!driverId) throw new AppError('No linked driver profile found', 404);
  return driverId;
}
