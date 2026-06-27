import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageShell } from '../../components/ui/PageShell';
import { API_BASE_URL } from '../../config/api';
import { ApiError } from '../../types/api';

export function MyVehicleInspectionPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    odometer: '',
    exteriorCondition: 'GOOD',
    interiorCondition: 'GOOD',
    tireCondition: 'GOOD',
    fluidLevels: 'OK',
    lightsWorking: true,
    brakesWorking: true,
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/drivers/me/vehicle/inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({
          odometer: form.odometer ? parseFloat(form.odometer) : undefined,
          exteriorCondition: form.exteriorCondition,
          interiorCondition: form.interiorCondition,
          tireCondition: form.tireCondition,
          fluidLevels: form.fluidLevels,
          lightsWorking: form.lightsWorking,
          brakesWorking: form.brakesWorking,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new ApiError(data.message || 'Failed to submit inspection', res.status);
      setSuccess(true);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to submit vehicle inspection.');
    } finally { setIsSaving(false); }
  }

  if (success) {
    return (
      <PageShell>
        <div style={{ maxWidth: '500px' }}>
          <div className="success-banner" style={{ marginBottom: 'var(--space-4)' }}>Vehicle inspection submitted successfully.</div>
          <button type="button" className="primary-button" onClick={() => navigate('/my-dashboard')}>Back to Dashboard</button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div style={{ maxWidth: '500px' }}>
        <h2 style={{ margin: '0 0 var(--space-4)' }}>Vehicle Inspection</h2>
        <p className="helper-text" style={{ marginBottom: 'var(--space-4)' }}>Submit a daily vehicle inspection report.</p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit} className="stack-form">
          <label><span className="field-label">Odometer Reading</span>
            <input type="number" min="0" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} placeholder="e.g. 45230" />
          </label>
          <label><span className="field-label">Exterior Condition</span>
            <select value={form.exteriorCondition} onChange={(e) => setForm({ ...form, exteriorCondition: e.target.value })}>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>
          </label>
          <label><span className="field-label">Interior Condition</span>
            <select value={form.interiorCondition} onChange={(e) => setForm({ ...form, interiorCondition: e.target.value })}>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>
          </label>
          <label><span className="field-label">Tire Condition</span>
            <select value={form.tireCondition} onChange={(e) => setForm({ ...form, tireCondition: e.target.value })}>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>
          </label>
          <label><span className="field-label">Fluid Levels</span>
            <select value={form.fluidLevels} onChange={(e) => setForm({ ...form, fluidLevels: e.target.value })}>
              <option value="OK">OK</option>
              <option value="LOW">Low</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={form.lightsWorking} onChange={(e) => setForm({ ...form, lightsWorking: e.target.checked })} />
            <span className="field-label">Lights Working</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={form.brakesWorking} onChange={(e) => setForm({ ...form, brakesWorking: e.target.checked })} />
            <span className="field-label">Brakes Working</span>
          </label>
          <label><span className="field-label">Notes</span>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Any additional observations..." />
          </label>
          <div className="button-row">
            <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? 'Submitting...' : 'Submit Inspection'}</button>
            <button type="button" className="secondary-button" onClick={() => navigate('/my-dashboard')}>Cancel</button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
