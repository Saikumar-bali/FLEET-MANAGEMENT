import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyTrips } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { TripRecord, PaginatedResponse } from '../types/auth';
import { PageShell } from '../components/ui/PageShell';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/ui/DataTable';
import type { ColumnDef } from '../components/ui/DataTable';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { StatusPill } from '../components/ui/StatusPill';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function MyTripsPage() {
  const auth = useAuth();
  const [data, setData] = useState<PaginatedResponse<TripRecord> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getMyTrips(auth.accessToken, { status: statusFilter || undefined, page, limit: 20 });
      setData(res.data);
    } catch {
      setError('Failed to load trips.');
    } finally {
      setIsLoading(false);
    }
  }, [auth.accessToken, page, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const columns: ColumnDef<TripRecord>[] = [
    {
      header: 'Trip Number',
      accessor: (row) => <Link to={`/trips/${row.id}`}>{row.tripNumber}</Link>,
    },
    { header: 'Type', accessor: 'tripType' },
    { header: 'Route', accessor: (row) => `${row.originName} → ${row.destinationName}` },
    { header: 'Status', accessor: (row) => <StatusPill status={row.status} /> },
    { header: 'Vehicle', accessor: (row) => row.vehicle?.vehicleNumber ?? '—' },
    { header: 'Date', accessor: (row) => formatDate(row.createdAt) },
  ];

  if (isLoading) return <PageShell><LoadingSkeleton rows={5} columns={6} /></PageShell>;
  if (error) return <PageShell><EmptyState title="Error" message={error} /></PageShell>;

  return (
    <PageShell>
      <PageHeader title="My Trips" description="View your trip history and active trips" />

      <div className="card">
        <div className="table-toolbar">
          <div className="table-toolbar-actions">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="STARTED">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {data && data.items.length > 0 ? (
          <DataTable columns={columns} data={data.items} keyExtractor={(r) => r.id} />
        ) : (
          <EmptyState title="No trips found" message="You don't have any trips yet." />
        )}

        {data && data.pagination.totalPages > 1 && (
          <div className="pagination-controls">
            <button type="button" className="secondary-button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
            <span>Page {data.pagination.page} of {data.pagination.totalPages}</span>
            <button type="button" className="secondary-button" onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))} disabled={page === data.pagination.totalPages}>Next</button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
