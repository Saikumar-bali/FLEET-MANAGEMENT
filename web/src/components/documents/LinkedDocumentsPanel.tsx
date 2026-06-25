import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getDocuments, getDocument, downloadDocument, archiveDocument, deleteDocument as apiDeleteDocument, verifyDocument } from '../../services/api';
import { DocumentTable } from './DocumentTable';
import { DocumentUploadDrawer } from './DocumentUploadDrawer';
import { DocumentPreviewDrawer } from './DocumentPreviewDrawer';
import type { DocumentRecord } from '../../types/auth';

type Props = {
  linkedEntityType: string;
  linkedEntityId: string;
  vehicleId?: string;
  driverId?: string;
  tripId?: string;
  customerId?: string;
  vendorId?: string;
  defaultDocumentCategory?: string;
  allowedDocumentTypes?: string[];
  title: string;
  subtitle?: string;
  canUpload?: boolean;
  canDownload?: boolean;
  canArchive?: boolean;
  canDelete?: boolean;
  canVerify?: boolean;
};

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - now.getTime()) / 86400000);
}

export function LinkedDocumentsPanel({
  linkedEntityType,
  linkedEntityId,
  vehicleId,
  driverId,
  tripId,
  customerId: _customerId,
  vendorId: _vendorId,
  defaultDocumentCategory,
  allowedDocumentTypes,
  title,
  subtitle,
  canUpload = false,
  canDownload = true,
  canArchive = false,
  canDelete = false,
  canVerify = false,
}: Props) {
  const auth = useAuth();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      params[`${linkedEntityType.toLowerCase()}Id`] = linkedEntityId;
      const result = await getDocuments(auth.accessToken, params);
      setDocuments(result.data?.items || []);
    } catch {
      showToast('Failed to load documents', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [auth.accessToken, linkedEntityType, linkedEntityId, showToast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

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

  const active = documents.filter((d) => d.documentStatus === 'ACTIVE');
  const verified = active.filter((d) => d.verificationStatus === 'VERIFIED').length;
  const pending = active.filter((d) => d.verificationStatus === 'PENDING').length;
  const expiring = active.filter((d) => d.expiryDate && daysUntil(d.expiryDate) <= 30 && daysUntil(d.expiryDate) >= 0).length;

  return (
    <div className="linked-doc-panel">
      <div className="linked-doc-header">
        <div className="linked-doc-header-text">
          <h3 className="linked-doc-title">{title}</h3>
          {subtitle && <p className="linked-doc-subtitle">{subtitle}</p>}
        </div>
        <div className="linked-doc-header-actions">
          <button className="doc-btn doc-btn-secondary doc-btn-sm" onClick={loadDocuments} disabled={isLoading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            Refresh
          </button>
          {canUpload && (
            <button className="doc-btn doc-btn-primary doc-btn-sm" onClick={() => setShowUpload(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              Upload
            </button>
          )}
        </div>
      </div>

      {documents.length > 0 && (
        <div className="linked-doc-kpi-strip">
          <div className="linked-doc-kpi">
            <span className="linked-doc-kpi-value">{active.length}</span>
            <span className="linked-doc-kpi-label">Total</span>
          </div>
          <div className="linked-doc-kpi">
            <span className="linked-doc-kpi-value">{verified}</span>
            <span className="linked-doc-kpi-label">Verified</span>
          </div>
          <div className="linked-doc-kpi">
            <span className="linked-doc-kpi-value">{expiring}</span>
            <span className="linked-doc-kpi-label">Expiring</span>
          </div>
          <div className="linked-doc-kpi">
            <span className="linked-doc-kpi-value">{pending}</span>
            <span className="linked-doc-kpi-label">Pending</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="doc-loading-skeleton">
          {[1, 2, 3].map((i) => (
            <div key={i} className="doc-skeleton-row">
              <div className="doc-skeleton-icon" />
              <div className="doc-skeleton-lines">
                <div className="doc-skeleton-line doc-skeleton-line-long" />
                <div className="doc-skeleton-line doc-skeleton-line-short" />
              </div>
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="doc-empty-state">
          <svg className="doc-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 12h6M9 8h6" strokeLinecap="round" />
          </svg>
          <p className="doc-empty-label">No documents uploaded yet</p>
          {canUpload && (
            <button className="doc-btn doc-btn-primary doc-btn-sm" onClick={() => setShowUpload(true)}>
              Upload the first document
            </button>
          )}
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
          onArchive={canArchive ? handleArchive : undefined}
          onDelete={canDelete ? handleDelete : undefined}
          onVerify={canVerify ? handleVerify : undefined}
          canArchive={canArchive}
          canDelete={canDelete}
          canVerify={canVerify}
        />
      )}

      <DocumentUploadDrawer
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={() => { setShowUpload(false); loadDocuments(); }}
        allowedTypes={allowedDocumentTypes}
        defaultCategory={defaultDocumentCategory}
        defaultLinkedEntityType={linkedEntityType}
        defaultLinkedEntityId={linkedEntityId}
        defaultVehicleId={vehicleId}
        defaultDriverId={driverId}
        defaultTripId={tripId}
      />

      <DocumentPreviewDrawer
        document={previewDoc}
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewDoc(null); }}
        onDownload={handleDownload}
        onVerify={canVerify ? handleVerify : undefined}
        onArchive={canArchive ? handleArchive : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        canDownload={canDownload}
        canVerify={canVerify}
        canArchive={canArchive}
        canDelete={canDelete}
      />
    </div>
  );
}
