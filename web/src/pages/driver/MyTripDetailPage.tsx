import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyTrip, startMyTrip, endMyTrip, cancelMyTrip } from '../../services/api';
import type { TripRecord } from '../../types/auth';
import { ApiError } from '../../types/api';
import { PageShell } from '../../components/ui/PageShell';
import { StatusPill } from '../../components/ui/StatusPill';

export function MyTripDetailPage() {
  const { id } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.accessToken || !id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getMyTrip(auth.accessToken, id);
      setTrip(res.data);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to load trip.');
    } finally {
      setIsLoading(false);
    }
  }, [auth.accessToken, id]);

  useEffect(() => { void load(); }, [load]);

  async function handleAction(action: 'start' | 'end' | 'cancel') {
    if (!auth.accessToken || !id) return;
    try {
      if (action === 'start') await startMyTrip(auth.accessToken, id);
      else if (action === 'end') await endMyTrip(auth.accessToken, id);
      else await cancelMyTrip(auth.accessToken, id);
      setMessage(`Trip ${action === 'end' ? 'completed' : action === 'start' ? 'started' : 'cancelled'}.`);
      setTimeout(() => load(), 800);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError(`Failed to ${action} trip.`);
    }
  }

  if (isLoading) return <div className="centered-state">Loading trip...</div>;
  if (error && !trip) return <div className="centered-state"><p>{error}</p></div>;

  const canStart = trip && (trip.status === 'DRAFT' || trip.status === 'SCHEDULED') && auth.hasPermission('driver_trip_start');
  const canEnd = trip && trip.status === 'STARTED' && auth.hasPermission('driver_trip_end');
  const canCancel = trip && ['DRAFT', 'SCHEDULED', 'STARTED'].includes(trip.status) && auth.hasPermission('driver_trip_cancel');
  const canUploadPOD = auth.hasPermission('driver_pod_upload');
  const canUploadDoc = auth.hasAnyPermission(['driver_trip_document_upload', 'driver_lr_upload', 'driver_challan_upload']);

  return (
    <PageShell>
      <div style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div>
            <a href="/my-trips" style={{ fontSize: '0.9rem', color: 'var(--color-primary)' }}>← Back to Trips</a>
            <h2 style={{ margin: 'var(--space-2) 0 0' }}>{trip?.tripNumber}</h2>
          </div>
          {trip && <StatusPill status={trip.status} />}
        </div>
        {message && <div className="success-banner">{message}</div>}
        {error && <div className="error-banner">{error}</div>}
        {trip && (
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="detail-grid">
              <div><p className="detail-label">Type</p><p className="detail-value">{trip.tripType}</p></div>
              <div><p className="detail-label">Origin</p><p className="detail-value">{trip.originName}</p></div>
              <div><p className="detail-label">Destination</p><p className="detail-value">{trip.destinationName}</p></div>
              <div><p className="detail-label">Vehicle</p><p className="detail-value">{trip.vehicle.vehicleNumber}</p></div>
              {trip.actualStartAt && <div><p className="detail-label">Started</p><p className="detail-value">{new Date(trip.actualStartAt).toLocaleString('en-IN')}</p></div>}
              {trip.actualEndAt && <div><p className="detail-label">Completed</p><p className="detail-value">{new Date(trip.actualEndAt).toLocaleString('en-IN')}</p></div>}
              {trip.notes && <div style={{ gridColumn: '1 / -1' }}><p className="detail-label">Notes</p><p className="detail-value">{trip.notes}</p></div>}
            </div>
          </div>
        )}
        <div className="card">
          <h3 style={{ margin: '0 0 var(--space-3)' }}>Actions</h3>
          <div className="button-row wrap-row">
            {canStart && <button className="primary-button" onClick={() => handleAction('start')}>Start Trip</button>}
            {canEnd && <button className="primary-button" onClick={() => handleAction('end')}>End Trip</button>}
            {canCancel && <button className="danger-button" onClick={() => handleAction('cancel')}>Cancel Trip</button>}
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
