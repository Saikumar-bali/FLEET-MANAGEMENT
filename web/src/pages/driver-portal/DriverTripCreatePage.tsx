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
  const [loading, setLoading] = useState(false);
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
    getMyDriverVehicles(auth.accessToken).then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setVehicles(list);
      if (list.length === 1) setForm((f) => ({ ...f, vehicleId: list[0].id }));
    });
  }, [auth.accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.accessToken) return;
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <section className="page-content">
      <PageHeader eyebrow="Driver Portal" title="Create Trip" description="Create a new trip." />
      <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div className="form-group">
          <label>Vehicle *</label>
          <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} required>
            <option value="">Select vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleType})</option>
            ))}
          </select>
        </div>

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

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Creating...' : 'Create Trip'}
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate('/driver-portal/trips')}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
