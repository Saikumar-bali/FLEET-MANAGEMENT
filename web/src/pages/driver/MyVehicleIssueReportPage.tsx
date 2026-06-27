import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../types/api';
import { API_BASE_URL } from '../../config/api';
import { PageShell } from '../../components/ui/PageShell';

export function MyVehicleIssueReportPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ category: 'GENERAL', description: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/drivers/me/vehicle-issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new ApiError(data.message || 'Failed', res.status);
      navigate('/my-dashboard');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to submit.');
    } finally { setIsSaving(false); }
  }

  return (
    <PageShell>
      <div style={{ maxWidth: '500px' }}>
        <h2 style={{ margin: '0 0 var(--space-4)' }}>Report Vehicle Issue</h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit} className="stack-form">
          <label><span className="field-label">Category</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="GENERAL">General</option><option value="ENGINE">Engine</option><option value="BRAKES">Brakes</option>
              <option value="TIRES">Tires</option><option value="ELECTRICAL">Electrical</option><option value="BODY">Body</option>
              <option value="LIGHTS">Lights</option>
            </select>
          </label>
          <label><span className="field-label">Description *</span>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={4} placeholder="Describe the issue..." />
          </label>
          <div className="button-row">
            <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? 'Submitting...' : 'Report Issue'}</button>
            <button type="button" className="secondary-button" onClick={() => navigate('/my-dashboard')}>Cancel</button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
