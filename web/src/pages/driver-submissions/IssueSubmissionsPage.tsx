import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listIssueSubmissions, acknowledgeIssue, resolveIssue, rejectIssueSubmission } from '../../services/api';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { ReviewActionModal } from './ReviewActionModal';

function statusClass(status: string) {
  switch (status) {
    case 'RESOLVED': return 'status-pill status-pill-success';
    case 'REJECTED': return 'status-pill status-pill-danger';
    case 'ACKNOWLEDGED': return 'status-pill status-pill-info';
    case 'IN_PROGRESS': return 'status-pill status-pill-warning';
    case 'OPEN': return 'status-pill status-pill-default';
    default: return 'status-pill status-pill-default';
  }
}

type IssueItem = {
  id: string; title: string; description?: string; severity: string; status: string;
  reviewComments?: string; reportedAt: string;
  vehicle: { vehicleNumber: string }; driver: { name: string };
};

export function IssueSubmissionsPage() {
  const auth = useAuth();
  const [items, setItems] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<{ open: boolean; id: string; action: string; title: string; fn: (token: string, id: string, reason?: string) => Promise<unknown> } | null>(null);

  const canReview = auth.permissions?.includes('driver_issue_review');

  const loadData = (p: number) => {
    if (!auth.accessToken) return;
    setLoading(true);
    listIssueSubmissions(auth.accessToken, { page: p, limit: 20, status: statusFilter || undefined })
      .then((res) => { setItems((res.data?.items || []) as IssueItem[]); setTotalPages(res.data?.totalPages || 1); })
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

  if (loading && items.length === 0) return <LoadingState message="Loading issue submissions..." />;
  if (error && items.length === 0) return <ErrorState message={error} onRetry={() => loadData(page)} />;

  return (
    <section className="page-content">
      <PageHeader eyebrow="Driver Submissions" title="Vehicle Issue Reviews" description="Review driver-reported vehicle issues." />
      <div style={{ marginBottom: '1rem' }}>
        <select className="form-input" style={{ width: 'auto' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option><option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="IN_PROGRESS">In Progress</option><option value="RESOLVED">Resolved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
      {items.length === 0 ? (
        <div className="state-panel"><div><h3>No issue submissions</h3><p>No records match the current filter.</p></div></div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead><tr><th>Reported</th><th>Driver</th><th>Vehicle</th><th>Title</th><th>Severity</th><th>Status</th><th>Notes</th>{canReview && <th>Actions</th>}</tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.reportedAt).toLocaleDateString()}</td>
                    <td>{item.driver.name}</td>
                    <td>{item.vehicle.vehicleNumber}</td>
                    <td>{item.title}</td>
                    <td>{item.severity}</td>
                    <td><span className={statusClass(item.status)}>{item.status}</span></td>
                    <td>{item.reviewComments || '—'}</td>
                    {canReview && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {item.status === 'OPEN' && (
                            <button type="button" className="primary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                              onClick={() => setModal({ open: true, id: item.id, action: 'Acknowledge', title: 'Acknowledge Issue', fn: acknowledgeIssue })}>Acknowledge</button>
                          )}
                          {(item.status === 'ACKNOWLEDGED' || item.status === 'IN_PROGRESS') && (
                            <button type="button" className="primary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                              onClick={() => setModal({ open: true, id: item.id, action: 'Resolve', title: 'Resolve Issue', fn: resolveIssue })}>Resolve</button>
                          )}
                          {item.status !== 'REJECTED' && item.status !== 'RESOLVED' && (
                            <button type="button" className="secondary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--color-danger, #dc3545)' }}
                              onClick={() => setModal({ open: true, id: item.id, action: 'Reject', title: 'Reject Issue', fn: rejectIssueSubmission })}>Reject</button>
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
