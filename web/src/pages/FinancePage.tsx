import { useEffect, useState } from 'react';
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
                  <h3 className="table-toolbar-title">Profit & Loss</h3>
                  <p className="table-toolbar-copy">Overall financial performance</p>
                </div>
              </div>
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
