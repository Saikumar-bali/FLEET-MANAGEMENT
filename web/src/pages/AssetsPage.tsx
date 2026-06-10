import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssets } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { AssetRecord } from '../types/auth';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

export function AssetsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
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
        if (caughtError instanceof ApiError) setError(caughtError.message);
        else setError('Failed to load assets.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken, page, search, statusFilter]);

  const columns = [
    { key: 'assetCode', header: 'Code', render: (a: AssetRecord) => <strong>{a.assetCode}</strong> },
    { key: 'name', header: 'Name', render: (a: AssetRecord) => a.name },
    { key: 'category', header: 'Category', render: (a: AssetRecord) => a.assetCategory.name },
    { key: 'serialNumber', header: 'Serial', render: (a: AssetRecord) => a.serialNumber ?? '-' },
    { key: 'currentStatus', header: 'Status', render: (a: AssetRecord) => <StatusBadge status={a.currentStatus} /> },
  ];

  if (isLoading) return <LoadingState message="Loading assets..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <section>
      <PageHeader
        title="Assets"
        description={`${total} asset${total !== 1 ? 's' : ''} registered`}
        actions={auth.hasPermission('asset_create') ? [
          <button key="create" type="button" className="primary-button" onClick={() => navigate('/assets/new')}>
            Add Asset
          </button>,
        ] : undefined}
      />

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input placeholder="Search assets..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ flex: 1, minWidth: '200px' }} />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ width: 'auto', minWidth: '150px' }}>
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

      {assets.length === 0 && !isLoading ? (
        <EmptyState
          message="No assets found. Add your first asset to get started."
          action={auth.hasPermission('asset_create') ? <button type="button" className="primary-button" onClick={() => navigate('/assets/new')}>Add Asset</button> : undefined}
        />
      ) : (
        <div className="card">
          <DataTable
            columns={columns}
            data={assets}
            keyExtractor={(a) => a.id}
            onRowClick={(a) => navigate(`/assets/${a.id}`)}
            pagination={{ page, limit: 20, total, totalPages, onPageChange: setPage }}
          />
        </div>
      )}
    </section>
  );
}
