import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { ActionButton, ActionToolbar } from '../components/ui/ActionToolbar';
import { ChartCard } from '../components/ui/ChartCard';
import { KpiGrid } from '../components/ui/KpiGrid';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { PageShell } from '../components/ui/PageShell';
import { StatCard } from '../components/ui/StatCard';
import { AlertIcon, ClockIcon, FileTextIcon, FuelIcon, MapPinIcon, ReceiptIcon, RupeeIcon, ShieldIcon, TruckIcon, UsersIcon, WalletIcon, WrenchIcon } from '../components/ui/icons';
import { getDashboardOverview, getDocuments, getDrivers, getExpenses, getFinanceDashboardSummary, getFuelEntries, getMaintenanceRecords, getRepairs, getTrips, getVehicles } from '../services/api';
import type { DashboardOverview, PaginatedResponse } from '../types/auth';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
type DataPoint = { name: string; value: number };

type Metrics = {
  vehicles: number;
  activeVehicles: number;
  drivers: number;
  trips: number;
  activeTrips: number;
  pendingTrips: number;
  fuelSpend: number;
  expenseSpend: number;
  maintenance: number;
  repairs: number;
  documents: number;
  risk: number;
  income: number;
  financeExpenses: number;
  receivable: number;
  overdue: number;
};

const emptyMetrics: Metrics = {
  vehicles: 0,
  activeVehicles: 0,
  drivers: 0,
  trips: 0,
  activeTrips: 0,
  pendingTrips: 0,
  fuelSpend: 0,
  expenseSpend: 0,
  maintenance: 0,
  repairs: 0,
  documents: 0,
  risk: 0,
  income: 0,
  financeExpenses: 0,
  receivable: 0,
  overdue: 0,
};

const colors = ['#1a73e8', '#1e8e3e', '#e37400', '#d93025', '#9334e6', '#188038'];

function totalOf<T>(page: PaginatedResponse<T> | null | undefined) {
  return page?.pagination?.total ?? 0;
}

function rowsOf<T>(page: PaginatedResponse<T> | null | undefined) {
  return page?.items ?? [];
}

async function safe<T>(fn: () => Promise<{ data: T }>, fallback: T): Promise<T> {
  try {
    return (await fn()).data;
  } catch {
    return fallback;
  }
}

