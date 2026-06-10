import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAssetCategories, getAsset, createAsset, updateAsset, updateAssetStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { AssetCategoryRecord, AssetRecord } from '../types/auth';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

type AssetForm = {
  assetCode: string;
  name: string;
  assetCategoryId: string;
  serialNumber: string;
  purchaseDate: string;
  purchaseAmount: string;
  notes: string;
};

const initialForm: AssetForm = {
  assetCode: '',
  name: '',
  assetCategoryId: '',
  serialNumber: '',
  purchaseDate: '',
  purchaseAmount: '',
  notes: '',
};

export function AssetDetailPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const auth = useAuth();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<AssetRecord | null>(null);
  const [categories, setCategories] = useState<AssetCategoryRecord[]>([]);
  const [form, setForm] = useState<AssetForm>(initialForm);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      try {
        const catsResponse = await getAssetCategories(auth.accessToken);
        setCategories(catsResponse.data);
        if (catsResponse.data.length > 0 && !form.assetCategoryId) {
          setForm((f) => ({ ...f, assetCategoryId: catsResponse.data[0].id }));
        }
      } catch { /* ignore */ }
    };
    void load();
  }, [auth.accessToken]);

  useEffect(() => {
    if (isNew || !id) return;
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getAsset(auth.accessToken, id);
        setAsset(response.data);
        setForm({
          assetCode: response.data.assetCode,
          name: response.data.name,
          assetCategoryId: response.data.assetCategoryId,
          serialNumber: response.data.serialNumber ?? '',
          purchaseDate: response.data.purchaseDate ?? '',
          purchaseAmount: response.data.purchaseAmount?.toString() ?? '',
          notes: response.data.notes ?? '',
        });
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setError(caughtError.message);
        else setError('Failed to load asset.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken, id, isNew]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload: Record<string, unknown> = {
        assetCode: form.assetCode,
        name: form.name,
        assetCategoryId: form.assetCategoryId,
      };
      if (form.serialNumber) payload.serialNumber = form.serialNumber;
      if (form.purchaseDate) payload.purchaseDate = form.purchaseDate;
      if (form.purchaseAmount) payload.purchaseAmount = parseFloat(form.purchaseAmount);
      if (form.notes) payload.notes = form.notes;

      let response;
      if (isNew) {
        response = await createAsset(auth.accessToken, payload as any);
        setMessage('Asset created successfully.');
        navigate(`/assets/${response.data.id}`, { replace: true });
      } else if (id) {
        response = await updateAsset(auth.accessToken, id, payload as any);
        setAsset(response.data);
        setMessage('Asset updated successfully.');
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to save asset.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(status: string) {
    if (!auth.accessToken || !id || isNew) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await updateAssetStatus(auth.accessToken, id, status);
      setAsset(response.data);
      setMessage(`Asset status updated to ${status.replace(/_/g, ' ')}.`);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to update status.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingState message="Loading asset..." />;
  if (error && !asset && !isNew) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const canEdit = auth.hasPermission('asset_update');
  const canChangeStatus = auth.hasAnyPermission(['asset_update', 'asset_delete']);

  return (
    <section>
      <PageHeader
        title={isNew ? 'Add Asset' : asset ? `${asset.assetCode} - ${asset.name}` : 'Asset'}
        description={isNew ? 'Register a new asset' : asset ? `Category: ${asset.assetCategory.name}` : undefined}
        actions={!isNew && asset ? [<StatusBadge key="badge" status={asset.currentStatus} />] : undefined}
      />

      {error ? <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div> : null}
      {message ? <div className="success-banner" style={{ marginBottom: '1rem' }}>{message}</div> : null}

      <div className="page-grid">
        <form className="card stack-form" onSubmit={handleSubmit}>
          <h3>Asset Information</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <label>
              <span>Asset Code *</span>
              <input value={form.assetCode} onChange={(e) => setForm((f) => ({ ...f, assetCode: e.target.value }))} required disabled={!isNew && !canEdit} />
            </label>
            <label>
              <span>Name *</span>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required disabled={!canEdit} />
            </label>
          </div>

          <label>
            <span>Category *</span>
            <select value={form.assetCategoryId} onChange={(e) => setForm((f) => ({ ...f, assetCategoryId: e.target.value }))} disabled={!canEdit}>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Serial Number</span>
            <input value={form.serialNumber} onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))} disabled={!canEdit} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <label>
              <span>Purchase Date</span>
              <input type="date" value={form.purchaseDate ? form.purchaseDate.substring(0, 10) : ''} onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value ? new Date(e.target.value).toISOString() : '' }))} disabled={!canEdit} />
            </label>
            <label>
              <span>Purchase Amount</span>
              <input type="number" min={0} step="0.01" value={form.purchaseAmount} onChange={(e) => setForm((f) => ({ ...f, purchaseAmount: e.target.value }))} disabled={!canEdit} />
            </label>
          </div>

          <label>
            <span>Notes</span>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} disabled={!canEdit} />
          </label>

          {canEdit ? (
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : isNew ? 'Create Asset' : 'Update Asset'}
            </button>
          ) : null}
        </form>

        {!isNew && asset ? (
          <div className="card stack-form">
            <h3>Status Management</h3>
            {canChangeStatus ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button type="button" className="secondary-button" onClick={() => handleStatusChange('AVAILABLE')}>Available</button>
                <button type="button" className="secondary-button" onClick={() => handleStatusChange('DAMAGED')}>Damaged</button>
                <button type="button" className="secondary-button" onClick={() => handleStatusChange('UNDER_REPAIR')}>Under Repair</button>
                <button type="button" className="secondary-button" onClick={() => handleStatusChange('RETIRED')}>Retired</button>
              </div>
            ) : null}

            <h3 style={{ marginTop: '1rem' }}>Documents</h3>
            <p style={{ color: '#5a6474', fontSize: '0.9rem' }}>Documents section placeholder. Add purchase invoices, warranty, and other documents here.</p>

            <h3 style={{ marginTop: '1rem' }}>Details</h3>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div><strong>Created:</strong> {new Date(asset.createdAt).toLocaleDateString()}</div>
              <div><strong>Last Updated:</strong> {new Date(asset.updatedAt).toLocaleDateString()}</div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
