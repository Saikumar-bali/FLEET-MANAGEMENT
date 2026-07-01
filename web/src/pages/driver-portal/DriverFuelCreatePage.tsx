import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createDriverFuel, getMyDriverVehicles } from '../../services/api';
import type { DriverPortalVehicle } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';

export function DriverFuelCreatePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<DriverPortalVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    vehicleId: '',
    totalAmount: '',
    quantityLiters: '',
    fuelDate: '',
    odometerReading: '',
    stationName: '',
    paymentMode: '',
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

  const calculatedPricePerLiter = form.totalAmount && form.quantityLiters
    ? (Number(form.totalAmount) / Number(form.quantityLiters)).toFixed(2)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await createDriverFuel(auth.accessToken, {
        vehicleId: form.vehicleId,
        totalAmount: Number(form.totalAmount),
        quantityLiters: form.quantityLiters ? Number(form.quantityLiters) : undefined,
        fuelDate: form.fuelDate || undefined,
        odometerReading: form.odometerReading ? Number(form.odometerReading) : undefined,
        stationName: form.stationName || undefined,
        paymentMode: form.paymentMode || undefined,
        notes: form.notes || undefined,
      });
      navigate('/driver-portal/fuel');
    } catch (err: any) {
      setError(err.message || 'Failed to create fuel entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-content">
      <PageHeader eyebrow="Driver Portal" title="Quick Fuel Entry" description="Log fuel for your vehicle." />
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
          <label>Amount (INR) *</label>
          <input type="number" step="0.01" min="0" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} placeholder="e.g. 2500" required />
        </div>

        <div className="form-group">
          <label>Liters (optional)</label>
          <input type="number" step="0.01" min="0" value={form.quantityLiters} onChange={(e) => setForm({ ...form, quantityLiters: e.target.value })} placeholder="e.g. 50" />
          {calculatedPricePerLiter && (
            <small style={{ color: 'var(--color-text-secondary)' }}>Calculated: ₹{calculatedPricePerLiter}/L</small>
          )}
        </div>

        <div className="form-group">
          <label>Date</label>
          <input type="date" value={form.fuelDate} onChange={(e) => setForm({ ...form, fuelDate: e.target.value })} />
        </div>

        <div className="form-group">
          <label>Odometer (optional)</label>
          <input type="number" min="0" value={form.odometerReading} onChange={(e) => setForm({ ...form, odometerReading: e.target.value })} placeholder="e.g. 45000" />
        </div>

        <div className="form-group">
          <label>Fuel Station (optional)</label>
          <input type="text" value={form.stationName} onChange={(e) => setForm({ ...form, stationName: e.target.value })} placeholder="e.g. HP Petrol Pump" />
        </div>

        <div className="form-group">
          <label>Payment Mode (optional)</label>
          <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
            <option value="">Select</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="UPI">UPI</option>
            <option value="CREDIT">Credit</option>
          </select>
        </div>

        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional notes" />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Saving...' : 'Save Entry'}
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate('/driver-portal/fuel')}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
