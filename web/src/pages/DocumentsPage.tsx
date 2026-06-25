import { useEffect, useState, useCallback } from 'react';
import { getDocuments, getDocument, downloadDocument, archiveDocument, deleteDocument as apiDeleteDocument, verifyDocument } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { DocumentRecord } from '../types/auth';
import { PageShell } from '../components/ui/PageShell';
import { DocumentKpiStrip } from '../components/documents/DocumentKpiStrip';
import { DocumentTable } from '../components/documents/DocumentTable';
import { DocumentFilters } from '../components/documents/DocumentFilters';
import { DocumentUploadDrawer } from '../components/documents/DocumentUploadDrawer';
import { DocumentPreviewDrawer } from '../components/documents/DocumentPreviewDrawer';

export function DocumentsPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    search: '',
    documentCategory: '',
    documentType: '',
    status: '',
    verificationStatus: '',
    expiringBefore: '',
  });

  const loadDocuments = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.search) params.search = filters.search;
      if (filters.documentCategory) params.documentCategory = filters.documentCategory;
      if (filters.documentType) params.documentType = filters.documentType;
      if (filters.status) params.status = filters.status;
      if (filters.verificationStatus) params.verificationStatus = filters.verificationStatus;
      if (filters.expiringBefore) params.expiringBefore = filters.expiringBefore;

      if (activeTab === 'vehicles') params.linkedEntityType = 'VEHICLE';
      else if (activeTab === 'drivers') params.linkedEntityType = 'DRIVER';
      else if (activeTab === 'trips') params.linkedEntityType = 'TRIP';
      else if (activeTab === 'compliance') params.documentCategory = 'COMPLIANCE';
      else if (activeTab === 'finance') params.documentCategory = 'FINANCE';
      else if (activeTab === 'fuelbills') params.documentType = 'FUEL_BILL';
      else if (activeTab === 'expiring') {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        params.expiringBefore = d.toISOString();
      } else if (activeTab === 'archived') params.status = 'ARCHIVED';

      const result = await getDocuments(auth.accessToken, params);
      setDocuments(result.data?.items || []);
    } catch {
      showToast('Failed to load documents', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [auth.accessToken, filters, activeTab, showToast]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const handleDownload = async (doc: DocumentRecord) => {
    if (!auth.accessToken) return;
    try {
      const result = await downloadDocument(auth.accessToken, doc.id);
      const data = result.data as any;
      if (data?.url) window.open(data.url, '_blank');
      showToast('Download started', 'success');
    } catch {
      showToast('Download failed', 'error');
    }
  };

  const handleArchive = async (doc: DocumentRecord) => {
    if (!auth.accessToken) return;
    try {
      await archiveDocument(auth.accessToken, doc.id);
      showToast('Document archived', 'success');
      loadDocuments();
    } catch {
      showToast('Archive failed', 'error');
    }
  };

  const handleDelete = async (doc: DocumentRecord) => {
    if (!auth.accessToken || !confirm('Delete this document permanently?')) return;
    try {
      await apiDeleteDocument(auth.accessToken, doc.id);
      showToast('Document deleted', 'success');
      loadDocuments();
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const handleVerify = async (doc: DocumentRecord, status: string) => {
    if (!auth.accessToken) return;
    try {
      await verifyDocument(auth.accessToken, doc.id, status);
      showToast(`Document ${status.toLowerCase()}`, 'success');
      loadDocuments();
    } catch {
      showToast('Verify failed', 'error');
    }
  };

  const allDocs = documents;
  const activeDocs = allDocs.filter((d) => d.documentStatus === 'ACTIVE');
  const pendingCount = activeDocs.filter((d) => d.verificationStatus === 'PENDING').length;
  const expiredCount = activeDocs.filter((d) => d.expiryDate && new Date(d.expiryDate) < new Date()).length;
  const archivedCount = allDocs.filter((d) => d.documentStatus === 'ARCHIVED').length;
  const totalSize = activeDocs.reduce((sum, d) => sum + (d.fileSizeBytes || 0), 0);

  const kpis = [
    { label: 'Total Documents', value: activeDocs.length, variant: 'default' as const },
    { label: 'Pending Verification', value: pendingCount, variant: pendingCount > 0 ? 'warning' as const : 'default' as const },
    { label: 'Expiring Soon', value: expiredCount, variant: expiredCount > 0 ? 'danger' as const : 'default' as const },
    { label: 'Archived', value: archivedCount, variant: 'default' as const },
    { label: 'Storage Used', value: totalSize < 1024 * 1024 ? `${(totalSize / 1024).toFixed(0)} KB` : `${(totalSize / (1024 * 1024)).toFixed(1)} MB`, variant: 'accent' as const },
  ];

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'vehicles', label: 'Vehicles' },
    { key: 'drivers', label: 'Drivers' },
    { key: 'trips', label: 'Trips' },
    { key: 'compliance', label: 'Compliance' },
    { key: 'finance', label: 'Finance' },
    { key: 'fuelbills', label: 'Fuel Bills' },
    { key: 'expiring', label: 'Expiring Soon' },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <PageShell>
      <div className="doc-vault-shell">
        <DocumentKpiStrip items={kpis} />

        <div className="doc-vault-tabs" data-testid="document-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`doc-tab ${activeTab === tab.key ? 'doc-tab-active' : ''}`}
              data-testid={`document-tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <DocumentFilters filters={filters} onChange={setFilters} onUpload={() => setShowUpload(true)} canUpload={auth.hasPermission('documents_upload')} />

        {isLoading ? (
          <div className="doc-loading-skeleton">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="doc-skeleton-row">
                <div className="doc-skeleton-icon" />
                <div className="doc-skeleton-lines">
                  <div className="doc-skeleton-line doc-skeleton-line-long" />
                  <div className="doc-skeleton-line doc-skeleton-line-short" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DocumentTable
            documents={documents}
            onView={async (doc) => {
              if (!auth.accessToken) return;
              try {
                const res = await getDocument(auth.accessToken, doc.id);
                if (res.data) setPreviewDoc(res.data);
                else setPreviewDoc(doc);
              } catch {
                setPreviewDoc(doc);
              }
              setPreviewOpen(true);
            }}
            onDownload={handleDownload}
            onArchive={auth.hasPermission('documents_archive') ? handleArchive : undefined}
            onDelete={auth.hasPermission('documents_delete') ? handleDelete : undefined}
            onVerify={auth.hasPermission('documents_verify') ? handleVerify : undefined}
            canArchive={auth.hasPermission('documents_archive')}
            canDelete={auth.hasPermission('documents_delete')}
            canVerify={auth.hasPermission('documents_verify')}
          />
        )}

        <DocumentUploadDrawer
          open={showUpload}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); loadDocuments(); }}
        />

        <DocumentPreviewDrawer
          document={previewDoc}
          open={previewOpen}
          onClose={() => { setPreviewOpen(false); setPreviewDoc(null); }}
          onDownload={handleDownload}
          onVerify={auth.hasPermission('documents_verify') ? handleVerify : undefined}
          onArchive={auth.hasPermission('documents_archive') ? handleArchive : undefined}
          onDelete={auth.hasPermission('documents_delete') ? handleDelete : undefined}
          canDownload={auth.hasPermission('documents_download')}
          canVerify={auth.hasPermission('documents_verify')}
          canArchive={auth.hasPermission('documents_archive')}
          canDelete={auth.hasPermission('documents_delete')}
        />
      </div>
    </PageShell>
  );
}

export default DocumentsPage;
