import { FormEvent, useEffect, useState, useCallback } from 'react';
import {
  getFinanceDashboardSummary,
  getFinancePnl,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../types/api';
import { PageShell } from '../components/ui/PageShell';
import type { FinanceDashboardSummary, PnlSummary } from '../types/auth';
import { StatCard } from '../components/ui/StatCard';
import { KpiGrid } from '../components/ui/KpiGrid';
import { ChartCard } from '../components/ui/ChartCard';
import { StatusPill } from '../components/ui/StatusPill';
import { DataTable } from '../components/ui/DataTable';
import type { ColumnDef } from '../components/ui/DataTable';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ActionButton } from '../components/ui/ActionToolbar';
import { ArrowDownCircleIcon, ArrowUpCircleIcon, TrendUpIcon, TrendDownIcon, ClockIcon, AlertIcon, FileTextIcon, RupeeIcon } from '../components/ui/icons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

function formatCurrency(value: number) {
  return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const CHART_COLORS = ['#1e8e3e', '#d93025', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899', '#059669'];

interface TxRow {
  id: string;
  number: string;
  type: string;
  amount: string;
  paymentStatus: string;
  date: string;
  vendor: string;
}

export function FinancePage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const [summary, setSummary] = useState<FinanceDashboardSummary | null>(null);
  const [pnl, setPnl] = useState<PnlSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [pnlDateFrom, setPnlDateFrom] = useState('');
  const [pnlDateTo, setPnlDateTo] = useState('');

  const canViewPnl = auth.hasPermission('pnl_view');

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const [summaryRes, pnlRes] = await Promise.all([
        getFinanceDashboardSummary(auth.accessToken),
        canViewPnl ? getFinancePnl(auth.accessToken) : null,
      ]);
      setSummary(summaryRes.data);
      if (pnlRes) setPnl(pnlRes.data);
    } catch (caughtError) {
      const msg = caughtError instanceof ApiError ? caughtError.message : 'Failed to load finance dashboard.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [auth.accessToken, canViewPnl]);

  useEffect(() => { void load(); }, [load]);

  async function loadPnl(e?: FormEvent) {
    e?.preventDefault();
    if (!auth.accessToken || !canViewPnl) return;
    try {
      const params: Record<string, string> = {};
      if (pnlDateFrom) params.dateFrom = pnlDateFrom;
      if (pnlDateTo) params.dateTo = pnlDateTo;
      const res = await getFinancePnl(auth.accessToken, params);
      setPnl(res.data);
    } catch (caughtError) {
      const msg = caughtError instanceof ApiError ? caughtError.message : 'Failed to load P&L report.';
      setError(msg);
      showToast(msg, 'error');
    }
  }

  if (isLoading) {
    return (
      <PageShell>
        <LoadingSkeleton rows={4} columns={4} />
      </PageShell>
    );
  }

  if (error && !summary) {
    return (
      <PageShell>
        <div className="empty-state-panel">
          <h3>Failed to load finance dashboard</h3>
          <p>{error}</p>
          <ActionButton label="Retry" variant="primary" onClick={load} />
        </div>
      </PageShell>
    );
  }

  const netProfit = pnl ? pnl.netProfit : summary ? summary.currentMonthIncome - summary.currentMonthExpenses : 0;

  const incomeExpenseData = pnl ? [
    { name: 'Income', value: pnl.totalIncome },
    { name: 'Expenses', value: pnl.totalExpenses },
  ] : summary ? [
    { name: 'Income', value: summary.currentMonthIncome },
    { name: 'Expenses', value: summary.currentMonthExpenses },
  ] : [];

  const receivablePieData = summary ? [
    { name: 'Pending', value: Math.max(0, summary.pendingPayments), color: '#f59e0b' },
    { name: 'Overdue', value: Math.max(0, summary.overduePayments), color: '#d93025' },
  ].filter((d) => d.value > 0) : [];

  const expenseBreakdownData = pnl?.breakdown
    ?.filter((b) => b.type === 'EXPENSE')
    .map((b) => ({ name: b.category, value: b.total })) ?? [];

  const txColumns: ColumnDef<TxRow>[] = [
    { header: 'Transaction#', accessor: 'number' },
    { header: 'Type', accessor: 'type' },
    { header: 'Amount', accessor: 'amount', align: 'right' },
    { header: 'Status', accessor: (row) => <StatusPill status={row.paymentStatus} /> },
    { header: 'Date', accessor: 'date' },
    { header: 'Vendor/Customer', accessor: 'vendor' },
  ];

  const txRows: TxRow[] = (summary?.recentTransactions ?? []).map((tx) => ({
    id: tx.id,
    number: tx.transactionNumber,
    type: tx.transactionType,
    amount: formatCurrency(tx.totalAmount),
    paymentStatus: tx.paymentStatus,
    date: formatDate(tx.transactionDate),
    vendor: tx.driver?.name ?? tx.vendor?.name ?? tx.customer?.name ?? '—',
  }));

  return (
    <PageShell>
      <div className="dashboard-command-header">
        <div className="dashboard-command-header-main">
          <h1>Finance Command Center</h1>
          <p className="dashboard-command-subtitle">
            Receivables, payments, and P&amp;L overview
          </p>
        </div>
        <div className="dashboard-command-meta">
          <ActionButton label="Refresh" variant="ghost" onClick={load} />
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="success-banner">{message}</div> : null}

      {summary ? (
        <>
          <KpiGrid columns={4}>
            <StatCard label="Total Receivable" value={formatCurrency(summary.totalReceivable)} variant="success" icon={<ArrowDownCircleIcon />} />
            <StatCard label="Total Payable" value={formatCurrency(summary.totalPayable)} variant="danger" icon={<ArrowUpCircleIcon />} />
            <StatCard label="Income MTD" value={formatCurrency(summary.currentMonthIncome)} variant="success" icon={<TrendUpIcon />} />
            <StatCard label="Expenses MTD" value={formatCurrency(summary.currentMonthExpenses)} variant="danger" icon={<TrendDownIcon />} />
          </KpiGrid>

          <KpiGrid columns={4}>
            <StatCard
              label="Net Profit MTD"
              value={formatCurrency(netProfit)}
              variant={netProfit >= 0 ? 'success' : 'danger'}
              icon={netProfit >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
            />
            <StatCard
              label="Pending Payments"
              value={formatCurrency(summary.pendingPayments)}
              variant={summary.pendingPayments > 0 ? 'warning' : 'muted'}
              icon={<ClockIcon />}
            />
            <StatCard
              label="Overdue Payments"
              value={formatCurrency(summary.overduePayments)}
              variant={summary.overduePayments > 0 ? 'danger' : 'muted'}
              icon={<AlertIcon />}
            />
            <StatCard label="Total Transactions" value={summary.recentTransactions.length} subtext="Recent" variant="info" icon={<FileTextIcon />} />
          </KpiGrid>

          <div className="dashboard-chart-grid">
            {incomeExpenseData.length > 0 && (
              <ChartCard title="Income vs Expenses" subtitle="Current month comparison">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={incomeExpenseData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: any) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {incomeExpenseData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {receivablePieData.length > 0 && (
              <ChartCard title="Receivables" subtitle="Pending vs overdue">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={receivablePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {receivablePieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {expenseBreakdownData.length > 0 && (
              <ChartCard title="Expense Breakdown" subtitle="By category">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={expenseBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {expenseBreakdownData.map((_entry, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {pnl ? (
            <div className="dashboard-table-card" data-testid="finance-pnl-section">
              <div className="chart-card-header">
                <div>
                  <h3 className="chart-card-title">Profit &amp; Loss</h3>
                  <p className="chart-card-subtitle">Overall financial performance</p>
                </div>
              </div>

              {canViewPnl ? (
                <form className="finance-filters" onSubmit={loadPnl} style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border-light)' }}>
                  <label className="field-group">
                    <span className="field-label">Date From</span>
                    <input className="finance-date-input" type="date" value={pnlDateFrom} onChange={(e) => setPnlDateFrom(e.target.value)} />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Date To</span>
                    <input className="finance-date-input" type="date" value={pnlDateTo} onChange={(e) => setPnlDateTo(e.target.value)} />
                  </label>
                  <ActionButton label="Apply Filters" variant="primary" onClick={loadPnl} />
                </form>
              ) : null}

              <div className="kpi-grid kpi-cols-3" style={{ padding: 'var(--space-4) var(--space-5)' }} data-testid="finance-pnl-summary">
                <StatCard label="Total Income" value={formatCurrency(pnl.totalIncome)} variant="success" icon={<TrendUpIcon />} />
                <StatCard label="Total Expenses" value={formatCurrency(pnl.totalExpenses)} variant="danger" icon={<TrendDownIcon />} />
                <StatCard
                  label="Net Profit"
                  value={formatCurrency(pnl.netProfit)}
                  variant={pnl.netProfit >= 0 ? 'success' : 'danger'}
                  icon={pnl.netProfit >= 0 ? <RupeeIcon /> : <AlertIcon />}
                />
              </div>

              {pnl.breakdown.length > 0 && (
                <div className="data-table-scroll" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Type</th>
                        <th align="right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pnl.breakdown.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.category}</td>
                          <td><StatusPill status={row.type} /></td>
                          <td align="right">{formatCurrency(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {txRows.length > 0 && (
            <div className="dashboard-table-card">
              <div className="chart-card-header">
                <div>
                  <h3 className="chart-card-title">Recent Transactions</h3>
                  <p className="chart-card-subtitle">Last {txRows.length} transactions</p>
                </div>
              </div>
              <DataTable columns={txColumns} data={txRows} keyExtractor={(r) => r.id} />
            </div>
          )}
        </>
      ) : null}
    </PageShell>
  );
}

export default FinancePage;

