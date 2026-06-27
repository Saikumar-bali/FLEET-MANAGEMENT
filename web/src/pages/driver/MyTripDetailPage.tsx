import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyTrips } from '../../services/api';
import type { TripRecord } from '../../types/auth';
import { PageShell } from '../../components/ui/PageShell';
import { StatusPill } from '../../components/ui/StatusPill';

export function MyTripDetailPage() {
  const { id } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.accessToken || !id) return;
    setIsLoading(true);
    try {
      const res = await getMyTrips(auth.accessToken, { page: 1, limit: 100 });
      const found = res.data.items.find((t) => t.id === id);
      setTrip(found ?? null);
      if (!found) setError('Trip not found.');
    } catch {
      setError('Failed to load trip.');
    } finally {
      setIsLoading(false);
    }
  }, [auth.accessToken, id]);

  useEffect(() => { void load(); }, [load]);

  if (isLoading) return <div className="centered-state">Loading trip...</div>;
  if (error || !trip) return <div className="centered-state"><p>{error || 'Trip not found.'}</p></div>;

  const canStart = trip.status === 'SCHEDULED' && auth.hasPermission('driver_trip_start');
  const canEnd = trip.status === 'STARTED' && auth.hasPermission('driver_trip_end');
  const canCancel = (trip.status === 'DRAFT' || trip.status === 'SCHEDULED') && auth.hasPermission('driver_trip_cancel');
  const canUploadPOD = auth.hasPermission('driver_pod_upload');
  const canUploadDoc = auth.hasAnyPermission(['driver_trip_document_upload', 'driver_lr_upload', 'driver_challan_upload']);

  return (
    <PageShell>
      <div style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div>
            <a href="/my-trips" style={{ fontSize: '0.9rem', color: 'var(--color-primary)' }}>← Back to Trips</a>
            <h2 style={{ margin: 'var(--space-2) 0 0' }}>{trip.tripNumber}</h2>
          </div>
          <StatusPill status={trip.status} />
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="detail-grid">
            <div><p className="detail-label">Type</p><p className="detail-value">{trip.tripType}</p></div>
            <div><p className="detail-label">Origin</p><p className="detail-value">{trip.originName}</p></div>
            <div><p className="detail-label">Destination</p><p className="detail-value">{trip.destinationName}</p></div>
            <div><p className="detail-label">Vehicle</p><p className="detail-value">{trip.vehicle.vehicleNumber}</p></div>
            {trip.actualStartAt && <div><p className="detail-label">Started</p><p className="detail-value">{new Date(trip.actualStartAt).toLocaleString()}</p></div>}
            {trip.actualEndAt && <div><p className="detail-label">Completed</p><p className="detail-value">{new Date(trip.actualEndAt).toLocaleString()}</p></div>}
            {trip.notes && <div style={{ gridColumn: '1 / -1' }}><p className="detail-label">Notes</p><p className="detail-value">{trip.notes}</p></div>}
          </div>
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 var(--space-3)' }}>Actions</h3>
          <div className="button-row wrap-row">
            {canStart && <button className="primary-button" onClick={() => alert('Start Trip - backend endpoint needed')}>Start Trip</button>}
            {canEnd && <button className="primary-button" onClick={() => alert('End Trip - backend endpoint needed')}>End Trip</button>}
            {canCancel && <button className="danger-button" onClick={() => alert('Cancel Trip - backend endpoint needed')}>Cancel Trip</button>}
            {canUploadPOD && <button className="secondary-button" onClick={() => navigate('/my-trips/upload-pod')}>Upload POD</button>}
            {canUploadDoc && <button className="secondary-button" onClick={() => navigate('/my-trips/upload-document')}>Upload Document</button>}
            {auth.hasPermission('driver_quick_fuel_create') && <button className="secondary-button" onClick={() => navigate('/my-fuel/new')}>Add Fuel</button>}
            {auth.hasPermission('driver_expense_create') && <button className="secondary-button" onClick={() => navigate('/my-expenses/new')}>Add Expense</button>}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
