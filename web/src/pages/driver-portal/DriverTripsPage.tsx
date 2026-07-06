import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getMyDriverTrips, cancelDriverTrip } from '../../services/api';
import { uploadTripPod } from '../../services/podBilling';
import { confirmDriverTripAssignment, declineDriverTripAssignment, endAssignedDriverTrip, startAssignedDriverTrip } from '../../services/driverAssignments';
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

function actionSuccessMessage(action: string) {
  switch (action) {
    case 'confirm': return 'Trip assignment confirmed.';
    case 'decline': return 'Trip assignment declined.';
    case 'start': return 'Trip started.';
    case 'end': return 'Trip completed.';
    case 'cancel': return 'Trip cancelled.';
    default: return 'Trip updated.';
  }
}

export function DriverTripsPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<DriverPortalTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [podTrip, setPodTrip] = useState<DriverPortalTrip | null>(null);
  const [podFile, setPodFile] = useState<File | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [receiverMobile, setReceiverMobile] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

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
      .catch((e) => {
        const msg = e.message || 'Failed to load trips';
        setError(msg);
        showToast(msg, 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTrips(page); }, [auth.accessToken, page]);

  const handleAction = async (action: string, tripId: string) => {
    if (!auth.accessToken) return;
    setActionLoading(`${tripId}:${action}`);
    setError(null);
    setSuccess(null);
    try {
      if (action === 'confirm') await confirmDriverTripAssignment(auth.accessToken, tripId);
      else if (action === 'decline') await declineDriverTripAssignment(auth.accessToken, tripId);
      else if (action === 'start') await startAssignedDriverTrip(auth.accessToken, tripId);
      else if (action === 'end') await endAssignedDriverTrip(auth.accessToken, tripId);
      else if (action === 'cancel') await cancelDriverTrip(auth.accessToken, tripId);
      const msg = actionSuccessMessage(action);
      setSuccess(msg);
      showToast(msg, 'success');
      loadTrips(page);
    } catch (e: any) {
      const msg = e.message || `Failed to ${action} trip`;
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openPodUpload = (trip: DriverPortalTrip) => {
    setPodTrip(trip);
    setPodFile(null);
    setReceiverName('');
    setReceiverMobile('');
    setDeliveryNotes('');
    setError(null);
    setSuccess(null);
  };

  const submitPodUpload = async () => {
    if (!auth.accessToken || !podTrip || !podFile) return;
    setActionLoading(`${podTrip.id}:pod`);
    setError(null);
    setSuccess(null);
    try {
      await uploadTripPod(auth.accessToken, podTrip.id, {
        file: podFile,
        receiverName,
        receiverMobile,
        deliveryNotes,
      });
      const msg = `POD uploaded for ${podTrip.tripNumber}. It is now waiting for verification.`;
      setSuccess(msg);
      showToast(msg, 'success');
      setPodTrip(null);
      setPodFile(null);
      loadTrips(page);
    } catch (e: any) {
      const msg = e.message || 'Failed to upload POD';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const canStart = permissions.includes('driver_trip_start');
  const canEnd = permissions.includes('driver_trip_end');
  const canCancel = permissions.includes('driver_trip_cancel');
  const canCreate = permissions.includes('driver_trip_create');
  const canUploadPod = permissions.includes('driver_pod_upload');

  if (loading && trips.length === 0) return <LoadingState message="Loading your trips..." />;
  if (error && trips.length === 0) return <ErrorState message={error} onRetry={() => loadTrips(page)} />;

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Driver Portal"
        title="My Trips"
        description="Trips assigned to you. Complete the trip, then upload POD so billing can start."
        actions={canCreate ? <button type="button" className="primary-button" onClick={() => navigate('/driver-portal/trips/create')}>Create Trip</button> : undefined}
      />

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

      {podTrip && (
        <div className="state-panel" style={{ marginBottom: '1rem', alignItems: 'stretch' }}>
          <div>
            <h3>Upload POD for {podTrip.tripNumber}</h3>
            <p>Attach delivery photo, signed LR, challan, or customer acknowledgement. Finance billing starts only after verification.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '.75rem', marginTop: '.75rem' }}>
            <label className="form-field">
              Receiver name
              <input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Customer/site receiver" />
            </label>
            <label className="form-field">
              Receiver mobile
              <input value={receiverMobile} onChange={(e) => setReceiverMobile(e.target.value)} placeholder="Optional mobile" />
            </label>
            <label className="form-field" style={{ gridColumn: '1 / -1' }}>
              Delivery notes
              <input value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="Delivered in good condition, unload complete, etc." />
            </label>
            <label className="form-field" style={{ gridColumn: '1 / -1' }}>
              POD file
              <input type="file" accept="image/*,.pdf" onChange={(e) => setPodFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem', flexWrap: 'wrap' }}>
            <button type="button" className="primary-button" disabled={!podFile || actionLoading === `${podTrip.id}:pod`} onClick={submitPodUpload}>
              {actionLoading === `${podTrip.id}:pod` ? 'Uploading...' : 'Submit POD'}
            </button>
            <button type="button" className="secondary-button" onClick={() => setPodTrip(null)}>Cancel</button>
          </div>
        </div>
      )}

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
                {trips.map((trip) => {
                  const busy = actionLoading?.startsWith(`${trip.id}:`);
                  return (
                    <tr key={trip.id}>
                      <td>{trip.tripNumber}</td>
                      <td>{trip.tripType}</td>
                      <td>{trip.originName} → {trip.destinationName}</td>
                      <td>{trip.vehicle.vehicleNumber}</td>
                      <td><span className={tripStatusClass(trip.status)}>{trip.status}</span></td>
                      <td>{trip.distanceKm ? `${trip.distanceKm} km` : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {canStart && trip.status === 'SCHEDULED' && (
                            <button type="button" className="primary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} disabled={busy} onClick={() => handleAction('confirm', trip.id)}>
                              Confirm
                            </button>
                          )}
                          {canCancel && trip.status === 'SCHEDULED' && (
                            <button type="button" className="secondary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} disabled={busy} onClick={() => handleAction('decline', trip.id)}>
                              Decline
                            </button>
                          )}
                          {canStart && (trip.status === 'DRAFT' || trip.status === 'SCHEDULED') && (
                            <button type="button" className="primary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} disabled={busy} onClick={() => handleAction('start', trip.id)}>
                              {busy ? '...' : 'Start'}
                            </button>
                          )}
                          {canEnd && trip.status === 'STARTED' && (
                            <button type="button" className="primary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} disabled={busy} onClick={() => handleAction('end', trip.id)}>
                              {busy ? '...' : 'End'}
                            </button>
                          )}
                          {canUploadPod && trip.status === 'COMPLETED' && (
                            <button type="button" className="primary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} disabled={busy} onClick={() => openPodUpload(trip)}>
                              Upload POD
                            </button>
                          )}
                          {canCancel && trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED' && (
                            <button type="button" className="secondary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} disabled={busy} onClick={() => handleAction('cancel', trip.id)}>
                              {busy ? '...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
