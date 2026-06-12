import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createTrip,
  getTrip,
  updateTrip,
  scheduleTrip,
  startTrip,
  completeTrip,
  cancelTrip,
  getTripHistory,
  getDrivers,
  getVehicles,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { TripRecord, TripHistoryRecord, VehicleRecord, DriverRecord } from '../types/auth';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

type TripForm = {
  tripType: string;
  vehicleId: string;
  driverId: string;
  assistantDriverId: string;
  originName: string;
  originAddress: string;
  destinationName: string;
  destinationAddress: string;
  plannedStartAt: string;
  plannedEndAt: string;
  purpose: string;
  notes: string;
  startOdometer: string;
  endOdometer: string;
  distanceKm: string;
};

const initialForm: TripForm = {
  tripType: 'TRANSFER',
  vehicleId: '',
  driverId: '',
  assistantDriverId: '',
  originName: '',
  originAddress: '',
  destinationName: '',
  destinationAddress: '',
  plannedStartAt: '',
  plannedEndAt: '',
  purpose: '',
  notes: '',
  startOdometer: '',
  endOdometer: '',
  distanceKm: '',
};

type SectionTab = 'overview' | 'route' | 'assignment' | 'odometer' | 'history';

const sectionTabs: { key: SectionTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'route', label: 'Route' },
  { key: 'assignment', label: 'Assignment' },
  { key: 'odometer', label: 'Odometer' },
  { key: 'history', label: 'History' },
];

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  STARTED: 'Started',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TripDetailPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const auth = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [form, setForm] = useState<TripForm>(initialForm);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionTab>('overview');
  const [history, setHistory] = useState<TripHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (isNew || !id) return;

    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getTrip(auth.accessToken, id);
        const t = response.data;
        setTrip(t);
        setForm({
          tripType: t.tripType,
          vehicleId: t.vehicleId,
          driverId: t.driverId ?? '',
          assistantDriverId: t.assistantDriverId ?? '',
          originName: t.originName,
          originAddress: t.originAddress ?? '',
          destinationName: t.destinationName,
          destinationAddress: t.destinationAddress ?? '',
          plannedStartAt: toDatetimeLocal(t.plannedStartAt),
          plannedEndAt: toDatetimeLocal(t.plannedEndAt),
          purpose: t.purpose ?? '',
          notes: t.notes ?? '',
          startOdometer: t.startOdometer?.toString() ?? '',
          endOdometer: t.endOdometer?.toString() ?? '',
          distanceKm: t.distanceKm?.toString() ?? '',
        });
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setError(caughtError.message);
        else setError('Failed to load trip.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [auth.accessToken, id, isNew]);

  useEffect(() => {
    const loadDropdowns = async () => {
      if (!auth.accessToken) return;
      try {
        const [vRes, dRes] = await Promise.all([
          getVehicles(auth.accessToken, { status: 'AVAILABLE', limit: 100 }),
          getDrivers(auth.accessToken, { status: 'AVAILABLE', limit: 100 }),
        ]);
        setVehicles(vRes.data.items);
        setDrivers(dRes.data.items);
      } catch {
        // Dropdowns are non-critical
      }
    };
    void loadDropdowns();
  }, [auth.accessToken]);

  useEffect(() => {
    if (activeSection === 'history' && trip && !isNew) {
      const loadHistory = async () => {
        if (!auth.accessToken || !id) return;
        setHistoryLoading(true);
        try {
          const response = await getTripHistory(auth.accessToken, id);
          setHistory(response.data);
        } catch {
          // History load is non-critical
        } finally {
          setHistoryLoading(false);
        }
      };
      void loadHistory();
    }
  }, [activeSection, trip, isNew, auth.accessToken, id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload: Record<string, unknown> = {
        tripType: form.tripType,
        vehicleId: form.vehicleId,
        originName: form.originName,
        destinationName: form.destinationName,
      };

      if (form.driverId) payload.driverId = form.driverId;
      if (form.assistantDriverId) payload.assistantDriverId = form.assistantDriverId;
      if (form.originAddress) payload.originAddress = form.originAddress;
      if (form.destinationAddress) payload.destinationAddress = form.destinationAddress;
      if (form.plannedStartAt) payload.plannedStartAt = new Date(form.plannedStartAt).toISOString();
      if (form.plannedEndAt) payload.plannedEndAt = new Date(form.plannedEndAt).toISOString();
      if (form.purpose) payload.purpose = form.purpose;
      if (form.notes) payload.notes = form.notes;

      if (activeSection === 'odometer' && !isNew) {
        if (form.startOdometer) payload.startOdometer = parseInt(form.startOdometer);
        if (form.endOdometer) payload.endOdometer = parseInt(form.endOdometer);
        if (form.distanceKm) payload.distanceKm = parseInt(form.distanceKm);
      }

      let response;
      if (isNew) {
        response = await createTrip(auth.accessToken, payload as any);
        setMessage('Trip created successfully.');
        navigate(`/trips/${response.data.id}`, { replace: true });
      } else if (id) {
        response = await updateTrip(auth.accessToken, id, payload as any);
        setTrip(response.data);
        setMessage('Trip updated successfully.');
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to save trip.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSchedule() {
    if (!auth.accessToken || !id || isNew) return;
    setIsSaving(true);
    setError(null);
    setShowConfirm(null);
    try {
      const response = await scheduleTrip(auth.accessToken, id, {
        plannedStartAt: form.plannedStartAt ? new Date(form.plannedStartAt).toISOString() : undefined,
        plannedEndAt: form.plannedEndAt ? new Date(form.plannedEndAt).toISOString() : undefined,
        driverId: form.driverId || undefined,
        assistantDriverId: form.assistantDriverId || undefined,
      });
      setTrip(response.data);
      setMessage('Trip scheduled successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to schedule trip.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStart() {
    if (!auth.accessToken || !id || isNew) return;
    setIsSaving(true);
    setError(null);
    setShowConfirm(null);
    try {
      const response = await startTrip(auth.accessToken, id, {
        startOdometer: form.startOdometer ? parseInt(form.startOdometer) : undefined,
      });
      setTrip(response.data);
      setMessage('Trip started successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to start trip.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleComplete() {
    if (!auth.accessToken || !id || isNew) return;
    setIsSaving(true);
    setError(null);
    setShowConfirm(null);
    try {
      const response = await completeTrip(auth.accessToken, id, {
        endOdometer: form.endOdometer ? parseInt(form.endOdometer) : undefined,
        distanceKm: form.distanceKm ? parseInt(form.distanceKm) : undefined,
      });
      setTrip(response.data);
      setMessage('Trip completed successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to complete trip.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCancel() {
    if (!auth.accessToken || !id || isNew) return;
    setIsSaving(true);
    setError(null);
    setShowConfirm(null);
    try {
      const response = await cancelTrip(auth.accessToken, id, {
        notes: form.notes || undefined,
      });
      setTrip(response.data);
      setMessage('Trip cancelled successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to cancel trip.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingState message="Loading trip..." />;
  if (error && !trip && !isNew) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const canEdit = auth.hasPermission('trip_update') || auth.hasPermission('trip_create');
  const canStart = auth.hasPermission('trip_start') || auth.hasPermission('trip_create');
  const canEnd = auth.hasPermission('trip_end') || auth.hasPermission('trip_create');
  const canCancel = auth.hasPermission('trip_cancel') || auth.hasPermission('trip_create');

  const status = trip?.status ?? 'DRAFT';
  const isEditable = status === 'DRAFT' || status === 'SCHEDULED';
  const canSchedule = isEditable && canEdit && status === 'DRAFT';
  const canStartTrip = (status === 'DRAFT' || status === 'SCHEDULED') && canStart;
  const canCompleteTrip = status === 'STARTED' && canEnd;
  const canCancelTrip = status !== 'COMPLETED' && status !== 'CANCELLED' && canCancel;

  return (
    <section className="form-page-full">
      <div className="section-header">
        <div>
          <a href="/trips" className="eyebrow" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '0.25rem' }}>Back to Trips</a>
          <PageHeader
            title={isNew ? 'Create Trip' : trip ? trip.tripNumber : 'Trip'}
            description={isNew ? 'Create a new trip or transfer' : undefined}
          />
        </div>
        <div className="action-panel">
          {!isNew && trip ? <StatusBadge status={trip.status} /> : null}

          {canSchedule && !isNew && (
            <button
              type="button"
              className="secondary-button"
              disabled={isSaving}
              onClick={() => setShowConfirm('schedule')}
            >
              Schedule
            </button>
          )}

          {canStartTrip && !isNew && (
            <button
              type="button"
              className="primary-button"
              disabled={isSaving}
              onClick={() => setShowConfirm('start')}
            >
              Start Trip
            </button>
          )}

          {canCompleteTrip && !isNew && (
            <button
              type="button"
              className="primary-button"
              disabled={isSaving}
              onClick={() => setShowConfirm('complete')}
            >
              Complete Trip
            </button>
          )}

          {canCancelTrip && !isNew && (
            <button
              type="button"
              className="danger-button"
              disabled={isSaving}
              onClick={() => setShowConfirm('cancel')}
            >
              Cancel
            </button>
          )}

          {canEdit && (isNew || isEditable) && (
            <button type="submit" form="trip-form" className="secondary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : isNew ? 'Create Trip' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="success-banner">{message}</div> : null}

      {!isNew ? (
        <div className="detail-tabs">
          {sectionTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`detail-tab${activeSection === tab.key ? ' detail-tab-active' : ''}`}
              onClick={() => setActiveSection(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {showConfirm && (
        <div className="modal-backdrop" onClick={() => setShowConfirm(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ width: 'min(100%, 420px)' }}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm {statusLabels[showConfirm.charAt(0).toUpperCase() + showConfirm.slice(1)] ?? showConfirm}</h3>
              <button type="button" className="ghost-button" onClick={() => setShowConfirm(null)}>Cancel</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                {showConfirm === 'start' && 'This will mark the vehicle and driver as ON_TRIP. Continue?'}
                {showConfirm === 'complete' && 'This will release the vehicle and driver back to AVAILABLE. Continue?'}
                {showConfirm === 'cancel' && 'This will cancel the trip. If started, the vehicle and driver will be released. Continue?'}
                {showConfirm === 'schedule' && 'This will move the trip to Scheduled status. Continue?'}
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setShowConfirm(null)}>No</button>
              <button
                type="button"
                className={showConfirm === 'cancel' ? 'danger-button' : 'primary-button'}
                disabled={isSaving}
                onClick={() => {
                  if (showConfirm === 'start') void handleStart();
                  else if (showConfirm === 'complete') void handleComplete();
                  else if (showConfirm === 'cancel') void handleCancel();
                  else if (showConfirm === 'schedule') void handleSchedule();
                }}
              >
                {isSaving ? 'Processing...' : 'Yes, Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <form id="trip-form" className="form-main" onSubmit={handleSubmit}>
        {(isNew || activeSection === 'overview') && (
          <div className="card form-section-grid">
            <h4 style={{ margin: 0 }}>Trip Overview</h4>
            <div className="form-two-column">
              <label>
                <span className="field-label">Trip Type *</span>
                <select
                  value={form.tripType}
                  onChange={(e) => setForm((f) => ({ ...f, tripType: e.target.value }))}
                  disabled={!isNew && !isEditable}
                >
                  <option value="TRANSFER">Transfer</option>
                  <option value="DELIVERY">Delivery</option>
                  <option value="PICKUP">Pickup</option>
                  <option value="SERVICE">Service</option>
                  <option value="INTERNAL">Internal</option>
                </select>
              </label>
              <label>
                <span className="field-label">Vehicle *</span>
                {isNew ? (
                  <select
                    value={form.vehicleId}
                    onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
                    required
                  >
                    <option value="">Select vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleType})</option>
                    ))}
                  </select>
                ) : (
                  <input value={trip?.vehicle.vehicleNumber ?? ''} disabled />
                )}
              </label>
            </div>
            <label>
              <span className="field-label">Purpose</span>
              <input
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                placeholder="Optional purpose description"
                disabled={!isNew && !isEditable}
              />
            </label>
            <label>
              <span className="field-label">Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Additional notes"
                disabled={!isNew && status === 'COMPLETED'}
              />
            </label>
          </div>
        )}

        {!isNew && activeSection === 'route' && (
          <div className="card form-section-grid">
            <h4 style={{ margin: 0 }}>Route Details</h4>
            <div className="form-two-column">
              <label>
                <span className="field-label">Origin Name *</span>
                <input
                  value={form.originName}
                  onChange={(e) => setForm((f) => ({ ...f, originName: e.target.value }))}
                  required
                  disabled={!isEditable}
                />
              </label>
              <label>
                <span className="field-label">Destination Name *</span>
                <input
                  value={form.destinationName}
                  onChange={(e) => setForm((f) => ({ ...f, destinationName: e.target.value }))}
                  required
                  disabled={!isEditable}
                />
              </label>
            </div>
            <div className="form-two-column">
              <label>
                <span className="field-label">Origin Address</span>
                <input
                  value={form.originAddress}
                  onChange={(e) => setForm((f) => ({ ...f, originAddress: e.target.value }))}
                  disabled={!isEditable}
                />
              </label>
              <label>
                <span className="field-label">Destination Address</span>
                <input
                  value={form.destinationAddress}
                  onChange={(e) => setForm((f) => ({ ...f, destinationAddress: e.target.value }))}
                  disabled={!isEditable}
                />
              </label>
            </div>
            <div className="form-two-column">
              <label>
                <span className="field-label">Planned Start</span>
                <input
                  type="datetime-local"
                  value={form.plannedStartAt}
                  onChange={(e) => setForm((f) => ({ ...f, plannedStartAt: e.target.value }))}
                  disabled={!isEditable}
                />
              </label>
              <label>
                <span className="field-label">Planned End</span>
                <input
                  type="datetime-local"
                  value={form.plannedEndAt}
                  onChange={(e) => setForm((f) => ({ ...f, plannedEndAt: e.target.value }))}
                  disabled={!isEditable}
                />
              </label>
            </div>
            {trip?.actualStartAt && (
              <div className="form-two-column">
                <div>
                  <p className="detail-label">Actual Start</p>
                  <p className="detail-value">{new Date(trip.actualStartAt).toLocaleString()}</p>
                </div>
                {trip.actualEndAt && (
                  <div>
                    <p className="detail-label">Actual End</p>
                    <p className="detail-value">{new Date(trip.actualEndAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!isNew && activeSection === 'assignment' && (
          <div className="card form-section-grid">
            <h4 style={{ margin: 0 }}>Driver Assignment</h4>
            <div className="form-two-column">
              <label>
                <span className="field-label">Driver</span>
                <select
                  value={form.driverId}
                  onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}
                  disabled={!isEditable}
                >
                  <option value="">No driver assigned</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.mobile})</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">Assistant Driver</span>
                <select
                  value={form.assistantDriverId}
                  onChange={(e) => setForm((f) => ({ ...f, assistantDriverId: e.target.value }))}
                  disabled={!isEditable}
                >
                  <option value="">No assistant assigned</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.mobile})</option>
                  ))}
                </select>
              </label>
            </div>
            {trip?.driver && (
              <div className="form-two-column" style={{ marginTop: '0.5rem' }}>
                <div>
                  <p className="detail-label">Current Driver Status</p>
                  <StatusBadge status={trip.driver.status} />
                </div>
                {trip.assistantDriver && (
                  <div>
                    <p className="detail-label">Assistant Driver Status</p>
                    <StatusBadge status={trip.assistantDriver.status} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!isNew && activeSection === 'odometer' && (
          <div className="card form-section-grid">
            <h4 style={{ margin: 0 }}>Odometer & Distance</h4>
            <div className="form-three-column">
              <label>
                <span className="field-label">Start Odometer (km)</span>
                <input
                  type="number"
                  min={0}
                  value={form.startOdometer}
                  onChange={(e) => setForm((f) => ({ ...f, startOdometer: e.target.value }))}
                  disabled={status === 'COMPLETED' || status === 'CANCELLED'}
                  placeholder={status === 'STARTED' ? 'Enter at start' : trip?.startOdometer?.toString() ?? ''}
                />
              </label>
              <label>
                <span className="field-label">End Odometer (km)</span>
                <input
                  type="number"
                  min={0}
                  value={form.endOdometer}
                  onChange={(e) => setForm((f) => ({ ...f, endOdometer: e.target.value }))}
                  disabled={status !== 'STARTED'}
                  placeholder={status === 'STARTED' ? 'Enter at completion' : trip?.endOdometer?.toString() ?? ''}
                />
              </label>
              <label>
                <span className="field-label">Distance (km)</span>
                <input
                  type="number"
                  min={0}
                  value={form.distanceKm}
                  onChange={(e) => setForm((f) => ({ ...f, distanceKm: e.target.value }))}
                  disabled={status !== 'STARTED'}
                  placeholder={trip?.distanceKm?.toString() ?? 'Auto-calculated'}
                />
              </label>
            </div>
          </div>
        )}

        {!isNew && activeSection === 'history' && (
          <div className="card form-section-grid">
            <h4 style={{ margin: 0 }}>Trip History</h4>
            {historyLoading ? (
              <p className="helper-text">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="helper-text">No history records found.</p>
            ) : (
              <div className="data-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Action</th>
                      <th>From Status</th>
                      <th>To Status</th>
                      <th>Remarks</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td>{new Date(h.createdAt).toLocaleString()}</td>
                        <td><span className="permission-badge">{h.action}</span></td>
                        <td>{h.fromStatus ? statusLabels[h.fromStatus] ?? h.fromStatus : '-'}</td>
                        <td>{h.toStatus ? statusLabels[h.toStatus] ?? h.toStatus : '-'}</td>
                        <td>{h.remarks ?? '-'}</td>
                        <td>{h.createdBy?.name ?? h.createdBy?.username ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {isNew && (
          <div className="card form-section-grid">
            <h4 style={{ margin: 0 }}>Route</h4>
            <div className="form-two-column">
              <label>
                <span className="field-label">Origin Name *</span>
                <input
                  value={form.originName}
                  onChange={(e) => setForm((f) => ({ ...f, originName: e.target.value }))}
                  required
                />
              </label>
              <label>
                <span className="field-label">Destination Name *</span>
                <input
                  value={form.destinationName}
                  onChange={(e) => setForm((f) => ({ ...f, destinationName: e.target.value }))}
                  required
                />
              </label>
            </div>
            <div className="form-two-column">
              <label>
                <span className="field-label">Origin Address</span>
                <input
                  value={form.originAddress}
                  onChange={(e) => setForm((f) => ({ ...f, originAddress: e.target.value }))}
                />
              </label>
              <label>
                <span className="field-label">Destination Address</span>
                <input
                  value={form.destinationAddress}
                  onChange={(e) => setForm((f) => ({ ...f, destinationAddress: e.target.value }))}
                />
              </label>
            </div>
            <div className="form-two-column">
              <label>
                <span className="field-label">Planned Start</span>
                <input
                  type="datetime-local"
                  value={form.plannedStartAt}
                  onChange={(e) => setForm((f) => ({ ...f, plannedStartAt: e.target.value }))}
                />
              </label>
              <label>
                <span className="field-label">Planned End</span>
                <input
                  type="datetime-local"
                  value={form.plannedEndAt}
                  onChange={(e) => setForm((f) => ({ ...f, plannedEndAt: e.target.value }))}
                />
              </label>
            </div>
          </div>
        )}

        {isNew && (
          <div className="card form-section-grid">
            <h4 style={{ margin: 0 }}>Driver Assignment (Optional)</h4>
            <div className="form-two-column">
              <label>
                <span className="field-label">Driver</span>
                <select
                  value={form.driverId}
                  onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}
                >
                  <option value="">No driver assigned</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.mobile})</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">Assistant Driver</span>
                <select
                  value={form.assistantDriverId}
                  onChange={(e) => setForm((f) => ({ ...f, assistantDriverId: e.target.value }))}
                >
                  <option value="">No assistant assigned</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.mobile})</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        {isNew && (
          <div className="action-panel" style={{ marginTop: '0.5rem' }}>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Trip'}
            </button>
            <button type="button" className="secondary-button" onClick={() => navigate('/trips')}>
              Cancel
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
