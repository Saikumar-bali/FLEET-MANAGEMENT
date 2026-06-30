import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyDriverTrips } from '../../services/api';
import type { DriverPortalTrip } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

export function DriverTripsPage() {
  const auth = useAuth();
  const [trips, setTrips] = useState<DriverPortalTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  if (loading && trips.length === 0) return <LoadingState message="Loading your trips..." />;
  if (error && trips.length === 0) return <ErrorState message={error} onRetry={() => loadTrips(page)} />;

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Driver Portal"
        title="My Trips"
        description="Trips assigned to you."
      />

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
                  <th>Start</th>
                  <th>End</th>
                  <th>Distance</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr key={trip.id}>
                    <td>{trip.tripNumber}</td>
                    <td>{trip.tripType}</td>
                    <td>{trip.originName} → {trip.destinationName}</td>
                    <td>{trip.vehicle.vehicleNumber}</td>
                    <td><span className="status-badge">{trip.status}</span></td>
                    <td>{trip.actualStartAt ? new Date(trip.actualStartAt).toLocaleDateString() : trip.plannedStartAt ? new Date(trip.plannedStartAt).toLocaleDateString() : '—'}</td>
                    <td>{trip.actualEndAt ? new Date(trip.actualEndAt).toLocaleDateString() : trip.plannedEndAt ? new Date(trip.plannedEndAt).toLocaleDateString() : '—'}</td>
                    <td>{trip.distanceKm ? `${trip.distanceKm} km` : '—'}</td>
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
