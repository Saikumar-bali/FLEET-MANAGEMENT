import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getDashboardOverview } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { DashboardOverview } from '../types/auth';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

function formatCurrency(value: number) {
  return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN');
}

export function DashboardPage() {
  const auth = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await getDashboardOverview(auth.accessToken);
        setData(res.data);
      } catch {
        setError('Failed to load dashboard data.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken]);

  if (isLoading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Workspace"
        title="Fleet Dashboard"
        description="Real-time fleet operations overview."
      />

      {data ? (
        <>
          <div className="dashboard-grid-sections">
            <article className="card">
              <div className="table-toolbar">
                <div>
                  <h3 className="table-toolbar-title">Fleet Health</h3>
                  <p className="table-toolbar-copy">Vehicles, drivers, and compliance status</p>
                </div>
              </div>
              <div className="metric-grid">
                <div className="metric-item">
                  <span className="metric-label">Total Vehicles</span>
                  <span className="metric-value">{data.totalVehicles}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Active</span>
                  <span className="metric-value" style={{ color: '#059669' }}>{data.activeVehicles}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Inactive</span>
                  <span className="metric-value" style={{ color: data.inactiveVehicles > 0 ? '#dc2626' : undefined }}>{data.inactiveVehicles}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Drivers</span>
                  <span className="metric-value">{data.driversCount}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Active Trips</span>
                  <span className="metric-value" style={{ color: '#059669' }}>{data.activeTrips}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Completed (MTD)</span>
                  <span className="metric-value">{data.completedTripsThisMonth}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Pending Trips</span>
                  <span className="metric-value" style={{ color: data.pendingTrips > 0 ? '#f59e0b' : undefined }}>{data.pendingTrips}</span>
                </div>
              </div>
            </article>

            <article className="card">
              <div className="table-toolbar">
                <div>
                  <h3 className="table-toolbar-title">Financial (MTD)</h3>
                  <p className="table-toolbar-copy">Fuel and expense costs this month</p>
                </div>
              </div>
              <div className="metric-grid">
                <div className="metric-item">
                  <span className="metric-label">Fuel Cost</span>
                  <span className="metric-value" style={{ color: '#dc2626' }}>{formatCurrency(Number(data.fuelCostThisMonth))}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Expenses</span>
                  <span className="metric-value" style={{ color: '#dc2626' }}>{formatCurrency(Number(data.expensesThisMonth))}</span>
                </div>
              </div>
            </article>

            <article className="card">
              <div className="table-toolbar">
                <div>
                  <h3 className="table-toolbar-title">Maintenance &amp; Repairs</h3>
                  <p className="table-toolbar-copy">Open work orders</p>
                </div>
              </div>
              <div className="metric-grid">
                <div className="metric-item">
                  <span className="metric-label">Open Maintenance</span>
                  <span className="metric-value" style={{ color: data.maintenanceOpen > 0 ? '#f59e0b' : undefined }}>{data.maintenanceOpen}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">In Progress Repairs</span>
                  <span className="metric-value" style={{ color: data.repairsOpen > 0 ? '#f59e0b' : undefined }}>{data.repairsOpen}</span>
                </div>
              </div>
            </article>

            <article className="card">
              <div className="table-toolbar">
                <div>
                  <h3 className="table-toolbar-title">Compliance Risk</h3>
                  <p className="table-toolbar-copy">Document expiry summary</p>
                </div>
              </div>
              <div className="metric-grid">
                <div className="metric-item">
                  <span className="metric-label">Expired</span>
                  <span className="metric-value" style={{ color: data.complianceExpired > 0 ? '#dc2626' : undefined }}>{data.complianceExpired}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Expiring in 7 Days</span>
                  <span className="metric-value" style={{ color: data.complianceExpiring7 > 0 ? '#fd7e14' : undefined }}>{data.complianceExpiring7}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Expiring in 30 Days</span>
                  <span className="metric-value" style={{ color: data.complianceExpiring30 > 0 ? '#f59e0b' : undefined }}>{data.complianceExpiring30}</span>
                </div>
              </div>
            </article>
          </div>

          <div className="dashboard-lower-grid">
            {data.recentTrips.length > 0 && (
              <article className="card table-card">
                <div className="table-toolbar">
                  <div>
                    <h3 className="table-toolbar-title">Recent Trips</h3>
                    <p className="table-toolbar-copy">Latest trip activity</p>
                  </div>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Route</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTrips.map((trip) => (
                      <tr key={trip.id}>
                        <td>{trip.tripType}</td>
                        <td>{trip.originName} &rarr; {trip.destinationName}</td>
                        <td><StatusBadge status={trip.status} /></td>
                        <td>{formatDate(trip.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            )}

            {data.recentFuel.length > 0 && (
              <article className="card table-card">
                <div className="table-toolbar">
                  <div>
                    <h3 className="table-toolbar-title">Recent Fuel Entries</h3>
                    <p className="table-toolbar-copy">Latest fuel records</p>
                  </div>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Qty (L)</th>
                      <th>Cost</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentFuel.map((f) => (
                      <tr key={f.id}>
                        <td>
                          <Link to={`/vehicles/${f.vehicleId}`} className="table-link">{f.vehicleId.slice(0, 8)}</Link>
                        </td>
                        <td>{Number(f.quantityLiters).toFixed(1)}</td>
                        <td>{formatCurrency(Number(f.totalAmount))}</td>
                        <td>{formatDate(f.fuelDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            )}

            {data.recentExpenses.length > 0 && (
              <article className="card table-card">
                <div className="table-toolbar">
                  <div>
                    <h3 className="table-toolbar-title">Recent Expenses</h3>
                    <p className="table-toolbar-copy">Latest expense records</p>
                  </div>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td>
                          <Link to={`/vehicles/${exp.vehicleId}`} className="table-link">{exp.vehicleId.slice(0, 8)}</Link>
                        </td>
                        <td>{exp.category}</td>
                        <td>{formatCurrency(Number(exp.amount))}</td>
                        <td>{formatDate(exp.expenseDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            )}
          </div>
        </>
      ) : null}

      <article className="card" style={{ marginTop: 24 }}>
        <div className="table-toolbar">
          <div>
            <h3 className="table-toolbar-title">Quick Links</h3>
            <p className="table-toolbar-copy">Jump to key areas</p>
          </div>
        </div>
        <div className="quick-link-grid">
          {auth.hasPermission('vehicle_view') ? (
            <Link className="quick-link-card" to="/vehicles">
              <strong>Vehicles</strong>
              <span>Manage vehicle master data</span>
            </Link>
          ) : null}
          {auth.hasPermission('trip_view') ? (
            <Link className="quick-link-card" to="/trips">
              <strong>Trips</strong>
              <span>Manage trips and transfers</span>
            </Link>
          ) : null}
          {auth.hasPermission('fuel_view') ? (
            <Link className="quick-link-card" to="/fuel">
              <strong>Fuel</strong>
              <span>Fuel entry workflow</span>
            </Link>
          ) : null}
          {auth.hasPermission('expense_view') ? (
            <Link className="quick-link-card" to="/expenses">
              <strong>Expenses</strong>
              <span>Expense workflow</span>
            </Link>
          ) : null}
          {auth.hasPermission('vehicle_compliance_view') ? (
            <Link className="quick-link-card" to="/compliance">
              <strong>Compliance</strong>
              <span>Vehicle compliance dashboard</span>
            </Link>
          ) : null}
          {auth.hasPermission('finance_view') ? (
            <Link className="quick-link-card" to="/finance">
              <strong>Finance</strong>
              <span>Finance management</span>
            </Link>
          ) : null}
        </div>
      </article>
    </section>
  );
}

