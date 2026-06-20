import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssets, getAssetCategories, createAssetCategory, updateAssetCategory } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { AssetRecord, AssetCategoryRecord } from '../types/auth';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

type AssetsTab = 'assets' | 'categories';

type CategoryForm = {
  name: string;
  key: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
};

const initialCategoryForm: CategoryForm = { name: '', key: '', description: '', status: 'ACTIVE' };

function normalizeCategoryKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

export function AssetsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AssetsTab>('assets');

  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [categories, setCategories] = useState<AssetCategoryRecord[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(initialCategoryForm);
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoadingAssets(true);
      setAssetError(null);
      try {
        const response = await getAssets(auth.accessToken, {
          search: search || undefined,
          status: statusFilter || undefined,
          page,
          limit: 20,
        });
        setAssets(response.data.items);
        setTotalPages(response.data.pagination.totalPages);
        setTotal(response.data.pagination.total);
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setAssetError(caughtError.message);
        else setAssetError('Failed to load assets.');
      } finally {
        setIsLoadingAssets(false);
      }
    };
    void load();
  }, [auth.accessToken, page, search, statusFilter]);

  useEffect(() => {
    if (activeTab !== 'categories') return;
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoadingCategories(true);
      setCategoryError(null);
      try {
        const response = await getAssetCategories(auth.accessToken);
        setCategories(response.data);
        if (response.data.length > 0 && !selectedCategoryId) {
          const first = response.data[0];
          setSelectedCategoryId(first.id);
          setCategoryForm({ name: first.name, key: first.key, description: first.description ?? '', status: first.status });
          setIsKeyManuallyEdited(true);
        }
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setCategoryError(caughtError.message);
        else setCategoryError('Failed to load categories.');
      } finally {
        setIsLoadingCategories(false);
      }
    };
    void load();
  }, [auth.accessToken, activeTab, selectedCategoryId]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;
  const canCreateCategory = auth.hasPermission('asset_create');
  const canUpdateCategory = auth.hasPermission('asset_update');
  const isCreateCategoryMode = selectedCategoryId === null;
  const canSubmitCategory = isCreateCategoryMode ? canCreateCategory : canUpdateCategory;

  useEffect(() => {
    if (!selectedCategory) return;
    setCategoryForm({ name: selectedCategory.name, key: selectedCategory.key, description: selectedCategory.description ?? '', status: selectedCategory.status });
    setIsKeyManuallyEdited(true);
    setCategoryMessage(null);
  }, [selectedCategory]);

  function startCreateCategoryMode() {
    setSelectedCategoryId(null);
    setCategoryForm(initialCategoryForm);
    setIsKeyManuallyEdited(false);
    setCategoryError(null);
    setCategoryMessage(null);
  }

  function handleCategoryNameChange(name: string) {
    setCategoryForm((current) => {
      if (!isCreateCategoryMode || isKeyManuallyEdited) return { ...current, name };
      return { ...current, name, key: normalizeCategoryKey(name) };
    });
  }

  function handleCategoryKeyChange(key: string) {
    const normalizedKey = normalizeCategoryKey(key);
    setCategoryForm((current) => ({ ...current, key: normalizedKey }));
    setIsKeyManuallyEdited(!isCreateCategoryMode || normalizedKey !== normalizeCategoryKey(categoryForm.name));
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;
    setIsSavingCategory(true);
    setCategoryError(null);
    setCategoryMessage(null);
    try {
      if (selectedCategoryId) {
        const response = await updateAssetCategory(auth.accessToken, selectedCategoryId, categoryForm);
        setCategories((cats) => cats.map((c) => c.id === selectedCategoryId ? response.data : c));
        setCategoryMessage('Category updated.');
      } else {
        const response = await createAssetCategory(auth.accessToken, categoryForm);
        setCategories((cats) => [...cats, response.data]);
        setSelectedCategoryId(response.data.id);
        setCategoryMessage('Category created.');
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setCategoryError(caughtError.message);
      else setCategoryError('Failed to save category.');
    } finally {
      setIsSavingCategory(false);
    }
  }

  const assetColumns = [
    { key: 'assetCode', header: 'Code', render: (a: AssetRecord) => <strong>{a.assetCode}</strong> },
    { key: 'name', header: 'Name', render: (a: AssetRecord) => a.name },
    { key: 'category', header: 'Category', render: (a: AssetRecord) => a.assetCategory.name },
    { key: 'serialNumber', header: 'Serial', render: (a: AssetRecord) => a.serialNumber ?? '-' },
    { key: 'currentStatus', header: 'Status', render: (a: AssetRecord) => <StatusBadge status={a.currentStatus} /> },
  ];

  return (
    <section className="page-content">
      <PageHeader
        title="Assets"
        description={`${total} asset${total !== 1 ? 's' : ''} registered`}
        actions={auth.hasPermission('asset_create') ? [
          <button key="create" type="button" className="primary-button" onClick={() => activeTab === 'categories' ? startCreateCategoryMode() : navigate('/assets/new')}>
            {activeTab === 'categories' ? 'Create Category' : 'Add Asset'}
          </button>,
        ] : undefined}
      />

      <div className="detail-tabs" style={{ marginBottom: '1rem' }}>
        <button type="button" className={`detail-tab${activeTab === 'assets' ? ' detail-tab-active' : ''}`} onClick={() => setActiveTab('assets')}>Assets</button>
        <button type="button" className={`detail-tab${activeTab === 'categories' ? ' detail-tab-active' : ''}`} onClick={() => setActiveTab('categories')}>Categories</button>
      </div>

      {activeTab === 'assets' ? (
        <>
          <div className="card trips-filter-card">
            <div className="trips-filter-row">
              <input
                className="trips-search-input"
                placeholder="Search assets..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              <select
                className="trips-filter-select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="DAMAGED">Damaged</option>
                <option value="LOST">Lost</option>
                <option value="UNDER_REPAIR">Under Repair</option>
                <option value="RETIRED">Retired</option>
              </select>
            </div>
          </div>

          {isLoadingAssets ? (
            <LoadingState message="Loading assets..." />
          ) : assetError ? (
            <ErrorState message={assetError} onRetry={() => window.location.reload()} />
          ) : assets.length === 0 ? (
            <EmptyState
              message="No assets found. Add your first asset to get started."
              action={auth.hasPermission('asset_create') ? <button type="button" className="primary-button" onClick={() => navigate('/assets/new')}>Add Asset</button> : undefined}
            />
          ) : (
            <div className="card table-card">
              <DataTable
                columns={assetColumns}
                data={assets}
                keyExtractor={(a) => a.id}
                onRowClick={(a) => navigate(`/assets/${a.id}`)}
                pagination={{ page, limit: 20, total, totalPages, onPageChange: setPage }}
              />
            </div>
          )}
        </>
      ) : (
        <>
          {isLoadingCategories ? (
            <LoadingState message="Loading categories..." />
          ) : categoryError && categories.length === 0 ? (
            <ErrorState message={categoryError} onRetry={() => window.location.reload()} />
          ) : (
            <div className="list-detail-layout">
              <article className="card table-card selection-panel">
                <div className="table-toolbar">
                  <div>
                    <h3 className="table-toolbar-title">Categories</h3>
                    <p className="table-toolbar-copy">{categories.length} total</p>
                  </div>
                  {canCreateCategory ? (
                    <button type="button" className="secondary-button" onClick={startCreateCategoryMode}>New Category</button>
                  ) : null}
                </div>
                {categories.length === 0 ? (
                  <EmptyState message="No categories found. Create the first category." />
                ) : (
                  <div className="role-list">
                    {categories.map((cat) => (
                      <button key={cat.id} type="button" className={`role-card${cat.id === selectedCategoryId ? ' role-card-active' : ''}`} onClick={() => setSelectedCategoryId(cat.id)}>
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
                      <h3 className="table-toolbar-title">{isCreateCategoryMode ? 'Create Category' : 'Edit Category'}</h3>
                      <p className="table-toolbar-copy">{selectedCategory ? `Editing ${selectedCategory.name}` : 'Add a new category'}</p>
                    </div>
                  </div>
                  <form className="stack-form" onSubmit={handleCategorySubmit}>
                    <label>
                      <span className="field-label">Name</span>
                      <input value={categoryForm.name} onChange={(e) => handleCategoryNameChange(e.target.value)} required />
                    </label>
                    <label>
                      <span className="field-label">Key</span>
                      <input value={categoryForm.key} onChange={(e) => handleCategoryKeyChange(e.target.value)} required />
                    </label>
                    <label>
                      <span className="field-label">Description</span>
                      <textarea value={categoryForm.description} onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
                    </label>
                    <label>
                      <span className="field-label">Status</span>
                      <select value={categoryForm.status} onChange={(e) => setCategoryForm((f) => ({ ...f, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </label>
                    {categoryError ? <div className="error-banner">{categoryError}</div> : null}
                    {categoryMessage ? <div className="success-banner">{categoryMessage}</div> : null}
                    <div className="button-row">
                      {canSubmitCategory ? (
                        <button type="submit" className="primary-button" disabled={isSavingCategory}>
                          {isSavingCategory ? 'Saving...' : isCreateCategoryMode ? 'Create Category' : 'Update Category'}
                        </button>
                      ) : null}
                    </div>
                  </form>
                </article>
              </aside>
            </div>
          )}
        </>
      )}
    </section>
  );
}
