import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import {
  createRepair,
  getRepair,
  getVehicles,
  repairAction,
  updateRepair,
} from '../services/api';
import type { RepairRecord, VehicleRecord } from '../types/auth';

const empty = {
  vehicleId: '',
  repairDate: new Date().toISOString().slice(0, 10),
  category: '',
  description: '',
  estimatedCost: '',
  actualCost: '',
  provider: '',
  invoiceNumber: '',
  notes: '',
};

export function RepairDetailPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const auth = useAuth();
  const navigate = useNavigate();
  const [record, setRecord] = useState<RepairRecord | null>(null);
  const [form, setForm] = useState(empty);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!auth.accessToken) return;
      const v = await getVehicles(auth.accessToken, { limit: 100 });
      setVehicles(v.data.items);
      if (!isNew && id) {
        try {
          const r = await getRepair(auth.accessToken, id);
          const x = r.data;
          setRecord(x);
          setForm({
            ...empty,
            vehicleId: x.vehicleId,
            repairDate: x.repairDate.slice(0, 10),
            category: x.category,
            description: x.description,
            estimatedCost: x.estimatedCost != null ? String(x.estimatedCost) : '',
            actualCost: x.actualCost != null ? String(x.actualCost) : '',
            provider: x.provider ?? '',
            invoiceNumber: x.invoiceNumber ?? '',
            notes: x.notes ?? '',
          });
        } catch {
          setError('Failed to load repair record.');
        } finally {
          setLoading(false);
        }
      }
    })();
  }, [auth.accessToken, id, isNew]);

  if (loading) return <LoadingState message="Loading record..." />;
  if (error && !record && !isNew) return <ErrorState message={error} />;

  const set = (key: keyof typeof empty, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!auth.accessToken) return;
    setError(null);
    try {
      const payload = {
        vehicleId: form.vehicleId,
        repairDate: new Date(form.repairDate).toISOString(),
        category: form.category,
        description: form.description,
        estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : undefined,
        actualCost: form.actualCost ? Number(form.actualCost) : undefined,
        provider: form.provider || undefined,
        invoiceNumber: form.invoiceNumber || undefined,
        notes: form.notes || undefined,
      };
      const r = isNew
        ? await createRepair(auth.accessToken, payload)
        : await updateRepair(auth.accessToken, id!, payload);
      navigate(`/repairs/${r.data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  }

  async function action(name: string) {
    if (!auth.accessToken || !id) return;
    const r = await repairAction(auth.accessToken, id, name);
    setRecord(r.data);
  }

  const editable = isNew || record?.status === 'OPEN' || record?.status === 'IN_PROGRESS';
  const canStart = record?.status === 'OPEN' && auth.hasPermission('repair_update');
  const canComplete = record?.status === 'IN_PROGRESS' && auth.hasPermission('repair_close');
  const canCancel = (record?.status === 'OPEN' || record?.status === 'IN_PROGRESS') && auth.hasPermission('repair_close');

  return (
    <section className="page-content">
      <PageHeader
        title={isNew ? 'Create Repair' : 'Repair Detail'}
        description={record ? `${record.status} - ${record.category}` : 'New repair record'}
        actions={!isNew && record ? [
          canStart ? <button key="start" className="primary-button" onClick={() => action('start')}>Start Repair</button> : null,
          canComplete ? <button key="complete" className="primary-button" onClick={() => action('complete')}>Complete</button> : null,
          canCancel ? <button key="cancel" className="danger-button" onClick={() => action('cancel')}>Cancel</button> : null,
        ].filter(Boolean) as JSX.Element[] : undefined}
      />

      {error && <div className="error-banner">{error}</div>}

      <form className="card stack-form" onSubmit={save}>
        <div className="form-two-column">
          <label>
            <span className="field-label">Vehicle *</span>
            <select required disabled={!editable} value={form.vehicleId} onChange={(e) => set('vehicleId', e.target.value)}>
              <option value="">Select vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.vehicleNumber}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Repair Date *</span>
            <input required disabled={!editable} type="date" value={form.repairDate} onChange={(e) => set('repairDate', e.target.value)} />
          </label>
        </div>

        <div className="form-two-column">
          <label>
            <span className="field-label">Category *</span>
            <input required disabled={!editable} value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g., Engine, Brake, Body" />
          </label>
          <label>
            <span className="field-label">Provider</span>
            <input disabled={!editable} value={form.provider} onChange={(e) => set('provider', e.target.value)} placeholder="Workshop or service provider" />
          </label>
        </div>

        <label>
          <span className="field-label">Description *</span>
          <textarea required disabled={!editable} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe the repair needed" />
        </label>

        <div className="form-three-column">
          <label>
            <span className="field-label">Estimated Cost</span>
            <input disabled={!editable} type="number" min="0" step="0.01" value={form.estimatedCost} onChange={(e) => set('estimatedCost', e.target.value)} />
          </label>
          <label>
            <span className="field-label">Actual Cost</span>
            <input disabled={!editable} type="number" min="0" step="0.01" value={form.actualCost} onChange={(e) => set('actualCost', e.target.value)} />
          </label>
          <label>
            <span className="field-label">Invoice Number</span>
            <input disabled={!editable} value={form.invoiceNumber} onChange={(e) => set('invoiceNumber', e.target.value)} />
          </label>
        </div>

        <label>
          <span className="field-label">Notes</span>
          <textarea disabled={!editable} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>

        {editable && (
          <div className="action-panel">
            <button className="primary-button" type="submit">Save</button>
            <button className="secondary-button" type="button" onClick={() => navigate('/repairs')}>Cancel</button>
          </div>
        )}
      </form>
    </section>
  );
}
