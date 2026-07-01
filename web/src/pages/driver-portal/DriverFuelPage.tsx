import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyDriverFuel } from '../../services/api';
import type { DriverPortalFuelEntry } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

function formatCurrency(amount: number) {
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

export function DriverFuelPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<DriverPortalFuelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.accessToken) return;
    setPermissions(auth.permissions || []);
  }, [auth.accessToken, auth.permissions]);

  const loadData = (p: number) => {
    if (!auth.accessToken) return;
    setLoading(true);
    getMyDriverFuel(auth.accessToken, { page: p, limit: 20 })
      .then((res) => {
        setEntries(res.data?.items || []);
        setTotalPages(res.data?.totalPages || 1);
      })
      .catch((e) => setError(e.message || 'Failed to load fuel entries'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(page); }, [auth.accessToken, page]);

  const canCreate = permissions.includes('driver_quick_fuel_create');

  if (loading && entries.length === 0) return <LoadingState message="Loading fuel entries..." />;
  if (error && entries.length === 0) return <ErrorState message={error} onRetry={() => loadData(page)} />;

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Driver Portal"
        title="My Fuel Entries"
        description="Fuel entries logged for your trips."
        actions={canCreate ? <button type="button" className="primary-button" onClick={() => navigate('/driver-portal/fuel/create')}>Quick Fuel Entry</button> : undefined}
      />

      {entries.length === 0 ? (
        <div className="state-panel">
          <div>
            <h3>No fuel entries found</h3>
            <p>No fuel entries are recorded for your trips yet.</p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Fuel Type</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.fuelDate).toLocaleDateString()}</td>
                    <td>{entry.vehicle.vehicleNumber}</td>
                    <td>{entry.fuelType}</td>
                    <td>{entry.quantityLiters ? `${entry.quantityLiters} L` : '—'}</td>
                    <td>{formatCurrency(entry.totalAmount)}</td>
                    <td><span className="status-badge">{entry.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" className="secondary-button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span style={{ padding: '0.5rem 1rem' }}>Page {page} of {totalPages}</span>
              <button type="button" className="secondary-button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
