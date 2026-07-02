import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { reportDriverVehicleIssue, getMyDriverVehicles } from '../../services/api';
import type { DriverPortalVehicle } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';

export function DriverVehicleIssuePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<DriverPortalVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    vehicleId: '',
    title: '',
    description: '',
    severity: 'MEDIUM',
  });

  useEffect(() => {
    if (!auth.accessToken) return;
    getMyDriverVehicles(auth.accessToken).then((res) => {
      const list = res.data.vehicles || (Array.isArray(res.data) ? res.data : []);
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
      await reportDriverVehicleIssue(auth.accessToken, {
        vehicleId: form.vehicleId,
        title: form.title,
        description: form.description || undefined,
        severity: form.severity,
      });
      navigate('/driver-portal/vehicles');
    } catch (err: any) {
      setError(err.message || 'Failed to report issue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-content">
      <PageHeader eyebrow="Driver Portal" title="Report Vehicle Issue" description="Report an issue with your vehicle." />
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
          <label>Issue Title *</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Brake noise, tyre puncture" required />
        </div>

        <div className="form-group">
          <label>Severity</label>
          <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        <div className="form-group">
          <label>Description (optional)</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Describe the issue in detail" />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Reporting...' : 'Report Issue'}
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate('/driver-portal/vehicles')}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
