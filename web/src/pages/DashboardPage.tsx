import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { getDashboardOverview } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { DashboardOverview } from '../types/auth';
import { PageShell } from '../components/ui/PageShell';
import { StatCard } from '../components/ui/StatCard';
import { KpiGrid } from '../components/ui/KpiGrid';
import { ChartCard } from '../components/ui/ChartCard';
import { DataTable } from '../components/ui/DataTable';
import type { ColumnDef } from '../components/ui/DataTable';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { StatusPill } from '../components/ui/StatusPill';
import { ActionButton } from '../components/ui/ActionToolbar';
import { TruckIcon, MapPinIcon, UsersIcon, FuelIcon, ShieldIcon, AlertIcon, WrenchIcon, ClockIcon } from '../components/ui/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function formatCurrency(value: number) {
  if (!value || value === 0) return '₹0';
  return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function pieChartColor(index: number): string {
  const colors = ['#1a73e8', '#1e8e3e', '#e37400', '#d93025', '#8ab4f8', '#81c995', '#fdd663', '#f28b82'];
  return colors[index % colors.length];
}

interface TripRow {
  id: string;
  tripType: string;
  status: string;
  route: string;
  date: string;
}

interface FuelRow {
  id: string;
  vehicleId: string;
  qty: string;
  cost: string;
  date: string;
}

interface ExpenseRow {
  id: string;
  vehicleId: string;
  category: string;
  amount: string;
  date: string;
}

