import { useEffect, useState, useCallback } from 'react';
import { getDocuments, downloadDocument, archiveDocument, deleteDocument as apiDeleteDocument } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { DocumentRecord } from '../types/auth';
import { PageShell } from '../components/ui/PageShell';
import { PageHeader } from '../components/PageHeader';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { DocumentUploadPanel } from '../components/documents/DocumentUploadPanel';
import { DocumentList } from '../components/documents/DocumentList';
import { DocumentFilters } from '../components/documents/DocumentFilters';
import { DocumentPreviewModal } from '../components/documents/DocumentPreviewModal';

export function DocumentsPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
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

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleDownload = async (doc: DocumentRecord) => {
    if (!auth.accessToken) return;
    try {
      const result = await downloadDocument(auth.accessToken, doc.id);
      const data = result.data as any;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
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
    if (!auth.accessToken) return;
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await apiDeleteDocument(auth.accessToken, doc.id);
      showToast('Document deleted', 'success');
      loadDocuments();
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'vehicles', label: 'Vehicles' },
    { key: 'drivers', label: 'Drivers' },
    { key: 'trips', label: 'Trips' },
    { key: 'compliance', label: 'Compliance' },
    { key: 'finance', label: 'Finance' },
    { key: 'expiring', label: 'Expiring Soon' },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Documents Vault"
        description="Store and manage fleet documents, compliance files, invoices, proofs, and trip papers."
        actions={
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            data-testid="upload-document-button"
          >
            {showUpload ? 'Close Upload' : 'Upload Document'}
          </button>
        }
      />

      {showUpload && (
        <div className="mb-6">
          <DocumentUploadPanel
            onSuccess={() => { setShowUpload(false); loadDocuments(); }}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      <div className="mb-4">
        <DocumentFilters filters={filters} onChange={setFilters} />
      </div>

      <div className="mb-4 border-b border-gray-200">
        <nav className="flex gap-1 -mb-px" data-testid="document-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid={`document-tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <DocumentList
          documents={documents}
          onView={setPreviewDoc}
          onDownload={handleDownload}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      )}

      <DocumentPreviewModal document={previewDoc} onClose={() => setPreviewDoc(null)} />
    </PageShell>
  );
}

export default DocumentsPage;
