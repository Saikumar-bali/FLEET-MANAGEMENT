import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyDriverDocuments } from '../../services/api';
import type { DriverPortalDocument } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

export function DriverDocumentsPage() {
  const auth = useAuth();
  const [documents, setDocuments] = useState<DriverPortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadDocs = (p: number) => {
    if (!auth.accessToken) return;
    setLoading(true);
    getMyDriverDocuments(auth.accessToken, { page: p, limit: 20 })
      .then((res) => {
        setDocuments(res.data?.items || []);
        setTotalPages(res.data?.totalPages || 1);
      })
      .catch((e) => setError(e.message || 'Failed to load documents'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDocs(page); }, [auth.accessToken, page]);

  if (loading && documents.length === 0) return <LoadingState message="Loading your documents..." />;
  if (error && documents.length === 0) return <ErrorState message={error} onRetry={() => loadDocs(page)} />;

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Driver Portal"
        title="My Documents"
        description="Documents linked to your driver profile."
      />

      {documents.length === 0 ? (
        <div className="state-panel">
          <div>
            <h3>No documents found</h3>
            <p>No documents are linked to your profile yet.</p>
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
                  <th>Expiry</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.title}</td>
                    <td>{doc.documentType}</td>
                    <td>{doc.documentCategory}</td>
                    <td>{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '—'}</td>
                    <td><span className="status-badge">{doc.verificationStatus}</span></td>
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
