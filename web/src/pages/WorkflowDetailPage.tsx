import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import {
  createExpense,
  createFuelEntry,
  expenseAction,
  fuelAction,
  getExpense,
  getFuelEntry,
  getVehicles,
  updateExpense,
  updateFuelEntry,
} from '../services/api';
import type { ExpenseRecord, FuelRecord, VehicleRecord } from '../types/auth';

const empty = {
  vehicleId: '',
  date: new Date().toISOString().slice(0, 10),
  category: '',
  fuelType: 'DIESEL',
  quantity: '',
  price: '',
  amount: '',
  vendor: '',
  station: '',
  receipt: '',
  odometer: '',
  notes: '',
};

export function WorkflowDetailPage({ kind }: { kind: 'fuel' | 'expense' }) {
  const { id } = useParams();
  const isNew = id === 'new';
  const auth = useAuth();
  const navigate = useNavigate();
  const [record, setRecord] = useState<FuelRecord | ExpenseRecord | null>(null);
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
          const r = kind === 'fuel' ? await getFuelEntry(auth.accessToken, id) : await getExpense(auth.accessToken, id);
          const x = r.data;
          setRecord(x);
          setForm({
            ...empty,
            vehicleId: x.vehicleId,
            date: (kind === 'fuel' ? (x as FuelRecord).fuelDate : (x as ExpenseRecord).expenseDate).slice(0, 10),
            category: kind === 'expense' ? (x as ExpenseRecord).category : '',
            fuelType: kind === 'fuel' ? (x as FuelRecord).fuelType : '',
            quantity: kind === 'fuel' ? String((x as FuelRecord).quantityLiters) : '',
            price: kind === 'fuel' ? String((x as FuelRecord).pricePerLiter) : '',
            amount: kind === 'expense' ? String((x as ExpenseRecord).amount) : '',
            vendor: kind === 'expense' ? (x as ExpenseRecord).vendor ?? '' : '',
            station: kind === 'fuel' ? (x as FuelRecord).stationName ?? '' : '',
            receipt: x.receiptNumber ?? '',
            odometer: kind === 'fuel' ? String((x as FuelRecord).odometerReading ?? '') : '',
            notes: x.notes ?? '',
          });
        } catch {
          setError(`Failed to load ${kind} record.`);
        } finally {
          setLoading(false);
        }
      }
    })();
  }, [auth.accessToken, id, isNew, kind]);

  if (loading) return <LoadingState message="Loading record..." />;
  if (error && !record && !isNew) return <ErrorState message={error} />;

  const set = (key: keyof typeof empty, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!auth.accessToken) return;
    setError(null);
    try {
      const common = { vehicleId: form.vehicleId, notes: form.notes || undefined, receiptNumber: form.receipt || undefined };
      const payload = kind === 'fuel'
        ? { ...common, fuelDate: new Date(form.date).toISOString(), fuelType: form.fuelType, quantityLiters: Number(form.quantity), pricePerLiter: Number(form.price), stationName: form.station || undefined, odometerReading: form.odometer ? Number(form.odometer) : undefined }
        : { ...common, expenseDate: new Date(form.date).toISOString(), category: form.category, amount: Number(form.amount), vendor: form.vendor || undefined };
      const r = isNew
        ? (kind === 'fuel' ? await createFuelEntry(auth.accessToken, payload) : await createExpense(auth.accessToken, payload))
        : (kind === 'fuel' ? await updateFuelEntry(auth.accessToken, id!, payload) : await updateExpense(auth.accessToken, id!, payload));
      navigate(`/${kind === 'fuel' ? 'fuel' : 'expenses'}/${r.data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  }

  async function action(name: string) {
    if (!auth.accessToken || !id) return;
    const r = kind === 'fuel' ? await fuelAction(auth.accessToken, id, name) : await expenseAction(auth.accessToken, id, name);
    setRecord(r.data);
  }

  const base = kind === 'fuel' ? 'fuel' : 'expense';
  const editable = isNew || record?.status === 'DRAFT' || (record?.status === 'APPROVED' && auth.hasPermission(`${base}_approve`));

  return (
    <section className="page-content">
      <PageHeader
        title={isNew ? `Create ${kind === 'fuel' ? 'Fuel Entry' : 'Expense'}` : `${kind === 'fuel' ? 'Fuel Entry' : 'Expense'} Detail`}
        description={record ? `Status: ${record.status}` : 'Draft workflow record'}
        actions={!isNew && record ? [
          record.status === 'DRAFT' && auth.hasPermission(`${base}_submit`) ? <button key="submit" className="primary-button" onClick={() => action('submit')}>Submit</button> : null,
          record.status === 'SUBMITTED' && auth.hasPermission(`${base}_approve`) ? <button key="approve" className="primary-button" onClick={() => action('approve')}>Approve</button> : null,
          record.status === 'SUBMITTED' && auth.hasPermission(`${base}_approve`) ? <button key="reject" className="danger-button" onClick={() => action('reject')}>Reject</button> : null,
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
            <span className="field-label">Date *</span>
            <input required disabled={!editable} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </label>
        </div>

        {kind === 'fuel' ? (
          <div className="form-three-column">
            <label>
              <span className="field-label">Fuel Type *</span>
              <input required disabled={!editable} value={form.fuelType} onChange={(e) => set('fuelType', e.target.value)} />
            </label>
            <label>
              <span className="field-label">Quantity Liters *</span>
              <input required disabled={!editable} type="number" min="0.001" step="0.001" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
            </label>
            <label>
              <span className="field-label">Price Per Liter *</span>
              <input required disabled={!editable} type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} />
            </label>
          </div>
        ) : (
          <div className="form-two-column">
            <label>
              <span className="field-label">Category *</span>
              <input required disabled={!editable} value={form.category} onChange={(e) => set('category', e.target.value)} />
            </label>
            <label>
              <span className="field-label">Amount *</span>
              <input required disabled={!editable} type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
            </label>
          </div>
        )}

        <div className="form-two-column">
          <label>
            <span className="field-label">{kind === 'fuel' ? 'Station' : 'Vendor'}</span>
            <input disabled={!editable} value={kind === 'fuel' ? form.station : form.vendor} onChange={(e) => set(kind === 'fuel' ? 'station' : 'vendor', e.target.value)} />
          </label>
          <label>
            <span className="field-label">Receipt Number</span>
            <input disabled={!editable} value={form.receipt} onChange={(e) => set('receipt', e.target.value)} />
          </label>
        </div>

        <label>
          <span className="field-label">Notes</span>
          <textarea disabled={!editable} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>

        {editable && (
          <div className="action-panel">
            <button className="primary-button" type="submit">Save</button>
            <button className="secondary-button" type="button" onClick={() => navigate(`/${kind === 'fuel' ? 'fuel' : 'expenses'}`)}>Cancel</button>
          </div>
        )}
      </form>
    </section>
  );
}
