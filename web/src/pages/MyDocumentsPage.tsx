import { useEffect, useState, useCallback } from 'react';
import { getMyDocuments } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { DocumentRecord, PaginatedResponse } from '../types/auth';
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

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MyDocumentsPage() {
  const auth = useAuth();
  const [data, setData] = useState<PaginatedResponse<DocumentRecord> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getMyDocuments(auth.accessToken, { page, limit: 20 });
      setData(res.data);
    } catch {
      setError('Failed to load documents.');
    } finally {
      setIsLoading(false);
    }
  }, [auth.accessToken, page]);

  useEffect(() => { void load(); }, [load]);

  const columns: ColumnDef<DocumentRecord>[] = [
    { header: 'Title', accessor: 'title' },
    { header: 'Type', accessor: 'documentType' },
    { header: 'Category', accessor: 'documentCategory' },
    { header: 'Status', accessor: (row) => <StatusPill status={row.verificationStatus} /> },
    { header: 'Size', accessor: (row) => formatFileSize(row.fileSizeBytes) },
    { header: 'Expiry', accessor: (row) => row.expiryDate ? formatDate(row.expiryDate) : '—' },
    { header: 'Uploaded', accessor: (row) => formatDate(row.createdAt) },
  ];

  if (isLoading) return <PageShell><LoadingSkeleton rows={5} columns={7} /></PageShell>;
  if (error) return <PageShell><EmptyState title="Error" message={error} /></PageShell>;

  return (
    <PageShell>
      <PageHeader title="My Documents" description="View your uploaded documents and files" />

      <div className="card">
        {data && data.items.length > 0 ? (
          <DataTable columns={columns} data={data.items} keyExtractor={(r) => r.id} />
        ) : (
          <EmptyState title="No documents found" message="You don't have any documents yet." />
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
