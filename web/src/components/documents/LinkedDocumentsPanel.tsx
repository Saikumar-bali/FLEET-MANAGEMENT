import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getDocuments, uploadDocument, downloadDocument, viewDocument, archiveDocument, deleteDocument as apiDeleteDocument, verifyDocument } from '../../services/api';
import { DocumentStatusBadge } from './DocumentStatusBadge';
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

function formatFileSize(bytes: number | null) {
  if (!bytes) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getDaysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  return '📁';
}

export function LinkedDocumentsPanel({
  linkedEntityType,
  linkedEntityId,
  vehicleId,
  driverId,
  tripId,
  customerId,
  vendorId,
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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDocType, setUploadDocType] = useState(allowedDocumentTypes?.[0] || 'GENERAL');
  const [uploadCategory, setUploadCategory] = useState(defaultDocumentCategory || 'GENERAL');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        linkedEntityType,
        linkedEntityId,
        limit: '50',
      };
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

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle.trim() || !auth.accessToken) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle.trim());
      formData.append('documentType', uploadDocType);
      formData.append('documentCategory', uploadCategory);
      formData.append('linkedEntityType', linkedEntityType);
      formData.append('linkedEntityId', linkedEntityId);
      if (vehicleId) formData.append('vehicleId', vehicleId);
      if (driverId) formData.append('driverId', driverId);
      if (tripId) formData.append('tripId', tripId);
      if (customerId) formData.append('customerId', customerId);
      if (vendorId) formData.append('vendorId', vendorId);
      if (uploadDescription) formData.append('description', uploadDescription);
      if (uploadExpiry) formData.append('expiryDate', uploadExpiry);

      await uploadDocument(auth.accessToken, formData);
      showToast('Document uploaded successfully', 'success');
      setShowUpload(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadExpiry('');
      loadDocuments();
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

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
    if (!auth.accessToken || !confirm('Delete this document?')) return;
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

  return (
    <div data-testid="linked-documents-panel">      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadDocuments} className="text-xs text-gray-500 hover:text-gray-700" data-testid="refresh-documents">
            Refresh
          </button>
          {canUpload && (
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              data-testid="upload-linked-document"
            >
              {showUpload ? 'Cancel' : 'Upload'}
            </button>
          )}
        </div>
      </div>

      {showUpload && (
        <div className="mb-4 border border-gray-200 rounded-lg p-4 bg-gray-50" data-testid="linked-upload-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">File *</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setUploadFile(f);
                    if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
                  }
                }}
                className="w-full text-xs"
                data-testid="upload-file-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                placeholder="Document title"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
              <select
                value={uploadDocType}
                onChange={(e) => setUploadDocType(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              >
                {(allowedDocumentTypes || ['GENERAL']).map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={uploadExpiry}
                onChange={(e) => setUploadExpiry(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              >
                {['VEHICLE', 'DRIVER', 'TRIP', 'COMPLIANCE', 'FINANCE', 'MAINTENANCE', 'REPAIR', 'VENDOR', 'CUSTOMER', 'GENERAL'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleUpload}
              disabled={!uploadFile || !uploadTitle.trim() || uploading}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              data-testid="submit-linked-upload"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button
              onClick={() => { setShowUpload(false); setUploadFile(null); }}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500" data-testid="empty-linked-documents">
          <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">No documents uploaded yet</p>
          {canUpload && (
            <button onClick={() => setShowUpload(true)} className="mt-2 text-xs text-blue-600 hover:text-blue-800">
              Upload the first document
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2" data-testid="linked-documents-list">
          {documents.map((doc) => {
            const expiryWarning = doc.expiryDate ? getDaysUntil(doc.expiryDate) : null;
            const isExpiringSoon = expiryWarning !== null && expiryWarning > 0 && expiryWarning <= 30;
            const isExpired = expiryWarning !== null && expiryWarning <= 0;

            return (
              <div key={doc.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
                <span className="text-lg">{getFileIcon(doc.mimeType)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{doc.title}</span>
                    <DocumentStatusBadge status={doc.verificationStatus} />
                    {isExpiringSoon && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-100 text-yellow-800 rounded">
                        Expiring in {expiryWarning}d
                      </span>
                    )}
                    {isExpired && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-800 rounded">
                        Expired
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    <span>{doc.documentType.replace(/_/g, ' ')}</span>
                    <span>{formatFileSize(doc.fileSizeBytes)}</span>
                    {doc.expiryDate && <span>Exp: {formatDate(doc.expiryDate)}</span>}
                    {doc.uploadedBy && <span>by {doc.uploadedBy.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => {
                    if (!auth.accessToken) return;
                    viewDocument(auth.accessToken, doc.id).then((r) => {
                      const data = r.data as any;
                      if (data?.url) window.open(data.url, '_blank');
                    });
                  }} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1">View</button>
                  {canDownload && (
                    <button onClick={() => handleDownload(doc)} className="text-xs text-green-600 hover:text-green-800 px-2 py-1">
                      Download
                    </button>
                  )}
                  {canArchive && doc.documentStatus === 'ACTIVE' && (
                    <button onClick={() => handleArchive(doc)} className="text-xs text-yellow-600 hover:text-yellow-800 px-2 py-1">
                      Archive
                    </button>
                  )}
                  {canVerify && doc.verificationStatus !== 'VERIFIED' && (
                    <button onClick={() => handleVerify(doc, 'VERIFIED')} className="text-xs text-emerald-600 hover:text-emerald-800 px-2 py-1">
                      Verify
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => handleDelete(doc)} className="text-xs text-red-600 hover:text-red-800 px-2 py-1">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
