import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listFuelSubmissions, approveFuelSubmission, rejectFuelSubmission, requestChangesFuel } from '../../services/api';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { ReviewActionModal } from './ReviewActionModal';

function statusClass(status: string) {
  switch (status) {
    case 'APPROVED': return 'status-pill status-pill-success';
    case 'REJECTED': return 'status-pill status-pill-danger';
    case 'NEEDS_CHANGES': return 'status-pill status-pill-warning';
    case 'SUBMITTED': return 'status-pill status-pill-info';
    default: return 'status-pill status-pill-default';
  }
}

type FuelItem = {
  id: string; fuelDate: string; totalAmount: number; quantityLiters?: number;
  fuelType: string; status: string; reviewComments?: string;
  vehicle: { vehicleNumber: string }; driver?: { name: string };
};

export function FuelSubmissionsPage() {
  const auth = useAuth();
  const [items, setItems] = useState<FuelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<{ open: boolean; id: string; action: string; title: string; fn: (token: string, id: string, reason?: string) => Promise<unknown> } | null>(null);

  const canApprove = auth.permissions?.includes('driver_fuel_approve');
  const canReview = auth.permissions?.includes('driver_submission_review');

  const loadData = (p: number) => {
    if (!auth.accessToken) return;
    setLoading(true);
    listFuelSubmissions(auth.accessToken, { page: p, limit: 20, status: statusFilter || undefined })
      .then((res) => { setItems((res.data?.items || []) as FuelItem[]); setTotalPages(res.data?.totalPages || 1); })
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

  if (loading && items.length === 0) return <LoadingState message="Loading fuel submissions..." />;
  if (error && items.length === 0) return <ErrorState message={error} onRetry={() => loadData(page)} />;

  return (
    <section className="page-content">
      <PageHeader eyebrow="Driver Submissions" title="Fuel Reviews" description="Review driver fuel entries." />
      <div style={{ marginBottom: '1rem' }}>
        <select className="form-input" style={{ width: 'auto' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="NEEDS_CHANGES">Needs Changes</option>
        </select>
      </div>
      {items.length === 0 ? (
        <div className="state-panel"><div><h3>No fuel submissions</h3><p>No records match the current filter.</p></div></div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date</th><th>Driver</th><th>Vehicle</th><th>Fuel Type</th><th>Qty</th><th>Amount</th><th>Status</th><th>Notes</th>{(canApprove || canReview) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.fuelDate).toLocaleDateString()}</td>
                    <td>{item.driver?.name || '—'}</td>
                    <td>{item.vehicle.vehicleNumber}</td>
                    <td>{item.fuelType}</td>
                    <td>{item.quantityLiters ? `${item.quantityLiters} L` : '—'}</td>
                    <td>{item.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                    <td><span className={statusClass(item.status)}>{item.status}</span></td>
                    <td>{item.reviewComments || '—'}</td>
                    {(canApprove || canReview) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {canApprove && item.status !== 'APPROVED' && (
                            <button type="button" className="primary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                              onClick={() => setModal({ open: true, id: item.id, action: 'Approve', title: 'Approve Fuel Entry', fn: approveFuelSubmission })}>
                              Approve
                            </button>
                          )}
                          {canReview && item.status !== 'REJECTED' && (
                            <button type="button" className="secondary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--color-danger, #dc3545)' }}
                              onClick={() => setModal({ open: true, id: item.id, action: 'Reject', title: 'Reject Fuel Entry', fn: rejectFuelSubmission })}>
                              Reject
                            </button>
                          )}
                          {canReview && item.status !== 'NEEDS_CHANGES' && item.status !== 'APPROVED' && (
                            <button type="button" className="secondary-button" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                              onClick={() => setModal({ open: true, id: item.id, action: 'Request Changes', title: 'Request Changes for Fuel', fn: requestChangesFuel })}>
                              Changes
                            </button>
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
