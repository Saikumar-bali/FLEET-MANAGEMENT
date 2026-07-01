import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listDocumentSubmissions, verifyDocumentSubmission, rejectDocumentSubmission, requestChangesDocument } from '../../services/api';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { ReviewActionModal } from './ReviewActionModal';

function statusClass(status: string) {
  switch (status) {
    case 'VERIFIED': return 'status-pill status-pill-success';
    case 'REJECTED': return 'status-pill status-pill-danger';
    case 'NEEDS_CHANGES': return 'status-pill status-pill-warning';
    case 'PENDING': return 'status-pill status-pill-info';
    default: return 'status-pill status-pill-default';
  }
}

type DocItem = {
  id: string; title: string; documentType: string; documentCategory: string;
  verificationStatus: string; reviewComments?: string; createdAt: string;
  driver?: { name: string }; vehicle?: { vehicleNumber: string };
};

export function DocumentSubmissionsPage() {
  const auth = useAuth();
  const [items, setItems] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<{ open: boolean; id: string; action: string; title: string; fn: (token: string, id: string, reason?: string) => Promise<unknown> } | null>(null);

  const canVerify = auth.permissions?.includes('driver_document_verify');
  const canReview = auth.permissions?.includes('driver_submission_review');

  const loadData = (p: number) => {
    if (!auth.accessToken) return;
    setLoading(true);
    listDocumentSubmissions(auth.accessToken, { page: p, limit: 20, status: statusFilter || undefined })
      .then((res) => { setItems((res.data?.items || []) as DocItem[]); setTotalPages(res.data?.totalPages || 1); })
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(page); }, [auth.accessToken, page, statusFilter]);

  const handleAction = async (reason: string) => {
    if (!modal || !auth.accessToken) return;
    await modal.fn(auth.accessToken, modal.id, reason);
    setModal(null);
    loadData(page);
  };

  if (loading && items.length === 0) return <LoadingState message="Loading document submissions..." />;
  if (error && items.length === 0) return <ErrorState message={error} onRetry={() => loadData(page)} />;

  return (
    <section className="page-content">
      <PageHeader eyebrow="Driver Submissions" title="Document Reviews" description="Review driver uploaded documents." />
      <div style={{ marginBottom: '1rem' }}>
        <select className="form-input" style={{ width: 'auto' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option><option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option><option value="NEEDS_CHANGES">Needs Changes</option>
        </select>
      </div>
      {items.length === 0 ? (
        <div className="state-panel"><div><h3>No document submissions</h3><p>No records match the current filter.</p></div></div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead><tr><th>Title</th><th>Driver</th><th>Vehicle</th><th>Type</th><th>Category</th><th>Status</th><th>Notes</th>{(canVerify || canReview) && <th>Actions</th>}</tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{item.driver?.name || '—'}</td>
                    <td>{item.vehicle?.vehicleNumber || '—'}</td>
                    <td>{item.documentType.replace(/_/g, ' ')}</td>
                    <td>{item.documentCategory}</td>
                    <td><span className={statusClass(item.verificationStatus)}>{item.verificationStatus}</span></td>
                    <td>{item.reviewComments || '—'}</td>
                    {(canVerify || canReview) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {canVerify && item.verificationStatus !== 'VERIFIED' && (
                            <button type="button" className="primary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                              onClick={() => setModal({ open: true, id: item.id, action: 'Verify', title: 'Verify Document', fn: verifyDocumentSubmission })}>Verify</button>
                          )}
                          {canReview && item.verificationStatus !== 'REJECTED' && (
                            <button type="button" className="secondary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--color-danger, #dc3545)' }}
                              onClick={() => setModal({ open: true, id: item.id, action: 'Reject', title: 'Reject Document', fn: rejectDocumentSubmission })}>Reject</button>
                          )}
                          {canReview && item.verificationStatus !== 'NEEDS_CHANGES' && item.verificationStatus !== 'VERIFIED' && (
                            <button type="button" className="secondary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                              onClick={() => setModal({ open: true, id: item.id, action: 'Request Changes', title: 'Request Changes for Document', fn: requestChangesDocument })}>Changes</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" className="secondary-button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span style={{ padding: '0.5rem 1rem' }}>Page {page} of {totalPages}</span>
              <button type="button" className="secondary-button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
      {modal && <ReviewActionModal open={modal.open} title={modal.title} actionLabel={modal.action} onClose={() => setModal(null)} onSubmit={handleAction} />}
    </section>
  );
}
