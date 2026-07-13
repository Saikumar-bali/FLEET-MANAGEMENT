import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

type Db = { $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>; $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number> };
type PostInput = { userId: string; direction: 'CREDIT' | 'DEBIT'; transactionType: string; amount: number; sourceType: string; sourceId: string; idempotencyKey: string; tripId?: string | null; driverId?: string | null; description?: string | null; createdById?: string | null };

export async function userIdForDriver(driverId: string, db: Db = prisma): Promise<string | null> {
  const rows = await db.$queryRawUnsafe<Array<{ user_id: string }>>(
    `SELECT user_id FROM user_profile_links WHERE profile_type='DRIVER' AND profile_id=$1 AND status='ACTIVE' ORDER BY is_primary DESC, created_at ASC LIMIT 1`, driverId,
  );
  return rows[0]?.user_id ?? null;
}

export async function getWallet(userId: string, db: Db = prisma) {
  await db.$executeRawUnsafe(`INSERT INTO staff_wallets (id,user_id) VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING`, randomUUID(), userId);
  const rows = await db.$queryRawUnsafe<any[]>(`SELECT sw.*, u.name AS user_name, r.name AS role_name FROM staff_wallets sw JOIN users u ON u.id=sw.user_id JOIN roles r ON r.id=u.role_id WHERE sw.user_id=$1`, userId);
  return rows[0];
}

export async function postWalletTransaction(db: Db, input: PostInput) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new AppError('Wallet transaction amount must be greater than zero', 400);
  const duplicate = await db.$queryRawUnsafe<any[]>(`SELECT * FROM staff_wallet_transactions WHERE idempotency_key=$1`, input.idempotencyKey);
  if (duplicate[0]) return duplicate[0];
  const wallet = await getWallet(input.userId, db);
  const locked = await db.$queryRawUnsafe<any[]>(`SELECT * FROM staff_wallets WHERE id=$1 FOR UPDATE`, wallet.id);
  const duplicateAfterLock = await db.$queryRawUnsafe<any[]>(`SELECT * FROM staff_wallet_transactions WHERE idempotency_key=$1`, input.idempotencyKey);
  if (duplicateAfterLock[0]) return duplicateAfterLock[0];
  const before = Number(locked[0].current_balance);
  const after = input.direction === 'CREDIT' ? before + input.amount : before - input.amount;
  if (after < 0) throw new AppError(`Insufficient staff wallet balance. Available: ${before.toFixed(2)}, required: ${input.amount.toFixed(2)}`, 409);
  await db.$executeRawUnsafe(`UPDATE staff_wallets SET current_balance=$2, updated_at=NOW() WHERE id=$1`, wallet.id, after);
  const rows = await db.$queryRawUnsafe<any[]>(`INSERT INTO staff_wallet_transactions (id,wallet_id,direction,transaction_type,amount,balance_before,balance_after,source_type,source_id,trip_id,driver_id,description,idempotency_key,created_by_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`, randomUUID(), wallet.id, input.direction, input.transactionType, input.amount, before, after, input.sourceType, input.sourceId, input.tripId ?? null, input.driverId ?? null, input.description ?? null, input.idempotencyKey, input.createdById ?? null);
  return rows[0];
}

export async function getWalletWithLedger(userId: string, page = 1, limit = 50) {
  const wallet = await getWallet(userId);
  const take = Math.min(Math.max(limit, 1), 100);
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM staff_wallet_transactions WHERE wallet_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, wallet.id, take, (Math.max(page, 1)-1)*take);
  return { id: wallet.id, userId: wallet.user_id, userName: wallet.user_name, roleName: wallet.role_name, currentBalance: Number(wallet.current_balance), transactions: rows.map(r => ({ ...r, amount: Number(r.amount), balanceBefore: Number(r.balance_before), balanceAfter: Number(r.balance_after) })) };
}

export async function listWallets() {
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT sw.*,u.name AS user_name,u.email,r.name AS role_name FROM staff_wallets sw JOIN users u ON u.id=sw.user_id JOIN roles r ON r.id=u.role_id ORDER BY sw.current_balance DESC,u.name`);
  return rows.map(r => ({ id:r.id,userId:r.user_id,userName:r.user_name,email:r.email,roleName:r.role_name,currentBalance:Number(r.current_balance),updatedAt:r.updated_at }));
}

export async function adjustWallet(input: { userId:string; direction:'CREDIT'|'DEBIT'; amount:number; reason:string; reference:string; createdById?:string|null }) {
  return prisma.$transaction(tx => postWalletTransaction(tx as any, { userId:input.userId, direction:input.direction, transactionType:'ADJUSTMENT', amount:input.amount, sourceType:'MANUAL_ADJUSTMENT', sourceId:input.reference, idempotencyKey:`wallet-adjustment:${input.reference}`, description:input.reason, createdById:input.createdById }));
}

export async function debitDriverSpend(db: Db, input: { driverId: string; tripId?: string | null; amount: number; sourceType: 'FUEL'|'EXPENSE'; sourceId: string; createdById?: string | null; description: string }) {
  const userId = await userIdForDriver(input.driverId, db);
  if (!userId) return null; // company-paid/non-wallet record
  const advances = await db.$queryRawUnsafe<any[]>(
    `SELECT * FROM driver_advances WHERE driver_id=$1 AND status IN ('ISSUED','PARTIALLY_SETTLED') AND balance_amount>0
     AND ($2::text IS NULL OR trip_id=$2 OR trip_id IS NULL)
     ORDER BY CASE WHEN trip_id=$2 THEN 0 ELSE 1 END, issued_at ASC LIMIT 1 FOR UPDATE`, input.driverId, input.tripId ?? null,
  );
  const advance = advances[0];
  if (!advance) return null; // no accountable advance: preserve existing company expense workflow
  if (Number(advance.balance_amount) < input.amount) throw new AppError(`Spend exceeds remaining trip allowance. Available: ${Number(advance.balance_amount).toFixed(2)}`, 409);
  const entry = await postWalletTransaction(db, { userId, direction:'DEBIT', transactionType:input.sourceType, amount:input.amount, sourceType:input.sourceType, sourceId:input.sourceId, idempotencyKey:`${input.sourceType.toLowerCase()}:${input.sourceId}:approved`, tripId:input.tripId, driverId:input.driverId, description:input.description, createdById:input.createdById });
  await db.$executeRawUnsafe(`UPDATE driver_advances SET settled_amount=settled_amount+$2, balance_amount=balance_amount-$2, status='PARTIALLY_SETTLED', updated_at=NOW() WHERE id=$1`, advance.id, input.amount);
  return { entry, advanceId: advance.id };
}
