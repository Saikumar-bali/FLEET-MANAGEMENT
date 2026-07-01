import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listInspectionSubmissions, reviewInspection, rejectInspectionSubmission, requestChangesInspection } from '../../services/api';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { ReviewActionModal } from './ReviewActionModal';

function statusClass(status: string) {
  switch (status) {
    case 'REVIEWED': return 'status-pill status-pill-success';
    case 'REJECTED': return 'status-pill status-pill-danger';
    case 'NEEDS_CHANGES': return 'status-pill status-pill-warning';
    case 'SUBMITTED': return 'status-pill status-pill-info';
    default: return 'status-pill status-pill-default';
  }
}

type InspectionItem = {
  id: string; inspectionDate: string; inspectionType: string; overallStatus: string;
  reviewStatus: string; reviewComments?: string;
  vehicle: { vehicleNumber: string }; driver: { name: string };
};

export function InspectionSubmissionsPage() {
  const auth = useAuth();
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<{ open: boolean; id: string; action: string; title: string; fn: (token: string, id: string, reason?: string) => Promise<unknown> } | null>(null);

  const canReview = auth.permissions?.includes('driver_inspection_review');

  const loadData = (p: number) => {
    if (!auth.accessToken) return;
    setLoading(true);
    listInspectionSubmissions(auth.accessToken, { page: p, limit: 20, status: statusFilter || undefined })
      .then((res) => { setItems((res.data?.items || []) as InspectionItem[]); setTotalPages(res.data?.totalPages || 1); })
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

  if (loading && items.length === 0) return <LoadingState message="Loading inspection submissions..." />;
  if (error && items.length === 0) return <ErrorState message={error} onRetry={() => loadData(page)} />;

  return (
    <section className="page-content">
      <PageHeader eyebrow="Driver Submissions" title="Inspection Reviews" description="Review driver vehicle inspections." />
      <div style={{ marginBottom: '1rem' }}>
        <select className="form-input" style={{ width: 'auto' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="SUBMITTED">Submitted</option><option value="REVIEWED">Reviewed</option>
          <option value="REJECTED">Rejected</option><option value="NEEDS_CHANGES">Needs Changes</option>
        </select>
      </div>
      {items.length === 0 ? (
        <div className="state-panel"><div><h3>No inspection submissions</h3><p>No records match the current filter.</p></div></div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead><tr><th>Date</th><th>Driver</th><th>Vehicle</th><th>Type</th><th>Result</th><th>Review Status</th><th>Notes</th>{canReview && <th>Actions</th>}</tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.inspectionDate).toLocaleDateString()}</td>
                    <td>{item.driver.name}</td>
                    <td>{item.vehicle.vehicleNumber}</td>
                    <td>{item.inspectionType}</td>
                    <td>{item.overallStatus}</td>
                    <td><span className={statusClass(item.reviewStatus)}>{item.reviewStatus}</span></td>
                    <td>{item.reviewComments || '—'}</td>
                    {canReview && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {item.reviewStatus !== 'REVIEWED' && (
                            <button type="button" className="primary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                              onClick={() => setModal({ open: true, id: item.id, action: 'Review', title: 'Review Inspection', fn: reviewInspection })}>Review</button>
                          )}
                          {item.reviewStatus !== 'REJECTED' && (
                            <button type="button" className="secondary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--color-danger, #dc3545)' }}
                              onClick={() => setModal({ open: true, id: item.id, action: 'Reject', title: 'Reject Inspection', fn: rejectInspectionSubmission })}>Reject</button>
                          )}
                          {item.reviewStatus !== 'NEEDS_CHANGES' && item.reviewStatus !== 'REVIEWED' && (
                            <button type="button" className="secondary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                              onClick={() => setModal({ open: true, id: item.id, action: 'Request Changes', title: 'Request Changes for Inspection', fn: requestChangesInspection })}>Changes</button>
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
