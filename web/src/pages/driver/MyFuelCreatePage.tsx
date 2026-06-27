import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createMyFuelEntry } from '../../services/api';
import { ApiError } from '../../types/api';
import { PageShell } from '../../components/ui/PageShell';

export function MyFuelCreatePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ totalAmount: '', quantityLiters: '', stationName: '', notes: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;
    setIsSaving(true);
    setError(null);
    try {
      await createMyFuelEntry(auth.accessToken, {
        totalAmount: parseFloat(form.totalAmount),
        quantityLiters: form.quantityLiters ? parseFloat(form.quantityLiters) : undefined,
        stationName: form.stationName || undefined,
        notes: form.notes || undefined,
      });
      navigate('/my-fuel');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to create fuel entry.');
    } finally { setIsSaving(false); }
  }

  return (
    <PageShell>
      <div style={{ maxWidth: '500px' }}>
        <h2 style={{ margin: '0 0 var(--space-4)' }}>Quick Fuel Entry</h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit} className="stack-form">
          <label><span className="field-label">Total Amount *</span>
            <input type="number" min="1" step="0.01" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} required placeholder="500" />
          </label>
          <label><span className="field-label">Litres</span>
            <input type="number" min="0" step="0.1" value={form.quantityLiters} onChange={(e) => setForm({ ...form, quantityLiters: e.target.value })} placeholder="Optional" />
          </label>
          <label><span className="field-label">Station</span>
            <input value={form.stationName} onChange={(e) => setForm({ ...form, stationName: e.target.value })} placeholder="Optional" />
          </label>
          <label><span className="field-label">Notes</span>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </label>
          <div className="button-row">
            <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? 'Saving...' : 'Add Fuel'}</button>
            <button type="button" className="secondary-button" onClick={() => navigate('/my-fuel')}>Cancel</button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
