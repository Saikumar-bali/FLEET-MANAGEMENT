import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createDriverVehicleInspection, getMyDriverVehicles } from '../../services/api';
import type { DriverPortalVehicle } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';

const INSPECTION_TYPES = ['Pre-Trip', 'Post-Trip', 'Daily', 'Weekly'];
const CHECKLIST_ITEMS_DEFAULT = [
  { label: 'Tyres condition', checked: false },
  { label: 'Brakes', checked: false },
  { label: 'Lights', checked: false },
  { label: 'Mirrors', checked: false },
  { label: 'Fuel level', checked: false },
  { label: 'Oil level', checked: false },
  { label: 'Body damage', checked: false },
  { label: 'Documents present', checked: false },
];

export function DriverVehicleInspectionPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<DriverPortalVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    vehicleId: '',
    inspectionType: 'Pre-Trip',
    odometerReading: '',
    overallStatus: 'OK',
    notes: '',
  });
  const [checklist, setChecklist] = useState(CHECKLIST_ITEMS_DEFAULT);

  useEffect(() => {
    if (!auth.accessToken) return;
    getMyDriverVehicles(auth.accessToken).then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setVehicles(list);
      if (list.length === 1) setForm((f) => ({ ...f, vehicleId: list[0].id }));
    });
  }, [auth.accessToken]);

  const toggleChecklist = (idx: number) => {
    setChecklist((prev) => prev.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.accessToken) return;
    setLoading(true);
    setError(null);

    const allPassed = checklist.every((c) => c.checked);
    const overallStatus = allPassed ? 'OK' : 'NEEDS_ATTENTION';

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
      <PageHeader eyebrow="Driver Portal" title="Vehicle Inspection" description="Perform a vehicle inspection." />
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
          <label>Inspection Type *</label>
          <select value={form.inspectionType} onChange={(e) => setForm({ ...form, inspectionType: e.target.value })} required>
            {INSPECTION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Odometer (optional)</label>
          <input type="number" min="0" value={form.odometerReading} onChange={(e) => setForm({ ...form, odometerReading: e.target.value })} placeholder="e.g. 45000" />
        </div>

        <div className="form-group">
          <label>Checklist</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {checklist.map((item, idx) => (
              <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={item.checked} onChange={() => toggleChecklist(idx)} />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Any observations" />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Inspection'}
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate('/driver-portal/vehicles')}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
