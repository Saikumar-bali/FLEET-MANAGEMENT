import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createDriverTrip, getMyDriverVehicles } from '../../services/api';
import type { DriverPortalVehicle } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';

export function DriverTripCreatePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<DriverPortalVehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    vehicleId: '',
    originName: '',
    destinationName: '',
    tripType: 'DELIVERY',
    plannedStartAt: '',
    notes: '',
  });

  useEffect(() => {
    if (!auth.accessToken) return;
    setVehiclesLoading(true);
    getMyDriverVehicles(auth.accessToken).then((res) => {
      const list = res.data.vehicles || (Array.isArray(res.data) ? res.data : []);
      setVehicles(list);
      if (list.length === 1) {
        setForm((f) => ({ ...f, vehicleId: list[0].id }));
      }
    }).finally(() => setVehiclesLoading(false));
  }, [auth.accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.accessToken) return;
    setSubmitting(true);
    setError(null);
    try {
      await createDriverTrip(auth.accessToken, {
        vehicleId: form.vehicleId,
        originName: form.originName,
        destinationName: form.destinationName,
        tripType: form.tripType,
        plannedStartAt: form.plannedStartAt || undefined,
        notes: form.notes || undefined,
      });
      navigate('/driver-portal/trips');
    } catch (err: any) {
      setError(err.message || 'Failed to create trip');
    } finally {
      setSubmitting(false);
    }
  };

  const hasVehicles = vehicles.length > 0;
  const currentVehicle = vehicles.find(v => v.isCurrent);

  return (
    <section className="page-content">
      <PageHeader eyebrow="Driver Portal" title="Create Trip" description="Create a new trip." />

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {!hasVehicles && !vehiclesLoading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 0.5rem' }}>No vehicle assigned</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            No vehicle is assigned to your driver profile. Ask your admin to assign a vehicle before creating a trip.
          </p>
        </div>
      ) : vehiclesLoading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Loading vehicles...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            {currentVehicle && (
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                Current vehicle: <strong>{currentVehicle.vehicleNumber}</strong> ({currentVehicle.vehicleType})
              </div>
            )}
            <div className="form-group">
              <label>Vehicle *</label>
              <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} required>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber} ({v.vehicleType}){v.isCurrent ? ' — Current' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Origin *</label>
              <input type="text" value={form.originName} onChange={(e) => setForm({ ...form, originName: e.target.value })} placeholder="e.g. Mumbai Warehouse" required />
            </div>
            <div className="form-group">
              <label>Destination *</label>
              <input type="text" value={form.destinationName} onChange={(e) => setForm({ ...form, destinationName: e.target.value })} placeholder="e.g. Pune Distribution Center" required />
            </div>
            <div className="form-group">
              <label>Trip Type</label>
              <select value={form.tripType} onChange={(e) => setForm({ ...form, tripType: e.target.value })}>
                <option value="DELIVERY">Delivery</option>
                <option value="PICKUP">Pickup</option>
                <option value="TRANSFER">Transfer</option>
                <option value="SERVICE">Service</option>
              </select>
            </div>
            <div className="form-group">
              <label>Planned Start</label>
              <input type="datetime-local" value={form.plannedStartAt} onChange={(e) => setForm({ ...form, plannedStartAt: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Optional notes" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="primary-button" disabled={submitting || !form.vehicleId}>
              {submitting ? 'Creating...' : 'Create Trip'}
            </button>
            <button type="button" className="secondary-button" onClick={() => navigate('/driver-portal/trips')}>Cancel</button>
          </div>
        </form>
      )}
    </section>
  );
}
