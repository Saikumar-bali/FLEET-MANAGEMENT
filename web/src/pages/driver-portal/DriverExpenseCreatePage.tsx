import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createDriverExpense, getMyDriverVehicles, getMyDriverTrips, uploadDriverExpenseReceipt } from '../../services/api';
import type { DriverPortalVehicle, DriverPortalTrip } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';

const EXPENSE_CATEGORIES = ['Toll', 'Parking', 'Food', 'Loading/Unloading', 'Maintenance', 'Permit/RTO', 'Emergency', 'Other'];
const BLOCKED_EXTENSIONS = new Set(['exe', 'bat', 'cmd', 'msi', 'js', 'ps1', 'sh', 'apk']);

function extension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function isImage(file: File | null) {
  return !!file && file.type.startsWith('image/') && extension(file.name) !== 'svg';
}

export function DriverExpenseCreatePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [vehicles, setVehicles] = useState<DriverPortalVehicle[]>([]);
  const [trips, setTrips] = useState<DriverPortalTrip[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ vehicleId: '', tripId: '', category: '', amount: '', expenseDate: '', paymentSource: 'STAFF_WALLET', notes: '' });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  useEffect(() => {
    if (!auth.accessToken) return;
    setVehiclesLoading(true);
    getMyDriverVehicles(auth.accessToken).then((res) => {
      const list = res.data.vehicles || (Array.isArray(res.data) ? res.data : []);
      setVehicles(list);
      const preferred = list.find((vehicle) => vehicle.isCurrent) || list[0];
      if (preferred) setForm((f) => ({ ...f, vehicleId: preferred.id }));
    }).finally(() => setVehiclesLoading(false));
    getMyDriverTrips(auth.accessToken, { page: 1, limit: 50 }).then((res) => setTrips(res.data?.items || []));
  }, [auth.accessToken]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = extension(file.name);
    if (!ext || BLOCKED_EXTENSIONS.has(ext)) {
      setError(`.${ext || 'unknown'} files are not allowed for receipts.`);
      return;
    }
    setReceiptFile(file);
    setReceiptPreview(isImage(file) ? URL.createObjectURL(file) : null);
  }

  async function handleUploadReceipt() {
    if (!auth.accessToken || !receiptFile) return;
    setIsUploadingReceipt(true);
    setError(null);
    try {
      await uploadDriverExpenseReceipt(auth.accessToken, receiptFile, { vehicleId: form.vehicleId, tripId: form.tripId });
      setReceiptFile(null);
      setReceiptPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
        paymentSource: form.paymentSource,
        notes: form.notes || undefined,
      });
      navigate('/driver-portal/expenses');
    } catch (err: any) {
      setError(err.message || 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  const currentVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const activeTrips = trips.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');

  return (
    <section className="page-content">
      <PageHeader eyebrow="Driver Portal" title="New Expense Claim" description="Submit tolls, parking, food, loading, repairs, and other trip expenses for your own visible vehicles." />
      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {!vehicles.length && !vehiclesLoading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: 720 }}>
          <h3 style={{ margin: '0 0 0.5rem' }}>No vehicle access found</h3>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Ask your admin to assign a vehicle or give your driver account scoped vehicle access.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '1rem', alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 1rem' }}>Expense Details</h3>
              <div className="form-two-column">
                <label className="form-group">
                  <span>Vehicle *</span>
                  <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} required>
                    <option value="">Select vehicle</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber} — {v.vehicleType}{v.isCurrent ? ' · Current' : ''}</option>)}
                  </select>
                </label>
                <label className="form-group">
                  <span>Category *</span>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                    <option value="">Select category</option>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="form-group">
                  <span>Amount (INR) *</span>
                  <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 500" required />
                </label>
                <label className="form-group">
                  <span>Date</span>
                  <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
                </label>
              </div>
              <label className="form-group">
                <span>Trip link</span>
                <select value={form.tripId} onChange={(e) => setForm({ ...form, tripId: e.target.value })}>
                  <option value="">No trip / general expense</option>
                  {activeTrips.map((t) => <option key={t.id} value={t.id}>{t.tripNumber} — {t.originName} → {t.destinationName}</option>)}
                </select>
              </label>
              <label className="form-group">
                <span>Paid using *</span>
                <select value={form.paymentSource} onChange={(e) => setForm({ ...form, paymentSource: e.target.value })}>
                  <option value="STAFF_WALLET">Trip allowance / staff wallet</option>
                  <option value="PERSONAL_MONEY">My personal money — reimburse me</option>
                  <option value="COMPANY_ACCOUNT">Company paid directly</option>
                  <option value="CORPORATE_CARD">Corporate card</option>
                  <option value="VENDOR_CREDIT">Vendor credit</option>
                </select>
                <small className="helper-text">Wallet-paid claims require a trip and are deducted only after approval.</small>
              </label>
              <label className="form-group">
                <span>Notes</span>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} placeholder="Add location, vendor, reason, or approval context" />
              </label>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.35rem' }}>Receipt Attachment</h3>
              <p className="helper-text" style={{ marginTop: 0 }}>Upload image, AVIF, PDF, document, or sheet receipt. Scripts/executables are blocked.</p>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ marginBottom: '0.75rem' }} />
              {receiptPreview ? <img src={receiptPreview} alt="Receipt preview" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 12, background: 'var(--color-bg-surface-subtle)' }} /> : null}
              {receiptFile && !receiptPreview ? <div className="card" style={{ padding: '0.85rem', marginBottom: '0.75rem' }}>{/* lgtm[js/dom-text-reinterpreted-as-html] React JSX auto-escapes text content */ receiptFile.name}</div> : null}
              {receiptFile && <button type="button" className="secondary-button" onClick={handleUploadReceipt} disabled={isUploadingReceipt || !form.vehicleId}>{isUploadingReceipt ? 'Uploading...' : 'Upload Receipt'}</button>}
            </div>
          </div>

          <aside className="card" style={{ padding: '1.25rem', position: 'sticky', top: 96 }}>
            <h3 style={{ marginTop: 0 }}>Claim Summary</h3>
            <p className="helper-text">Vehicle</p>
            <strong>{currentVehicle ? `${currentVehicle.vehicleNumber} · ${currentVehicle.vehicleType}` : 'Not selected'}</strong>
            <p className="helper-text">Amount</p>
            <strong>₹{Number(form.amount || 0).toLocaleString('en-IN')}</strong>
            <p className="helper-text">Receipt</p>
            <strong>{receiptFile ? receiptFile.name : 'Not attached'}</strong>
            <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="submit" className="primary-button" disabled={submitting || !form.vehicleId || !form.category || !form.amount || (form.paymentSource === 'STAFF_WALLET' && !form.tripId)}>{submitting ? 'Submitting...' : 'Submit Claim'}</button>
              <button type="button" className="secondary-button" onClick={() => navigate('/driver-portal/expenses')}>Cancel</button>
            </div>
          </aside>
        </form>
      )}
    </section>
  );
}
