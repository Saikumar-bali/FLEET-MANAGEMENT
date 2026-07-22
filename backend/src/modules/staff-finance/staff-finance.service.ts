import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

type Db = typeof prisma | Prisma.TransactionClient;
type MoneyLike = number | string | Prisma.Decimal;

type JournalLineInput = {
  side: 'DEBIT' | 'CREDIT';
  accountCode: string;
  amount: MoneyLike;
  financeAccountId?: string | null;
  tripId?: string | null;
  vehicleId?: string | null;
  beneficiaryUserId?: string | null;
  description?: string | null;
};

export type OperationalExpenseKind = 'FUEL' | 'EXPENSE';

const OPEN_ADVANCE_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'FUNDED', 'ACTIVE', 'RECONCILING', 'NEEDS_CHANGES'];
const OPEN_SETTLEMENT_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'CASH_CONFIRMED', 'NEEDS_CHANGES'];

function amount(value: MoneyLike | null | undefined): number {
  return Math.round(Number(value ?? 0) * 100) / 100;
}

function number(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString(36).toUpperCase()}`;
}

function decimal(value: MoneyLike): Prisma.Decimal {
  return new Prisma.Decimal(amount(value));
}

function assertPositive(value: MoneyLike, label: string) {
  if (amount(value) <= 0) throw new AppError(`${label} must be greater than zero`, 400);
}

async function ensureUser(db: Db, userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, status: true, role: { select: { key: true } } } });
  if (!user || user.status !== 'ACTIVE') throw new AppError('Active beneficiary user not found', 404);
  return user;
}

export async function resolveDriverUserId(driverId: string, db: Db = prisma): Promise<string> {
  const link = await db.userProfileLink.findFirst({
    where: { profileType: 'DRIVER', profileId: driverId, status: 'ACTIVE' },
    orderBy: [{ isPrimary: 'desc' }, { linkedAt: 'asc' }],
    select: { userId: true },
  });
  if (!link) throw new AppError('The selected driver is not linked to an active user account. Link the profile before allocating company money.', 409);
  return link.userId;
}

async function ensureWallet(db: Db, userId: string) {
  await ensureUser(db, userId);
  const wallet = await db.staffWallet.upsert({
    where: { userId },
    create: { userId, currency: 'INR' },
    update: {},
  });
  await db.$queryRawUnsafe('SELECT id FROM "staff_wallets" WHERE id=$1 FOR UPDATE', wallet.id);
  return db.staffWallet.findUniqueOrThrow({ where: { id: wallet.id } });
}

async function updateAccountBalance(db: Db, accountId: string | null | undefined, delta: number) {
  if (!accountId || delta === 0) return;
  if (delta < 0) {
    const changed = await db.$executeRawUnsafe(
      'UPDATE "finance_accounts" SET "current_balance"="current_balance"+$2, "updated_at"=NOW() WHERE id=$1 AND "current_balance" >= ABS($2)',
      accountId,
      delta,
    );
    if (changed !== 1) throw new AppError('The selected finance account has insufficient available balance', 409);
    return;
  }
  await db.financeAccount.update({ where: { id: accountId }, data: { currentBalance: { increment: delta } } });
}

export async function postJournalEntry(
  db: Db,
  input: { idempotencyKey: string; sourceType: string; sourceId: string; description: string; createdById?: string | null; lines: JournalLineInput[] },
) {
  const existing = await db.journalEntry.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { lines: true } });
  if (existing) return existing;

  const debit = input.lines.filter((line) => line.side === 'DEBIT').reduce((sum, line) => sum + amount(line.amount), 0);
  const credit = input.lines.filter((line) => line.side === 'CREDIT').reduce((sum, line) => sum + amount(line.amount), 0);
  if (input.lines.length < 2 || Math.abs(debit - credit) > 0.009 || debit <= 0) {
    throw new AppError('Journal entry must contain balanced, positive debit and credit lines', 500);
  }

  return db.journalEntry.create({
    data: {
      entryNumber: number('JE'),
      idempotencyKey: input.idempotencyKey,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingDate: new Date(),
      description: input.description,
      createdById: input.createdById ?? null,
      lines: {
        create: input.lines.map((line) => ({
          side: line.side,
          accountCode: line.accountCode,
          financeAccountId: line.financeAccountId ?? null,
          amount: decimal(line.amount),
          tripId: line.tripId ?? null,
          vehicleId: line.vehicleId ?? null,
          beneficiaryUserId: line.beneficiaryUserId ?? null,
          description: line.description ?? null,
        })),
      },
    },
    include: { lines: true },
  });
}

async function createWalletEntry(
  db: Db,
  input: {
    wallet: any;
    allocationId?: string | null;
    advanceId?: string | null;
    direction: 'CREDIT' | 'DEBIT';
    entryType: 'DISBURSEMENT' | 'EXPENSE' | 'CASH_RETURN' | 'CARRY_FORWARD' | 'REIMBURSEMENT' | 'REVERSAL' | 'ADJUSTMENT';
    entryAmount: number;
    nextBalance: number;
    nextReserved: number;
    sourceType: string;
    sourceId: string;
    idempotencyKey: string;
    description: string;
    createdById?: string | null;
  },
) {
  const existing = await db.staffWalletEntry.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;
  const beforeBalance = amount(input.wallet.currentBalance);
  const beforeReserved = amount(input.wallet.reservedBalance);
  if (input.nextBalance < -0.009 || input.nextReserved < -0.009 || input.nextReserved - input.nextBalance > 0.009) {
    throw new AppError('Wallet invariant failed: reserved money cannot be negative or exceed custody balance', 409);
  }
  await db.staffWallet.update({
    where: { id: input.wallet.id },
    data: {
      currentBalance: decimal(input.nextBalance),
      reservedBalance: decimal(input.nextReserved),
      version: { increment: 1 },
    },
  });
  return db.staffWalletEntry.create({
    data: {
      walletId: input.wallet.id,
      allocationId: input.allocationId ?? null,
      advanceId: input.advanceId ?? null,
      direction: input.direction,
      entryType: input.entryType,
      amount: decimal(input.entryAmount),
      balanceBefore: decimal(beforeBalance),
      balanceAfter: decimal(input.nextBalance),
      reservedBefore: decimal(beforeReserved),
      reservedAfter: decimal(input.nextReserved),
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey,
      description: input.description,
      createdById: input.createdById ?? null,
    },
  });
}

export async function listWallets(query: { page?: number; limit?: number; search?: string } = {}) {
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
  const userWhere = query.search ? { OR: [
    { name: { contains: query.search, mode: 'insensitive' as const } },
    { email: { contains: query.search, mode: 'insensitive' as const } },
    { username: { contains: query.search, mode: 'insensitive' as const } },
  ] } : undefined;
  const users = userWhere ? await prisma.user.findMany({ where: userWhere, select: { id: true } }) : [];
  const where = userWhere ? { userId: { in: users.map((user) => user.id) } } : {};
  const [items, total] = await Promise.all([
    prisma.staffWallet.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.staffWallet.count({ where }),
  ]);
  const owners = await prisma.user.findMany({ where: { id: { in: items.map((item) => item.userId) } }, select: { id: true, name: true, email: true, role: { select: { key: true, name: true } } } });
  const byId = new Map(owners.map((owner) => [owner.id, owner]));
  return {
    items: items.map((item) => ({ ...item, availableBalance: amount(item.currentBalance) - amount(item.reservedBalance), owner: byId.get(item.userId) })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getWallet(userId: string, create = false) {
  const wallet = create
    ? await prisma.$transaction((tx) => ensureWallet(tx, userId))
    : await prisma.staffWallet.findUnique({ where: { userId } });
  if (!wallet) throw new AppError('Staff wallet not found', 404);
  const [owner, entries, allocations] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: { select: { key: true, name: true } } } }),
    prisma.staffWalletEntry.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.walletAllocation.findMany({ where: { walletId: wallet.id }, include: { advance: true }, orderBy: { createdAt: 'desc' } }),
  ]);
  return { ...wallet, availableBalance: amount(wallet.currentBalance) - amount(wallet.reservedBalance), owner, entries, allocations };
}

export async function listStaffAdvances(query: { page?: number; limit?: number; status?: string; beneficiaryUserId?: string; tripId?: string } = {}) {
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
  const where: any = {
    ...(query.status && { status: query.status }),
    ...(query.beneficiaryUserId && { beneficiaryUserId: query.beneficiaryUserId }),
    ...(query.tripId && { tripId: query.tripId }),
  };
  const [items, total] = await Promise.all([
    prisma.staffAdvance.findMany({ where, include: { allocation: true, settlements: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.staffAdvance.count({ where }),
  ]);
  const owners = await prisma.user.findMany({ where: { id: { in: items.map((item) => item.beneficiaryUserId) } }, select: { id: true, name: true, email: true, role: { select: { key: true, name: true } } } });
  const byId = new Map(owners.map((owner) => [owner.id, owner]));
  return { items: items.map((item) => ({ ...item, beneficiary: byId.get(item.beneficiaryUserId), remainingAmount: amount(item.totalAllocated) - amount(item.spentAmount) })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getStaffAdvance(id: string, ownUserId?: string) {
  const item = await prisma.staffAdvance.findUnique({ where: { id }, include: { allocation: true, settlements: { include: { lines: true }, orderBy: { createdAt: 'desc' } }, walletEntries: { orderBy: { createdAt: 'asc' } } } });
  if (!item || (ownUserId && item.beneficiaryUserId !== ownUserId)) throw new AppError('Staff advance not found', 404);
  const beneficiary = await prisma.user.findUnique({ where: { id: item.beneficiaryUserId }, select: { id: true, name: true, email: true, role: { select: { key: true, name: true } } } });
  return { ...item, beneficiary, remainingAmount: amount(item.totalAllocated) - amount(item.spentAmount) };
}

export async function createStaffAdvance(input: {
  beneficiaryUserId: string;
  contextType: 'TRIP' | 'REPAIR' | 'MAINTENANCE' | 'PURCHASE' | 'OTHER';
  contextId: string;
  tripId?: string | null;
  vehicleId?: string | null;
  accountId?: string | null;
  targetAllowance: number;
  fundingMode?: 'USE_EXISTING_BALANCE' | 'PRESERVE_EXISTING_BALANCE';
  paymentMode?: any;
  dueDate?: string | null;
  purpose?: string | null;
  notes?: string | null;
  createdById?: string | null;
}, db: Db = prisma) {
  assertPositive(input.targetAllowance, 'Target allowance');
  await ensureUser(db, input.beneficiaryUserId);
  if (input.tripId && !(await db.trip.findUnique({ where: { id: input.tripId }, select: { id: true } }))) throw new AppError('Trip not found', 404);
  if (input.accountId && !(await db.financeAccount.findUnique({ where: { id: input.accountId, isActive: true }, select: { id: true } }))) throw new AppError('Active finance account not found', 404);
  const existing = await db.staffAdvance.findUnique({ where: { beneficiaryUserId_contextType_contextId: { beneficiaryUserId: input.beneficiaryUserId, contextType: input.contextType, contextId: input.contextId } } });
  if (existing) return existing;
  return db.staffAdvance.create({
    data: {
      advanceNumber: number('SADV'),
      beneficiaryUserId: input.beneficiaryUserId,
      contextType: input.contextType,
      contextId: input.contextId,
      tripId: input.tripId ?? null,
      vehicleId: input.vehicleId ?? null,
      accountId: input.accountId ?? null,
      targetAllowance: decimal(input.targetAllowance),
      fundingMode: input.fundingMode ?? 'USE_EXISTING_BALANCE',
      paymentMode: input.paymentMode ?? 'CASH',
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      purpose: input.purpose ?? null,
      notes: input.notes ?? null,
      createdById: input.createdById ?? null,
    },
  });
}

async function requireAdvance(id: string, db: Db = prisma) {
  const item = await db.staffAdvance.findUnique({ where: { id }, include: { allocation: true } });
  if (!item) throw new AppError('Staff advance not found', 404);
  return item;
}

export async function submitStaffAdvance(id: string, actorId: string) {
  const item = await requireAdvance(id);
  if (!['DRAFT', 'NEEDS_CHANGES'].includes(item.status)) throw new AppError(`Cannot submit an advance in ${item.status} status`, 409);
  return prisma.staffAdvance.update({ where: { id }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
}

export async function approveStaffAdvance(id: string, actorId: string) {
  const item = await requireAdvance(id);
  if (item.status !== 'SUBMITTED') throw new AppError('Only submitted advances can be approved', 409);
  if (item.createdById && item.createdById === actorId) throw new AppError('Maker-checker control: the creator cannot approve this advance', 409);
  return prisma.staffAdvance.update({ where: { id }, data: { status: 'APPROVED', approvedAt: new Date(), approvedById: actorId } });
}

async function fundAdvanceWithTx(db: Prisma.TransactionClient, id: string, actorId: string, input: { accountId?: string | null; paymentMode?: any } = {}) {
  await db.$queryRawUnsafe('SELECT id FROM "staff_advances" WHERE id=$1 FOR UPDATE', id);
  const advance = await requireAdvance(id, db);
  if (['FUNDED', 'ACTIVE', 'RECONCILING', 'CLOSED'].includes(advance.status)) return advance;
  if (advance.status !== 'APPROVED') throw new AppError('Only approved advances can be funded', 409);
  const wallet = await ensureWallet(db, advance.beneficiaryUserId);
  const available = amount(wallet.currentBalance) - amount(wallet.reservedBalance);
  const target = amount(advance.targetAllowance);
  const existingAllocated = advance.fundingMode === 'USE_EXISTING_BALANCE' ? Math.min(Math.max(available, 0), target) : 0;
  const newCash = target - existingAllocated;
  const accountId = input.accountId === undefined ? advance.accountId : input.accountId;
  await updateAccountBalance(db, accountId, -newCash);
  const allocation = await db.walletAllocation.create({
    data: { walletId: wallet.id, advanceId: advance.id, tripId: advance.tripId, allocatedAmount: decimal(target) },
  });
  await createWalletEntry(db, {
    wallet,
    allocationId: allocation.id,
    advanceId: advance.id,
    direction: 'CREDIT',
    entryType: 'DISBURSEMENT',
    entryAmount: newCash,
    nextBalance: amount(wallet.currentBalance) + newCash,
    nextReserved: amount(wallet.reservedBalance) + target,
    sourceType: 'STAFF_ADVANCE',
    sourceId: advance.id,
    idempotencyKey: `advance:${advance.id}:fund`,
    description: `Allowance funded for ${advance.contextType.toLowerCase()} ${advance.contextId}`,
    createdById: actorId,
  });
  if (newCash > 0) {
    await postJournalEntry(db, {
      idempotencyKey: `advance:${advance.id}:fund`,
      sourceType: 'STAFF_ADVANCE', sourceId: advance.id, createdById: actorId,
      description: `Company money transferred to staff custody (${advance.advanceNumber})`,
      lines: [
        { side: 'DEBIT', accountCode: `STAFF_CUSTODY:${advance.beneficiaryUserId}`, amount: newCash, tripId: advance.tripId, vehicleId: advance.vehicleId, beneficiaryUserId: advance.beneficiaryUserId },
        { side: 'CREDIT', accountCode: accountId ? `FINANCE_ACCOUNT:${accountId}` : 'COMPANY_CASH:UNASSIGNED', financeAccountId: accountId, amount: newCash, tripId: advance.tripId, vehicleId: advance.vehicleId },
      ],
    });
  }
  return db.staffAdvance.update({
    where: { id },
    data: {
      accountId: accountId ?? null,
      paymentMode: input.paymentMode ?? advance.paymentMode,
      existingBalanceAllocated: decimal(existingAllocated),
      newCashIssued: decimal(newCash),
      totalAllocated: decimal(target),
      status: 'ACTIVE',
      fundedAt: new Date(),
      fundedById: actorId,
    },
  });
}

export async function fundStaffAdvance(id: string, actorId: string, input: { accountId?: string | null; paymentMode?: any } = {}) {
  return prisma.$transaction((tx) => fundAdvanceWithTx(tx, id, actorId, input), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function rejectStaffAdvance(id: string, actorId: string, reason: string, needsChanges = false) {
  const item = await requireAdvance(id);
  if (!['SUBMITTED', 'APPROVED'].includes(item.status)) throw new AppError('Advance is not awaiting review', 409);
  if (item.createdById && item.createdById === actorId) throw new AppError('Maker-checker control: the creator cannot review this advance', 409);
  return prisma.staffAdvance.update({ where: { id }, data: { status: needsChanges ? 'NEEDS_CHANGES' : 'REJECTED', notes: reason } });
}

export async function cancelStaffAdvance(id: string, actorId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT id FROM "staff_advances" WHERE id=$1 FOR UPDATE', id);
    const advance = await requireAdvance(id, tx);
    if (['CANCELLED', 'CLOSED'].includes(advance.status)) throw new AppError('Advance is already closed', 409);
    if (!advance.allocation) return tx.staffAdvance.update({ where: { id }, data: { status: 'CANCELLED', notes: reason, closedAt: new Date() } });
    if (amount(advance.spentAmount) > 0) throw new AppError('A funded advance with approved spend must be settled, not cancelled', 409);
    const wallet = await ensureWallet(tx, advance.beneficiaryUserId);
    const newCash = amount(advance.newCashIssued);
    await updateAccountBalance(tx, advance.accountId, newCash);
    await createWalletEntry(tx, {
      wallet,
      allocationId: advance.allocation.id,
      advanceId: advance.id,
      direction: 'DEBIT', entryType: 'REVERSAL', entryAmount: newCash,
      nextBalance: amount(wallet.currentBalance) - newCash,
      nextReserved: amount(wallet.reservedBalance) - amount(advance.totalAllocated),
      sourceType: 'STAFF_ADVANCE', sourceId: advance.id, idempotencyKey: `advance:${advance.id}:cancel`,
      description: reason, createdById: actorId,
    });
    if (newCash > 0) await postJournalEntry(tx, {
      idempotencyKey: `advance:${advance.id}:cancel`, sourceType: 'STAFF_ADVANCE_REVERSAL', sourceId: advance.id, description: `Advance cancellation: ${reason}`, createdById: actorId,
      lines: [
        { side: 'DEBIT', accountCode: advance.accountId ? `FINANCE_ACCOUNT:${advance.accountId}` : 'COMPANY_CASH:UNASSIGNED', financeAccountId: advance.accountId, amount: newCash },
        { side: 'CREDIT', accountCode: `STAFF_CUSTODY:${advance.beneficiaryUserId}`, beneficiaryUserId: advance.beneficiaryUserId, amount: newCash },
      ],
    });
    await tx.walletAllocation.update({ where: { id: advance.allocation.id }, data: { status: 'CANCELLED', releasedAmount: advance.totalAllocated } });
    return tx.staffAdvance.update({ where: { id }, data: { status: 'CANCELLED', notes: reason, closedAt: new Date() } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function operationalRecord(db: Db, kind: OperationalExpenseKind, id: string) {
  const record = kind === 'FUEL'
    ? await db.fuelEntry.findUnique({ where: { id } })
    : await db.expense.findUnique({ where: { id } });
  if (!record) throw new AppError(`${kind === 'FUEL' ? 'Fuel entry' : 'Expense'} not found`, 404);
  return record as any;
}

export async function approveOperationalExpense(kind: OperationalExpenseKind, id: string, approverId: string | null | undefined, notes?: string | null) {
  return prisma.$transaction(async (tx) => {
    const table = kind === 'FUEL' ? 'fuel_entries' : 'expenses';
    await tx.$queryRawUnsafe(`SELECT id FROM "${table}" WHERE id=$1 FOR UPDATE`, id);
    const record = await operationalRecord(tx, kind, id);
    if (record.status === 'APPROVED' && record.financialPostedAt) return record;
    if (record.status !== 'SUBMITTED') throw new AppError(`Only submitted ${kind === 'FUEL' ? 'fuel entries' : 'expenses'} can be approved`, 409);
    const recordAmount = amount(kind === 'FUEL' ? record.totalAmount : record.amount);
    const expenseCode = kind === 'FUEL' ? 'EXPENSE:FUEL' : `EXPENSE:${String(record.category ?? 'GENERAL').toUpperCase()}`;
    const paymentSource = record.paymentSource ?? 'COMPANY_ACCOUNT';
    let beneficiaryUserId: string | null = record.paidByUserId ?? null;
    if (!beneficiaryUserId && record.driverId) beneficiaryUserId = await resolveDriverUserId(record.driverId, tx).catch(() => null);
    let journal: any;
    if (beneficiaryUserId && record.tripId) {
      const advance = await tx.staffAdvance.findFirst({ where: { beneficiaryUserId, tripId: record.tripId, status: { in: ['ACTIVE', 'RECONCILING'] } }, orderBy: { createdAt: 'desc' } });
      if (advance) {
        const frozenSettlement = await tx.staffSettlement.findFirst({ where: { advanceId: advance.id, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'CASH_CONFIRMED', 'CLOSED'] } } });
        if (frozenSettlement) throw new AppError('The trip settlement has already been submitted. Return it for changes before approving more expenses.', 409);
      }
    }

    if (paymentSource === 'STAFF_WALLET') {
      if (!beneficiaryUserId) throw new AppError('Wallet-paid expense requires a linked staff user', 409);
      if (!record.tripId) throw new AppError('Wallet-paid expense must be linked to a trip or work context', 409);
      const wallet = await ensureWallet(tx, beneficiaryUserId);
      const allocation = await tx.walletAllocation.findFirst({ where: { walletId: wallet.id, tripId: record.tripId, status: 'ACTIVE' }, include: { advance: true } });
      if (!allocation) throw new AppError('No active wallet allocation exists for this staff member and trip', 409);
      const remaining = amount(allocation.allocatedAmount) - amount(allocation.consumedAmount);
      if (recordAmount - remaining > 0.009) throw new AppError(`Expense exceeds the trip wallet allocation. Remaining: ₹${remaining.toFixed(2)}`, 409);
      await createWalletEntry(tx, {
        wallet, allocationId: allocation.id, advanceId: allocation.advanceId,
        direction: 'DEBIT', entryType: 'EXPENSE', entryAmount: recordAmount,
        nextBalance: amount(wallet.currentBalance) - recordAmount,
        nextReserved: amount(wallet.reservedBalance) - recordAmount,
        sourceType: kind, sourceId: id, idempotencyKey: `${kind.toLowerCase()}:${id}:wallet`,
        description: `${kind === 'FUEL' ? 'Fuel' : 'Expense'} approved and deducted from allocated company money`, createdById: approverId,
      });
      await tx.walletAllocation.update({ where: { id: allocation.id }, data: { consumedAmount: { increment: decimal(recordAmount) } } });
      await tx.staffAdvance.update({ where: { id: allocation.advanceId }, data: { spentAmount: { increment: decimal(recordAmount) } } });
      journal = await postJournalEntry(tx, {
        idempotencyKey: `${kind.toLowerCase()}:${id}:post`, sourceType: kind, sourceId: id, createdById: approverId,
        description: `${kind} expense paid from staff custody`,
        lines: [
          { side: 'DEBIT', accountCode: expenseCode, amount: recordAmount, tripId: record.tripId, vehicleId: record.vehicleId, beneficiaryUserId },
          { side: 'CREDIT', accountCode: `STAFF_CUSTODY:${beneficiaryUserId}`, amount: recordAmount, tripId: record.tripId, vehicleId: record.vehicleId, beneficiaryUserId },
        ],
      });
    } else if (paymentSource === 'PERSONAL_MONEY') {
      if (!beneficiaryUserId) throw new AppError('Personally-paid expense requires a linked staff user', 409);
      const advance = record.tripId ? await tx.staffAdvance.findFirst({ where: { beneficiaryUserId, tripId: record.tripId, status: { in: ['ACTIVE', 'RECONCILING'] } }, orderBy: { createdAt: 'desc' } }) : null;
      if (advance) await tx.staffAdvance.update({ where: { id: advance.id }, data: { reimbursementAmount: { increment: decimal(recordAmount) } } });
      journal = await postJournalEntry(tx, {
        idempotencyKey: `${kind.toLowerCase()}:${id}:post`, sourceType: kind, sourceId: id, createdById: approverId,
        description: `${kind} expense paid personally; reimbursement payable`,
        lines: [
          { side: 'DEBIT', accountCode: expenseCode, amount: recordAmount, tripId: record.tripId, vehicleId: record.vehicleId, beneficiaryUserId },
          { side: 'CREDIT', accountCode: `STAFF_REIMBURSEMENT_PAYABLE:${beneficiaryUserId}`, amount: recordAmount, tripId: record.tripId, vehicleId: record.vehicleId, beneficiaryUserId },
        ],
      });
    } else {
      await updateAccountBalance(tx, record.financeAccountId, record.financeAccountId ? -recordAmount : 0);
      journal = await postJournalEntry(tx, {
        idempotencyKey: `${kind.toLowerCase()}:${id}:post`, sourceType: kind, sourceId: id, createdById: approverId,
        description: `${kind} expense paid directly by company`,
        lines: [
          { side: 'DEBIT', accountCode: expenseCode, amount: recordAmount, tripId: record.tripId, vehicleId: record.vehicleId },
          { side: 'CREDIT', accountCode: record.financeAccountId ? `FINANCE_ACCOUNT:${record.financeAccountId}` : `COMPANY_PAYMENT_SOURCE:${paymentSource}`, financeAccountId: record.financeAccountId, amount: recordAmount, tripId: record.tripId, vehicleId: record.vehicleId },
        ],
      });
    }

    const data = { status: 'APPROVED' as const, notes: notes === undefined ? record.notes : notes, approvedById: approverId ?? null, approvedAt: new Date(), financialPostedAt: new Date(), journalEntryId: journal.id };
    return kind === 'FUEL'
      ? tx.fuelEntry.update({ where: { id }, data })
      : tx.expense.update({ where: { id }, data });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function reverseOperationalExpense(kind: OperationalExpenseKind, id: string, actorId: string | null | undefined, reason?: string | null) {
  return prisma.$transaction(async (tx) => {
    const table = kind === 'FUEL' ? 'fuel_entries' : 'expenses';
    await tx.$queryRawUnsafe(`SELECT id FROM "${table}" WHERE id=$1 FOR UPDATE`, id);
    const record = await operationalRecord(tx, kind, id);
    if (record.status === 'CANCELLED') return record;
    if (record.status !== 'APPROVED' || !record.financialPostedAt || !record.journalEntryId) throw new AppError('Only a financially posted approval can be reversed', 409);
    const originalJournal = await tx.journalEntry.findUnique({ where: { id: record.journalEntryId }, include: { lines: true } });
    if (!originalJournal || originalJournal.status !== 'POSTED') throw new AppError('The original journal is missing or already reversed', 409);
    const recordAmount = amount(kind === 'FUEL' ? record.totalAmount : record.amount);
    let beneficiaryUserId: string | null = record.paidByUserId ?? null;
    if (!beneficiaryUserId && record.driverId) beneficiaryUserId = await resolveDriverUserId(record.driverId, tx).catch(() => null);
    const advance = beneficiaryUserId && record.tripId
      ? await tx.staffAdvance.findFirst({ where: { beneficiaryUserId, tripId: record.tripId }, include: { allocation: true }, orderBy: { createdAt: 'desc' } })
      : null;
    if (advance) {
      const lockedSettlement = await tx.staffSettlement.findFirst({ where: { advanceId: advance.id, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'CASH_CONFIRMED', 'CLOSED'] } } });
      if (lockedSettlement) throw new AppError('This expense is part of a submitted or closed settlement. Reverse the settlement first.', 409);
    }

    if (record.paymentSource === 'STAFF_WALLET') {
      if (!beneficiaryUserId || !advance?.allocation) throw new AppError('The wallet allocation for this expense could not be found', 409);
      const wallet = await ensureWallet(tx, beneficiaryUserId);
      await createWalletEntry(tx, {
        wallet, allocationId: advance.allocation.id, advanceId: advance.id,
        direction: 'CREDIT', entryType: 'REVERSAL', entryAmount: recordAmount,
        nextBalance: amount(wallet.currentBalance) + recordAmount,
        nextReserved: amount(wallet.reservedBalance) + recordAmount,
        sourceType: `${kind}_REVERSAL`, sourceId: id, idempotencyKey: `${kind.toLowerCase()}:${id}:wallet-reverse`,
        description: reason || `${kind} approval reversed`, createdById: actorId,
      });
      await tx.walletAllocation.update({ where: { id: advance.allocation.id }, data: { consumedAmount: { decrement: decimal(recordAmount) } } });
      await tx.staffAdvance.update({ where: { id: advance.id }, data: { spentAmount: { decrement: decimal(recordAmount) } } });
    } else if (record.paymentSource === 'PERSONAL_MONEY' && advance) {
      await tx.staffAdvance.update({ where: { id: advance.id }, data: { reimbursementAmount: { decrement: decimal(recordAmount) } } });
    } else if (record.financeAccountId) {
      await updateAccountBalance(tx, record.financeAccountId, recordAmount);
    }

    const reversal = await postJournalEntry(tx, {
      idempotencyKey: `${kind.toLowerCase()}:${id}:reverse`, sourceType: `${kind}_REVERSAL`, sourceId: id, createdById: actorId,
      description: reason || `Reversal of ${kind} approval`,
      lines: originalJournal.lines.map((line) => ({
        side: line.side === 'DEBIT' ? 'CREDIT' as const : 'DEBIT' as const,
        accountCode: line.accountCode, financeAccountId: line.financeAccountId, amount: line.amount,
        tripId: line.tripId, vehicleId: line.vehicleId, beneficiaryUserId: line.beneficiaryUserId, description: line.description,
      })),
    });
    await tx.journalEntry.update({ where: { id: originalJournal.id }, data: { status: 'REVERSED', reversedById: reversal.id } });
    const data = { status: 'CANCELLED' as const, notes: reason === undefined ? record.notes : reason };
    return kind === 'FUEL' ? tx.fuelEntry.update({ where: { id }, data }) : tx.expense.update({ where: { id }, data });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function calculateSettlement(db: Db, advanceId: string) {
  const advance = await requireAdvance(advanceId, db);
  if (!advance.allocation) throw new AppError('Advance has not been funded', 409);
  const remaining = Math.max(amount(advance.totalAllocated) - amount(advance.spentAmount), 0);
  return { advance, remaining, reimbursement: amount(advance.reimbursementAmount) };
}

async function addSettlementLines(db: Prisma.TransactionClient, settlementId: string, advance: any) {
  const walletSpend = advance.allocation
    ? await db.staffWalletEntry.findMany({ where: { allocationId: advance.allocation.id, entryType: 'EXPENSE' } })
    : [];
  const [personalFuel, personalExpenses] = advance.tripId ? await Promise.all([
    db.fuelEntry.findMany({ where: { tripId: advance.tripId, paidByUserId: advance.beneficiaryUserId, paymentSource: 'PERSONAL_MONEY', status: 'APPROVED' }, select: { id: true, totalAmount: true } }),
    db.expense.findMany({ where: { tripId: advance.tripId, paidByUserId: advance.beneficiaryUserId, paymentSource: 'PERSONAL_MONEY', status: 'APPROVED' }, select: { id: true, amount: true, category: true } }),
  ]) : [[], []];
  const lines = [
    ...walletSpend.map((entry) => ({ settlementId, lineType: entry.sourceType, sourceId: entry.sourceId, paymentSource: 'STAFF_WALLET' as const, amount: entry.amount, description: entry.description })),
    ...personalFuel.map((entry) => ({ settlementId, lineType: 'FUEL', sourceId: entry.id, paymentSource: 'PERSONAL_MONEY' as const, amount: entry.totalAmount, description: 'Personally paid fuel reimbursement' })),
    ...personalExpenses.map((entry) => ({ settlementId, lineType: 'EXPENSE', sourceId: entry.id, paymentSource: 'PERSONAL_MONEY' as const, amount: entry.amount, description: `Personally paid ${entry.category} reimbursement` })),
  ];
  if (lines.length > 0) await db.staffSettlementLine.createMany({ data: lines });
}

export async function createStaffSettlement(input: { advanceId: string; disposition: 'RETURN' | 'CARRY_FORWARD'; declaredReturnAmount?: number; notes?: string | null; createdById: string }, ownOnly = false) {
  return prisma.$transaction(async (tx) => {
    const { advance, remaining, reimbursement } = await calculateSettlement(tx, input.advanceId);
    if (ownOnly && advance.beneficiaryUserId !== input.createdById) throw new AppError('You can create settlements only for your own advance', 403);
    if (!['ACTIVE', 'RECONCILING'].includes(advance.status)) throw new AppError('Only active advances can be reconciled', 409);
    const open = await tx.staffSettlement.findFirst({ where: { advanceId: advance.id, status: { in: OPEN_SETTLEMENT_STATUSES as any } } });
    if (open) return open;
    const declared = input.disposition === 'RETURN' ? amount(input.declaredReturnAmount ?? remaining) : 0;
    const settlement = await tx.staffSettlement.create({
      data: {
        settlementNumber: number('SSET'), advanceId: advance.id, disposition: input.disposition,
        approvedSpend: advance.spentAmount, declaredReturnAmount: decimal(declared),
        carryForwardAmount: decimal(input.disposition === 'CARRY_FORWARD' ? remaining : 0),
        reimbursementAmount: decimal(reimbursement), varianceAmount: decimal(input.disposition === 'RETURN' ? remaining - declared : 0),
        notes: input.notes ?? null, createdById: input.createdById,
      },
    });
    await addSettlementLines(tx, settlement.id, advance);
    await tx.walletAllocation.update({ where: { id: advance.allocation!.id }, data: { status: 'RECONCILING' } });
    await tx.staffAdvance.update({ where: { id: advance.id }, data: { status: 'RECONCILING' } });
    return settlement;
  });
}

export async function listStaffSettlements(query: { page?: number; limit?: number; status?: string; beneficiaryUserId?: string } = {}) {
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
  const where: any = { ...(query.status && { status: query.status }), ...(query.beneficiaryUserId && { advance: { beneficiaryUserId: query.beneficiaryUserId } }) };
  const [items, total] = await Promise.all([
    prisma.staffSettlement.findMany({ where, include: { advance: { include: { allocation: true } }, lines: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.staffSettlement.count({ where }),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function submitStaffSettlement(id: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT id FROM "staff_settlements" WHERE id=$1 FOR UPDATE', id);
    const settlement = await tx.staffSettlement.findUnique({ where: { id }, include: { advance: { include: { allocation: true } } } });
    if (!settlement || !['DRAFT', 'NEEDS_CHANGES'].includes(settlement.status)) throw new AppError('Settlement is not ready for submission', 409);
    if (settlement.advance.beneficiaryUserId !== actorId && settlement.createdById !== actorId) throw new AppError('Only the beneficiary or settlement creator can submit it', 403);
    const remaining = amount(settlement.advance.totalAllocated) - amount(settlement.advance.spentAmount);
    const variance = settlement.disposition === 'RETURN' ? remaining - amount(settlement.declaredReturnAmount) : 0;
    if (Math.abs(variance) > 0.009) throw new AppError(`Settlement does not balance. Expected return: ₹${remaining.toFixed(2)}`, 409);
    await tx.staffSettlementLine.deleteMany({ where: { settlementId: id } });
    await addSettlementLines(tx, id, settlement.advance);
    return tx.staffSettlement.update({
      where: { id },
      data: {
        status: 'SUBMITTED', submittedAt: new Date(), approvedSpend: settlement.advance.spentAmount,
        reimbursementAmount: settlement.advance.reimbursementAmount, varianceAmount: decimal(variance),
        carryForwardAmount: decimal(settlement.disposition === 'CARRY_FORWARD' ? remaining : 0),
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function approveStaffSettlement(id: string, actorId: string) {
  const settlement = await prisma.staffSettlement.findUnique({ where: { id } });
  if (!settlement || !['SUBMITTED', 'UNDER_REVIEW'].includes(settlement.status)) throw new AppError('Only submitted settlements can be approved', 409);
  if (settlement.createdById === actorId) throw new AppError('Maker-checker control: the settlement creator cannot approve it', 409);
  return prisma.staffSettlement.update({ where: { id }, data: { status: 'APPROVED', approvedAt: new Date(), approvedById: actorId } });
}

export async function cancelStaffSettlement(id: string, actorId: string, reason: string, ownOnly = false) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT id FROM "staff_settlements" WHERE id=$1 FOR UPDATE', id);
    const settlement = await tx.staffSettlement.findUnique({ where: { id }, include: { advance: { include: { allocation: true } } } });
    if (!settlement) throw new AppError('Staff settlement not found', 404);
    if (['CLOSED', 'CANCELLED', 'REJECTED'].includes(settlement.status)) throw new AppError('Closed settlements cannot be cancelled', 409);
    if (ownOnly && settlement.advance.beneficiaryUserId !== actorId) throw new AppError('You can cancel only your own settlement', 403);
    if (settlement.advance.allocation) await tx.walletAllocation.update({ where: { id: settlement.advance.allocation.id }, data: { status: 'ACTIVE' } });
    await tx.staffAdvance.update({ where: { id: settlement.advanceId }, data: { status: 'ACTIVE' } });
    return tx.staffSettlement.update({ where: { id }, data: { status: 'CANCELLED', notes: reason } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function confirmStaffSettlement(id: string, actorId: string, input: { accountId?: string | null; paymentMode?: any; referenceNumber?: string | null; proofDocumentId?: string | null } = {}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT id FROM "staff_settlements" WHERE id=$1 FOR UPDATE', id);
    const settlement = await tx.staffSettlement.findUnique({ where: { id }, include: { advance: { include: { allocation: true } } } });
    if (!settlement) throw new AppError('Staff settlement not found', 404);
    if (settlement.status === 'CLOSED') return settlement;
    if (settlement.status !== 'APPROVED') throw new AppError('Only approved settlements can be confirmed by the cashier', 409);
    if (settlement.createdById === actorId || settlement.approvedById === actorId) throw new AppError('Separation of duties: the cashier must be different from the creator and approver', 409);
    const advance = settlement.advance;
    if (!advance.allocation) throw new AppError('Wallet allocation not found', 409);
    const wallet = await ensureWallet(tx, advance.beneficiaryUserId);
    const remaining = Math.max(amount(advance.totalAllocated) - amount(advance.spentAmount), 0);
    const accountId = input.accountId === undefined ? advance.accountId : input.accountId;
    if (input.proofDocumentId && !(await tx.document.findUnique({ where: { id: input.proofDocumentId }, select: { id: true } }))) throw new AppError('Settlement proof document not found', 404);

    if (settlement.disposition === 'RETURN') {
      if (Math.abs(amount(settlement.declaredReturnAmount) - remaining) > 0.009) throw new AppError('Cash return no longer matches the live wallet allocation', 409);
      await updateAccountBalance(tx, accountId, remaining);
      await createWalletEntry(tx, {
        wallet, allocationId: advance.allocation.id, advanceId: advance.id,
        direction: 'DEBIT', entryType: 'CASH_RETURN', entryAmount: remaining,
        nextBalance: amount(wallet.currentBalance) - remaining,
        nextReserved: amount(wallet.reservedBalance) - remaining,
        sourceType: 'STAFF_SETTLEMENT', sourceId: settlement.id, idempotencyKey: `settlement:${settlement.id}:return`,
        description: `Cash return confirmed for ${settlement.settlementNumber}`, createdById: actorId,
      });
      if (remaining > 0) await postJournalEntry(tx, {
        idempotencyKey: `settlement:${settlement.id}:return`, sourceType: 'STAFF_SETTLEMENT', sourceId: settlement.id, createdById: actorId,
        description: `Cash returned from staff custody (${settlement.settlementNumber})`,
        lines: [
          { side: 'DEBIT', accountCode: accountId ? `FINANCE_ACCOUNT:${accountId}` : 'COMPANY_CASH:UNASSIGNED', financeAccountId: accountId, amount: remaining, tripId: advance.tripId, vehicleId: advance.vehicleId },
          { side: 'CREDIT', accountCode: `STAFF_CUSTODY:${advance.beneficiaryUserId}`, amount: remaining, tripId: advance.tripId, vehicleId: advance.vehicleId, beneficiaryUserId: advance.beneficiaryUserId },
        ],
      });
    } else {
      await createWalletEntry(tx, {
        wallet, allocationId: advance.allocation.id, advanceId: advance.id,
        direction: 'CREDIT', entryType: 'CARRY_FORWARD', entryAmount: 0,
        nextBalance: amount(wallet.currentBalance), nextReserved: amount(wallet.reservedBalance) - remaining,
        sourceType: 'STAFF_SETTLEMENT', sourceId: settlement.id, idempotencyKey: `settlement:${settlement.id}:carry`,
        description: `Unused trip money released to available wallet balance`, createdById: actorId,
      });
    }

    const reimbursement = amount(settlement.reimbursementAmount);
    if (reimbursement > 0) {
      await updateAccountBalance(tx, accountId, -reimbursement);
      await postJournalEntry(tx, {
        idempotencyKey: `settlement:${settlement.id}:reimbursement`, sourceType: 'STAFF_REIMBURSEMENT', sourceId: settlement.id, createdById: actorId,
        description: `Approved personal-money reimbursement (${settlement.settlementNumber})`,
        lines: [
          { side: 'DEBIT', accountCode: `STAFF_REIMBURSEMENT_PAYABLE:${advance.beneficiaryUserId}`, amount: reimbursement, beneficiaryUserId: advance.beneficiaryUserId, tripId: advance.tripId },
          { side: 'CREDIT', accountCode: accountId ? `FINANCE_ACCOUNT:${accountId}` : 'COMPANY_CASH:UNASSIGNED', financeAccountId: accountId, amount: reimbursement, tripId: advance.tripId },
        ],
      });
    }

    await tx.walletAllocation.update({ where: { id: advance.allocation.id }, data: { status: 'CLOSED', releasedAmount: decimal(remaining) } });
    await tx.staffAdvance.update({ where: { id: advance.id }, data: { status: 'CLOSED', returnedAmount: decimal(settlement.disposition === 'RETURN' ? remaining : 0), carriedForwardAmount: decimal(settlement.disposition === 'CARRY_FORWARD' ? remaining : 0), closedAt: new Date() } });
    return tx.staffSettlement.update({ where: { id }, data: { status: 'CLOSED', confirmedReturnAmount: decimal(settlement.disposition === 'RETURN' ? remaining : 0), carryForwardAmount: decimal(settlement.disposition === 'CARRY_FORWARD' ? remaining : 0), paymentMode: input.paymentMode ?? advance.paymentMode, referenceNumber: input.referenceNumber ?? null, cashReceiptNumber: number('RCT'), proofDocumentId: input.proofDocumentId ?? null, cashierId: actorId, cashConfirmedAt: new Date(), closedAt: new Date() } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function openSettlementsForTrip(db: Prisma.TransactionClient, tripId: string, actorId?: string | null) {
  const advances = await db.staffAdvance.findMany({ where: { tripId, status: 'ACTIVE' }, include: { allocation: true } });
  for (const advance of advances) {
    const existing = await db.staffSettlement.findFirst({ where: { advanceId: advance.id, status: { in: OPEN_SETTLEMENT_STATUSES as any } } });
    if (existing || !advance.allocation) continue;
    const remaining = Math.max(amount(advance.totalAllocated) - amount(advance.spentAmount), 0);
    const settlement = await db.staffSettlement.create({
      data: { settlementNumber: number('SSET'), advanceId: advance.id, disposition: 'RETURN', approvedSpend: advance.spentAmount, declaredReturnAmount: decimal(remaining), reimbursementAmount: advance.reimbursementAmount, createdById: actorId ?? advance.beneficiaryUserId, notes: 'Automatically opened when the trip completed' },
    });
    await addSettlementLines(db, settlement.id, advance);
    await db.walletAllocation.update({ where: { id: advance.allocation.id }, data: { status: 'RECONCILING' } });
    await db.staffAdvance.update({ where: { id: advance.id }, data: { status: 'RECONCILING' } });
  }
}

export async function createAllowanceForScheduledTrip(db: Prisma.TransactionClient, trip: { id: string; tripType: any; driverId: string | null; vehicleId: string; distanceKm: number | null }, actorId?: string | null) {
  if (!trip.driverId) return null;
  const policy = await db.tripAllowancePolicy.findFirst({ where: { isActive: true, OR: [{ tripType: trip.tripType }, { tripType: null }] }, orderBy: [{ tripType: 'desc' }, { updatedAt: 'desc' }] });
  if (!policy) return null;
  const calculated = amount(policy.baseAmount) + amount(policy.perKmAmount) * Number(trip.distanceKm ?? 0);
  const target = policy.maxAmount ? Math.min(calculated, amount(policy.maxAmount)) : calculated;
  if (target <= 0) return null;
  const beneficiaryUserId = await resolveDriverUserId(trip.driverId, db);
  const created = await createStaffAdvance({ beneficiaryUserId, contextType: 'TRIP', contextId: trip.id, tripId: trip.id, vehicleId: trip.vehicleId, accountId: policy.accountId, targetAllowance: target, fundingMode: policy.fundingMode, paymentMode: policy.paymentMode, purpose: `Automatic allowance for scheduled trip`, createdById: actorId ?? null }, db);
  if (created.status !== 'DRAFT') return created;
  const autoApproved = policy.autoApproveThreshold && target <= amount(policy.autoApproveThreshold);
  const submitted = await db.staffAdvance.update({ where: { id: created.id }, data: { status: autoApproved ? 'APPROVED' : 'SUBMITTED', submittedAt: new Date(), ...(autoApproved ? { approvedAt: new Date() } : {}) } });
  if (autoApproved && policy.autoFund) return fundAdvanceWithTx(db, submitted.id, actorId ?? beneficiaryUserId, { accountId: policy.accountId, paymentMode: policy.paymentMode });
  return submitted;
}

export async function listAllowancePolicies() {
  return prisma.tripAllowancePolicy.findMany({ orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }] });
}

export async function createAllowancePolicy(input: any) {
  return prisma.tripAllowancePolicy.create({ data: { name: input.name, tripType: input.tripType ?? null, baseAmount: decimal(input.baseAmount ?? 0), perKmAmount: decimal(input.perKmAmount ?? 0), maxAmount: input.maxAmount == null ? null : decimal(input.maxAmount), autoApproveThreshold: input.autoApproveThreshold == null ? null : decimal(input.autoApproveThreshold), fundingMode: input.fundingMode ?? 'USE_EXISTING_BALANCE', accountId: input.accountId ?? null, paymentMode: input.paymentMode ?? 'CASH', autoFund: Boolean(input.autoFund), isActive: input.isActive !== false } });
}

export async function updateAllowancePolicy(id: string, input: any) {
  return prisma.tripAllowancePolicy.update({ where: { id }, data: { ...(input.name !== undefined && { name: input.name }), ...(input.tripType !== undefined && { tripType: input.tripType }), ...(input.baseAmount !== undefined && { baseAmount: decimal(input.baseAmount) }), ...(input.perKmAmount !== undefined && { perKmAmount: decimal(input.perKmAmount) }), ...(input.maxAmount !== undefined && { maxAmount: input.maxAmount == null ? null : decimal(input.maxAmount) }), ...(input.autoApproveThreshold !== undefined && { autoApproveThreshold: input.autoApproveThreshold == null ? null : decimal(input.autoApproveThreshold) }), ...(input.fundingMode !== undefined && { fundingMode: input.fundingMode }), ...(input.accountId !== undefined && { accountId: input.accountId }), ...(input.paymentMode !== undefined && { paymentMode: input.paymentMode }), ...(input.autoFund !== undefined && { autoFund: Boolean(input.autoFund) }), ...(input.isActive !== undefined && { isActive: Boolean(input.isActive) }) } });
}

export async function getJournalPnl(query: { dateFrom?: string; dateTo?: string; tripId?: string; vehicleId?: string }) {
  const entries = await prisma.journalEntry.findMany({
    where: { status: 'POSTED', ...(query.dateFrom || query.dateTo ? { postingDate: { ...(query.dateFrom && { gte: new Date(query.dateFrom) }), ...(query.dateTo && { lte: new Date(query.dateTo) }) } } : {}) },
    include: { lines: true },
  });
  const lines = entries.flatMap((entry) => entry.lines).filter((line) => (!query.tripId || line.tripId === query.tripId) && (!query.vehicleId || line.vehicleId === query.vehicleId));
  const expenseLines = lines.filter((line) => line.side === 'DEBIT' && line.accountCode.startsWith('EXPENSE:'));
  const revenueLines = lines.filter((line) => line.side === 'CREDIT' && line.accountCode.startsWith('REVENUE:'));
  const group = new Map<string, number>();
  for (const line of [...expenseLines, ...revenueLines]) group.set(line.accountCode, (group.get(line.accountCode) ?? 0) + amount(line.amount));
  const totalIncome = revenueLines.reduce((sum, line) => sum + amount(line.amount), 0);
  const totalExpenses = expenseLines.reduce((sum, line) => sum + amount(line.amount), 0);
  return { totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses, breakdown: [...group].map(([category, total]) => ({ category: category.replace(/^(EXPENSE|REVENUE):/, ''), type: category.startsWith('REVENUE:') ? 'INCOME' : 'EXPENSE', total })) };
}

export function openAdvanceStatuses() { return OPEN_ADVANCE_STATUSES; }
