import { FormEvent, useEffect, useState } from 'react';
import { getFinanceCategories, createFinanceCategory, deleteFinanceCategory } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { FinanceCategory } from '../types/auth';
import { ApiError } from '../types/api';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

type CategoryForm = {
  name: string;
  type: 'INCOME' | 'EXPENSE';
  module: string;
};

const initialForm: CategoryForm = { name: '', type: 'EXPENSE', module: 'GENERAL' };

const MODULE_OPTIONS = [
  { value: 'TRIP', label: 'Trip' },
  { value: 'FUEL', label: 'Fuel' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'REPAIR', label: 'Repair' },
  { value: 'COMPLIANCE', label: 'Compliance' },
  { value: 'DRIVER', label: 'Driver' },
  { value: 'GENERAL', label: 'General' },
];

export function FinanceCategoriesPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selected = categories.find((c) => c.id === selectedId) ?? null;
  const canCreate = auth.hasPermission('finance_create');
  const canDelete = auth.hasPermission('finance_delete');

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getFinanceCategories(auth.accessToken);
        const items = response.data?.items ?? [];
        setCategories(items);
        if (items.length > 0) {
          const first = items[0];
          setSelectedId(first.id);
          setForm({ name: first.name, type: first.type, module: first.module });
        }
      } catch (caughtError) {
        const msg = caughtError instanceof ApiError ? caughtError.message : 'Failed to load categories.';
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
    setForm({ name: selected.name, type: selected.type, module: selected.module });
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

    try {
      const response = await createFinanceCategory(auth.accessToken, form);
      setCategories((cats) => [...cats, response.data]);
      setSelectedId(response.data.id);
      setMessage('Category created.');
      showToast('Category created.', 'success');
    } catch (caughtError) {
      const msg = caughtError instanceof ApiError ? caughtError.message : 'Failed to create category.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const category = categories.find((c) => c.id === id);
    if (!auth.accessToken) return;
    if (category?.isSystem) {
      setError('System categories cannot be deleted.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteFinanceCategory(auth.accessToken, id);
      setCategories((items) => items.filter((c) => c.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setForm(initialForm);
      }
      setMessage('Category deleted.');
      showToast('Category deleted.', 'success');
    } catch (caughtError) {
      const msg = caughtError instanceof ApiError ? caughtError.message : 'Failed to delete category.';
      setError(msg);
      showToast(msg, 'error');
    }
  }

  if (isLoading) return <LoadingState message="Loading categories..." />;
  if (error && categories.length === 0) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div>
      <div className="section-header">
        <div>
          <PageHeader
            eyebrow="Finance"
            title="Categories"
            description="Create and manage income and expense categories."
          />
        </div>
        <div className="action-panel">
          {canCreate ? (
            <button type="button" className="primary-button" onClick={startCreateMode}>
              Create Category
            </button>
          ) : null}
        </div>
      </div>

      {error && !categories.length ? <div className="error-banner">{error}</div> : null}

      <div className="list-detail-layout">
        <article className="card table-card selection-panel">
          <div className="table-toolbar">
            <div>
              <h3 className="table-toolbar-title">Categories</h3>
              <p className="table-toolbar-copy">{categories.length} total categories</p>
            </div>
            {canCreate ? (
              <button type="button" className="secondary-button" onClick={startCreateMode}>
                New Category
              </button>
            ) : null}
          </div>

          {categories.length === 0 ? (
            <EmptyState message="No categories found. Create the first category to continue." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Module</th>
                  <th>System</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className={cat.id === selectedId ? 'row-active' : ''}
                    onClick={() => setSelectedId(cat.id)}
                  >
                    <td><strong>{cat.name}</strong></td>
                    <td>{cat.type}</td>
                    <td>{cat.module}</td>
                    <td>{cat.isSystem ? 'Yes' : 'No'}</td>
                    <td>
                      {!cat.isSystem && canDelete ? (
                        <button
                          type="button"
                          className="danger-button"
                          onClick={(e) => { e.stopPropagation(); void handleDelete(cat.id); }}
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
                <h3 className="table-toolbar-title">{selected ? 'Category Details' : 'Create Category'}</h3>
                <p className="table-toolbar-copy">
                  {selected ? `Viewing ${selected.name}` : 'Add a new category'}
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
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'INCOME' | 'EXPENSE' }))}>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </label>
              <label>
                <span className="field-label">Module</span>
                <select value={form.module} onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}>
                  {MODULE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>

              {error ? <div className="error-banner">{error}</div> : null}
              {message ? <div className="success-banner">{message}</div> : null}

              <div className="button-row">
                {canCreate ? (
                  <button type="submit" className="primary-button" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Create Category'}
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

export default FinanceCategoriesPage;
