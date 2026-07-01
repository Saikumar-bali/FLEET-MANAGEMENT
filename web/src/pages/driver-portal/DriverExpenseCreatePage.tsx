import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createDriverExpense, getMyDriverVehicles, getMyDriverTrips, uploadDriverExpenseReceipt } from '../../services/api';
import type { DriverPortalVehicle, DriverPortalTrip } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';

const EXPENSE_CATEGORIES = ['Toll', 'Parking', 'Food', 'Loading/Unloading', 'Bribes', 'Maintenance', 'Other'];

export function DriverExpenseCreatePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [vehicles, setVehicles] = useState<DriverPortalVehicle[]>([]);
  const [trips, setTrips] = useState<DriverPortalTrip[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    vehicleId: '',
    tripId: '',
    category: '',
    amount: '',
    expenseDate: '',
    notes: '',
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  useEffect(() => {
    if (!auth.accessToken) return;
    setVehiclesLoading(true);
    getMyDriverVehicles(auth.accessToken).then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setVehicles(list);
      if (list.length === 1) setForm((f) => ({ ...f, vehicleId: list[0].id }));
    }).finally(() => setVehiclesLoading(false));
    getMyDriverTrips(auth.accessToken, { page: 1, limit: 50 }).then((res) => {
      setTrips(res.data?.items || []);
    });
  }, [auth.accessToken]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  async function handleUploadReceipt() {
    if (!auth.accessToken || !receiptFile) return;
    setIsUploadingReceipt(true);
    setError(null);
    try {
      await uploadDriverExpenseReceipt(auth.accessToken, receiptFile, {
        vehicleId: form.vehicleId,
        tripId: form.tripId,
      });
      setReceiptFile(null);
      setReceiptPreview(null);
    } catch (err: any) {
      setError(err.message || 'Failed to upload receipt');
    } finally {
      setIsUploadingReceipt(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.accessToken) return;
    setSubmitting(true);
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
      setSubmitting(false);
    }
  };

  const hasVehicles = vehicles.length > 0;
  const currentVehicle = vehicles.find(v => v.isCurrent);

  return (
    <section className="page-content">
      <PageHeader eyebrow="Driver Portal" title="Expense Claim" description="Submit an expense claim." />

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {!hasVehicles && !vehiclesLoading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 0.5rem' }}>No vehicle assigned</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            No vehicle is assigned to your driver profile. Ask your admin to assign a vehicle before submitting expenses.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
          {currentVehicle && (
            <div className="card" style={{ padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              Current vehicle: <strong>{currentVehicle.vehicleNumber}</strong> ({currentVehicle.vehicleType})
            </div>
          )}

          <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Vehicle *</label>
              <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} required>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleType}){v.isCurrent ? ' — Current' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
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
              <input type="number" step="0.01" min="0" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="e.g. 500" required />
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
          </div>

          {/* Receipt Photo Upload */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>Receipt Photo (optional)</h4>
            <input type="file" ref={fileInputRef} accept="image/*,.pdf" onChange={handleFileSelect} style={{ marginBottom: '0.75rem' }} />
            {receiptPreview && (
              <div style={{ marginBottom: '0.75rem' }}>
                <img src={receiptPreview} alt="Receipt preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} />
              </div>
            )}
            {receiptFile && (
              <button type="button" className="secondary-button" onClick={handleUploadReceipt} disabled={isUploadingReceipt}>
                {isUploadingReceipt ? 'Uploading...' : 'Upload Receipt'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="primary-button" disabled={submitting || !form.vehicleId || !form.category || !form.amount}>
              {submitting ? 'Submitting...' : 'Submit Claim'}
            </button>
            <button type="button" className="secondary-button" onClick={() => navigate('/driver-portal/expenses')}>Cancel</button>
          </div>
        </form>
      )}
    </section>
  );
}
