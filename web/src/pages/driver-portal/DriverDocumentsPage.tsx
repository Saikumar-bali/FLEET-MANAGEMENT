import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyDriverDocuments } from '../../services/api';
import type { DriverPortalDocument } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

const DOC_TYPES = ['VEHICLE_RC', 'VEHICLE_INSURANCE', 'VEHICLE_PERMIT', 'VEHICLE_FITNESS', 'VEHICLE_PUC', 'ROAD_TAX', 'FASTAG', 'AIS140_GPS', 'DRIVER_LICENSE', 'DRIVER_ID_PROOF', 'TRIP_POD', 'TRIP_CHALLAN', 'TRIP_LR', 'TRIP_EWAY_BILL', 'CUSTOMER_PO', 'INVOICE', 'PAYMENT_PROOF', 'FUEL_BILL', 'EXPENSE_BILL', 'MAINTENANCE_BILL', 'REPAIR_BILL', 'VENDOR_DOCUMENT', 'CUSTOMER_DOCUMENT', 'GENERAL'];
const DOC_CATEGORIES = ['VEHICLE', 'DRIVER', 'TRIP', 'COMPLIANCE', 'FINANCE', 'MAINTENANCE', 'REPAIR', 'VENDOR', 'CUSTOMER', 'GENERAL'];

function docStatusClass(status: string) {
  switch (status) {
    case 'VERIFIED': return 'status-pill status-pill-success';
    case 'REJECTED': return 'status-pill status-pill-danger';
    case 'NEEDS_CHANGES': return 'status-pill status-pill-warning';
    case 'PENDING': return 'status-pill status-pill-info';
    default: return 'status-pill status-pill-default';
  }
}

function docStatusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

export function DriverDocumentsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DriverPortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    if (!auth.accessToken) return;
    setPermissions(auth.permissions || []);
  }, [auth.accessToken, auth.permissions]);

  const loadData = (p: number) => {
    if (!auth.accessToken) return;
    setLoading(true);
    getMyDriverDocuments(auth.accessToken, {
      page: p,
      limit: 20,
      ...(filterType ? { documentType: filterType } : {}),
      ...(filterCategory ? { documentCategory: filterCategory } : {}),
    })
      .then((res) => {
        setDocs(res.data?.items || []);
        setTotalPages(res.data?.totalPages || 1);
      })
      .catch((e) => setError(e.message || 'Failed to load documents'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [filterType, filterCategory]);
  useEffect(() => { loadData(page); }, [auth.accessToken, page, filterType, filterCategory]);

  const canUpload = permissions.includes('driver_document_upload');
  const hasFilters = filterType || filterCategory;

  if (loading && docs.length === 0) return <LoadingState message="Loading documents..." />;
  if (error && docs.length === 0) return <ErrorState message={error} onRetry={() => loadData(page)} />;

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Driver Portal"
        title="My Documents"
        description="Documents linked to your profile, trips, vehicles, fuel, and expenses."
        actions={canUpload ? <button type="button" className="primary-button" onClick={() => navigate('/driver-portal/documents/upload')}>Upload Document</button> : undefined}
      />

      <div className="filter-bar" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            {DOC_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <button type="button" className="secondary-button" onClick={() => { setFilterType(''); setFilterCategory(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      {docs.length === 0 ? (
        <div className="state-panel">
          <div>
            <h3>{hasFilters ? 'No matching documents' : 'No documents found'}</h3>
            <p>{hasFilters ? 'No documents match the selected filters.' : 'You have no documents uploaded yet. Upload a document to get started.'}</p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Reviewer Notes</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.title}</td>
                    <td>{doc.documentType.replace(/_/g, ' ')}</td>
                    <td>{doc.documentCategory}</td>
                    <td><span className={docStatusClass(doc.verificationStatus)}>{docStatusLabel(doc.verificationStatus)}</span></td>
                    <td>{(doc as Record<string, unknown>).reviewComments ? String((doc as Record<string, unknown>).reviewComments) : '—'}</td>
                    <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
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
    </section>
  );
}
