import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  approveDriverSettlement,
  cancelDriverSettlement,
  listDriverSettlements,
  rejectDriverSettlement,
  requestChangesDriverSettlement,
  reviewDriverSettlement,
  settleDriverSettlement,
  submitDriverSettlement,
} from '../services/driverAdvances';
import type { DriverSettlement } from '../types/driver-advances';

function money(value: number) {
  return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function statusClass(status: string) {
  if (['SETTLED', 'APPROVED'].includes(status)) return 'status-pill status-pill-success';
  if (['REJECTED', 'CANCELLED'].includes(status)) return 'status-pill status-pill-danger';
  if (['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES'].includes(status)) return 'status-pill status-pill-warning';
  return 'status-pill status-pill-default';
}

export default function FinanceDriverSettlementsPage() {
  const auth = useAuth();
  const token = auth.accessToken;
  const [items, setItems] = useState<DriverSettlement[]>([]);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const canSubmit = auth.hasAnyPermission(['driver_settlement_create', 'driver_settlement_review']);
  const canReview = auth.hasAnyPermission(['driver_settlement_review']);
  const canApprove = auth.hasAnyPermission(['driver_settlement_approve']);
  const canSettle = auth.hasAnyPermission(['driver_settlement_settle']);
  const canCancel = auth.hasAnyPermission(['driver_settlement_cancel']);

  async function load() {
    if (!token) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await listDriverSettlements(token, { status: status || undefined });
      setItems(res.data.items || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load settlements');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [token, status]);

  async function act(label: string, callback: () => Promise<unknown>) {
    try {
      await callback();
      setMessage(label);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed');
    }
  }

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Finance</p>
          <h1>Driver Settlements</h1>
          <p>Review approved driver spend, returned cash, reimbursement, and balance due before closing an advance.</p>
        </div>
      </div>

      {message && <div className="state-panel" style={{ marginBottom: '1rem' }}><p>{message}</p></div>}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option>DRAFT</option><option>SUBMITTED</option><option>UNDER_REVIEW</option><option>APPROVED</option><option>SETTLED</option><option>NEEDS_CHANGES</option><option>REJECTED</option><option>CANCELLED</option>
        </select>
        <button type="button" className="secondary-button" onClick={() => void load()}>Refresh</button>
      </div>

      {loading ? <div className="state-panel">Loading settlements...</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead><tr><th>Settlement</th><th>Advance</th><th>Driver</th><th>Spend</th><th>Cash Return</th><th>Balance</th><th>Reimbursement</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{items.map((settlement) => (
              <tr key={settlement.id}>
                <td>{settlement.settlementNumber}<br /><small>{settlement.notes || '—'}</small></td>
                <td>{settlement.advanceNumber || settlement.advanceId}</td>
                <td>{settlement.driverName || settlement.driverId}</td>
                <td>{money(settlement.totalApprovedSpend)}<br /><small>Fuel {money(settlement.approvedFuelTotal)} / Expense {money(settlement.approvedExpenseTotal)}</small></td>
                <td>{money(settlement.returnedCashAmount)}</td>
                <td>{money(settlement.balanceDueFromDriver)}</td>
                <td>{money(settlement.reimbursementDueToDriver)}</td>
                <td><span className={statusClass(settlement.status)}>{settlement.status.replace(/_/g, ' ')}</span></td>
                <td><div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {canSubmit && ['DRAFT', 'NEEDS_CHANGES'].includes(settlement.status) && <button type="button" className="secondary-button" onClick={() => void act('Settlement submitted.', () => submitDriverSettlement(token!, settlement.id))}>Submit</button>}
                  {canReview && settlement.status === 'SUBMITTED' && <button type="button" className="secondary-button" onClick={() => void act('Settlement moved to review.', () => reviewDriverSettlement(token!, settlement.id, 'Review started'))}>Review</button>}
                  {canApprove && ['SUBMITTED', 'UNDER_REVIEW'].includes(settlement.status) && <button type="button" className="secondary-button" onClick={() => void act('Settlement approved.', () => approveDriverSettlement(token!, settlement.id, 'Verified'))}>Approve</button>}
                  {canReview && ['SUBMITTED', 'UNDER_REVIEW'].includes(settlement.status) && <button type="button" className="secondary-button" onClick={() => void act('Settlement returned for changes.', () => requestChangesDriverSettlement(token!, settlement.id, 'Please correct settlement'))}>Changes</button>}
                  {canReview && ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(settlement.status) && <button type="button" className="secondary-button" onClick={() => void act('Settlement rejected.', () => rejectDriverSettlement(token!, settlement.id, 'Rejected from UI'))}>Reject</button>}
                  {canSettle && settlement.status === 'APPROVED' && <button type="button" className="primary-button" onClick={() => void act('Settlement closed.', () => settleDriverSettlement(token!, settlement.id, { paymentMode: 'CASH' }))}>Settle</button>}
                  {canCancel && !['SETTLED', 'CANCELLED'].includes(settlement.status) && <button type="button" className="secondary-button" onClick={() => void act('Settlement cancelled.', () => cancelDriverSettlement(token!, settlement.id, 'Cancelled from UI'))}>Cancel</button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
