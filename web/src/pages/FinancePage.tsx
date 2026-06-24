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
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

function formatCurrency(value: number) {
  return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

const COLORS = ['#059669', '#dc2626', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899'];

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

  const netProfit = pnl ? pnl.netProfit : summary ? summary.currentMonthIncome - summary.currentMonthExpenses : 0;

  const summaryCards = summary ? [
    { label: 'Total Receivable', value: summary.totalReceivable, color: '#059669' },
    { label: 'Total Payable', value: summary.totalPayable, color: '#dc2626' },
    { label: 'Current Month Income', value: summary.currentMonthIncome, color: '#059669' },
    { label: 'Current Month Expenses', value: summary.currentMonthExpenses, color: '#dc2626' },
    { label: 'Net Profit (MTD)', value: netProfit, color: netProfit >= 0 ? '#059669' : '#dc2626' },
    { label: 'Pending Payments', value: summary.pendingPayments, color: '#f59e0b' },
    { label: 'Overdue Payments', value: summary.overduePayments, color: '#dc2626' },
  ] : [];

  const incomeExpenseData = pnl ? [
    { name: 'Income', value: pnl.totalIncome, fill: '#059669' },
    { name: 'Expenses', value: pnl.totalExpenses, fill: '#dc2626' },
    { name: 'Net Profit', value: Math.max(0, pnl.netProfit), fill: '#6366f1' },
  ] : summary ? [
    { name: 'Income', value: summary.currentMonthIncome, fill: '#059669' },
    { name: 'Expenses', value: summary.currentMonthExpenses, fill: '#dc2626' },
    { name: 'Net Profit', value: Math.max(0, netProfit), fill: '#6366f1' },
  ] : [];

  const receivablePieData = summary ? [
    { name: 'Pending', value: Math.max(0, summary.pendingPayments), color: '#f59e0b' },
    { name: 'Overdue', value: Math.max(0, summary.overduePayments), color: '#dc2626' },
    { name: 'Received', value: Math.max(0, summary.totalReceivable - summary.pendingPayments - summary.overduePayments), color: '#059669' },
  ].filter((d) => d.value > 0) : [];

  const expenseBreakdownData = pnl?.breakdown
    ?.filter((b) => b.type === 'EXPENSE')
    .map((b) => ({ name: b.category, value: b.total })) ?? [];

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
          <div className="finance-summary-grid">
            {summaryCards.map((card) => (
              <div key={card.label} className="card finance-summary-card">
                <p className="finance-summary-label">{card.label}</p>
                <p className="finance-summary-value" style={{ color: card.color }}>
                  {formatCurrency(card.value)}
                </p>
              </div>
            ))}
          </div>

          <div className="finance-charts-row">
            {incomeExpenseData.length > 0 && (
              <div className="card finance-chart-card">
                <h3 className="chart-title">Income vs Expenses</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={incomeExpenseData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {incomeExpenseData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {receivablePieData.length > 0 && (
              <div className="card finance-chart-card">
                <h3 className="chart-title">Receivables by Status</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={receivablePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {receivablePieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {expenseBreakdownData.length > 0 && (
              <div className="card finance-chart-card">
                <h3 className="chart-title">Expense Breakdown</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={expenseBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {expenseBreakdownData.map((_entry, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {pnl ? (
            <div data-testid="finance-pnl-section" className="card">
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

              <div data-testid="finance-pnl-summary" className="finance-pnl-cards">
                <div className="finance-pnl-card">
                  <span className="finance-pnl-label">Total Income</span>
                  <span className="finance-pnl-value" style={{ color: '#059669' }}>{formatCurrency(pnl.totalIncome)}</span>
                </div>
                <div className="finance-pnl-card">
                  <span className="finance-pnl-label">Total Expenses</span>
                  <span className="finance-pnl-value" style={{ color: '#dc2626' }}>{formatCurrency(pnl.totalExpenses)}</span>
                </div>
                <div className="finance-pnl-card">
                  <span className="finance-pnl-label">Net Profit</span>
                  <span className={`finance-pnl-value${pnl.netProfit >= 0 ? ' text-success' : ' text-danger'}`}>
                    {formatCurrency(pnl.netProfit)}
                  </span>
                </div>
              </div>

              {pnl.breakdown.length > 0 ? (
                <div className="table-container">
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
                </div>
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
              <div className="table-container">
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
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export default FinancePage;
