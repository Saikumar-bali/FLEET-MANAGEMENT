import { FormEvent, useEffect, useState } from 'react';
import {
  getTripBillings,
  createTripBilling,
  updateTripBilling,
  deleteTripBilling,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { TripBilling } from '../types/auth';
import { ApiError } from '../types/api';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

type TripBillingForm = {
  tripId: string;
  customerId: string;
  vehicleId: string;
  driverId: string;
  invoiceNumber: string;
  invoiceDate: string;
  lrNumber: string;
  challanNumber: string;
  ewayBillNumber: string;
  customerPoNumber: string;
  placeOfSupplyState: string;
  originState: string;
  destinationState: string;
  freightAmount: string;
  loadingCharges: string;
  unloadingCharges: string;
  detentionCharges: string;
  tollCharges: string;
  permitCharges: string;
  otherCharges: string;
  discountAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  tdsAmount: string;
  dueDate: string;
  notes: string;
};

const initialForm: TripBillingForm = {
  tripId: '',
  customerId: '',
  vehicleId: '',
  driverId: '',
  invoiceNumber: '',
  invoiceDate: '',
  lrNumber: '',
  challanNumber: '',
  ewayBillNumber: '',
  customerPoNumber: '',
  placeOfSupplyState: '',
  originState: '',
  destinationState: '',
  freightAmount: '0',
  loadingCharges: '0',
  unloadingCharges: '0',
  detentionCharges: '0',
  tollCharges: '0',
  permitCharges: '0',
  otherCharges: '0',
  discountAmount: '0',
  cgstAmount: '0',
  sgstAmount: '0',
  igstAmount: '0',
  tdsAmount: '0',
  dueDate: '',
  notes: '',
};

export function FinanceTripBillingsPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<TripBilling[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<TripBillingForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canCreate = auth.hasPermission('trip_billing_create');
  const canUpdate = auth.hasPermission('trip_billing_update');
  const canDelete = auth.hasPermission('trip_billing_delete');

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const isCreateMode = selectedId === null;
  const canSubmit = isCreateMode ? canCreate : canUpdate;
  const submitLabel = isCreateMode ? 'Create Trip Billing' : 'Update Trip Billing';

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getTripBillings(auth.accessToken);
        const items = response.data?.items ?? [];
        setItems(items);
        if (items.length > 0 && !selectedId) {
          const first = items[0];
          setSelectedId(first.id);
        }
      } catch (caughtError) {
        const msg = caughtError instanceof ApiError ? caughtError.message : 'Failed to load trip billings.';
        setError(msg);
        showToast(msg, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken]);

  useEffect(() => {
    if (selected) {
      setForm({
        tripId: selected.tripId,
        customerId: selected.customerId ?? '',
        vehicleId: selected.vehicleId ?? '',
        driverId: selected.driverId ?? '',
        invoiceNumber: selected.invoiceNumber ?? '',
        invoiceDate: selected.invoiceDate.split('T')[0],
        lrNumber: selected.lrNumber ?? '',
        challanNumber: selected.challanNumber ?? '',
        ewayBillNumber: selected.ewayBillNumber ?? '',
        customerPoNumber: selected.customerPoNumber ?? '',
        placeOfSupplyState: selected.placeOfSupplyState ?? '',
        originState: selected.originState ?? '',
        destinationState: selected.destinationState ?? '',
        freightAmount: selected.freightAmount.toString(),
        loadingCharges: selected.loadingCharges.toString(),
        unloadingCharges: selected.unloadingCharges.toString(),
        detentionCharges: selected.detentionCharges.toString(),
        tollCharges: selected.tollCharges.toString(),
        permitCharges: selected.permitCharges.toString(),
        otherCharges: selected.otherCharges.toString(),
        discountAmount: selected.discountAmount.toString(),
        cgstAmount: selected.cgstAmount.toString(),
        sgstAmount: selected.sgstAmount.toString(),
        igstAmount: selected.igstAmount.toString(),
        tdsAmount: selected.tdsAmount.toString(),
        dueDate: selected.dueDate?.split('T')[0] ?? '',
        notes: selected.notes ?? '',
      });
      setMessage(null);
    }
  }, [selected]);

  function startCreateMode() {
    setSelectedId(null);
    setForm(initialForm);
    setError(null);
    setMessage(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!auth.accessToken) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload: Record<string, unknown> = {
        tripId: form.tripId,
        customerId: form.customerId || undefined,
        vehicleId: form.vehicleId || undefined,
        driverId: form.driverId || undefined,
        invoiceNumber: form.invoiceNumber || undefined,
        invoiceDate: form.invoiceDate ? new Date(form.invoiceDate).toISOString() : undefined,
        lrNumber: form.lrNumber || undefined,
        challanNumber: form.challanNumber || undefined,
        ewayBillNumber: form.ewayBillNumber || undefined,
        customerPoNumber: form.customerPoNumber || undefined,
        placeOfSupplyState: form.placeOfSupplyState || undefined,
        originState: form.originState || undefined,
        destinationState: form.destinationState || undefined,
        freightAmount: parseFloat(form.freightAmount) || 0,
        loadingCharges: parseFloat(form.loadingCharges) || 0,
        unloadingCharges: parseFloat(form.unloadingCharges) || 0,
        detentionCharges: parseFloat(form.detentionCharges) || 0,
        tollCharges: parseFloat(form.tollCharges) || 0,
        permitCharges: parseFloat(form.permitCharges) || 0,
        otherCharges: parseFloat(form.otherCharges) || 0,
        discountAmount: parseFloat(form.discountAmount) || 0,
        cgstAmount: parseFloat(form.cgstAmount) || 0,
        sgstAmount: parseFloat(form.sgstAmount) || 0,
        igstAmount: parseFloat(form.igstAmount) || 0,
        tdsAmount: parseFloat(form.tdsAmount) || 0,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        notes: form.notes || undefined,
      };

      if (selectedId) {
        const response = await updateTripBilling(auth.accessToken, selectedId, payload);
        setItems((prev) => prev.map((i) => (i.id === selectedId ? response.data : i)));
        setMessage('Trip billing updated.');
        showToast('Trip billing updated.', 'success');
      } else {
        const response = await createTripBilling(auth.accessToken, payload);
        setItems((prev) => [response.data, ...prev]);
        setSelectedId(response.data.id);
        setMessage('Trip billing created.');
        showToast('Trip billing created.', 'success');
      }
    } catch (caughtError) {
      const msg = caughtError instanceof ApiError ? caughtError.message : 'Failed to save trip billing.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!auth.accessToken) return;
    if (!window.confirm('Are you sure you want to delete this trip billing?')) return;
    try {
      await deleteTripBilling(auth.accessToken, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setForm(initialForm);
      }
      setMessage('Trip billing deleted.');
      showToast('Trip billing deleted.', 'success');
    } catch (caughtError) {
      const msg = caughtError instanceof ApiError ? caughtError.message : 'Failed to delete trip billing.';
      setError(msg);
      showToast(msg, 'error');
    }
  }

  if (isLoading) return <LoadingState message="Loading trip billings..." />;
  if (error && items.length === 0) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div>
      <div className="section-header">
        <div>
          <PageHeader
            eyebrow="Finance"
            title="Trip Billing"
            description="Manage trip invoices, billing, and payment status."
          />
        </div>
        <div className="action-panel">
          {canCreate ? (
            <button type="button" className="primary-button" onClick={startCreateMode}>
              Create Trip Billing
            </button>
          ) : null}
        </div>
      </div>

      <div className="list-detail-layout">
        <article className="card table-card selection-panel">
          <div className="table-toolbar">
            <div>
              <h3 className="table-toolbar-title">Trip Billings</h3>
              <p className="table-toolbar-copy">{items.length} total billings</p>
            </div>
            {canCreate ? (
              <button type="button" className="secondary-button" onClick={startCreateMode}>
                New Billing
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <EmptyState message="No trip billings found. Create the first billing to continue." />
          ) : (
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice#</th>
                    <th>Customer</th>
                    <th>Freight Amount</th>
                    <th>Total Amount</th>
                    <th>Net Receivable</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Payment Status</th>
                    <th>Due Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={item.id === selectedId ? 'row-active' : ''}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <td>{item.invoiceNumber ?? '—'}</td>
                      <td>{item.customer?.name ?? '—'}</td>
                      <td>{item.freightAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                      <td>{item.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                      <td>{item.netReceivable.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                      <td>{item.paidAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                      <td>{item.balanceAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                      <td><StatusBadge status={item.paymentStatus} /></td>
                      <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                      <td>
                        {canDelete ? (
                          <button
                            type="button"
                            className="danger-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDelete(item.id);
                            }}
                          >
                            Delete
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <aside className="detail-panel">
          <article className="card detail-card">
            <div className="table-toolbar">
              <div>
                <h3 className="table-toolbar-title">{isCreateMode ? 'Create Trip Billing' : 'Edit Trip Billing'}</h3>
                <p className="table-toolbar-copy">
                  {selected ? `Editing invoice ${selected.invoiceNumber ?? selected.id}` : 'Add a new trip billing'}
                </p>
              </div>
            </div>

            <form data-testid="finance-trip-billing-form" className="stack-form form-grid" onSubmit={handleSubmit}>
              <label>
                <span className="field-label">Trip ID</span>
                <input value={form.tripId} onChange={(e) => setForm((f) => ({ ...f, tripId: e.target.value }))} required />
              </label>
              <label>
                <span className="field-label">Customer ID</span>
                <input value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Vehicle ID</span>
                <input value={form.vehicleId} onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Driver ID</span>
                <input value={form.driverId} onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Invoice Number</span>
                <input value={form.invoiceNumber} onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Invoice Date</span>
                <input type="date" value={form.invoiceDate} onChange={(e) => setForm((f) => ({ ...f, invoiceDate: e.target.value }))} required />
              </label>
              <label>
                <span className="field-label">LR Number</span>
                <input value={form.lrNumber} onChange={(e) => setForm((f) => ({ ...f, lrNumber: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Challan Number</span>
                <input value={form.challanNumber} onChange={(e) => setForm((f) => ({ ...f, challanNumber: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">E-Way Bill Number</span>
                <input value={form.ewayBillNumber} onChange={(e) => setForm((f) => ({ ...f, ewayBillNumber: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Customer PO Number</span>
                <input value={form.customerPoNumber} onChange={(e) => setForm((f) => ({ ...f, customerPoNumber: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Place of Supply State</span>
                <input value={form.placeOfSupplyState} onChange={(e) => setForm((f) => ({ ...f, placeOfSupplyState: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Origin State</span>
                <input value={form.originState} onChange={(e) => setForm((f) => ({ ...f, originState: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Destination State</span>
                <input value={form.destinationState} onChange={(e) => setForm((f) => ({ ...f, destinationState: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Freight Amount</span>
                <input type="number" step="0.01" value={form.freightAmount} onChange={(e) => setForm((f) => ({ ...f, freightAmount: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Loading Charges</span>
                <input type="number" step="0.01" value={form.loadingCharges} onChange={(e) => setForm((f) => ({ ...f, loadingCharges: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Unloading Charges</span>
                <input type="number" step="0.01" value={form.unloadingCharges} onChange={(e) => setForm((f) => ({ ...f, unloadingCharges: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Detention Charges</span>
                <input type="number" step="0.01" value={form.detentionCharges} onChange={(e) => setForm((f) => ({ ...f, detentionCharges: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Toll Charges</span>
                <input type="number" step="0.01" value={form.tollCharges} onChange={(e) => setForm((f) => ({ ...f, tollCharges: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Permit Charges</span>
                <input type="number" step="0.01" value={form.permitCharges} onChange={(e) => setForm((f) => ({ ...f, permitCharges: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Other Charges</span>
                <input type="number" step="0.01" value={form.otherCharges} onChange={(e) => setForm((f) => ({ ...f, otherCharges: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Discount Amount</span>
                <input type="number" step="0.01" value={form.discountAmount} onChange={(e) => setForm((f) => ({ ...f, discountAmount: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">CGST Amount</span>
                <input type="number" step="0.01" value={form.cgstAmount} onChange={(e) => setForm((f) => ({ ...f, cgstAmount: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">SGST Amount</span>
                <input type="number" step="0.01" value={form.sgstAmount} onChange={(e) => setForm((f) => ({ ...f, sgstAmount: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">IGST Amount</span>
                <input type="number" step="0.01" value={form.igstAmount} onChange={(e) => setForm((f) => ({ ...f, igstAmount: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">TDS Amount</span>
                <input type="number" step="0.01" value={form.tdsAmount} onChange={(e) => setForm((f) => ({ ...f, tdsAmount: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Due Date</span>
                <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Notes</span>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
              </label>

              {error ? <div data-testid="finance-error-message" className="error-banner">{error}</div> : null}
              {message ? <div data-testid="finance-success-message" className="success-banner">{message}</div> : null}

              <div className="button-row">
                {canSubmit ? (
                  <button data-testid="finance-save-button" type="submit" className="primary-button" disabled={isSaving}>
                    {isSaving ? 'Saving...' : submitLabel}
                  </button>
                ) : null}
              </div>
            </form>
          </article>
        </aside>
      </div>
    </div>
  );
}

export default FinanceTripBillingsPage;
