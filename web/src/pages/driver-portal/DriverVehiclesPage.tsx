import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyDriverVehicles } from '../../services/api';
import type { DriverPortalVehicle } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { StatusBadge } from '../../components/StatusBadge';

export function DriverVehiclesPage() {
  const auth = useAuth();
  const [vehicles, setVehicles] = useState<DriverPortalVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.accessToken) return;
    setLoading(true);
    getMyDriverVehicles(auth.accessToken)
      .then((res) => setVehicles(res.data || []))
      .catch((e) => setError(e.message || 'Failed to load vehicles'))
      .finally(() => setLoading(false));
  }, [auth.accessToken]);

  if (loading) return <LoadingState message="Loading your vehicles..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Driver Portal"
        title="My Vehicles"
        description="Vehicles assigned or related to you."
      />

      {vehicles.length === 0 ? (
        <div className="state-panel">
          <div>
            <h3>No vehicles found</h3>
            <p>No vehicles are currently assigned to you.</p>
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Vehicle Number</th>
                <th>Type</th>
                <th>Brand</th>
                <th>Model</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td>{v.vehicleNumber}</td>
                  <td>{v.vehicleType}</td>
                  <td>{v.brand || '—'}</td>
                  <td>{v.model || '—'}</td>
                  <td><StatusBadge status={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
