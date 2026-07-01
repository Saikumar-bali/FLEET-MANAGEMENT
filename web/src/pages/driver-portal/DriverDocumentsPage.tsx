import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyDriverDocuments } from '../../services/api';
import type { DriverPortalDocument } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

export function DriverDocumentsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DriverPortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.accessToken) return;
    setPermissions(auth.permissions || []);
  }, [auth.accessToken, auth.permissions]);

  const loadData = (p: number) => {
    if (!auth.accessToken) return;
    setLoading(true);
    getMyDriverDocuments(auth.accessToken, { page: p, limit: 20 })
      .then((res) => {
        setDocs(res.data?.items || []);
        setTotalPages(res.data?.totalPages || 1);
      })
      .catch((e) => setError(e.message || 'Failed to load documents'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(page); }, [auth.accessToken, page]);

  const canUpload = permissions.includes('driver_document_upload');

  if (loading && docs.length === 0) return <LoadingState message="Loading documents..." />;
  if (error && docs.length === 0) return <ErrorState message={error} onRetry={() => loadData(page)} />;

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Driver Portal"
        title="My Documents"
        description="Documents uploaded by you."
        actions={canUpload ? <button type="button" className="primary-button" onClick={() => navigate('/driver-portal/documents/upload')}>Upload Document</button> : undefined}
      />

      {docs.length === 0 ? (
        <div className="state-panel">
          <div>
            <h3>No documents found</h3>
            <p>You have no documents uploaded yet.</p>
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
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.title}</td>
                    <td>{doc.documentType.replace(/_/g, ' ')}</td>
                    <td>{doc.documentCategory}</td>
                    <td><span className="status-badge">{doc.verificationStatus}</span></td>
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
