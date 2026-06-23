import { FormEvent, useEffect, useState } from 'react';
import {
  getTripBillings,
  createTripBilling,
  updateTripBilling,
  deleteTripBilling,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  invoiceNumber: string;
  invoiceDate: string;
  billingAmount: string;
  taxAmount: string;
  discountAmount: string;
  dueDate: string;
  notes: string;
};

const initialForm: TripBillingForm = {
  tripId: '',
  customerId: '',
  invoiceNumber: '',
  invoiceDate: '',
  billingAmount: '',
  taxAmount: '',
  discountAmount: '',
  dueDate: '',
  notes: '',
};

export function FinanceTripBillingsPage() {
  const auth = useAuth();
  const [items, setItems] = useState<TripBilling[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<TripBillingForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');

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
        const response = await getTripBillings(auth.accessToken, {
          ...(filterPaymentStatus ? { status: filterPaymentStatus } : {}),
        });
        setItems(response.data.items);
        if (response.data.items.length > 0 && !selectedId) {
          const first = response.data.items[0];
          setSelectedId(first.id);
        }
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setError(caughtError.message);
        else setError('Failed to load trip billings.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken, filterPaymentStatus]);

  useEffect(() => {
    if (selected) {
      setForm({
        tripId: selected.tripId,
        customerId: selected.customerId ?? '',
        invoiceNumber: selected.invoiceNumber ?? '',
        invoiceDate: selected.invoiceDate.split('T')[0],
        billingAmount: selected.billingAmount.toString(),
        taxAmount: selected.taxAmount.toString(),
        discountAmount: selected.discountAmount.toString(),
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
        invoiceNumber: form.invoiceNumber || undefined,
        invoiceDate: form.invoiceDate || undefined,
        billingAmount: parseFloat(form.billingAmount) || 0,
        taxAmount: parseFloat(form.taxAmount) || 0,
        discountAmount: parseFloat(form.discountAmount) || 0,
        dueDate: form.dueDate || undefined,
        notes: form.notes || undefined,
      };

      if (selectedId) {
        const response = await updateTripBilling(auth.accessToken, selectedId, payload);
        setItems((prev) => prev.map((i) => (i.id === selectedId ? response.data : i)));
        setMessage('Trip billing updated.');
      } else {
        const response = await createTripBilling(auth.accessToken, payload);
        setItems((prev) => [response.data, ...prev]);
        setSelectedId(response.data.id);
        setMessage('Trip billing created.');
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to save trip billing.');
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
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to delete trip billing.');
    }
  }

  if (isLoading) return <LoadingState message="Loading trip billings..." />;
  if (error && items.length === 0) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <section className="page-content">
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

      <div className="filter-bar">
        <label>
          <span className="field-label">Payment Status</span>
          <select value={filterPaymentStatus} onChange={(e) => setFilterPaymentStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="UNBILLED">Unbilled</option>
            <option value="BILLED">Billed</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
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
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice#</th>
                  <th>Trip ID</th>
                  <th>Customer</th>
                  <th>Invoice Date</th>
                  <th>Total Amount</th>
                  <th>Paid Amount</th>
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
                    <td>{item.tripId}</td>
                    <td>{item.customer?.name ?? '—'}</td>
                    <td>{new Date(item.invoiceDate).toLocaleDateString('en-IN')}</td>
                    <td>{item.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
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

            <form className="stack-form" onSubmit={handleSubmit}>
              <label>
                <span className="field-label">Trip ID</span>
                <input value={form.tripId} onChange={(e) => setForm((f) => ({ ...f, tripId: e.target.value }))} required />
              </label>
              <label>
                <span className="field-label">Customer ID</span>
                <input value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))} />
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
                <span className="field-label">Billing Amount</span>
                <input type="number" step="0.01" value={form.billingAmount} onChange={(e) => setForm((f) => ({ ...f, billingAmount: e.target.value }))} required />
              </label>
              <label>
                <span className="field-label">Tax Amount</span>
                <input type="number" step="0.01" value={form.taxAmount} onChange={(e) => setForm((f) => ({ ...f, taxAmount: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Discount Amount</span>
                <input type="number" step="0.01" value={form.discountAmount} onChange={(e) => setForm((f) => ({ ...f, discountAmount: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Due Date</span>
                <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Notes</span>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
              </label>

              {error ? <div className="error-banner">{error}</div> : null}
              {message ? <div className="success-banner">{message}</div> : null}

              <div className="button-row">
                {canSubmit ? (
                  <button type="submit" className="primary-button" disabled={isSaving}>
                    {isSaving ? 'Saving...' : submitLabel}
                  </button>
                ) : null}
              </div>
            </form>
          </article>
        </aside>
      </div>
    </section>
  );
}

export default FinanceTripBillingsPage;