export function DashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getDashboardOverview(auth.accessToken);
      setData(res.data);
      setLastUpdated(new Date().toLocaleTimeString('en-IN'));
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [auth.accessToken]);

  useEffect(() => { void load(); }, [load]);

  if (isLoading) {
    return (
      <PageShell>
        <LoadingSkeleton rows={6} columns={4} />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="empty-state-panel">
          <h3>Failed to load dashboard</h3>
          <p>{error}</p>
          <ActionButton label="Retry" variant="primary" onClick={load} />
        </div>
      </PageShell>
    );
  }

  const vehicleStatusData = [
    { name: 'Active', value: data?.activeVehicles ?? 0 },
    { name: 'Inactive', value: data?.inactiveVehicles ?? 0 },
  ];

  const tripStatusData = [
    { name: 'Active', value: data?.activeTrips ?? 0 },
    { name: 'Completed', value: data?.completedTripsThisMonth ?? 0 },
    { name: 'Pending', value: data?.pendingTrips ?? 0 },
  ];

  const financeData = [
    { name: 'Fuel Cost', amount: Number(data?.fuelCostThisMonth ?? 0) },
    { name: 'Expenses', amount: Number(data?.expensesThisMonth ?? 0) },
  ];

  const complianceData = [
    { name: 'Expired', value: data?.complianceExpired ?? 0 },
    { name: 'Expiring 7d', value: data?.complianceExpiring7 ?? 0 },
    { name: 'Expiring 30d', value: data?.complianceExpiring30 ?? 0 },
  ];

  const maintenanceData = [
    { name: 'Open Work Orders', value: data?.maintenanceOpen ?? 0 },
    { name: 'In Progress Repairs', value: data?.repairsOpen ?? 0 },
  ];

  const tripColumns: ColumnDef<TripRow>[] = [
    { header: 'Type', accessor: 'tripType' },
    { header: 'Route', accessor: 'route' },
    { header: 'Status', accessor: (row) => <StatusPill status={row.status} /> },
    { header: 'Date', accessor: 'date' },
  ];

  const fuelColumns: ColumnDef<FuelRow>[] = [
    { header: 'Vehicle', accessor: 'vehicleId' },
    { header: 'Qty (L)', accessor: 'qty', align: 'right' },
    { header: 'Cost', accessor: 'cost', align: 'right' },
    { header: 'Date', accessor: 'date' },
  ];

  const expenseColumns: ColumnDef<ExpenseRow>[] = [
    { header: 'Vehicle', accessor: 'vehicleId' },
    { header: 'Category', accessor: 'category' },
    { header: 'Amount', accessor: 'amount', align: 'right' },
    { header: 'Date', accessor: 'date' },
  ];

  const tripRows: TripRow[] = (data?.recentTrips ?? []).map((t) => ({
    id: t.id,
    tripType: t.tripType,
    status: t.status,
    route: `${t.originName} → ${t.destinationName}`,
    date: formatDate(t.createdAt),
  }));

  const fuelRows: FuelRow[] = (data?.recentFuel ?? []).map((f) => ({
    id: f.id,
    vehicleId: f.vehicleId.slice(0, 8),
    qty: Number(f.quantityLiters).toFixed(1),
    cost: formatCurrency(Number(f.totalAmount)),
    date: formatDate(f.fuelDate),
  }));

  const expenseRows: ExpenseRow[] = (data?.recentExpenses ?? []).map((e) => ({
    id: e.id,
    vehicleId: e.vehicleId.slice(0, 8),
    category: e.category,
    amount: formatCurrency(Number(e.amount)),
    date: formatDate(e.expenseDate),
  }));

  const hasComplianceRisk = (data?.complianceExpired ?? 0) > 0;
  const hasMaintenanceIssues = (data?.maintenanceOpen ?? 0) > 0;

  return (
    <PageShell>
      <div className="dashboard-command-header">
        <div className="dashboard-command-header-main">
          <h1>Fleet Operations Command Center</h1>
          <p className="dashboard-command-subtitle">
            Real-time fleet analytics &amp; operations overview
          </p>
        </div>
        <div className="dashboard-command-meta">
          <span className={`health-indicator ${hasComplianceRisk || hasMaintenanceIssues ? 'health-indicator-warning' : 'health-indicator-good'}`}>
            {hasComplianceRisk || hasMaintenanceIssues ? 'Attention Required' : 'All Systems Normal'}
          </span>
          <span className="last-updated-text">Updated {lastUpdated}</span>
          <ActionButton label="Refresh" variant="ghost" onClick={load} />
          <div className="dashboard-quick-actions">
            {auth.hasPermission('trip_create') && (
              <ActionButton label="New Trip" variant="primary" onClick={() => navigate('/trips/new')} />
            )}
            {auth.hasPermission('fuel_create') && (
              <ActionButton label="Add Fuel" variant="secondary" onClick={() => navigate('/fuel/new')} />
            )}
            {auth.hasPermission('expense_create') && (
              <ActionButton label="Add Expense" variant="secondary" onClick={() => navigate('/expenses/new')} />
            )}
            {auth.hasPermission('vehicle_compliance_view') && (
              <ActionButton label="Compliance" variant="ghost" onClick={() => navigate('/compliance')} />
            )}
            {auth.hasPermission('finance_view') && (
              <ActionButton label="Finance" variant="ghost" onClick={() => navigate('/finance')} />
            )}
          </div>
        </div>
      </div>

      <KpiGrid columns={5}>
        <StatCard
          label="Total Vehicles"
          value={data?.totalVehicles ?? 0}
          subtext={`${data?.activeVehicles ?? 0} active, ${data?.inactiveVehicles ?? 0} inactive`}
          variant="default"
          icon={<TruckIcon />}
        />
        <StatCard
          label="Active Trips"
          value={data?.activeTrips ?? 0}
          subtext={`${data?.completedTripsThisMonth ?? 0} completed this month`}
          variant={data && data.activeTrips > 0 ? 'success' : 'muted'}
          icon={<MapPinIcon />}
        />
        <StatCard
          label="Pending Trips"
          value={data?.pendingTrips ?? 0}
          subtext="Awaiting scheduling"
          variant={data && data.pendingTrips > 0 ? 'warning' : 'muted'}
          icon={<ClockIcon />}
        />
        <StatCard
          label="Drivers"
          value={data?.driversCount ?? 0}
          subtext="Registered drivers"
          variant="info"
          icon={<UsersIcon />}
        />
        <StatCard
          label="Compliance Risk"
          value={(data?.complianceExpired ?? 0) + (data?.complianceExpiring7 ?? 0)}
          subtext={`${data?.complianceExpired ?? 0} expired, ${data?.complianceExpiring7 ?? 0} expiring soon`}
          variant={hasComplianceRisk ? 'danger' : 'muted'}
          icon={hasComplianceRisk ? <AlertIcon /> : <ShieldIcon />}
        />
      </KpiGrid>

      <KpiGrid columns={5}>
        <StatCard
          label="Fuel Cost MTD"
          value={formatCurrency(Number(data?.fuelCostThisMonth ?? 0))}
          variant="default"
          icon={<FuelIcon />}
        />
        <StatCard
          label="Expenses MTD"
          value={formatCurrency(Number(data?.expensesThisMonth ?? 0))}
          variant="default"
          icon={<FuelIcon />}
        />
        <StatCard
          label="Open Maintenance"
          value={data?.maintenanceOpen ?? 0}
          subtext="Work orders in progress"
          variant={data && data.maintenanceOpen > 0 ? 'warning' : 'muted'}
          icon={<WrenchIcon />}
        />
        <StatCard
          label="Repairs in Progress"
          value={data?.repairsOpen ?? 0}
          subtext="Active repair orders"
          variant={data && data.repairsOpen > 0 ? 'warning' : 'muted'}
          icon={<WrenchIcon />}
        />
        <StatCard
          label="Expired Documents"
          value={data?.complianceExpired ?? 0}
          subtext="Requires immediate action"
          variant={hasComplianceRisk ? 'danger' : 'muted'}
          icon={<AlertIcon />}
        />
      </KpiGrid>

      <div className="dashboard-chart-grid">
        <ChartCard title="Vehicle Status" subtitle="Active vs inactive vehicles">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={vehicleStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {vehicleStatusData.map((_, i) => (
                  <Cell key={i} fill={pieChartColor(i)} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Trip Status" subtitle="Active, completed, and pending trips">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={tripStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {tripStatusData.map((_, i) => (
                  <Cell key={i} fill={pieChartColor(i)} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fuel vs Expenses MTD" subtitle="Month-to-date costs">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={financeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
              <Bar dataKey="amount" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Compliance Risk" subtitle="Document expiry overview">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={complianceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {complianceData.map((_, i) => (
                  <Cell key={i} fill={pieChartColor(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="dashboard-chart-grid">
        <ChartCard title="Maintenance & Repairs" subtitle="Open work order status">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={maintenanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="dashboard-activity-grid">
        {tripRows.length > 0 && (
          <div className="dashboard-table-card">
            <div className="chart-card-header">
              <div>
                <h3 className="chart-card-title">Recent Trips</h3>
                <p className="chart-card-subtitle">Latest trip activity</p>
              </div>
            </div>
            <DataTable columns={tripColumns} data={tripRows} keyExtractor={(r) => r.id} />
          </div>
        )}

        {fuelRows.length > 0 && (
          <div className="dashboard-table-card">
            <div className="chart-card-header">
              <div>
                <h3 className="chart-card-title">Recent Fuel Entries</h3>
                <p className="chart-card-subtitle">Latest fuel records</p>
              </div>
            </div>
            <DataTable columns={fuelColumns} data={fuelRows} keyExtractor={(r) => r.id} />
          </div>
        )}

        {expenseRows.length > 0 && (
          <div className="dashboard-table-card">
            <div className="chart-card-header">
              <div>
                <h3 className="chart-card-title">Recent Expenses</h3>
                <p className="chart-card-subtitle">Latest expense records</p>
              </div>
            </div>
            <DataTable columns={expenseColumns} data={expenseRows} keyExtractor={(r) => r.id} />
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-header" style={{ marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 className="chart-card-title">Quick Links</h3>
            <p className="chart-card-subtitle">Navigate to key areas</p>
          </div>
        </div>
        <div className="quick-link-grid">
          {auth.hasPermission('vehicle_view') && (
            <Link to="/vehicles" className="quick-link-card">
              <strong>Vehicles</strong>
              <span>Manage vehicle master data</span>
            </Link>
          )}
          {auth.hasPermission('trip_view') && (
            <Link to="/trips" className="quick-link-card">
              <strong>Trips</strong>
              <span>Manage trips and transfers</span>
            </Link>
          )}
          {auth.hasPermission('fuel_view') && (
            <Link to="/fuel" className="quick-link-card">
              <strong>Fuel</strong>
              <span>Fuel entry workflow</span>
            </Link>
          )}
          {auth.hasPermission('expense_view') && (
            <Link to="/expenses" className="quick-link-card">
              <strong>Expenses</strong>
              <span>Expense workflow</span>
            </Link>
          )}
          {auth.hasPermission('vehicle_compliance_view') && (
            <Link to="/compliance" className="quick-link-card">
              <strong>Compliance</strong>
              <span>Vehicle compliance dashboard</span>
            </Link>
          )}
          {auth.hasPermission('finance_view') && (
            <Link to="/finance" className="quick-link-card">
              <strong>Finance</strong>
              <span>Finance management</span>
            </Link>
          )}
        </div>
      </div>
    </PageShell>
  );
}
