import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createDriverVehicleInspection, getMyDriverVehicles } from '../../services/api';
import type { DriverPortalVehicle } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';

const INSPECTION_TYPES = ['Pre-Trip', 'Post-Trip', 'Daily', 'Weekly'];
const CHECKLIST_ITEMS_DEFAULT = [
  { label: 'Tyres condition', checked: false, critical: true },
  { label: 'Brakes', checked: false, critical: true },
  { label: 'Headlights / indicators', checked: false, critical: true },
  { label: 'Mirrors and windshield', checked: false, critical: false },
  { label: 'Fuel level', checked: false, critical: false },
  { label: 'Oil / coolant level', checked: false, critical: true },
  { label: 'Body damage check', checked: false, critical: false },
  { label: 'Vehicle documents present', checked: false, critical: false },
];

export function DriverVehicleInspectionPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<DriverPortalVehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ vehicleId: '', inspectionType: 'Pre-Trip', odometerReading: '', notes: '' });
  const [checklist, setChecklist] = useState(CHECKLIST_ITEMS_DEFAULT);

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

  const passedCount = useMemo(() => checklist.filter((item) => item.checked).length, [checklist]);
  const criticalFailed = useMemo(() => checklist.some((item) => item.critical && !item.checked), [checklist]);
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const overallStatus = checklist.every((c) => c.checked) ? 'OK' : criticalFailed ? 'CRITICAL_ATTENTION' : 'NEEDS_ATTENTION';

  const toggleChecklist = (idx: number) => {
    setChecklist((prev) => prev.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item));
  };

  const markAllPassed = () => setChecklist((prev) => prev.map((item) => ({ ...item, checked: true })));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await createDriverVehicleInspection(auth.accessToken, {
        vehicleId: form.vehicleId,
        inspectionType: form.inspectionType,
        odometerReading: form.odometerReading ? Number(form.odometerReading) : undefined,
        overallStatus,
        notes: form.notes || undefined,
        checklistItems: checklist,
      });
      navigate('/driver-portal/vehicles');
    } catch (err: any) {
      setError(err.message || 'Failed to submit inspection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-content">
      <PageHeader eyebrow="Driver Portal" title="Vehicle Inspection" description="Complete a structured safety inspection for your own visible vehicle before or after trips." />
      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {!vehicles.length && !vehiclesLoading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: 720 }}>
          <h3 style={{ margin: '0 0 0.5rem' }}>No vehicle access found</h3>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>You need a current vehicle, trip-history vehicle, or scoped vehicle access before submitting an inspection.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '1rem', alignItems: 'start' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div className="section-header">
              <div>
                <h3 style={{ margin: 0 }}>Inspection Details</h3>
                <p className="helper-text">Mark each item only after checking it physically.</p>
              </div>
              <button type="button" className="secondary-button" onClick={markAllPassed}>Mark all passed</button>
            </div>

            <div className="form-two-column">
              <label className="form-group">
                <span>Vehicle *</span>
                <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} required>
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber} — {v.vehicleType}{v.isCurrent ? ' · Current' : ''}</option>)}
                </select>
              </label>
              <label className="form-group">
                <span>Inspection Type *</span>
                <select value={form.inspectionType} onChange={(e) => setForm({ ...form, inspectionType: e.target.value })} required>
                  {INSPECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="form-group">
                <span>Odometer</span>
                <input type="number" min="0" value={form.odometerReading} onChange={(e) => setForm({ ...form, odometerReading: e.target.value })} placeholder="e.g. 45000" />
              </label>
            </div>

            <div className="card" style={{ padding: '1rem', margin: '1rem 0', background: 'var(--color-bg-surface-subtle)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {checklist.map((item, idx) => (
                  <label key={item.label} style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', padding: '0.75rem', border: '1px solid var(--color-border-subtle)', borderRadius: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={item.checked} onChange={() => toggleChecklist(idx)} />
                    <span><strong>{item.label}</strong>{item.critical ? <span className="helper-text" style={{ display: 'block' }}>Critical safety item</span> : null}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="form-group">
              <span>Notes</span>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} placeholder="Mention damage, missing documents, warning lights, or unsafe conditions." />
            </label>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="submit" className="primary-button" disabled={loading || !form.vehicleId}>{loading ? 'Submitting...' : 'Submit Inspection'}</button>
              <button type="button" className="secondary-button" onClick={() => navigate('/driver-portal/vehicles')}>Cancel</button>
            </div>
          </div>

          <aside className="card" style={{ padding: '1.25rem', position: 'sticky', top: 96 }}>
            <h3 style={{ marginTop: 0 }}>Inspection Summary</h3>
            <p className="helper-text">Vehicle</p>
            <strong>{selectedVehicle ? `${selectedVehicle.vehicleNumber} · ${selectedVehicle.vehicleType}` : 'Not selected'}</strong>
            <p className="helper-text">Checklist</p>
            <strong>{passedCount} / {checklist.length} passed</strong>
            <p className="helper-text">Status</p>
            <strong>{overallStatus.replace(/_/g, ' ')}</strong>
            <div className="alert" style={{ marginTop: '1rem' }}>
              {criticalFailed ? 'One or more critical safety checks are not passed.' : 'No critical safety failures marked.'}
            </div>
          </aside>
        </form>
      )}
    </section>
  );
}
