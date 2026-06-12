import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrips } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { TripRecord } from '../types/auth';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

const tripTypeLabels: Record<string, string> = {
  TRANSFER: 'Transfer',
  DELIVERY: 'Delivery',
  PICKUP: 'Pickup',
  SERVICE: 'Service',
  INTERNAL: 'Internal',
};

export function TripsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tripTypeFilter, setTripTypeFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);

      try {
        const response = await getTrips(auth.accessToken, {
          search: search || undefined,
          status: statusFilter || undefined,
          tripType: tripTypeFilter || undefined,
          page,
          limit: 20,
        });
        setTrips(response.data.items);
        setTotalPages(response.data.pagination.totalPages);
        setTotal(response.data.pagination.total);
      } catch (caughtError) {
        if (caughtError instanceof ApiError) {
          setError(caughtError.message);
        } else {
          setError('Failed to load trips.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [auth.accessToken, page, search, statusFilter, tripTypeFilter]);

  const columns = [
    {
      key: 'tripNumber',
      header: 'Trip Number',
      render: (t: TripRecord) => <strong>{t.tripNumber}</strong>,
    },
    {
      key: 'tripType',
      header: 'Type',
      render: (t: TripRecord) => tripTypeLabels[t.tripType] ?? t.tripType,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t: TripRecord) => <StatusBadge status={t.status} />,
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (t: TripRecord) => t.vehicle.vehicleNumber,
    },
    {
      key: 'driver',
      header: 'Driver',
      render: (t: TripRecord) => t.driver?.name ?? '-',
    },
    {
      key: 'route',
      header: 'Route',
      render: (t: TripRecord) => (
        <span className="trip-route-text">
          {t.originName} → {t.destinationName}
        </span>
      ),
    },
    {
      key: 'plannedStartAt',
      header: 'Planned Start',
      render: (t: TripRecord) =>
        t.plannedStartAt ? new Date(t.plannedStartAt).toLocaleDateString() : '-',
    },
    {
      key: 'actualStartAt',
      header: 'Actual Start',
      render: (t: TripRecord) =>
        t.actualStartAt ? new Date(t.actualStartAt).toLocaleDateString() : '-',
    },
  ];

  if (isLoading) return <LoadingState message="Loading trips..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <section>
      <PageHeader
        title="Trips"
        description={`${total} trip${total !== 1 ? 's' : ''}`}
        actions={
          auth.hasPermission('trip_create')
            ? [
                <button
                  key="create"
                  type="button"
                  className="primary-button"
                  onClick={() => navigate('/trips/new')}
                >
                  Create Trip
                </button>,
              ]
            : undefined
        }
      />

      <div className="card trips-filter-card">
        <div className="trips-filter-row">
          <input
            className="trips-search-input"
            placeholder="Search trips..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            className="trips-filter-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="STARTED">Started</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select
            className="trips-filter-select"
            value={tripTypeFilter}
            onChange={(e) => { setTripTypeFilter(e.target.value); setPage(1); }}
          >
            <option value="">All types</option>
            <option value="TRANSFER">Transfer</option>
            <option value="DELIVERY">Delivery</option>
            <option value="PICKUP">Pickup</option>
            <option value="SERVICE">Service</option>
            <option value="INTERNAL">Internal</option>
          </select>
        </div>
      </div>

      {trips.length === 0 && !isLoading ? (
        <EmptyState
          message="No trips found. Create your first trip to get started."
          action={
            auth.hasPermission('trip_create')
              ? <button type="button" className="primary-button" onClick={() => navigate('/trips/new')}>Create Trip</button>
              : undefined
          }
        />
      ) : (
        <div className="card">
          <DataTable
            columns={columns}
            data={trips}
            keyExtractor={(t) => t.id}
            onRowClick={(t) => navigate(`/trips/${t.id}`)}
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
