import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { getDriverSettlement } from './driver-advances.service';
import { randomUUID } from 'crypto';

async function getSettlementMeta(id: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; advance_id: string; status: string }>>(
    'SELECT id, advance_id, status FROM driver_settlements WHERE id=$1',
    id,
  );
  const row = rows[0];
  if (!row) throw new AppError('Driver settlement not found', 404);
  return row;
}

async function insertHistory(input: {
  settlementId: string;
  advanceId: string;
  action: string;
  fromStatus: string;
  toStatus: string;
  userId?: string | null;
  remarks?: string | null;
}) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO driver_settlement_history
      (id, settlement_id, advance_id, action, from_status, to_status, remarks, created_by_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    randomUUID(),
    input.settlementId,
    input.advanceId,
    input.action,
    input.fromStatus,
    input.toStatus,
    input.remarks ?? null,
    input.userId ?? null,
  );
}

async function transition(id: string, allowedFrom: string[], toStatus: string, action: string, userId?: string | null, remarks?: string | null, reviewFields = false) {
  const existing = await getSettlementMeta(id);
  if (!allowedFrom.includes(existing.status)) {
    throw new AppError(`Cannot move settlement from ${existing.status} to ${toStatus}`, 409);
  }

  if (reviewFields) {
    await prisma.$executeRawUnsafe(
      `UPDATE driver_settlements
       SET status=$2, review_comments=COALESCE($3, review_comments), reviewed_at=NOW(), reviewed_by_id=$4, updated_at=NOW()
       WHERE id=$1`,
      id,
      toStatus,
      remarks ?? null,
      userId ?? null,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE driver_settlements
       SET status=$2, review_comments=COALESCE($3, review_comments), updated_at=NOW()
       WHERE id=$1`,
      id,
      toStatus,
      remarks ?? null,
    );
  }

  await insertHistory({ settlementId: id, advanceId: existing.advance_id, action, fromStatus: existing.status, toStatus, userId, remarks });
  return getDriverSettlement(id);
}

export async function reviewSettlementSafe(id: string, userId?: string | null, remarks?: string | null) {
  return transition(id, ['SUBMITTED'], 'UNDER_REVIEW', 'SETTLEMENT_REVIEW_STARTED', userId, remarks, true);
}

export async function approveSettlementSafe(id: string, userId?: string | null, remarks?: string | null) {
  return transition(id, ['SUBMITTED', 'UNDER_REVIEW'], 'APPROVED', 'SETTLEMENT_APPROVED', userId, remarks, true);
}

export async function rejectSettlementSafe(id: string, userId?: string | null, remarks?: string | null) {
  return transition(id, ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'], 'REJECTED', 'SETTLEMENT_REJECTED', userId, remarks, true);
}

export async function requestSettlementChangesSafe(id: string, userId?: string | null, remarks?: string | null) {
  return transition(id, ['SUBMITTED', 'UNDER_REVIEW'], 'NEEDS_CHANGES', 'SETTLEMENT_NEEDS_CHANGES', userId, remarks, true);
}
