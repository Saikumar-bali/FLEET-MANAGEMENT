import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { reportDriverVehicleIssue, getMyDriverVehicles } from '../../services/api';
import type { DriverPortalVehicle } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';

const SEVERITIES = [
  { value: 'LOW', label: 'Low', hint: 'Can continue safely' },
  { value: 'MEDIUM', label: 'Medium', hint: 'Needs attention soon' },
  { value: 'HIGH', label: 'High', hint: 'May affect trip safety' },
  { value: 'CRITICAL', label: 'Critical', hint: 'Stop and report immediately' },
];

export function DriverVehicleIssuePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<DriverPortalVehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ vehicleId: '', title: '', description: '', severity: 'MEDIUM' });

  useEffect(() => {
    if (!auth.accessToken) return;
    setVehiclesLoading(true);
    getMyDriverVehicles(auth.accessToken).then((res) => {
      const list = res.data.vehicles || (Array.isArray(res.data) ? res.data : []);
      setVehicles(list);
      const preferred = list.find((vehicle) => vehicle.isCurrent) || list[0];
      if (preferred) setForm((f) => ({ ...f, vehicleId: preferred.id }));
    }).finally(() => setVehiclesLoading(false));
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

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const selectedSeverity = SEVERITIES.find((item) => item.value === form.severity);

  return (
    <section className="page-content">
      <PageHeader eyebrow="Driver Portal" title="Report Vehicle Issue" description="Create a clear safety or maintenance issue for your assigned/scoped vehicle." />
      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {!vehicles.length && !vehiclesLoading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: 720 }}>
          <h3 style={{ margin: '0 0 0.5rem' }}>No vehicle access found</h3>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>You need a current vehicle, trip-history vehicle, or scoped vehicle access before reporting an issue.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '1rem', alignItems: 'start' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem' }}>Issue Details</h3>
            <div className="form-two-column">
              <label className="form-group">
                <span>Vehicle *</span>
                <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} required>
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber} — {v.vehicleType}{v.isCurrent ? ' · Current' : ''}</option>)}
                </select>
              </label>
              <label className="form-group">
                <span>Severity</span>
                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                  {SEVERITIES.map((item) => <option key={item.value} value={item.value}>{item.label} — {item.hint}</option>)}
                </select>
              </label>
            </div>
            <label className="form-group">
              <span>Issue Title *</span>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Brake noise, tyre puncture, engine heating" required />
            </label>
            <label className="form-group">
              <span>Description</span>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} placeholder="Describe what happened, when it started, exact location/sound/smell, and whether the vehicle can continue safely." />
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="submit" className="primary-button" disabled={loading || !form.vehicleId || !form.title.trim()}>{loading ? 'Reporting...' : 'Submit Issue'}</button>
              <button type="button" className="secondary-button" onClick={() => navigate('/driver-portal/vehicles')}>Cancel</button>
            </div>
          </div>

          <aside className="card" style={{ padding: '1.25rem', position: 'sticky', top: 96 }}>
            <h3 style={{ marginTop: 0 }}>Safety Summary</h3>
            <p className="helper-text">Vehicle</p>
            <strong>{selectedVehicle ? `${selectedVehicle.vehicleNumber} · ${selectedVehicle.vehicleType}` : 'Not selected'}</strong>
            <p className="helper-text">Severity</p>
            <strong>{selectedSeverity?.label}</strong>
            <p style={{ color: 'var(--color-text-secondary)' }}>{selectedSeverity?.hint}</p>
            <div className="alert" style={{ marginTop: '1rem' }}>
              For critical issues, stop the vehicle safely first, then submit this report.
            </div>
          </aside>
        </form>
      )}
    </section>
  );
}
