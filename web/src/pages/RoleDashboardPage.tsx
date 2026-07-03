import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardOverview,
  getFinanceDashboardSummary,
  getMaintenanceRecords,
  getMyDriverDocuments,
  getMyDriverExpenses,
  getMyDriverFuel,
  getMyDriverTrips,
  getMyDriverVehicles,
  getRepairs,
} from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { ActionButton, ActionToolbar } from '../components/ui/ActionToolbar';
import { PageShell } from '../components/ui/PageShell';
import { StatCard } from '../components/ui/StatCard';
import { KpiGrid } from '../components/ui/KpiGrid';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { AlertIcon, MapPinIcon, ReceiptIcon, TruckIcon, UsersIcon, WrenchIcon } from '../components/ui/icons';

type Metrics = { vehicles: number; drivers: number; trips: number; fuel: number; expenses: number; maintenance: number; repairs: number; risk: number };
const empty: Metrics = { vehicles: 0, drivers: 0, trips: 0, fuel: 0, expenses: 0, maintenance: 0, repairs: 0, risk: 0 };
const money = (n: number) => n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const compact = (n: number) => n.toLocaleString('en-IN');
const num = (x: unknown) => Number(x ?? 0);

function total(x: unknown): number {
  if (!x || typeof x !== 'object') return 0;
  const obj = x as { total?: unknown; pagination?: { total?: unknown } };
  return Number(obj.total ?? obj.pagination?.total ?? 0);
}

function rows(x: unknown): Record<string, unknown>[] {
  if (!x || typeof x !== 'object') return [];
  const obj = x as { items?: unknown };
  return Array.isArray(obj.items) ? (obj.items as Record<string, unknown>[]) : [];
}

async function safe<T>(fn: () => Promise<{ data: T }>) { try { return (await fn()).data; } catch { return null; } }

function titleFor(role: string) {
  if (role === 'driver') return 'My Driver Dashboard';
  if (role === 'mechanic') return 'My Maintenance Dashboard';
  if (role === 'finance') return 'My Finance Dashboard';
  if (role === 'manager' || role === 'supervisor') return 'My Operations Dashboard';
  return 'My Dashboard';
}

