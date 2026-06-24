import { FormEvent, useEffect, useState } from 'react';
import { getPayments, createPayment, deletePayment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { PaymentRecord } from '../types/auth';
import { ApiError } from '../types/api';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

type PaymentForm = {
  transactionId: string;
  tripBillingId: string;
  accountId: string;
  vendorId: string;
  customerId: string;
  amount: string;
  paymentDate: string;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'CHEQUE' | 'CREDIT' | 'OTHER';
  upiReference: string;
  bankUtrNumber: string;
  chequeNumber: string;
  chequeDate: string;
  collectedByDriverId: string;
  referenceNumber: string;
  notes: string;
};

const initialForm: PaymentForm = {
  transactionId: '',
  tripBillingId: '',
  accountId: '',
  vendorId: '',
  customerId: '',
  amount: '',
  paymentDate: '',
  paymentMode: 'CASH',
  upiReference: '',
  bankUtrNumber: '',
  chequeNumber: '',
  chequeDate: '',
  collectedByDriverId: '',
  referenceNumber: '',
  notes: '',
};

export function FinancePaymentsPage() {
  const auth = useAuth();
  const [items, setItems] = useState<PaymentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canCreate = auth.hasPermission('payments_create');
  const canDelete = auth.hasPermission('payments_delete');

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getPayments(auth.accessToken);
        setItems(response.data?.items ?? []);
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setError(caughtError.message);
        else setError('Failed to load payments.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken]);

  useEffect(() => {
    const selected = items.find((i) => i.id === selectedId);
    if (selected) {
      setForm({
        transactionId: selected.transactionId ?? '',
        tripBillingId: selected.tripBillingId ?? '',
        accountId: selected.accountId ?? '',
        vendorId: selected.vendorId ?? '',
        customerId: selected.customerId ?? '',
        amount: selected.amount.toString(),
        paymentDate: selected.paymentDate.split('T')[0],
        paymentMode: (selected.paymentMode as PaymentForm['paymentMode']) || 'CASH',
        upiReference: selected.upiReference ?? '',
        bankUtrNumber: selected.bankUtrNumber ?? '',
        chequeNumber: selected.chequeNumber ?? '',
        chequeDate: selected.chequeDate?.split('T')[0] ?? '',
        collectedByDriverId: selected.collectedByDriverId ?? '',
        referenceNumber: selected.referenceNumber ?? '',
        notes: selected.notes ?? '',
      });
    }
  }, [selectedId, items]);

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
        transactionId: form.transactionId || undefined,
        tripBillingId: form.tripBillingId || undefined,
        accountId: form.accountId || undefined,
        vendorId: form.vendorId || undefined,
        customerId: form.customerId || undefined,
        amount: parseFloat(form.amount) || 0,
        paymentDate: form.paymentDate || undefined,
        paymentMode: form.paymentMode,
        upiReference: form.upiReference || undefined,
        bankUtrNumber: form.bankUtrNumber || undefined,
        chequeNumber: form.chequeNumber || undefined,
        chequeDate: form.chequeDate || undefined,
        collectedByDriverId: form.collectedByDriverId || undefined,
        referenceNumber: form.referenceNumber || undefined,
        notes: form.notes || undefined,
      };
      const response = await createPayment(auth.accessToken, payload);
      setItems((prev) => [response.data, ...prev]);
      setSelectedId(response.data.id);
      setMessage('Payment created.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to save payment.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!auth.accessToken) return;
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    try {
      await deletePayment(auth.accessToken, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setForm(initialForm);
      }
      setMessage('Payment deleted.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to delete payment.');
    }
  }

  if (isLoading) return <LoadingState message="Loading payments..." />;
  if (error && items.length === 0) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <section className="page-content">
      <div className="section-header">
        <div>
          <PageHeader
            eyebrow="Finance"
            title="Payments"
            description="Track and record all payment transactions."
          />
        </div>
        <div className="action-panel">
          {canCreate ? (
            <button type="button" className="primary-button" onClick={startCreateMode}>
              Create Payment
            </button>
          ) : null}
        </div>
      </div>

      <div className="list-detail-layout">
        <article className="card table-card selection-panel">
          <div className="table-toolbar">
            <div>
              <h3 className="table-toolbar-title">Payments</h3>
              <p className="table-toolbar-copy">{items.length} total payments</p>
            </div>
            {canCreate ? (
              <button type="button" className="secondary-button" onClick={startCreateMode}>
                New Payment
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <EmptyState message="No payments found. Create the first payment to continue." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment#</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Reference</th>
                  <th>Vendor/Customer</th>
                  <th>Notes</th>
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
                    <td>{item.paymentNumber ?? '—'}</td>
                    <td>{item.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                    <td>{new Date(item.paymentDate).toLocaleDateString('en-IN')}</td>
                    <td>{item.paymentMode}</td>
                    <td>{item.referenceNumber ?? '—'}</td>
                    <td>{item.vendorId ?? item.customerId ?? '—'}</td>
                    <td>{item.notes ?? '—'}</td>
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
                <h3 className="table-toolbar-title">Create Payment</h3>
                <p className="table-toolbar-copy">Record a new payment</p>
              </div>
            </div>

            <form data-testid="finance-payment-form" className="stack-form" onSubmit={handleSubmit}>
              <label>
                <span className="field-label">Transaction ID</span>
                <input value={form.transactionId} onChange={(e) => setForm((f) => ({ ...f, transactionId: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Trip Billing ID</span>
                <input value={form.tripBillingId} onChange={(e) => setForm((f) => ({ ...f, tripBillingId: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Account ID</span>
                <input value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Vendor ID</span>
                <input value={form.vendorId} onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Customer ID</span>
                <input value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Amount</span>
                <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
              </label>
              <label>
                <span className="field-label">Payment Date</span>
                <input type="date" value={form.paymentDate} onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))} required />
              </label>
              <label>
                <span className="field-label">Payment Mode</span>
                <select value={form.paymentMode} onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value as PaymentForm['paymentMode'] }))}>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CREDIT">Credit</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label>
                <span className="field-label">UPI Reference</span>
                <input value={form.upiReference} onChange={(e) => setForm((f) => ({ ...f, upiReference: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Bank UTR Number</span>
                <input value={form.bankUtrNumber} onChange={(e) => setForm((f) => ({ ...f, bankUtrNumber: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Cheque Number</span>
                <input value={form.chequeNumber} onChange={(e) => setForm((f) => ({ ...f, chequeNumber: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Cheque Date</span>
                <input type="date" value={form.chequeDate} onChange={(e) => setForm((f) => ({ ...f, chequeDate: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Collected By Driver ID</span>
                <input value={form.collectedByDriverId} onChange={(e) => setForm((f) => ({ ...f, collectedByDriverId: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Reference Number</span>
                <input value={form.referenceNumber} onChange={(e) => setForm((f) => ({ ...f, referenceNumber: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Notes</span>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
              </label>

              {error ? <div data-testid="finance-error" className="error-banner">{error}</div> : null}
              {message ? <div data-testid="finance-success" className="success-banner">{message}</div> : null}

              <div className="button-row">
                {canCreate ? (
                  <button data-testid="finance-save-button" type="submit" className="primary-button" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Create Payment'}
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

export default FinancePaymentsPage;
