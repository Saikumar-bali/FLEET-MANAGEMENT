import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardOverview } from '../services/api';
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

function titleFor(role: string) {
  if (role === 'driver') return 'Driver Dashboard';
  if (role === 'mechanic') return 'Maintenance Dashboard';
  if (role === 'finance') return 'Finance Dashboard';
  if (role === 'manager' || role === 'supervisor') return 'Operations Dashboard';
  return 'Role Dashboard';
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
      if (!auth.accessToken) return;
      setLoading(true);
      try {
        if (auth.hasPermission('dashboard_view')) {
          const response = await getDashboardOverview(auth.accessToken);
          const d = response.data;
          if (alive) setMetrics({
            vehicles: d.totalVehicles,
            drivers: d.driversCount,
            trips: d.activeTrips + d.pendingTrips + d.completedTripsThisMonth,
            fuel: Number(d.fuelCostThisMonth ?? 0),
            expenses: Number(d.expensesThisMonth ?? 0),
            maintenance: d.maintenanceOpen,
            repairs: d.repairsOpen,
            risk: d.complianceExpired + d.complianceExpiring7 + d.expiredDocuments + d.expiringDocuments30 + d.unverifiedDocuments,
          });
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [auth]);

  const bars = [
    ['Trips', metrics.trips], ['Maintenance', metrics.maintenance], ['Repairs', metrics.repairs], ['Risk', metrics.risk],
  ] as const;
  const max = Math.max(1, ...bars.map(([, value]) => value));

  if (loading) return <PageShell><LoadingSkeleton rows={6} columns={4} /></PageShell>;

  return (
    <PageShell>
      <PageHeader
        eyebrow={auth.user?.role.name ?? 'Role'}
        title={title}
        description="A professional role-aware dashboard with KPIs, workload charts, and permission-safe metrics."
        actions={<ActionToolbar><ActionButton label="Workspace" variant="primary" onClick={() => navigate('/workspace')} /></ActionToolbar>}
      />
      <KpiGrid columns={4}>
        <StatCard label="Vehicles" value={compact(metrics.vehicles)} subtext="Visible fleet" icon={<TruckIcon />} onClick={() => navigate('/vehicles')} />
        <StatCard label="Drivers" value={compact(metrics.drivers)} subtext="Visible drivers" variant="info" icon={<UsersIcon />} onClick={() => navigate('/drivers')} />
        <StatCard label="Trips" value={compact(metrics.trips)} subtext="Active and monthly trips" variant="success" icon={<MapPinIcon />} onClick={() => navigate('/trips')} />
        <StatCard label="Risk" value={compact(metrics.risk)} subtext="Compliance and documents" variant={metrics.risk ? 'danger' : 'muted'} icon={<AlertIcon />} onClick={() => navigate('/compliance')} />
      </KpiGrid>
      <KpiGrid columns={4}>
        <StatCard label="Fuel MTD" value={money(metrics.fuel)} subtext="Fuel spend" icon={<ReceiptIcon />} />
        <StatCard label="Expenses MTD" value={money(metrics.expenses)} subtext="Operational expense" variant="warning" icon={<ReceiptIcon />} />
        <StatCard label="Maintenance" value={compact(metrics.maintenance)} subtext="Open jobs" variant="warning" icon={<WrenchIcon />} onClick={() => navigate('/maintenance')} />
        <StatCard label="Repairs" value={compact(metrics.repairs)} subtext="Open repairs" variant="warning" icon={<WrenchIcon />} onClick={() => navigate('/repairs')} />
      </KpiGrid>
      <section className="chart-card">
        <div className="chart-card-header"><div><h3 className="chart-card-title">Role workload chart</h3><p className="chart-card-subtitle">Records that need attention.</p></div></div>
        <div style={{ display: 'grid', gap: '0.75rem', padding: '1rem' }}>
          {bars.map(([label, value]) => <div key={label}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{label}</span><strong>{value}</strong></div><div style={{ height: 10, borderRadius: 999, background: 'var(--color-bg-surface-subtle)' }}><div style={{ width: `${Math.max(6, (value / max) * 100)}%`, height: '100%', borderRadius: 999, background: 'var(--color-accent)' }} /></div></div>)}
        </div>
      </section>
    </PageShell>
  );
}

export default RoleDashboardPage;
