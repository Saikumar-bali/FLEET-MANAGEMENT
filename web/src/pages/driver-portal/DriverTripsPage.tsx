import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyDriverTrips, startDriverTrip, endDriverTrip, cancelDriverTrip } from '../../services/api';
import type { DriverPortalTrip } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

function tripStatusClass(status: string) {
  switch (status) {
    case 'COMPLETED': return 'status-pill status-pill-success';
    case 'STARTED': return 'status-pill status-pill-info';
    case 'CANCELLED': return 'status-pill status-pill-danger';
    case 'SCHEDULED': return 'status-pill status-pill-warning';
    default: return 'status-pill status-pill-default';
  }
}

export function DriverTripsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<DriverPortalTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.accessToken) return;
    const p = auth.permissions || [];
    setPermissions(p);
  }, [auth.accessToken, auth.permissions]);

  const loadTrips = (p: number) => {
    if (!auth.accessToken) return;
    setLoading(true);
    getMyDriverTrips(auth.accessToken, { page: p, limit: 20 })
      .then((res) => {
        setTrips(res.data?.items || []);
        setTotalPages(res.data?.totalPages || 1);
      })
      .catch((e) => setError(e.message || 'Failed to load trips'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTrips(page); }, [auth.accessToken, page]);

  const handleAction = async (action: string, tripId: string) => {
    if (!auth.accessToken) return;
    setActionLoading(tripId);
    try {
      if (action === 'start') await startDriverTrip(auth.accessToken, tripId);
      else if (action === 'end') await endDriverTrip(auth.accessToken, tripId);
      else if (action === 'cancel') await cancelDriverTrip(auth.accessToken, tripId);
      loadTrips(page);
    } catch (e: any) {
      setError(e.message || `Failed to ${action} trip`);
    } finally {
      setActionLoading(null);
    }
  };

  const canStart = permissions.includes('driver_trip_start');
  const canEnd = permissions.includes('driver_trip_end');
  const canCancel = permissions.includes('driver_trip_cancel');
  const canCreate = permissions.includes('driver_trip_create');

  if (loading && trips.length === 0) return <LoadingState message="Loading your trips..." />;
  if (error && trips.length === 0) return <ErrorState message={error} onRetry={() => loadTrips(page)} />;

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Driver Portal"
        title="My Trips"
        description="Trips assigned to you."
        actions={canCreate ? <button type="button" className="primary-button" onClick={() => navigate('/driver-portal/trips/create')}>Create Trip</button> : undefined}
      />

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {trips.length === 0 ? (
        <div className="state-panel">
          <div>
            <h3>No trips found</h3>
            <p>You have no trips assigned yet.</p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Trip #</th>
                  <th>Type</th>
                  <th>Route</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Distance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr key={trip.id}>
                    <td>{trip.tripNumber}</td>
                    <td>{trip.tripType}</td>
                    <td>{trip.originName} → {trip.destinationName}</td>
                    <td>{trip.vehicle.vehicleNumber}</td>
                    <td><span className={tripStatusClass(trip.status)}>{trip.status}</span></td>
                    <td>{trip.distanceKm ? `${trip.distanceKm} km` : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {canStart && (trip.status === 'DRAFT' || trip.status === 'SCHEDULED') && (
                          <button type="button" className="primary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            disabled={actionLoading === trip.id}
                            onClick={() => handleAction('start', trip.id)}>
                            {actionLoading === trip.id ? '...' : 'Start'}
                          </button>
                        )}
                        {canEnd && trip.status === 'STARTED' && (
                          <button type="button" className="primary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            disabled={actionLoading === trip.id}
                            onClick={() => handleAction('end', trip.id)}>
                            {actionLoading === trip.id ? '...' : 'End'}
                          </button>
                        )}
                        {canCancel && trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED' && (
                          <button type="button" className="secondary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            disabled={actionLoading === trip.id}
                            onClick={() => handleAction('cancel', trip.id)}>
                            {actionLoading === trip.id ? '...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </td>
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