export function RoleDashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics>(empty);
  const [loading, setLoading] = useState(true);
  const role = auth.user?.role.key ?? 'unknown';
  const title = titleFor(role);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!auth.accessToken) { setLoading(false); return; }
      const token = auth.accessToken;
      const next = { ...empty };
      setLoading(true);
      try {
        if (auth.hasPermission('dashboard_view')) {
          const d = await safe(() => getDashboardOverview(token));
          if (d) {
            next.vehicles = d.totalVehicles;
            next.drivers = d.driversCount;
            next.trips = d.activeTrips + d.pendingTrips + d.completedTripsThisMonth;
            next.fuel = num(d.fuelCostThisMonth);
            next.expenses = num(d.expensesThisMonth);
            next.maintenance = d.maintenanceOpen;
            next.repairs = d.repairsOpen;
            next.risk = d.complianceExpired + d.complianceExpiring7 + d.expiredDocuments + d.expiringDocuments30 + d.unverifiedDocuments;
          }
        }
        if (role === 'driver') {
          const [vehicles, trips, fuel, expenses, docs] = await Promise.all([
            safe(() => getMyDriverVehicles(token)),
            safe(() => getMyDriverTrips(token, { page: 1, limit: 100 })),
            safe(() => getMyDriverFuel(token, { page: 1, limit: 100 })),
            safe(() => getMyDriverExpenses(token, { page: 1, limit: 100 })),
            safe(() => getMyDriverDocuments(token, { page: 1, limit: 100 })),
          ]);
          next.vehicles = vehicles?.vehicles?.length ?? 0;
          next.trips = total(trips);
          next.fuel = rows(fuel).reduce((sum, entry) => sum + num(entry.totalAmount), 0);
          next.expenses = rows(expenses).reduce((sum, entry) => sum + num(entry.amount), 0);
          next.risk = total(docs);
          next.drivers = 1;
        }
        if (role === 'mechanic') {
          const [r, m] = await Promise.all([safe(() => getRepairs(token, { page: 1, limit: 100 })), safe(() => getMaintenanceRecords(token, { page: 1, limit: 100 }))]);
          next.repairs = rows(r).filter((x) => x.status === 'OPEN' || x.status === 'IN_PROGRESS').length;
          next.maintenance = rows(m).filter((x) => x.status === 'SUBMITTED' || x.status === 'APPROVED').length;
        }
        if (role === 'finance') {
          const f = await safe(() => getFinanceDashboardSummary(token));
          if (f) { next.fuel = num(f.currentMonthIncome); next.expenses = num(f.currentMonthExpenses); next.risk = num(f.overduePayments); next.trips = num(f.pendingPayments); }
        }
        if (alive) setMetrics(next);
      } finally { if (alive) setLoading(false); }
    }
    void load();
    return () => { alive = false; };
  }, [auth, role]);

  const bars = [['Trips', metrics.trips], ['Maintenance', metrics.maintenance], ['Repairs', metrics.repairs], ['Attention', metrics.risk]] as const;
  const max = Math.max(1, ...bars.map(([, value]) => value));
  if (loading) return <PageShell><LoadingSkeleton rows={6} columns={4} /></PageShell>;

  return (
    <PageShell>
      <PageHeader eyebrow={auth.user?.name ?? 'My account'} title={title} description="Individual dashboard: only records visible to this logged-in user through their own role, assignment, and data-scope permissions." actions={<ActionToolbar><ActionButton label="Workspace" variant="primary" onClick={() => navigate('/workspace')} /></ActionToolbar>} />
      <KpiGrid columns={4}>
        <StatCard label={role === 'finance' ? 'My Income MTD' : 'My Vehicles'} value={role === 'finance' ? money(metrics.fuel) : compact(metrics.vehicles)} subtext={role === 'driver' ? 'Assigned, scoped, or selectable vehicles' : role === 'finance' ? 'Finance data visible to me' : 'Fleet records visible to me'} icon={<TruckIcon />} onClick={() => navigate(role === 'driver' ? '/driver-portal/vehicles' : role === 'finance' ? '/finance' : '/vehicles')} />
        <StatCard label={role === 'driver' ? 'My Trips' : 'My Visible Drivers'} value={compact(role === 'driver' ? metrics.trips : metrics.drivers)} subtext={role === 'driver' ? 'Trips assigned to me' : 'Driver records visible to me'} variant="info" icon={<UsersIcon />} onClick={() => navigate(role === 'driver' ? '/driver-portal/trips' : '/drivers')} />
        <StatCard label={role === 'driver' ? 'My Fuel' : 'My Visible Trips'} value={role === 'driver' ? money(metrics.fuel) : compact(metrics.trips)} subtext={role === 'driver' ? 'Fuel submitted by me' : 'Trip records visible to me'} variant="success" icon={<MapPinIcon />} onClick={() => navigate(role === 'driver' ? '/driver-portal/fuel' : '/trips')} />
        <StatCard label="My Attention" value={compact(metrics.risk)} subtext="Documents, overdue, or risk items visible to me" variant={metrics.risk ? 'danger' : 'muted'} icon={<AlertIcon />} onClick={() => navigate(role === 'driver' ? '/driver-portal/documents' : '/compliance')} />
      </KpiGrid>
      <KpiGrid columns={4}>
        <StatCard label="My Money Signal" value={money(metrics.fuel)} subtext="Fuel or income visible to me" icon={<ReceiptIcon />} />
        <StatCard label="My Expenses" value={money(metrics.expenses)} subtext="Expense records visible to me" variant="warning" icon={<ReceiptIcon />} onClick={() => navigate(role === 'driver' ? '/driver-portal/expenses' : '/expenses')} />
        <StatCard label="My Maintenance" value={compact(metrics.maintenance)} subtext="Maintenance jobs visible to me" variant="warning" icon={<WrenchIcon />} onClick={() => navigate('/maintenance')} />
        <StatCard label="My Repairs" value={compact(metrics.repairs)} subtext="Repair jobs visible to me" variant="warning" icon={<WrenchIcon />} onClick={() => navigate('/repairs')} />
      </KpiGrid>
      <section className="chart-card"><div className="chart-card-header"><div><h3 className="chart-card-title">My workload chart</h3><p className="chart-card-subtitle">Only my visible / assigned records are counted.</p></div></div><div style={{ display: 'grid', gap: '0.75rem', padding: '1rem' }}>{bars.map(([label, value]) => <div key={label}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{label}</span><strong>{value}</strong></div><div style={{ height: 10, borderRadius: 999, background: 'var(--color-bg-surface-subtle)' }}><div style={{ width: `${Math.max(6, (value / max) * 100)}%`, height: '100%', borderRadius: 999, background: 'var(--color-accent)' }} /></div></div>)}</div></section>
    </PageShell>
  );
}

export default RoleDashboardPage;
