import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  addMyCashReturn,
  createMySettlementForAdvance,
  listMyDriverAdvances,
  listMyDriverSettlements,
  submitMyDriverSettlement,
} from '../../services/driverAdvances';
import type { DriverAdvance, DriverSettlement } from '../../types/driver-advances';

function money(value: number) {
  return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function statusClass(status: string) {
  if (['SETTLED', 'APPROVED'].includes(status)) return 'status-pill status-pill-success';
  if (['REJECTED', 'CANCELLED'].includes(status)) return 'status-pill status-pill-danger';
  if (['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES', 'PARTIALLY_SETTLED'].includes(status)) return 'status-pill status-pill-warning';
  if (status === 'ISSUED') return 'status-pill status-pill-info';
  return 'status-pill status-pill-default';
}

export function DriverAdvancesPage() {
  const auth = useAuth();
  const token = auth.accessToken;
  const [advances, setAdvances] = useState<DriverAdvance[]>([]);
  const [settlements, setSettlements] = useState<DriverSettlement[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    setLoading(true);
    setMessage(null);
    try {
      const [advanceRes, settlementRes] = await Promise.all([
        listMyDriverAdvances(token, { limit: 50 }),
        listMyDriverSettlements(token, { limit: 50 }),
      ]);
      setAdvances(advanceRes.data.items || []);
      setSettlements(settlementRes.data.items || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load advances');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [token]);

  async function act(label: string, callback: () => Promise<unknown>) {
    try {
      await callback();
      setMessage(label);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed');
    }
  }

  async function createSettlement(advance: DriverAdvance) {
    const returned = window.prompt('Cash you are returning now?', '0');
    if (returned === null || !token) return;
    await act('Settlement draft created. Submit it for finance review.', () => createMySettlementForAdvance(token, advance.id, {
      returnedCashAmount: Number(returned || 0),
      includeApprovedFuel: true,
      includeApprovedExpenses: true,
      notes: 'Submitted from driver portal',
    }));
  }

  async function addCash(settlement: DriverSettlement) {
    const returned = window.prompt('Additional cash return amount?', '0');
    if (returned === null || !token) return;
    await act('Cash return added.', () => addMyCashReturn(token, settlement.id, { amount: Number(returned || 0), paymentMode: 'CASH', notes: 'Cash return from driver portal' }));
  }

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Driver Portal</p>
          <h1>My Advances & Settlements</h1>
          <p>Track issued advance balance, returned cash, pending settlement, and finance review status.</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => void load()}>Refresh</button>
      </div>

      {message && <div className="state-panel" style={{ marginBottom: '1rem' }}><p>{message}</p></div>}
      {loading && <div className="state-panel">Loading driver advances...</div>}

      {!loading && (
        <>
          <h3>Advances</h3>
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead><tr><th>Advance</th><th>Vehicle</th><th>Issued</th><th>Spent</th><th>Returned</th><th>Balance</th><th>Due</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{advances.map((advance) => (
                <tr key={advance.id}>
                  <td>{advance.advanceNumber}<br /><small>{advance.purpose || '—'}</small></td>
                  <td>{advance.vehicleNumber || '—'}</td>
                  <td>{money(advance.issuedAmount || advance.amount)}</td>
                  <td>{money(advance.settledAmount)}</td>
                  <td>{money(advance.returnedAmount)}</td>
                  <td>{money(advance.balanceAmount)}</td>
                  <td>{advance.dueDate ? new Date(advance.dueDate).toLocaleDateString() : '—'} {advance.isOverdue ? '⚠️' : ''}</td>
                  <td><span className={statusClass(advance.status)}>{advance.status.replace(/_/g, ' ')}</span></td>
                  <td>{['ISSUED', 'PARTIALLY_SETTLED'].includes(advance.status) ? <button type="button" className="primary-button" onClick={() => void createSettlement(advance)}>Create Settlement</button> : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>

          <h3>Settlements</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead><tr><th>Settlement</th><th>Advance</th><th>Approved Spend</th><th>Returned Cash</th><th>Balance Due</th><th>Reimbursement</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{settlements.map((settlement) => (
                <tr key={settlement.id}>
                  <td>{settlement.settlementNumber}<br /><small>{settlement.notes || '—'}</small></td>
                  <td>{settlement.advanceNumber || settlement.advanceId}</td>
                  <td>{money(settlement.totalApprovedSpend)}<br /><small>Fuel {money(settlement.approvedFuelTotal)} / Expense {money(settlement.approvedExpenseTotal)}</small></td>
                  <td>{money(settlement.returnedCashAmount)}</td>
                  <td>{money(settlement.balanceDueFromDriver)}</td>
                  <td>{money(settlement.reimbursementDueToDriver)}</td>
                  <td><span className={statusClass(settlement.status)}>{settlement.status.replace(/_/g, ' ')}</span></td>
                  <td><div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {['DRAFT', 'NEEDS_CHANGES'].includes(settlement.status) && <button type="button" className="primary-button" onClick={() => void act('Settlement submitted.', () => submitMyDriverSettlement(token!, settlement.id))}>Submit</button>}
                    {!['SETTLED', 'CANCELLED', 'REJECTED'].includes(settlement.status) && <button type="button" className="secondary-button" onClick={() => void addCash(settlement)}>Add Cash</button>}
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
