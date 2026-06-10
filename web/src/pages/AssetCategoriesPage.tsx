import { FormEvent, useEffect, useState } from 'react';
import { getAssetCategories, createAssetCategory, updateAssetCategory } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { AssetCategoryRecord } from '../types/auth';
import { ApiError } from '../types/api';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

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
    <section className="page-grid roles-grid">
      <article className="card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Asset Categories</p>
            <h3>Available categories</h3>
          </div>
        </div>

        {categories.length === 0 ? (
          <EmptyState message="No categories found. Create the first category to continue." />
        ) : (
          <div className="role-list">
            {categories.map((cat) => (
              <button key={cat.id} type="button" className={`role-card${cat.id === selectedId ? ' role-card-active' : ''}`} onClick={() => setSelectedId(cat.id)}>
                <strong>{cat.name}</strong>
                <span>{cat.key}</span>
                <small>{cat._count?.assets ?? 0} assets | <StatusBadge status={cat.status} /></small>
              </button>
            ))}
          </div>
        )}
      </article>

      <article className="card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Category Editor</p>
            <h3>{selected?.name ?? 'Create category'}</h3>
          </div>
        </div>

        <form className="stack-form" onSubmit={handleSubmit}>
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>
          <label>
            <span>Key</span>
            <input
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.replace(/[^a-z0-9_]/g, '_').toLowerCase() }))}
              required
              disabled={!!selected}
            />
          </label>
          <label>
            <span>Description</span>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          </label>
          <label>
            <span>Status</span>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>

          {error ? <div className="error-banner">{error}</div> : null}
          {message ? <div className="success-banner">{message}</div> : null}

          <div className="button-row">
            {!selectedId && canEdit ? (
              <button type="submit" className="primary-button" disabled={isSaving}>
                {isSaving ? 'Creating...' : 'Create Category'}
              </button>
            ) : null}
            {selectedId && canEdit ? (
              <button type="submit" className="secondary-button" disabled={isSaving}>
                {isSaving ? 'Updating...' : 'Update Category'}
              </button>
            ) : null}
          </div>
        </form>
      </article>
    </section>
  );
}
