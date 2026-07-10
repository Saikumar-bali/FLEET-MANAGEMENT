import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDrivers, getFinanceAccounts, getVehicles } from '../services/api';
import {
  approveDriverAdvance,
  cancelDriverAdvance,
  createDriverAdvance,
  createSettlementForAdvance,
  getDriverAdvanceReport,
  issueDriverAdvance,
  listDriverAdvances,
  rejectDriverAdvance,
  requestChangesDriverAdvance,
  submitDriverAdvance,
} from '../services/driverAdvances';
import type { DriverRecord, FinanceAccount, VehicleRecord } from '../types/auth';
import type { DriverAdvance, DriverAdvanceReport } from '../types/driver-advances';

function money(value: number) {
  return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function statusClass(status: string) {
  if (['SETTLED', 'APPROVED'].includes(status)) return 'status-pill status-pill-success';
  if (['REJECTED', 'CANCELLED'].includes(status)) return 'status-pill status-pill-danger';
  if (['SUBMITTED', 'NEEDS_CHANGES', 'PARTIALLY_SETTLED'].includes(status)) return 'status-pill status-pill-warning';
  if (status === 'ISSUED') return 'status-pill status-pill-info';
  return 'status-pill status-pill-default';
}

const emptyForm = {
  driverId: '',
  vehicleId: '',
  accountId: '',
  amount: '',
  paymentMode: 'CASH',
  dueDate: '',
  purpose: '',
  notes: '',
};

export default function FinanceDriverAdvancesPage() {
  const auth = useAuth();
  const token = auth.accessToken;
  const [items, setItems] = useState<DriverAdvance[]>([]);
  const [report, setReport] = useState<DriverAdvanceReport | null>(null);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [status, setStatus] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const canCreate = auth.hasAnyPermission(['driver_advance_create']);
  const canSubmit = auth.hasAnyPermission(['driver_advance_submit', 'driver_advance_create']);
  const canApprove = auth.hasAnyPermission(['driver_advance_approve']);
  const canIssue = auth.hasAnyPermission(['driver_advance_issue']);
  const canCancel = auth.hasAnyPermission(['driver_advance_cancel']);
  const canSettle = auth.hasAnyPermission(['driver_settlement_create']);

  const driverMap = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver.name])), [drivers]);
  const vehicleMap = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.vehicleNumber])), [vehicles]);

  async function load() {
    if (!token) return;
    setLoading(true);
    setMessage(null);
    try {
      const [advanceRes, reportRes, driversRes, vehiclesRes, accountsRes] = await Promise.all([
        listDriverAdvances(token, { status: status || undefined, overdueOnly }),
        getDriverAdvanceReport(token, { status: status || undefined, overdueOnly: overdueOnly || undefined }),
        getDrivers(token, { limit: 100 }),
        getVehicles(token, { limit: 100 }),
        getFinanceAccounts(token, { limit: 100 }),
      ]);
      setItems(advanceRes.data.items || []);
      setReport(reportRes.data);
      setDrivers(driversRes.data.items || []);
      setVehicles(vehiclesRes.data.items || []);
      setAccounts(accountsRes.data.items || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load driver advances');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [token, status, overdueOnly]);

  async function createAdvance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    try {
      await createDriverAdvance(token, {
        driverId: form.driverId,
        vehicleId: form.vehicleId || null,
        accountId: form.accountId || null,
        amount: Number(form.amount),
        paymentMode: form.paymentMode,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        purpose: form.purpose || null,
        notes: form.notes || null,
      });
      setForm(emptyForm);
      setMessage('Driver advance created as draft. Submit and approve before issuing cash.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Advance creation failed');
    }
  }

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
    const returned = window.prompt('Returned cash amount?', '0');
    if (returned === null || !token) return;
    await act('Settlement draft created from approved fuel/expense and returned cash.', () => createSettlementForAdvance(token, advance.id, {
      returnedCashAmount: Number(returned || 0),
      includeApprovedFuel: true,
      includeApprovedExpenses: true,
      notes: 'Created from finance driver advances page',
    }));
  }

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Finance</p>
          <h1>Driver Advances</h1>
          <p>Approval-controlled cash advances, outstanding balances, overdue tracking, and settlement handoff.</p>
        </div>
      </div>

      {report && (
        <>
          <div className="metric-grid" style={{ marginBottom: '1rem' }}>
            <div className="metric-card"><span>Total Issued</span><strong>{money(report.summary.totalIssued)}</strong></div>
            <div className="metric-card"><span>Outstanding</span><strong>{money(report.summary.totalOutstanding)}</strong></div>
            <div className="metric-card"><span>Returned</span><strong>{money(report.summary.totalReturned)}</strong></div>
            <div className="metric-card"><span>Settled/Spent</span><strong>{money(report.summary.totalSpentSettled)}</strong></div>
            <div className="metric-card"><span>Overdue</span><strong>{report.summary.overdueCount}</strong></div>
            <div className="metric-card"><span>Total Advances</span><strong>{report.summary.totalAdvances}</strong></div>
          </div>

          {report.byDriver.length > 0 && (
            <div className="form-card" style={{ marginBottom: '1rem' }}>
              <h3>Individual Driver Stats</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead><tr><th>Driver</th><th>Advances</th><th>Issued</th><th>Spent/Settled</th><th>Returned</th><th>Outstanding</th><th>Overdue</th></tr></thead>
                  <tbody>{report.byDriver.map((d) => (
                    <tr key={d.driverId}>
                      <td>{d.driverName}</td>
                      <td>{d.totalAdvances}</td>
                      <td>{money(d.totalIssued)}</td>
                      <td>{money(d.totalSpentSettled)}</td>
                      <td>{money(d.totalReturned)}</td>
                      <td>{money(d.totalOutstanding)}</td>
                      <td>{d.overdueCount > 0 ? <span className="status-pill status-pill-danger">{d.overdueCount}</span> : '0'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {message && <div className="state-panel" style={{ marginBottom: '1rem' }}><p>{message}</p></div>}

      {canCreate && (
        <form className="form-card" onSubmit={createAdvance} style={{ marginBottom: '1rem' }}>
          <h3>Create advance</h3>
          <div className="form-grid">
            <label>Driver<select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })} required><option value="">Select driver</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></label>
            <label>Vehicle<select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}><option value="">Optional</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicleNumber}</option>)}</select></label>
            <label>Account<select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}><option value="">Optional / cash counter</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} — {money(account.currentBalance)}</option>)}</select></label>
            <label>Amount<input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label>
            <label>Payment mode<select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}><option>CASH</option><option>UPI</option><option>BANK_TRANSFER</option><option>CARD</option><option>CHEQUE</option><option>OTHER</option></select></label>
            <label>Due date<input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
            <label>Purpose<input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></label>
            <label>Notes<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          </div>
          <button type="submit" className="primary-button">Create Draft Advance</button>
        </form>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option>DRAFT</option><option>SUBMITTED</option><option>APPROVED</option><option>ISSUED</option><option>PARTIALLY_SETTLED</option><option>SETTLED</option><option>NEEDS_CHANGES</option><option>REJECTED</option><option>CANCELLED</option></select>
        <label><input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} /> Overdue only</label>
        <button type="button" className="secondary-button" onClick={() => void load()}>Refresh</button>
      </div>

      {loading ? <div className="state-panel">Loading advances...</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead><tr><th>Advance</th><th>Driver</th><th>Vehicle</th><th>Amount</th><th>Issued</th><th>Outstanding</th><th>Payment</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{items.map((advance) => (
              <tr key={advance.id}>
                <td>{advance.advanceNumber}<br /><small>{advance.purpose || '—'}</small></td>
                <td>{advance.driverName || driverMap.get(advance.driverId) || advance.driverId}</td>
                <td>{advance.vehicleNumber || (advance.vehicleId ? vehicleMap.get(advance.vehicleId) : '—') || '—'}</td>
                <td>{money(advance.amount)}</td>
                <td>{money(advance.issuedAmount)}</td>
                <td>{money(advance.balanceAmount)}</td>
                <td>{advance.paymentMode}</td>
                <td>{advance.dueDate ? new Date(advance.dueDate).toLocaleString() : '—'} {advance.isOverdue ? '⚠️' : ''}</td>
                <td><span className={statusClass(advance.status)}>{advance.status.replace(/_/g, ' ')}</span></td>
                <td><div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {canSubmit && ['DRAFT', 'NEEDS_CHANGES'].includes(advance.status) && <button type="button" className="secondary-button" onClick={() => void act('Advance submitted.', () => submitDriverAdvance(token!, advance.id))}>Submit</button>}
                  {canApprove && advance.status === 'SUBMITTED' && <button type="button" className="secondary-button" onClick={() => void act('Advance approved.', () => approveDriverAdvance(token!, advance.id, 'Approved from UI'))}>Approve</button>}
                  {canApprove && advance.status === 'SUBMITTED' && <button type="button" className="secondary-button" onClick={() => void act('Advance sent back for changes.', () => requestChangesDriverAdvance(token!, advance.id, 'Please correct advance details'))}>Changes</button>}
                  {canApprove && ['SUBMITTED', 'APPROVED'].includes(advance.status) && <button type="button" className="secondary-button" onClick={() => void act('Advance rejected.', () => rejectDriverAdvance(token!, advance.id, 'Rejected from UI'))}>Reject</button>}
                  {canIssue && advance.status === 'APPROVED' && <button type="button" className="primary-button" onClick={() => void act('Advance issued.', () => issueDriverAdvance(token!, advance.id, { accountId: advance.accountId || null, paymentMode: advance.paymentMode }))}>Issue</button>}
                  {canSettle && ['ISSUED', 'PARTIALLY_SETTLED'].includes(advance.status) && <button type="button" className="secondary-button" onClick={() => void createSettlement(advance)}>Create Settlement</button>}
                  {canCancel && !['SETTLED', 'CANCELLED'].includes(advance.status) && <button type="button" className="secondary-button" onClick={() => void act('Advance cancelled.', () => cancelDriverAdvance(token!, advance.id, 'Cancelled from UI'))}>Cancel</button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
