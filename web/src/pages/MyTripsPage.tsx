import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyTrips, startMyTrip, endMyTrip, cancelMyTrip } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { TripRecord, PaginatedResponse } from '../types/auth';
import { ApiError } from '../types/api';
import { PageShell } from '../components/ui/PageShell';
import { PageHeader } from '../components/PageHeader';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { StatusPill } from '../components/ui/StatusPill';

export function MyTripsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse<TripRecord> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getMyTrips(auth.accessToken, { status: statusFilter || undefined, page, limit: 20 });
      setData(res.data);
    } catch {
      setError('Failed to load trips.');
    } finally {
      setIsLoading(false);
    }
  }, [auth.accessToken, page, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  async function handleTripAction(tripId: string, action: 'start' | 'end' | 'cancel') {
    if (!auth.accessToken) return;
    setActionLoading(tripId);
    try {
      if (action === 'start') await startMyTrip(auth.accessToken, tripId);
      else if (action === 'end') await endMyTrip(auth.accessToken, tripId);
      else await cancelMyTrip(auth.accessToken, tripId);
      void load();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
    } finally { setActionLoading(null); }
  }

  if (isLoading) return <PageShell><LoadingSkeleton rows={5} columns={6} /></PageShell>;
  if (error) return <PageShell><EmptyState title="Error" message={error} /></PageShell>;

  return (
    <PageShell>
      <PageHeader title="My Trips" description="View your trip history and active trips" />
      <div className="card">
        <div className="table-toolbar">
          <div className="table-toolbar-actions">
            {auth.hasPermission('driver_trip_create') && (
              <button className="primary-button" onClick={() => navigate('/my-trips/new')}>Create Trip</button>
            )}
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ marginLeft: 'var(--space-2)' }}>
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="STARTED">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
        {data && data.items.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="doc-table doc-table-compact">
              <thead><tr>
                <th>Trip</th><th>Route</th><th>Status</th><th>Vehicle</th><th>Date</th><th>Actions</th>
              </tr></thead>
              <tbody>{data.items.map((row) => (
                <tr key={row.id}>
                  <td><Link to={`/my-trips/${row.id}`}>{row.tripNumber}</Link></td>
                  <td>{row.originName} → {row.destinationName}</td>
                  <td><StatusPill status={row.status} /></td>
                  <td>{row.vehicle?.vehicleNumber ?? '—'}</td>
                  <td>{new Date(row.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div className="button-row" style={{ gap: '4px', flexWrap: 'wrap' }}>
                      {row.status === 'DRAFT' && auth.hasPermission('driver_trip_start') && (
                        <button className="primary-button" style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                          disabled={actionLoading === row.id} onClick={() => handleTripAction(row.id, 'start')}>Start</button>
                      )}
                      {row.status === 'STARTED' && auth.hasPermission('driver_trip_end') && (
                        <button className="primary-button" style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                          disabled={actionLoading === row.id} onClick={() => handleTripAction(row.id, 'end')}>End</button>
                      )}
                      {['DRAFT', 'SCHEDULED', 'STARTED'].includes(row.status) && auth.hasPermission('driver_trip_cancel') && (
                        <button className="danger-button" style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                          disabled={actionLoading === row.id} onClick={() => handleTripAction(row.id, 'cancel')}>Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No trips found" message="You don't have any trips yet." />
        )}
        {data && data.pagination.totalPages > 1 && (
          <div className="pagination-controls" style={{ marginTop: 'var(--space-3)' }}>
            <button type="button" className="secondary-button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
            <span>Page {data.pagination.page} of {data.pagination.totalPages}</span>
            <button type="button" className="secondary-button" onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))} disabled={page === data.pagination.totalPages}>Next</button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
