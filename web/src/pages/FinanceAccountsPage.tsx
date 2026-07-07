import { FormEvent, useEffect, useState } from 'react';
import { getFinanceAccounts, createFinanceAccount, updateFinanceAccount, deleteFinanceAccount } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { FinanceAccount } from '../types/auth';
import { ApiError } from '../types/api';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

type AccountForm = {
  name: string;
  type: 'CASH' | 'BANK' | 'WALLET' | 'CREDIT' | 'OTHER';
  bankName: string;
  accountNumberMasked: string;
  openingBalance: string;
};

const initialForm: AccountForm = { name: '', type: 'BANK', bankName: '', accountNumberMasked: '', openingBalance: '0' };

export function FinanceAccountsPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selected = accounts.find((a) => a.id === selectedId) ?? null;
  const canCreate = auth.hasPermission('finance_create');
  const canUpdate = auth.hasPermission('finance_update');
  const canDelete = auth.hasPermission('finance_delete');
  const isCreateMode = selectedId === null;
  const canSubmit = isCreateMode ? canCreate : canUpdate;
  const submitLabel = isCreateMode ? 'Create Account' : 'Update Account';

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getFinanceAccounts(auth.accessToken);
        const items = response.data?.items ?? [];
        setAccounts(items);
        if (items.length > 0) {
          const first = items[0];
          setSelectedId(first.id);
          setForm({
            name: first.name,
            type: first.type,
            bankName: first.bankName ?? '',
            accountNumberMasked: first.accountNumberMasked ?? '',
            openingBalance: String(first.openingBalance ?? 0),
          });
        }
      } catch (caughtError) {
        const msg = caughtError instanceof ApiError ? caughtError.message : 'Failed to load accounts.';
        setError(msg);
        showToast(msg, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken]);

  useEffect(() => {
    if (!selected) return;
    setForm({
      name: selected.name,
      type: selected.type,
      bankName: selected.bankName ?? '',
      accountNumberMasked: selected.accountNumberMasked ?? '',
      openingBalance: String(selected.openingBalance ?? 0),
    });
    setMessage(null);
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

    const payload = {
      name: form.name,
      type: form.type,
      bankName: form.bankName || null,
      accountNumberMasked: form.accountNumberMasked || null,
      openingBalance: Number(form.openingBalance) || 0,
    };

    try {
      if (selectedId) {
        const response = await updateFinanceAccount(auth.accessToken, selectedId, payload);
        setAccounts((items) => items.map((a) => (a.id === selectedId ? response.data : a)));
        setMessage('Account updated.');
        showToast('Account updated.', 'success');
      } else {
        const response = await createFinanceAccount(auth.accessToken, payload);
        setAccounts((items) => [...items, response.data]);
        setSelectedId(response.data.id);
        setMessage('Account created.');
        showToast('Account created.', 'success');
      }
    } catch (caughtError) {
      const msg = caughtError instanceof ApiError ? caughtError.message : 'Failed to save account.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!auth.accessToken || !window.confirm('Are you sure you want to delete this account?')) return;
    try {
      await deleteFinanceAccount(auth.accessToken, id);
      setAccounts((items) => items.filter((a) => a.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setForm(initialForm);
      }
      setMessage('Account deleted.');
      showToast('Account deleted.', 'success');
    } catch (caughtError) {
      const msg = caughtError instanceof ApiError ? caughtError.message : 'Failed to delete account.';
      setError(msg);
      showToast(msg, 'error');
    }
  }

  if (isLoading) return <LoadingState message="Loading accounts..." />;
  if (error && accounts.length === 0) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div>
      <div className="section-header">
        <div>
          <PageHeader
            eyebrow="Finance"
            title="Accounts"
            description="Manage bank accounts, cash, wallets and credit accounts."
          />
        </div>
        <div className="action-panel">
          {canCreate ? (
            <button type="button" className="primary-button" onClick={startCreateMode}>
              Create Account
            </button>
          ) : null}
        </div>
      </div>

      {error && !accounts.length ? <div className="error-banner">{error}</div> : null}

      <div className="list-detail-layout">
        <article className="card table-card selection-panel">
          <div className="table-toolbar">
            <div>
              <h3 className="table-toolbar-title">Accounts</h3>
              <p className="table-toolbar-copy">{accounts.length} total accounts</p>
            </div>
            {canCreate ? (
              <button type="button" className="secondary-button" onClick={startCreateMode}>
                New Account
              </button>
            ) : null}
          </div>

          {accounts.length === 0 ? (
            <EmptyState message="No accounts found. Create the first account to continue." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Bank</th>
                  <th>Current Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr
                    key={account.id}
                    className={account.id === selectedId ? 'row-active' : ''}
                    onClick={() => setSelectedId(account.id)}
                  >
                    <td><strong>{account.name}</strong></td>
                    <td>{account.type}</td>
                    <td>{account.bankName ?? '-'}</td>
                    <td>{account.currentBalance.toLocaleString()}</td>
                    <td><StatusBadge status={account.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                    <td>
                      {canDelete ? (
                        <button
                          type="button"
                          className="danger-button"
                          onClick={(e) => { e.stopPropagation(); void handleDelete(account.id); }}
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
                <h3 className="table-toolbar-title">{isCreateMode ? 'Create Account' : 'Edit Account'}</h3>
                <p className="table-toolbar-copy">
                  {selected ? `Editing ${selected.name}` : 'Add a new account'}
                </p>
              </div>
            </div>

            <form className="stack-form" onSubmit={handleSubmit}>
              <label>
                <span className="field-label">Name</span>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </label>
              <label>
                <span className="field-label">Type</span>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountForm['type'] }))}>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank</option>
                  <option value="WALLET">Wallet</option>
                  <option value="CREDIT">Credit</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label>
                <span className="field-label">Bank Name</span>
                <input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Account Number (Masked)</span>
                <input value={form.accountNumberMasked} onChange={(e) => setForm((f) => ({ ...f, accountNumberMasked: e.target.value }))} />
              </label>
              <label>
                <span className="field-label">Opening Balance</span>
                <input type="number" value={form.openingBalance} onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))} />
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
    </div>
  );
}

export default FinanceAccountsPage;
