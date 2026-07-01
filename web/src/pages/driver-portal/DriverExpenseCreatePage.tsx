import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createDriverExpense, getMyDriverVehicles, getMyDriverTrips } from '../../services/api';
import type { DriverPortalVehicle, DriverPortalTrip } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';

const EXPENSE_CATEGORIES = ['Toll', 'Parking', 'Food', 'Loading/Unloading', 'Bribes', 'Maintenance', 'Other'];

export function DriverExpenseCreatePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<DriverPortalVehicle[]>([]);
  const [trips, setTrips] = useState<DriverPortalTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    vehicleId: '',
    tripId: '',
    category: '',
    amount: '',
    notes: '',
    expenseDate: '',
  });

  useEffect(() => {
    if (!auth.accessToken) return;
    getMyDriverVehicles(auth.accessToken).then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setVehicles(list);
      if (list.length === 1) setForm((f) => ({ ...f, vehicleId: list[0].id }));
    });
    getMyDriverTrips(auth.accessToken, { page: 1, limit: 50 }).then((res) => {
      setTrips(res.data?.items || []);
    });
  }, [auth.accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await createDriverExpense(auth.accessToken, {
        vehicleId: form.vehicleId,
        category: form.category,
        amount: Number(form.amount),
        tripId: form.tripId || undefined,
        expenseDate: form.expenseDate || undefined,
        notes: form.notes || undefined,
      });
      navigate('/driver-portal/expenses');
    } catch (err: any) {
      setError(err.message || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-content">
      <PageHeader eyebrow="Driver Portal" title="Expense Claim" description="Submit an expense claim." />
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
          <label>Category *</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
            <option value="">Select category</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Amount (INR) *</label>
          <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 500" required />
        </div>

        <div className="form-group">
          <label>Trip (optional)</label>
          <select value={form.tripId} onChange={(e) => setForm({ ...form, tripId: e.target.value })}>
            <option value="">No trip</option>
            {trips.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').map((t) => (
              <option key={t.id} value={t.id}>{t.tripNumber} — {t.originName} → {t.destinationName}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Date</label>
          <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
        </div>

        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Optional notes" />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Claim'}
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate('/driver-portal/expenses')}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
