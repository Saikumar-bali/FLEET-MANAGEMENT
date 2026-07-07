import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { uploadDriverDocument, getMyDriverVehicles, getMyDriverTrips } from '../../services/api';
import type { DriverPortalVehicle, DriverPortalTrip } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';

const DOC_TYPES = ['GENERAL', 'FUEL_BILL', 'EXPENSE_BILL', 'VEHICLE_RC', 'VEHICLE_INSURANCE', 'DRIVER_LICENSE', 'DRIVER_ID_PROOF', 'TRIP_POD', 'TRIP_LR', 'TRIP_CHALLAN', 'TRIP_EWAY_BILL', 'PAYMENT_PROOF'];
const DOC_CATEGORIES = ['TRIP', 'VEHICLE', 'DRIVER', 'COMPLIANCE', 'FINANCE', 'GENERAL'];

export function DriverDocumentUploadPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [vehicles, setVehicles] = useState<DriverPortalVehicle[]>([]);
  const [trips, setTrips] = useState<DriverPortalTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    documentType: 'GENERAL',
    documentCategory: 'TRIP',
    vehicleId: '',
    tripId: '',
    description: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.accessToken) return;
    getMyDriverVehicles(auth.accessToken).then((res) => {
      const list = res.data.vehicles || (Array.isArray(res.data) ? res.data : []);
      setVehicles(list);
      if (list.length === 1) setForm((f) => ({ ...f, vehicleId: list[0].id }));
    });
    getMyDriverTrips(auth.accessToken, { page: 1, limit: 50 }).then((res) => {
      setTrips(res.data?.items || []);
    });
  }, [auth.accessToken]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(f));
    } else {
      setFilePreview(null);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await uploadDriverDocument(auth.accessToken, {
        title: form.title,
        documentType: form.documentType,
        documentCategory: form.documentCategory,
        vehicleId: form.vehicleId || undefined,
        tripId: form.tripId || undefined,
        description: form.description || undefined,
        file: file ?? undefined,
      });
      navigate('/driver-portal/documents');
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-content">
      <PageHeader eyebrow="Driver Portal" title="Upload Document" description="Upload a document." />
      <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <div className="form-group">
            <label>Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. POD for Trip TR-123" required />
          </div>
          <div className="form-group">
            <label>Document Type *</label>
            <select value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })} required>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Category *</label>
            <select value={form.documentCategory} onChange={(e) => setForm({ ...form, documentCategory: e.target.value })} required>
              {DOC_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Vehicle (optional)</label>
            <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
              <option value="">No vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.vehicleNumber}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Trip (optional)</label>
            <select value={form.tripId} onChange={(e) => setForm({ ...form, tripId: e.target.value })}>
              <option value="">No trip</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>{t.tripNumber} — {t.originName} → {t.destinationName}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Optional description" />
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>File</h4>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ marginBottom: '0.75rem' }} />
          {file && (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
          {filePreview && (
            <div style={{ marginTop: '0.5rem' }}>
              <img src={filePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="submit" className="primary-button" disabled={loading || !form.title}>
            {loading ? 'Uploading...' : 'Upload Document'}
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate('/driver-portal/documents')}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