function money(value: number) {
  return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function compact(value: number) {
  return value.toLocaleString('en-IN');
}

function applyOverview(next: Metrics, overview: DashboardOverview) {
  next.vehicles = overview.totalVehicles;
  next.activeVehicles = overview.activeVehicles;
  next.drivers = overview.driversCount;
  next.activeTrips = overview.activeTrips;
  next.pendingTrips = overview.pendingTrips;
  next.trips = overview.activeTrips + overview.pendingTrips + overview.completedTripsThisMonth;
  next.fuelSpend = Number(overview.fuelCostThisMonth ?? 0);
  next.expenseSpend = Number(overview.expensesThisMonth ?? 0);
  next.maintenance = overview.maintenanceOpen;
  next.repairs = overview.repairsOpen;
  next.documents = overview.totalDocuments;
  next.risk = overview.complianceExpired + overview.complianceExpiring7 + overview.expiredDocuments + overview.expiringDocuments30 + overview.unverifiedDocuments;
}

function roleText(roleKey: string) {
  if (roleKey === 'driver') return ['Driver Dashboard', 'Trips, fuel, expenses, documents, and vehicle work focused on the logged-in driver.'];
  if (roleKey === 'mechanic') return ['Maintenance Dashboard', 'Repair queue, maintenance workload, compliance pressure, and service documentation.'];
  if (roleKey === 'finance') return ['Finance Dashboard', 'Income, expense, receivable, overdue payment, and transaction-focused control view.'];
  if (roleKey === 'viewer') return ['Viewer Dashboard', 'Read-only operational visibility with charts and risk indicators.'];
  if (roleKey === 'manager' || roleKey === 'supervisor') return ['Operations Dashboard', 'Trips, vehicles, drivers, submissions, and operational health for field leadership.'];
  return ['Role Dashboard', 'Professional metrics and charts based on the current user permissions.'];
}

function filled(data: DataPoint[], emptyName: string) {
  const nonZero = data.filter((x) => x.value > 0);
  return nonZero.length ? nonZero : [{ name: emptyName, value: 1 }];
}

export function RoleDashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState('');

  const roleKey = auth.user?.role.key ?? 'unknown';
  const [title, description] = roleText(roleKey);

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    const token = auth.accessToken;
    const next: Metrics = { ...emptyMetrics };
    setLoading(true);

    if (auth.hasPermission('dashboard_view')) {
      const overview = await safe(() => getDashboardOverview(token), null as DashboardOverview | null);
      if (overview) applyOverview(next, overview);
    }

    if (auth.hasPermission('vehicle_view')) {
      const page = await safe(() => getVehicles(token, { page: 1, limit: 100 }), null as Awaited<ReturnType<typeof getVehicles>>['data'] | null);
      next.vehicles = Math.max(next.vehicles, totalOf(page));
      next.activeVehicles = Math.max(next.activeVehicles, rowsOf(page).filter((v) => v.status === 'AVAILABLE').length);
    }

    if (auth.hasPermission('driver_view')) {
      const page = await safe(() => getDrivers(token, { page: 1, limit: 100 }), null as Awaited<ReturnType<typeof getDrivers>>['data'] | null);
      next.drivers = Math.max(next.drivers, totalOf(page));
    }

    if (auth.hasPermission('trip_view')) {
      const page = await safe(() => getTrips(token, { page: 1, limit: 100 }), null as Awaited<ReturnType<typeof getTrips>>['data'] | null);
      const rows = rowsOf(page);
      next.trips = Math.max(next.trips, totalOf(page));
      next.activeTrips = Math.max(next.activeTrips, rows.filter((t) => t.status === 'STARTED').length);
      next.pendingTrips = Math.max(next.pendingTrips, rows.filter((t) => t.status === 'SCHEDULED').length);
    }

    if (auth.hasPermission('fuel_view')) {
      const page = await safe(() => getFuelEntries(token, { page: 1, limit: 100 }), null as Awaited<ReturnType<typeof getFuelEntries>>['data'] | null);
      next.fuelSpend = Math.max(next.fuelSpend, rowsOf(page).reduce((sum, row) => sum + Number(row.totalAmount ?? 0), 0));
    }

    if (auth.hasPermission('expense_view')) {
      const page = await safe(() => getExpenses(token, { page: 1, limit: 100 }), null as Awaited<ReturnType<typeof getExpenses>>['data'] | null);
      next.expenseSpend = Math.max(next.expenseSpend, rowsOf(page).reduce((sum, row) => sum + Number(row.amount ?? 0), 0));
    }

    if (auth.hasPermission('maintenance_view')) {
      const page = await safe(() => getMaintenanceRecords(token, { page: 1, limit: 100 }), null as Awaited<ReturnType<typeof getMaintenanceRecords>>['data'] | null);
      next.maintenance = Math.max(next.maintenance, rowsOf(page).filter((m) => m.status === 'SUBMITTED' || m.status === 'APPROVED').length);
    }

    if (auth.hasPermission('repair_view')) {
      const page = await safe(() => getRepairs(token, { page: 1, limit: 100 }), null as Awaited<ReturnType<typeof getRepairs>>['data'] | null);
      next.repairs = Math.max(next.repairs, rowsOf(page).filter((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS').length);
    }

    if (auth.hasPermission('documents_view')) {
      const page = await safe(() => getDocuments(token, { page: '1', limit: '100' }), null as Awaited<ReturnType<typeof getDocuments>>['data'] | null);
      const rows = rowsOf(page);
      next.documents = Math.max(next.documents, totalOf(page));
      next.risk = Math.max(next.risk, rows.filter((d) => d.verificationStatus === 'PENDING' || d.verificationStatus === 'REJECTED').length);
    }

    if (auth.hasPermission('finance_view')) {
      const finance = await safe(() => getFinanceDashboardSummary(token), null as Awaited<ReturnType<typeof getFinanceDashboardSummary>>['data'] | null);
      if (finance) {
        next.income = finance.currentMonthIncome;
        next.financeExpenses = finance.currentMonthExpenses;
        next.receivable = finance.totalReceivable;
        next.overdue = finance.overduePayments;
      }
    }

    setMetrics(next);
    setUpdatedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    setLoading(false);
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = useMemo<Array<{ label: string; value: string | number; subtext: string; variant: Variant; icon: JSX.Element; to: string }>>(() => {
    if (roleKey === 'finance') {
      return [
        { label: 'Income MTD', value: money(metrics.income), subtext: 'Current month income', variant: 'success', icon: <RupeeIcon />, to: '/finance' },
        { label: 'Expenses MTD', value: money(metrics.financeExpenses || metrics.expenseSpend), subtext: 'Month-to-date outflow', variant: 'warning', icon: <ReceiptIcon />, to: '/finance/transactions' },
        { label: 'Receivable', value: money(metrics.receivable), subtext: 'Customer balance', variant: 'info', icon: <WalletIcon />, to: '/finance/trip-billings' },
        { label: 'Overdue', value: compact(metrics.overdue), subtext: 'Payments needing follow-up', variant: metrics.overdue > 0 ? 'danger' : 'muted', icon: <ClockIcon />, to: '/finance/payments' },
      ];
    }
    if (roleKey === 'mechanic') {
      return [
        { label: 'Open Repairs', value: compact(metrics.repairs), subtext: 'Repair work queue', variant: metrics.repairs > 0 ? 'warning' : 'muted', icon: <WrenchIcon />, to: '/repairs' },
        { label: 'Maintenance Jobs', value: compact(metrics.maintenance), subtext: 'Submitted or approved jobs', variant: metrics.maintenance > 0 ? 'warning' : 'muted', icon: <ClockIcon />, to: '/maintenance' },
        { label: 'Documents', value: compact(metrics.documents), subtext: 'Service documents', variant: 'info', icon: <FileTextIcon />, to: '/documents' },
        { label: 'Risk', value: compact(metrics.risk), subtext: 'Compliance or document risk', variant: metrics.risk > 0 ? 'danger' : 'success', icon: metrics.risk > 0 ? <AlertIcon /> : <ShieldIcon />, to: '/compliance' },
      ];
    }
    return [
      { label: 'Vehicles', value: compact(metrics.vehicles), subtext: `${metrics.activeVehicles} available`, variant: 'default', icon: <TruckIcon />, to: '/vehicles' },
      { label: 'Drivers', value: compact(metrics.drivers), subtext: 'Registered drivers', variant: 'info', icon: <UsersIcon />, to: '/drivers' },
      { label: 'Trips', value: compact(metrics.trips), subtext: `${metrics.activeTrips} active, ${metrics.pendingTrips} pending`, variant: metrics.activeTrips > 0 ? 'success' : 'muted', icon: <MapPinIcon />, to: '/trips' },
      { label: 'Risk', value: compact(metrics.risk), subtext: 'Documents and compliance', variant: metrics.risk > 0 ? 'danger' : 'success', icon: metrics.risk > 0 ? <AlertIcon /> : <ShieldIcon />, to: '/compliance' },
    ];
  }, [metrics, roleKey]);

  const workload = filled([
    { name: 'Trips', value: metrics.trips },
    { name: 'Maintenance', value: metrics.maintenance },
    { name: 'Repairs', value: metrics.repairs },
    { name: 'Documents', value: metrics.documents },
  ], 'No workload');

  const moneyFlow = filled([
    { name: 'Income', value: metrics.income },
    { name: 'Fuel', value: metrics.fuelSpend },
    { name: 'Expenses', value: metrics.financeExpenses || metrics.expenseSpend },
    { name: 'Receivable', value: metrics.receivable },
  ], 'No movement');

  const attention = filled([
    { name: 'Risk', value: metrics.risk },
    { name: 'Repairs', value: metrics.repairs },
    { name: 'Maintenance', value: metrics.maintenance },
    { name: 'Overdue', value: metrics.overdue },
  ], 'Healthy');

  if (loading) {
    return <PageShell><LoadingSkeleton rows={6} columns={4} /></PageShell>;
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={auth.user?.role.name ?? 'Role dashboard'}
        title={title}
        description={description}
        actions={(
          <ActionToolbar>
            <ActionButton label="Refresh" variant="ghost" onClick={load} />
            <ActionButton label="Workspace" variant="primary" onClick={() => navigate('/workspace')} />
          </ActionToolbar>
        )}
      />

      <div className="dashboard-command-header">
        <div className="dashboard-command-header-main">
          <h1>{title}</h1>
          <p className="dashboard-command-subtitle">Updated {updatedAt || 'just now'} · permission-aware metrics for {auth.user?.name ?? 'this user'}.</p>
        </div>
        <div className="dashboard-command-meta">
          <span className={`health-indicator ${metrics.risk + metrics.overdue > 0 ? 'health-indicator-warning' : 'health-indicator-good'}`}>
            {metrics.risk + metrics.overdue > 0 ? 'Attention required' : 'Healthy'}
          </span>
        </div>
      </div>

      <KpiGrid columns={4}>
        {kpis.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} subtext={card.subtext} variant={card.variant} icon={card.icon} onClick={() => navigate(card.to)} />
        ))}
      </KpiGrid>

      <div className="dashboard-chart-grid">
        <ChartCard title="Role workload" subtitle="Records visible through this role">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={workload}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {workload.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Financial signal" subtitle="Costs, income, and receivables">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={moneyFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: unknown) => money(Number(v))} />
              <Bar dataKey="value" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Attention map" subtitle="What should be handled first">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={attention} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} label={({ name, value }) => `${name}: ${value}`}>
                {attention.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </PageShell>
  );
}

export default RoleDashboardPage;
