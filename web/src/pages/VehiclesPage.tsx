import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVehicles } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { VehicleRecord } from '../types/auth';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

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
  ];

  if (isLoading) return <LoadingState message="Loading vehicles..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <section className="page-content">
      <PageHeader
        title="Vehicles"
        description={`${total} vehicle${total !== 1 ? 's' : ''} registered`}
        actions={
          auth.hasPermission('vehicle_create')
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
            auth.hasPermission('vehicle_create')
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
            onRowClick={(v) => navigate(`/vehicles/${v.id}`)}
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
    </section>
  );
}
