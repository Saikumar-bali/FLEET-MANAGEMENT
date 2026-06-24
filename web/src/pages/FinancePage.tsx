import { FormEvent, useEffect, useState } from 'react';
import {
  getFinanceDashboardSummary,
  getFinancePnl,
  deleteFinanceTransaction,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { FinanceDashboardSummary, PnlSummary } from '../types/auth';
import { ApiError } from '../types/api';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { PageHeader } from '../components/PageHeader';

function formatCurrency(value: number) {
  return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

export function FinancePage() {
  const auth = useAuth();
  const [summary, setSummary] = useState<FinanceDashboardSummary | null>(null);
  const [pnl, setPnl] = useState<PnlSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [pnlDateFrom, setPnlDateFrom] = useState('');
  const [pnlDateTo, setPnlDateTo] = useState('');
  const [pnlVehicleId, setPnlVehicleId] = useState('');
  const [pnlDriverId, setPnlDriverId] = useState('');
  const [pnlCustomerId, setPnlCustomerId] = useState('');

  const canViewPnl = auth.hasPermission('pnl_view');
  const canDeleteTransaction = auth.hasPermission('finance_transactions_delete');

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const [summaryRes, pnlRes] = await Promise.all([
          getFinanceDashboardSummary(auth.accessToken),
          canViewPnl ? getFinancePnl(auth.accessToken) : null,
        ]);
        setSummary(summaryRes.data);
        if (pnlRes) setPnl(pnlRes.data);
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setError(caughtError.message);
        else setError('Failed to load finance dashboard.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken]);

  async function loadPnl(e?: FormEvent) {
    e?.preventDefault();
    if (!auth.accessToken || !canViewPnl) return;
    try {
      const params: Record<string, string> = {};
      if (pnlDateFrom) params.dateFrom = pnlDateFrom;
      if (pnlDateTo) params.dateTo = pnlDateTo;
      if (pnlVehicleId) params.vehicleId = pnlVehicleId;
      if (pnlDriverId) params.driverId = pnlDriverId;
      if (pnlCustomerId) params.customerId = pnlCustomerId;
      const res = await getFinancePnl(auth.accessToken, params);
      setPnl(res.data);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to load P&L report.');
    }
  }

  async function handleDeleteTransaction(id: string) {
    if (!auth.accessToken) return;
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await deleteFinanceTransaction(auth.accessToken, id);
      setSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          recentTransactions: prev.recentTransactions.filter((t) => t.id !== id),
        };
      });
      setMessage('Transaction deleted.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to delete transaction.');
    }
  }

  if (isLoading) return <LoadingState message="Loading finance dashboard..." />;
  if (error && !summary) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <section className="page-content">
      <div className="section-header">
        <div>
          <PageHeader
            eyebrow="Finance"
            title="Finance Dashboard"
            description="Overview of financial metrics, P&L, and recent activity."
          />
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="success-banner">{message}</div> : null}

      {summary ? (
        <>
          <div className="stat-cards-row">
            <div className="card stat-card">
              <p className="stat-card-label">Current Month Income</p>
              <p className="stat-card-value">{formatCurrency(summary.currentMonthIncome)}</p>
            </div>
            <div className="card stat-card">
              <p className="stat-card-label">Current Month Expenses</p>
              <p className="stat-card-value">{formatCurrency(summary.currentMonthExpenses)}</p>
            </div>
            <div className="card stat-card">
              <p className="stat-card-label">Pending Payments</p>
              <p className="stat-card-value">{formatCurrency(summary.pendingPayments)}</p>
            </div>
            <div className="card stat-card">
              <p className="stat-card-label">Overdue Payments</p>
              <p className="stat-card-value">{formatCurrency(summary.overduePayments)}</p>
            </div>
          </div>

          {pnl ? (
            <div className="card">
              <div className="table-toolbar">
                <div>
                  <h3 className="table-toolbar-title">Profit &amp; Loss</h3>
                  <p className="table-toolbar-copy">Overall financial performance</p>
                </div>
              </div>

              {canViewPnl ? (
                <form className="filter-bar" onSubmit={loadPnl}>
                  <label>
                    <span className="field-label">Date From</span>
                    <input type="date" value={pnlDateFrom} onChange={(e) => setPnlDateFrom(e.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Date To</span>
                    <input type="date" value={pnlDateTo} onChange={(e) => setPnlDateTo(e.target.value)} />
                  </label>
                  <label>
                    <span className="field-label">Vehicle ID</span>
                    <input value={pnlVehicleId} onChange={(e) => setPnlVehicleId(e.target.value)} placeholder="Optional" />
                  </label>
                  <label>
                    <span className="field-label">Driver ID</span>
                    <input value={pnlDriverId} onChange={(e) => setPnlDriverId(e.target.value)} placeholder="Optional" />
                  </label>
                  <label>
                    <span className="field-label">Customer ID</span>
                    <input value={pnlCustomerId} onChange={(e) => setPnlCustomerId(e.target.value)} placeholder="Optional" />
                  </label>
                  <div className="button-row">
                    <button type="submit" className="secondary-button">Apply Filters</button>
                  </div>
                </form>
              ) : null}

              <div className="stat-cards-row">
                <div className="stat-card-inline">
                  <span className="stat-card-label">Total Income</span>
                  <span className="stat-card-value">{formatCurrency(pnl.totalIncome)}</span>
                </div>
                <div className="stat-card-inline">
                  <span className="stat-card-label">Total Expenses</span>
                  <span className="stat-card-value">{formatCurrency(pnl.totalExpenses)}</span>
                </div>
                <div className="stat-card-inline">
                  <span className="stat-card-label">Net Profit</span>
                  <span className={`stat-card-value${pnl.netProfit >= 0 ? ' text-success' : ' text-danger'}`}>
                    {formatCurrency(pnl.netProfit)}
                  </span>
                </div>
              </div>

              {pnl.breakdown.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pnl.breakdown.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.category}</td>
                        <td><StatusBadge status={row.type} /></td>
                        <td>{formatCurrency(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          ) : null}

          {summary.recentTransactions.length > 0 ? (
            <div className="card table-card">
              <div className="table-toolbar">
                <div>
                  <h3 className="table-toolbar-title">Recent Transactions</h3>
                  <p className="table-toolbar-copy">Last {summary.recentTransactions.length} transactions</p>
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transaction#</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Payment Status</th>
                    <th>Date</th>
                    <th>Vendor/Customer</th>
                    {canDeleteTransaction ? <th></th> : null}
                  </tr>
                </thead>
                <tbody>
                  {summary.recentTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{tx.transactionNumber}</td>
                      <td>{tx.transactionType}</td>
                      <td>{formatCurrency(tx.totalAmount)}</td>
                      <td><StatusBadge status={tx.paymentStatus} /></td>
                      <td>{new Date(tx.transactionDate).toLocaleDateString('en-IN')}</td>
                      <td>{tx.vendor?.name ?? tx.customer?.name ?? '—'}</td>
                      {canDeleteTransaction ? (
                        <td>
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => void handleDeleteTransaction(tx.id)}
                          >
                            Delete
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export default FinancePage;
