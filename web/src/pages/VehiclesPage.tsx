import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteVehicle as deleteVehicleRequest, getVehicles } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { VehicleRecord } from '../types/auth';
import { ApiError } from '../types/api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';

export function VehiclesPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewVehicle, setViewVehicle] = useState<VehicleRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const canCreate = auth.hasPermission('vehicle_create');
  const canDelete = auth.hasPermission('vehicle_delete');

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);

      try {
        const response = await getVehicles(auth.accessToken, {
          search: search || undefined,
          status: statusFilter || undefined,
          page,
          limit: 20,
        });
        setVehicles(response.data.items);
        setTotalPages(response.data.pagination.totalPages);
        setTotal(response.data.pagination.total);
      } catch (caughtError) {
        if (caughtError instanceof ApiError) {
          setError(caughtError.message);
        } else {
          setError('Failed to load vehicles.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [auth.accessToken, page, search, statusFilter]);

  async function handleDelete() {
    if (!auth.accessToken || !deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteVehicleRequest(auth.accessToken, deleteTarget.id);
      setPageMessage(`Vehicle "${deleteTarget.vehicleNumber}" deleted.`);
      setVehicles(cur => cur.filter(v => v.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (viewVehicle?.id === deleteTarget.id) setViewVehicle(null);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to delete.'); }
    finally { setIsDeleting(false); }
  }

  const columns = [
    {
      key: 'vehicleNumber',
      header: 'Vehicle Number',
      render: (v: VehicleRecord) => <strong>{v.vehicleNumber}</strong>,
    },
    {
      key: 'vehicleType',
      header: 'Type',
      render: (v: VehicleRecord) => v.vehicleType,
    },
    {
      key: 'brand',
      header: 'Brand',
      render: (v: VehicleRecord) => v.brand ?? '-',
    },
    {
      key: 'fuelType',
      header: 'Fuel',
      render: (v: VehicleRecord) => v.fuelType,
    },
    {
      key: 'status',
      header: 'Status',
      render: (v: VehicleRecord) => <StatusBadge status={v.status} />,
    },
    {
      key: 'currentOdometer',
      header: 'Odometer',
      render: (v: VehicleRecord) => `${v.currentOdometer.toLocaleString()} km`,
    },
    {
      key: 'actions', header: '', width: '120px',
      render: (v: VehicleRecord) => (
        <button type="button" className="secondary-button" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
          onClick={e => { e.stopPropagation(); setViewVehicle(v); setPageMessage(null); }}>View</button>
      ),
    },
  ];

  if (isLoading) return <LoadingState message="Loading vehicles..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <section className="page-content">
      <PageHeader
        title="Vehicles"
        description={`${total} vehicle${total !== 1 ? 's' : ''} registered`}
        actions={
          canCreate
            ? [
                <button
                  key="create"
                  type="button"
                  className="primary-button"
                  onClick={() => navigate('/vehicles/new')}
                >
                  Add Vehicle
                </button>,
              ]
            : undefined
        }
      />

      {pageMessage ? <div className="success-banner">{pageMessage}</div> : null}

      <div className="card trips-filter-card">
        <div className="trips-filter-row">
          <input
            className="trips-search-input"
            placeholder="Search vehicles..."
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
            <option value="ON_TRIP">On Trip</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="UNDER_REPAIR">Under Repair</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SOLD">Sold</option>
            <option value="ACCIDENT">Accident</option>
          </select>
        </div>
      </div>

      {vehicles.length === 0 && !isLoading ? (
        <EmptyState
          message="No vehicles found. Add your first vehicle to get started."
          action={
            canCreate
              ? <button type="button" className="primary-button" onClick={() => navigate('/vehicles/new')}>Add Vehicle</button>
              : undefined
          }
        />
      ) : (
        <div className="card table-card">
          <DataTable
            columns={columns}
            data={vehicles}
            keyExtractor={(v) => v.id}
            onRowClick={(v) => { setViewVehicle(v); setPageMessage(null); }}
            pagination={{
              page,
              limit: 20,
              total,
              totalPages,
              onPageChange: setPage,
            }}
          />
        </div>
      )}

      {/* View Vehicle Modal */}
      <Modal isOpen={!!viewVehicle} title={viewVehicle?.vehicleNumber ?? ''}
        description={viewVehicle ? `${viewVehicle.vehicleType} — ${viewVehicle.fuelType}` : ''}
        onClose={() => { setViewVehicle(null); }}
        size="large"
        footer={
          <div className="button-row" style={{ justifyContent: 'space-between' }}>
            <div>
              {canDelete && viewVehicle ? <button type="button" className="danger-button" onClick={() => setDeleteTarget(viewVehicle)}>Delete vehicle</button> : null}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="ghost-button" onClick={() => { setViewVehicle(null); }}>Close</button>
            </div>
          </div>
        }
      >
        {viewVehicle && (
          <div className="detail-grid">
            <div><p className="detail-label">Vehicle Number</p><p className="detail-value">{viewVehicle.vehicleNumber}</p></div>
            <div><p className="detail-label">Type</p><p className="detail-value">{viewVehicle.vehicleType}</p></div>
            <div><p className="detail-label">Brand</p><p className="detail-value">{viewVehicle.brand ?? '-'}</p></div>
            <div><p className="detail-label">Model</p><p className="detail-value">{viewVehicle.model ?? '-'}</p></div>
            <div><p className="detail-label">Year</p><p className="detail-value">{viewVehicle.year ?? '-'}</p></div>
            <div><p className="detail-label">Fuel Type</p><p className="detail-value">{viewVehicle.fuelType}</p></div>
            <div><p className="detail-label">Status</p><StatusBadge status={viewVehicle.status} /></div>
            <div><p className="detail-label">Odometer</p><p className="detail-value">{viewVehicle.currentOdometer.toLocaleString()} km</p></div>
            <div><p className="detail-label">Chassis Number</p><p className="detail-value">{viewVehicle.chassisNumber ?? '-'}</p></div>
            <div><p className="detail-label">Engine Number</p><p className="detail-value">{viewVehicle.engineNumber ?? '-'}</p></div>
            <div><p className="detail-label">RC Number</p><p className="detail-value">{viewVehicle.rcNumber ?? '-'}</p></div>
            <div><p className="detail-label">Current Driver</p><p className="detail-value">{viewVehicle.currentDriver?.name ?? 'Unassigned'}</p></div>
            <div><p className="detail-label">Insurance Expiry</p><p className="detail-value">{viewVehicle.insuranceExpiry ? new Date(viewVehicle.insuranceExpiry).toLocaleDateString() : '-'}</p></div>
            <div><p className="detail-label">Fitness Expiry</p><p className="detail-value">{viewVehicle.fitnessExpiry ? new Date(viewVehicle.fitnessExpiry).toLocaleDateString() : '-'}</p></div>
            <div><p className="detail-label">Pollution Expiry</p><p className="detail-value">{viewVehicle.pollutionExpiry ? new Date(viewVehicle.pollutionExpiry).toLocaleDateString() : '-'}</p></div>
            <div><p className="detail-label">Permit Expiry</p><p className="detail-value">{viewVehicle.permitExpiry ? new Date(viewVehicle.permitExpiry).toLocaleDateString() : '-'}</p></div>
            <div><p className="detail-label">Created</p><p className="detail-value">{new Date(viewVehicle.createdAt).toLocaleString()}</p></div>
            <div><p className="detail-label">Last Updated</p><p className="detail-value">{new Date(viewVehicle.updatedAt).toLocaleString()}</p></div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation (after view modal so it renders on top) */}
      <ConfirmDialog isOpen={!!deleteTarget} title="Delete vehicle"
        description={`Permanently delete vehicle "${deleteTarget?.vehicleNumber}"? This action cannot be undone.`}
        confirmLabel="Delete" tone="danger" isConfirming={isDeleting}
        onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} />
    </section>
  );
}
