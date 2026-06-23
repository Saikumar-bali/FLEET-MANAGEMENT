import { FormEvent, useEffect, useState } from 'react';
import {
  getFinanceTransactions,
  createFinanceTransaction,
  deleteFinanceTransaction,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { FinanceTransaction } from '../types/auth';
import { ApiError } from '../types/api';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

type TransactionForm = {
  transactionType: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ADJUSTMENT';
  sourceModule: string;
  vendorId: string;
  customerId: string;
  accountId: string;
  categoryId: string;
  amount: string;
  taxAmount: string;
  transactionDate: string;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'CHEQUE' | 'CREDIT' | 'OTHER';
  referenceNumber: string;
  description: string;
};

const initialForm: TransactionForm = {
  transactionType: 'INCOME',
  sourceModule: '',
  vendorId: '',
  customerId: '',
  accountId: '',
  categoryId: '',
  amount: '',
  taxAmount: '',
  transactionDate: '',
  paymentMode: 'CASH',
  referenceNumber: '',
  description: '',
};

export function FinanceTransactionsPage() {
  const auth = useAuth();
  const [items, setItems] = useState<FinanceTransaction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<TransactionForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [filterType, setFilterType] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const canCreate = auth.hasPermission('finance_transactions_create');
  const canDelete = auth.hasPermission('finance_transactions_delete');

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getFinanceTransactions(auth.accessToken, {
          ...(filterType ? { status: filterType } : {}),
        });
        setItems(response.data.items);
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setError(caughtError.message);
        else setError('Failed to load transactions.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken, filterType, filterPaymentStatus, filterDateFrom, filterDateTo]);

  useEffect(() => {
    const selected = items.find((i) => i.id === selectedId);
    if (selected) {
      setForm({
        transactionType: selected.transactionType,
        sourceModule: selected.sourceModule ?? '',
        vendorId: selected.vendorId ?? '',
        customerId: selected.customerId ?? '',
        accountId: selected.accountId ?? '',
        categoryId: selected.categoryId ?? '',
        amount: selected.amount.toString(),
        taxAmount: selected.taxAmount.toString(),
        transactionDate: selected.transactionDate.split('T')[0],
        paymentMode: (selected.paymentMode as TransactionForm['paymentMode']) || 'CASH',
        referenceNumber: selected.referenceNumber ?? '',
        description: selected.description ?? '',
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
        transactionType: form.transactionType,
        sourceModule: form.sourceModule || undefined,
        vendorId: form.vendorId || undefined,
        customerId: form.customerId || undefined,
        accountId: form.accountId || undefined,
        categoryId: form.categoryId || undefined,
        amount: parseFloat(form.amount) || 0,
        taxAmount: parseFloat(form.taxAmount) || 0,
        transactionDate: form.transactionDate || undefined,
        paymentMode: form.paymentMode,
        referenceNumber: form.referenceNumber || undefined,
        description: form.description || undefined,
      };
      const response = await createFinanceTransaction(auth.accessToken, payload);
      setItems((prev) => [response.data, ...prev]);
      setSelectedId(response.data.id);
      setMessage('Transaction created.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to save transaction.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!auth.accessToken) return;
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await deleteFinanceTransaction(auth.accessToken, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setForm(initialForm);
      }
      setMessage('Transaction deleted.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to delete transaction.');
    }
  }

  const filteredItems = items.filter((item) => {
    if (filterPaymentStatus && item.paymentStatus !== filterPaymentStatus) return false;
    if (filterDateFrom && item.transactionDate < filterDateFrom) return false;
    if (filterDateTo && item.transactionDate > filterDateTo) return false;
    return true;
  });

  if (isLoading) return <LoadingState message="Loading transactions..." />;
  if (error && items.length === 0) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <section className="page-content">
      <div className="section-header">
        <div>
          <PageHeader
            eyebrow="Finance"
            title="Transactions"
            description="View and manage all financial transactions."
          />
        </div>
        <div className="action-panel">
          {canCreate ? (
            <button type="button" className="primary-button" onClick={startCreateMode}>
              Create Transaction
            </button>
          ) : null}
        </div>
      </div>

      <div className="filter-bar">
        <label>
          <span className="field-label">Type</span>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="TRANSFER">Transfer</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>
        </label>
        <label>
          <span className="field-label">Payment Status</span>
          <select value={filterPaymentStatus} onChange={(e) => setFilterPaymentStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
        <label>
          <span className="field-label">Date From</span>
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
        </label>
        <label>
          <span className="field-label">Date To</span>
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
        </label>
      </div>

      <div className="list-detail-layout">
        <article className="card table-card selection-panel">
          <div className="table-toolbar">
            <div>
              <h3 className="table-toolbar-title">Transactions</h3>
              <p className="table-toolbar-copy">{filteredItems.length} total transactions</p>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <EmptyState message="No transactions found. Create the first transaction to continue." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction#</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Payment Mode</th>
                  <th>Payment Status</th>
                  <th>Date</th>
                  <th>Vendor/Customer</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className={item.id === selectedId ? 'row-active' : ''}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <td>{item.transactionNumber}</td>
                    <td>{item.transactionType}</td>
                    <td>{item.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                    <td>{item.paymentMode}</td>
                    <td><StatusBadge status={item.paymentStatus} /></td>
                    <td>{new Date(item.transactionDate).toLocaleDateString('en-IN')}</td>
                    <td>{item.vendor?.name ?? item.customer?.name ?? '—'}</td>
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
                <h3 className="table-toolbar-title">Create Transaction</h3>
                <p className="table-toolbar-copy">Add a new financial transaction</p>
              </div>
            </div>

            <form className="stack-form" onSubmit={handleSubmit}>
              <label>
                <span className="field-label">Transaction Type</span>
                <select value={form.transactionType} onChange={(e) => setForm((f) => ({ ...f, transactionType: e.target.value as TransactionForm['transactionType'] }))}>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                </select>
              </label>
              <label>
                <span className="field-label">Source Module</span>
                <input value={form.sourceModule} onChange={(e) => setForm((f) => ({ ...f, sourceModule: e.target.value }))} placeholder="e.g. TRIP, MAINTENANCE" />
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
                <span className="field-label">Account ID</span>
                <input value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Category ID</span>
                <input value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Amount</span>
                <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
              </label>
              <label>
                <span className="field-label">Tax Amount</span>
                <input type="number" step="0.01" value={form.taxAmount} onChange={(e) => setForm((f) => ({ ...f, taxAmount: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Transaction Date</span>
                <input type="date" value={form.transactionDate} onChange={(e) => setForm((f) => ({ ...f, transactionDate: e.target.value }))} required />
              </label>
              <label>
                <span className="field-label">Payment Mode</span>
                <select value={form.paymentMode} onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value as TransactionForm['paymentMode'] }))}>
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
                <span className="field-label">Reference Number</span>
                <input value={form.referenceNumber} onChange={(e) => setForm((f) => ({ ...f, referenceNumber: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Description</span>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
              </label>

              {error ? <div className="error-banner">{error}</div> : null}
              {message ? <div className="success-banner">{message}</div> : null}

              <div className="button-row">
                {canCreate ? (
                  <button type="submit" className="primary-button" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Create Transaction'}
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

export default FinanceTransactionsPage;
