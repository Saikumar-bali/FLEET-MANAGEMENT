import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDrivers } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { DriverRecord } from '../types/auth';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

export function DriversPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
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
        const response = await getDrivers(auth.accessToken, {
          search: search || undefined,
          status: statusFilter || undefined,
          page,
          limit: 20,
        });
        setDrivers(response.data.items);
        setTotalPages(response.data.pagination.totalPages);
        setTotal(response.data.pagination.total);
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setError(caughtError.message);
        else setError('Failed to load drivers.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken, page, search, statusFilter]);

  const columns = [
    { key: 'name', header: 'Name', render: (d: DriverRecord) => <strong>{d.name}</strong> },
    { key: 'mobile', header: 'Mobile', render: (d: DriverRecord) => d.mobile },
    { key: 'licenseNumber', header: 'License', render: (d: DriverRecord) => d.licenseNumber },
    { key: 'experienceYears', header: 'Experience', render: (d: DriverRecord) => d.experienceYears ? `${d.experienceYears} yrs` : '-' },
    { key: 'status', header: 'Status', render: (d: DriverRecord) => <StatusBadge status={d.status} /> },
  ];

  if (isLoading) return <LoadingState message="Loading drivers..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <section className="page-content">
      <PageHeader
        title="Drivers"
        description={`${total} driver${total !== 1 ? 's' : ''} registered`}
        actions={auth.hasPermission('driver_create') ? [
          <button key="create" type="button" className="primary-button" onClick={() => navigate('/drivers/new')}>
            Add Driver
          </button>,
        ] : undefined}
      />

      <div className="card trips-filter-card">
        <div className="trips-filter-row">
          <input
            className="trips-search-input"
            placeholder="Search drivers..."
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
            <option value="ON_LEAVE">On Leave</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {drivers.length === 0 && !isLoading ? (
        <EmptyState
          message="No drivers found. Add your first driver to get started."
          action={auth.hasPermission('driver_create') ? <button type="button" className="primary-button" onClick={() => navigate('/drivers/new')}>Add Driver</button> : undefined}
        />
      ) : (
        <div className="card table-card">
          <DataTable
            columns={columns}
            data={drivers}
            keyExtractor={(d) => d.id}
            onRowClick={(d) => navigate(`/drivers/${d.id}`)}
            pagination={{ page, limit: 20, total, totalPages, onPageChange: setPage }}
          />
        </div>
      )}
    </section>
  );
}
