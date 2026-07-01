import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyDriverVehicles } from '../../services/api';
import type { DriverPortalVehicle } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

function vehicleStatusClass(status: string) {
  switch (status) {
    case 'AVAILABLE': return 'status-pill status-pill-success';
    case 'ON_TRIP': return 'status-pill status-pill-info';
    case 'IN_MAINTENANCE': return 'status-pill status-pill-warning';
    case 'OUT_OF_SERVICE': return 'status-pill status-pill-danger';
    default: return 'status-pill status-pill-default';
  }
}

export function DriverVehiclesPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<DriverPortalVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.accessToken) return;
    setPermissions(auth.permissions || []);
    getMyDriverVehicles(auth.accessToken)
      .then((res) => setVehicles(Array.isArray(res.data) ? res.data : []))
      .catch((e) => setError(e.message || 'Failed to load vehicles'))
      .finally(() => setLoading(false));
  }, [auth.accessToken]);

  if (loading) return <LoadingState message="Loading vehicles..." />;
  if (error) return <ErrorState message={error} onRetry={() => {}} />;

  const canReport = permissions.includes('driver_vehicle_issue_report');
  const canInspect = permissions.includes('driver_vehicle_inspection_create');

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Driver Portal"
        title="My Vehicles"
        description="Vehicles linked to your driver profile."
      />

      {(canReport || canInspect) && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {canReport && (
            <button type="button" className="secondary-button" onClick={() => navigate('/driver-portal/vehicles/issue')}>
              Report Issue
            </button>
          )}
          {canInspect && (
            <button type="button" className="secondary-button" onClick={() => navigate('/driver-portal/vehicles/inspect')}>
              Vehicle Inspection
            </button>
          )}
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="state-panel">
          <div>
            <h3>No vehicles found</h3>
            <p>No vehicles are linked to your driver profile.</p>
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Vehicle #</th>
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
                  <td><span className={vehicleStatusClass(v.status)}>{v.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
