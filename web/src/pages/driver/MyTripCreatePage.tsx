import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyVehicle, createMyTrip } from '../../services/api';
import type { VehicleRecord } from '../../types/auth';
import { ApiError } from '../../types/api';
import { PageShell } from '../../components/ui/PageShell';

export function MyTripCreatePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ tripType: 'TRANSFER', originName: '', destinationName: '', plannedStartAt: '', notes: '' });
  const [vehicle, setVehicle] = useState<VehicleRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.accessToken) return;
    getMyVehicle(auth.accessToken).then((res) => setVehicle(res.data)).catch(() => {});
  }, [auth.accessToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload: Parameters<typeof createMyTrip>[1] = {
        tripType: form.tripType,
        originName: form.originName,
        destinationName: form.destinationName,
        notes: form.notes || undefined,
      };
      if (form.plannedStartAt) payload.plannedStartAt = new Date(form.plannedStartAt).toISOString();
      if (vehicle) payload.vehicleId = vehicle.id;
      const res = await createMyTrip(auth.accessToken, payload);
      setMessage(`Trip ${res.data.tripNumber} created.`);
      setTimeout(() => navigate('/my-trips'), 1500);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to create trip.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageShell>
      <div style={{ maxWidth: '500px' }}>
        <h2 style={{ margin: '0 0 var(--space-4)' }}>Create Trip</h2>
        {vehicle && (
          <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)' }}>
            <strong>Assigned Vehicle:</strong> {vehicle.vehicleNumber} ({vehicle.vehicleType})
          </div>
        )}
        {error && <div className="error-banner">{error}</div>}
        {message && <div className="success-banner">{message}</div>}
        <form onSubmit={handleSubmit} className="stack-form">
          <label><span className="field-label">Trip Type</span>
            <select value={form.tripType} onChange={(e) => setForm({ ...form, tripType: e.target.value })} required>
              <option value="TRANSFER">Transfer</option><option value="DELIVERY">Delivery</option>
              <option value="PICKUP">Pickup</option><option value="SERVICE">Service</option>
            </select>
          </label>
          <label><span className="field-label">Origin</span>
            <input value={form.originName} onChange={(e) => setForm({ ...form, originName: e.target.value })} required placeholder="Starting point" />
          </label>
          <label><span className="field-label">Destination</span>
            <input value={form.destinationName} onChange={(e) => setForm({ ...form, destinationName: e.target.value })} required placeholder="End point" />
          </label>
          <label><span className="field-label">Planned Start</span>
            <input type="datetime-local" value={form.plannedStartAt} onChange={(e) => setForm({ ...form, plannedStartAt: e.target.value })} />
          </label>
          <label><span className="field-label">Notes</span>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </label>
          <div className="button-row">
            <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Trip'}</button>
            <button type="button" className="secondary-button" onClick={() => navigate('/my-trips')}>Cancel</button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
