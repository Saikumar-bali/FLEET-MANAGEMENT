import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDriverDashboard } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { DriverDashboardData } from '../types/auth';
import { PageShell } from '../components/ui/PageShell';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { KpiGrid } from '../components/ui/KpiGrid';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { StatusPill } from '../components/ui/StatusPill';
import { ActionButton } from '../components/ui/ActionToolbar';
import { MapPinIcon, FuelIcon, ClockIcon } from '../components/ui/icons';
import { DRIVER_CAPABILITY_MAP } from '../config/driverCapabilities';

function formatCurrency(value: number) {
  if (!value || value === 0) return '₹0';
  return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function DriverDashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DriverDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getDriverDashboard(auth.accessToken);
      setData(res.data);
    } catch {
      setError('Failed to load driver dashboard.');
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

  if (!data) {
    return (
      <PageShell>
        <div className="empty-state-panel">
          <h3>No data available</h3>
          <p>Driver dashboard data could not be loaded.</p>
        </div>
      </PageShell>
    );
  }

  const { driver, currentVehicle, activeTrip, tripStats, fuelStatsThisMonth, recentFuelEntries, recentExpenses, driverDocuments, expiringDocuments, recentTrips } = data;

  const licenseExpiring = driver.licenseExpiry ? daysUntil(driver.licenseExpiry) : null;

  const capabilities = Object.entries(DRIVER_CAPABILITY_MAP)
    .filter(([perm]) => auth.hasPermission(perm))
    .map(([, label]) => label);

  const hasTripCreate = auth.hasPermission('driver_trip_create');
  const hasTripStart = auth.hasPermission('driver_trip_start');
  const hasTripEnd = auth.hasPermission('driver_trip_end');
  const hasFuelCreate = auth.hasPermission('driver_quick_fuel_create');
  const hasFuelReceipt = auth.hasPermission('driver_fuel_receipt_upload');
  const hasExpenseCreate = auth.hasPermission('driver_expense_create');
  const hasPodUpload = auth.hasPermission('driver_pod_upload');
  const hasInspection = auth.hasPermission('driver_vehicle_inspection_create');
  const hasIssueReport = auth.hasPermission('driver_vehicle_issue_report');

  const expenseStatsThisMonth = data.expenseStatsThisMonth ?? { count: recentExpenses.length, totalAmount: recentExpenses.reduce((sum, e) => sum + Number(e.amount), 0) };
  const documentStats = data.documentStats ?? { total: driverDocuments.length, pendingVerification: driverDocuments.filter((d) => d.verificationStatus === 'PENDING').length, expiringSoon: expiringDocuments.length, expired: driverDocuments.filter((d) => d.documentStatus === 'ARCHIVED').length };

  return (
    <PageShell>
      <PageHeader title="My Dashboard" />

      {!auth.user?.userDriverId ? (
        <div className="warning-banner" style={{ marginBottom: 'var(--space-4)' }}>
          <strong>Driver account not linked.</strong> Your login is not connected to a driver profile.
          Contact your administrator to set up account linking.
        </div>
      ) : null}

      {auth.user?.userDriverId && !currentVehicle ? (
        <div className="warning-banner" style={{ marginBottom: 'var(--space-4)' }}>
          <strong>No vehicle assigned.</strong> Ask admin to assign a vehicle in Driver Detail or Vehicle Detail.
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="section-header">
          <div>
            <h3 className="chart-card-title">{driver.name}</h3>
            <p className="chart-card-subtitle">
              Status: <StatusPill status={driver.status} />
              {currentVehicle && <span style={{ marginLeft: '12px' }}>Vehicle: <strong>{currentVehicle.vehicleNumber}</strong></span>}
            </p>
          </div>
          <div className="action-panel">
            {hasFuelCreate && <ActionButton label="Fuel Entry" variant="primary" onClick={() => navigate('/my-fuel/new')} />}
            {hasExpenseCreate && <ActionButton label="Add Expense" variant="secondary" onClick={() => navigate('/my-expenses/new')} />}
            <ActionButton label="My Trips" variant="ghost" onClick={() => navigate('/my-trips')} />
          </div>
        </div>
      </div>

      <KpiGrid columns={6}>
        <StatCard
          label="Active Trips"
          value={tripStats.active}
          variant={tripStats.active > 0 ? 'success' : 'muted'}
          icon={<MapPinIcon />}
        />
        <StatCard
          label="Completed (Month)"
          value={tripStats.completedThisMonth}
          variant="default"
          icon={<MapPinIcon />}
        />
        <StatCard
          label="Total Trips"
          value={tripStats.total}
          variant="default"
          icon={<MapPinIcon />}
        />
        <StatCard
          label="Fuel This Month"
          value={`${fuelStatsThisMonth.totalLiters.toFixed(1)}L`}
          subtext={formatCurrency(fuelStatsThisMonth.totalAmount)}
          variant="default"
          icon={<FuelIcon />}
        />
        <StatCard
          label="Fuel Entries"
          value={fuelStatsThisMonth.count}
          subtext="This month"
          variant="default"
          icon={<FuelIcon />}
        />
        <StatCard
          label="License Expiry"
          value={licenseExpiring !== null ? (licenseExpiring > 0 ? `${licenseExpiring}d` : 'Expired') : 'N/A'}
          subtext={driver.licenseExpiry ? formatDate(driver.licenseExpiry) : ''}
          variant={licenseExpiring !== null && licenseExpiring <= 30 ? 'warning' : 'muted'}
          icon={<ClockIcon />}
        />
      </KpiGrid>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <KpiGrid columns={4}>
        <StatCard
          label="Expense (Month)"
          value={formatCurrency(expenseStatsThisMonth.totalAmount)}
          subtext={`${expenseStatsThisMonth.count} entries`}
          variant="default"
        />
        <StatCard
          label="Documents"
          value={documentStats.total}
          subtext={`${documentStats.pendingVerification} pending, ${documentStats.expiringSoon} expiring`}
          variant={documentStats.expiringSoon > 0 ? 'warning' : 'muted'}
        />
        <StatCard
          label="Assigned Vehicle"
          value={currentVehicle ? currentVehicle.vehicleNumber : 'None'}
          variant={currentVehicle ? 'default' : 'muted'}
        />
        <StatCard
          label="Expenses This Month"
          value={expenseStatsThisMonth.count}
          subtext={formatCurrency(expenseStatsThisMonth.totalAmount)}
          variant="default"
        />
      </KpiGrid>
      </div>

      {activeTrip && (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Active Trip</h3>
              <p className="chart-card-subtitle">{activeTrip.tripNumber}</p>
            </div>
            <Link to={`/my-trips/${activeTrip.id}`} className="chart-card-link">View trip</Link>
          </div>
          <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
            <p><strong>Route:</strong> {activeTrip.originName} → {activeTrip.destinationName}</p>
            <p><strong>Vehicle:</strong> {activeTrip.vehicle.vehicleNumber}</p>
            {activeTrip.actualStartAt && <p><strong>Started:</strong> {formatDateTime(activeTrip.actualStartAt)}</p>}
          </div>
        </div>
      )}

      {capabilities.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">My Capabilities</h3>
              <p className="chart-card-subtitle">Your enabled driver actions ({capabilities.length})</p>
            </div>
            <div className="action-panel">
              <a href="/my-permissions" className="chart-card-link">View Details</a>
              <button type="button" className="ghost-button" onClick={() => auth.refreshCurrentUser()}>Refresh</button>
            </div>
          </div>
          <div style={{ padding: '0 var(--space-4) var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {capabilities.map((cap) => (
              <span key={cap} style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', background: 'var(--color-success-bg, #e8f5e9)', color: 'var(--color-success-text, #2e7d32)', border: '1px solid var(--color-success-border, #a5d6a7)' }}>{cap}</span>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="section-header">
          <div>
            <h3 className="chart-card-title">Quick Actions</h3>
            <p className="chart-card-subtitle">Common tasks</p>
          </div>
          <div className="action-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {hasTripCreate && <ActionButton label="Create Trip" variant="primary" onClick={() => navigate('/my-trips/new')} />}
            {hasTripStart && activeTrip && <ActionButton label="Start Trip" variant="primary" onClick={() => navigate(`/my-trips/${activeTrip.id}`)} />}
            {hasTripEnd && activeTrip && <ActionButton label="End Trip" variant="secondary" onClick={() => navigate(`/my-trips/${activeTrip.id}`)} />}
            {hasFuelCreate && <ActionButton label="Add Fuel" variant="secondary" onClick={() => navigate('/my-fuel/new')} />}
            {hasFuelReceipt && <ActionButton label="Upload Fuel Bill" variant="ghost" onClick={() => navigate('/my-fuel/upload-receipt')} />}
            {hasExpenseCreate && <ActionButton label="Create Expense" variant="ghost" onClick={() => navigate('/my-expenses/new')} />}
            {hasPodUpload && <ActionButton label="Upload POD" variant="ghost" onClick={() => navigate('/my-trips/upload-pod')} />}
            {hasInspection && <ActionButton label="Vehicle Inspection" variant="ghost" onClick={() => navigate('/my-vehicle/inspection')} />}
            {hasIssueReport && <ActionButton label="Report Issue" variant="ghost" onClick={() => navigate('/my-vehicle/report-issue')} />}
          </div>
        </div>
      </div>

      <div className="dashboard-chart-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {recentTrips.length > 0 && (
          <div className="dashboard-table-card">
            <div className="chart-card-header">
              <div>
                <h3 className="chart-card-title">Recent Trips</h3>
                <p className="chart-card-subtitle">Your trip history</p>
              </div>
              <Link to="/my-trips" className="chart-card-link">View all</Link>
            </div>
            <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
              <table className="doc-table doc-table-compact">
                <thead>
                  <tr>
                    <th>Trip</th>
                    <th>Route</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrips.slice(0, 5).map((trip) => (
                    <tr key={trip.id}>
                      <td><Link to={`/my-trips/${trip.id}`}>{trip.tripNumber}</Link></td>
                      <td>{trip.originName} → {trip.destinationName}</td>
                      <td><StatusPill status={trip.status} /></td>
                      <td>{formatDate(trip.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {recentFuelEntries.length > 0 && (
          <div className="dashboard-table-card">
            <div className="chart-card-header">
              <div>
                <h3 className="chart-card-title">Recent Fuel Entries</h3>
                <p className="chart-card-subtitle">Your fuel records</p>
              </div>
            </div>
            <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
              <table className="doc-table doc-table-compact">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Qty</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFuelEntries.slice(0, 5).map((fuel) => (
                    <tr key={fuel.id}>
                      <td>{fuel.vehicle?.vehicleNumber ?? '—'}</td>
                      <td>{fuel.quantityLiters ? `${fuel.quantityLiters}L` : '—'}</td>
                      <td>{formatCurrency(Number(fuel.totalAmount))}</td>
                      <td>{formatDate(fuel.fuelDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {recentExpenses.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-4)' }}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Recent Expenses</h3>
              <p className="chart-card-subtitle">Your expense records</p>
            </div>
          </div>
          <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
            <table className="doc-table doc-table-compact">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentExpenses.slice(0, 5).map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.vehicle?.vehicleNumber ?? '—'}</td>
                    <td>{expense.category}</td>
                    <td>{formatCurrency(Number(expense.amount))}</td>
                    <td>{formatDate(expense.expenseDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {driverDocuments.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-4)' }}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">My Documents</h3>
              <p className="chart-card-subtitle">{driverDocuments.length} documents</p>
            </div>
            <Link to="/my-documents" className="chart-card-link">View all</Link>
          </div>
          <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
            <table className="doc-table doc-table-compact">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {driverDocuments.slice(0, 5).map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.title}</td>
                    <td>{doc.documentType}</td>
                    <td><StatusPill status={doc.verificationStatus} /></td>
                    <td>{doc.expiryDate ? formatDate(doc.expiryDate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {expiringDocuments.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-4)' }}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Expiring Documents</h3>
              <p className="chart-card-subtitle">Documents expiring within 30 days</p>
            </div>
          </div>
          <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
            <table className="doc-table doc-table-compact">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Expiry</th>
                  <th>Days Left</th>
                </tr>
              </thead>
              <tbody>
                {expiringDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.title}</td>
                    <td>{doc.documentType}</td>
                    <td>{formatDate(doc.expiryDate!)}</td>
                    <td><span style={{ color: daysUntil(doc.expiryDate!) <= 7 ? 'var(--color-danger)' : 'var(--color-warning)' }}>{daysUntil(doc.expiryDate!)} days</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}
