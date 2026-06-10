import { FormEvent, useEffect, useState } from 'react';
import { getAssetCategories, createAssetCategory, updateAssetCategory } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { AssetCategoryRecord } from '../types/auth';
import { ApiError } from '../types/api';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

type CategoryForm = {
  name: string;
  key: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
};

const initialForm: CategoryForm = { name: '', key: '', description: '', status: 'ACTIVE' };

export function AssetCategoriesPage() {
  const auth = useAuth();
  const [categories, setCategories] = useState<AssetCategoryRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selected = categories.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getAssetCategories(auth.accessToken);
        setCategories(response.data);
        if (response.data.length > 0) {
          const first = response.data[0];
          setSelectedId(first.id);
          setForm({ name: first.name, key: first.key, description: first.description ?? '', status: first.status });
        }
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setError(caughtError.message);
        else setError('Failed to load categories.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken]);

  useEffect(() => {
    if (!selected) return;
    setForm({ name: selected.name, key: selected.key, description: selected.description ?? '', status: selected.status });
    setMessage(null);
  }, [selected]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      if (selectedId) {
        const response = await updateAssetCategory(auth.accessToken, selectedId, form);
        setCategories((cats) => cats.map((c) => c.id === selectedId ? response.data : c));
        setMessage('Category updated.');
      } else {
        const response = await createAssetCategory(auth.accessToken, form);
        setCategories((cats) => [...cats, response.data]);
        setSelectedId(response.data.id);
        setMessage('Category created.');
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to save category.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingState message="Loading categories..." />;
  if (error && categories.length === 0) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const canEdit = auth.hasPermission('asset_update');

  return (
    <section className="form-page">
      <div className="section-header">
        <div>
          <PageHeader
            eyebrow="Masters"
            title="Asset Categories"
            description="Create and manage asset category configuration."
          />
        </div>
      </div>

      {error && !categories.length ? <div className="error-banner">{error}</div> : null}

      <div className="list-detail-layout">
        <article className="card table-card selection-panel">
          <div className="table-toolbar">
            <div>
              <h3 className="table-toolbar-title">Available categories</h3>
              <p className="table-toolbar-copy">{categories.length} total categories</p>
            </div>
          </div>

          {categories.length === 0 ? (
            <EmptyState message="No categories found. Create the first category to continue." />
          ) : (
            <div className="role-list">
              {categories.map((cat) => (
                <button key={cat.id} type="button" className={`role-card${cat.id === selectedId ? ' role-card-active' : ''}`} onClick={() => setSelectedId(cat.id)}>
                  <div className="role-card-title-row">
                    <strong>{cat.name}</strong>
                    <StatusBadge status={cat.status} />
                  </div>
                  <span className="role-card-meta">{cat.key}</span>
                  <small className="role-card-meta">{cat._count?.assets ?? 0} assets</small>
                </button>
              ))}
            </div>
          )}
        </article>

        <aside className="detail-panel">
          <article className="card detail-card">
            <div className="table-toolbar">
              <div>
                <h3 className="table-toolbar-title">{selected?.name ?? 'Create category'}</h3>
                <p className="table-toolbar-copy">{selected ? 'Edit the selected category' : 'Add a new category'}</p>
              </div>
            </div>

            <form className="stack-form" onSubmit={handleSubmit}>
              <label>
                <span className="field-label">Name</span>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </label>
              <label>
                <span className="field-label">Key</span>
                <input
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.replace(/[^a-z0-9_]/g, '_').toLowerCase() }))}
                  required
                  disabled={!!selected}
                />
              </label>
              <label>
                <span className="field-label">Description</span>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
              </label>
              <label>
                <span className="field-label">Status</span>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>

              {error ? <div className="error-banner">{error}</div> : null}
              {message ? <div className="success-banner">{message}</div> : null}

              <div className="button-row">
                {canEdit ? (
                  <button type="submit" className="primary-button" disabled={isSaving}>
                    {isSaving ? 'Saving...' : selectedId ? 'Update Category' : 'Create Category'}
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
