import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/Modal';
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

type SettlementForm = {
  advanceId: string;
  advanceNumber: string;
  balance: number;
  returnedCash: string;
  notes: string;
};

type CashReturnForm = {
  settlementId: string;
  settlementNumber: string;
  amount: string;
  notes: string;
};

export function DriverAdvancesPage() {
  const auth = useAuth();
  const token = auth.accessToken;
  const [advances, setAdvances] = useState<DriverAdvance[]>([]);
  const [settlements, setSettlements] = useState<DriverSettlement[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [settlementForm, setSettlementForm] = useState<SettlementForm | null>(null);
  const [cashReturnForm, setCashReturnForm] = useState<CashReturnForm | null>(null);

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

  function openSettlement(advance: DriverAdvance) {
    setSettlementForm({
      advanceId: advance.id,
      advanceNumber: advance.advanceNumber,
      balance: advance.balanceAmount,
      returnedCash: '0',
      notes: '',
    });
  }

  async function submitSettlement() {
    if (!settlementForm || !token) return;
    await act('Settlement draft created. Submit it for finance review.', () => createMySettlementForAdvance(token, settlementForm.advanceId, {
      returnedCashAmount: Number(settlementForm.returnedCash || 0),
      includeApprovedFuel: true,
      includeApprovedExpenses: true,
      notes: settlementForm.notes || 'Submitted from driver portal',
    }));
    setSettlementForm(null);
  }

  function openCashReturn(settlement: DriverSettlement) {
    setCashReturnForm({
      settlementId: settlement.id,
      settlementNumber: settlement.settlementNumber,
      amount: '0',
      notes: '',
    });
  }

  async function submitCashReturn() {
    if (!cashReturnForm || !token) return;
    await act('Cash return added.', () => addMyCashReturn(token, cashReturnForm.settlementId, {
      amount: Number(cashReturnForm.amount || 0),
      paymentMode: 'CASH',
      notes: cashReturnForm.notes || 'Cash return from driver portal',
    }));
    setCashReturnForm(null);
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
                  <td>{['ISSUED', 'PARTIALLY_SETTLED'].includes(advance.status) ? <button type="button" className="primary-button" onClick={() => openSettlement(advance)}>Create Settlement</button> : '—'}</td>
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
                    {!['SETTLED', 'CANCELLED', 'REJECTED'].includes(settlement.status) && <button type="button" className="secondary-button" onClick={() => openCashReturn(settlement)}>Add Cash</button>}
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        isOpen={!!settlementForm}
        title="Create Settlement"
        description="Settlement auto-includes approved fuel and expense spends. Enter any cash you're returning now."
        onClose={() => setSettlementForm(null)}
        footer={
          <div className="button-row">
            <button type="button" className="ghost-button" onClick={() => setSettlementForm(null)}>Cancel</button>
            <button type="button" className="primary-button" onClick={() => void submitSettlement()}>Create Settlement</button>
          </div>
        }
      >
        {settlementForm && (
          <div className="form-grid">
            <div className="detail-card" style={{ gridColumn: 'span 2', background: 'var(--color-surface-alt, #f5f5f5)', borderRadius: 8, padding: '1rem' }}>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Advance</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{settlementForm.advanceNumber}</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Outstanding balance: <strong>{money(settlementForm.balance)}</strong></p>
            </div>
            <label>
              Cash you are returning
              <input
                type="number"
                min="0"
                max={settlementForm.balance}
                value={settlementForm.returnedCash}
                onChange={(e) => setSettlementForm({ ...settlementForm, returnedCash: e.target.value })}
                placeholder="0"
              />
              <small style={{ color: 'var(--color-text-tertiary)' }}>How much cash are you handing back to finance?</small>
            </label>
            <label style={{ gridColumn: 'span 2' }}>
              Notes (optional)
              <input
                value={settlementForm.notes}
                onChange={(e) => setSettlementForm({ ...settlementForm, notes: e.target.value })}
                placeholder="Any notes for finance..."
              />
            </label>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!cashReturnForm}
        title="Add Cash Return"
        description="Record additional cash you are returning to finance."
        onClose={() => setCashReturnForm(null)}
        footer={
          <div className="button-row">
            <button type="button" className="ghost-button" onClick={() => setCashReturnForm(null)}>Cancel</button>
            <button type="button" className="primary-button" onClick={() => void submitCashReturn()}>Add Cash</button>
          </div>
        }
      >
        {cashReturnForm && (
          <div className="form-grid">
            <div className="detail-card" style={{ gridColumn: 'span 2', background: 'var(--color-surface-alt, #f5f5f5)', borderRadius: 8, padding: '1rem' }}>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Settlement</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{cashReturnForm.settlementNumber}</p>
            </div>
            <label>
              Amount
              <input
                type="number"
                min="0"
                value={cashReturnForm.amount}
                onChange={(e) => setCashReturnForm({ ...cashReturnForm, amount: e.target.value })}
                placeholder="0"
              />
            </label>
            <label style={{ gridColumn: 'span 2' }}>
              Notes (optional)
              <input
                value={cashReturnForm.notes}
                onChange={(e) => setCashReturnForm({ ...cashReturnForm, notes: e.target.value })}
                placeholder="Any notes..."
              />
            </label>
          </div>
        )}
      </Modal>
    </section>
  );
}
