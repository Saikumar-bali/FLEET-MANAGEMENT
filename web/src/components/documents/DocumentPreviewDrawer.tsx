import { useEffect } from 'react';
import { DocumentTypeIcon } from './DocumentTypeIcon';
import { DocumentVerificationBadge } from './DocumentVerificationBadge';
import { DocumentExpiryBadge } from './DocumentExpiryBadge';
import type { DocumentRecord } from '../../types/auth';

type Props = {
  document: DocumentRecord | null;
  open: boolean;
  onClose: () => void;
  onDownload?: (doc: DocumentRecord) => void;
  onVerify?: (doc: DocumentRecord, status: string) => void;
  onArchive?: (doc: DocumentRecord) => void;
  onDelete?: (doc: DocumentRecord) => void;
  canDownload?: boolean;
  canVerify?: boolean;
  canArchive?: boolean;
  canDelete?: boolean;
};

function formatFileSize(bytes: number | null) {
  if (!bytes) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getLinkedLabel(doc: DocumentRecord) {
  if (doc.vehicle) return `Vehicle: ${doc.vehicle.vehicleNumber}`;
  if (doc.driver) return `Driver: ${doc.driver.name}`;
  if (doc.trip) return `Trip: ${doc.trip.tripNumber}`;
  if (doc.customer) return `Customer: ${doc.customer.name}`;
  if (doc.vendor) return `Vendor: ${doc.vendor.name}`;
  return '--';
}

export function DocumentPreviewDrawer({
  document: doc, open, onClose,
  onDownload, onVerify, onArchive, onDelete,
  canDownload, canVerify, canArchive, canDelete,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !doc) return null;

  return (
    <div className="doc-drawer-overlay" onClick={onClose}>
      <div className="doc-drawer doc-preview-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="doc-drawer-header">
          <div className="doc-preview-header-left">
            <DocumentTypeIcon mimeType={doc.mimeType} className="doc-preview-icon" />
            <div>
              <h2 className="doc-drawer-title">{doc.title}</h2>
              <p className="doc-preview-subtitle">{doc.documentNumber || doc.originalFileName}</p>
            </div>
          </div>
          <button className="doc-drawer-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="doc-drawer-body doc-preview-body">
          <div className="doc-preview-main">
            {doc.mimeType === 'application/pdf' && (doc.fileUrl || doc.storageKey) ? (
              <iframe
                src={doc.fileUrl || ''}
                className="doc-preview-frame"
                title="PDF Preview"
              />
            ) : doc.mimeType?.startsWith('image/') && doc.fileUrl ? (
              <img src={doc.fileUrl} alt={doc.title} className="doc-preview-image" />
            ) : (
              <div className="doc-preview-unsupported">
                <DocumentTypeIcon mimeType={doc.mimeType} className="doc-preview-unsupported-icon" />
                <p>Preview not available for this file type</p>
                {canDownload && (
                  <button className="doc-btn doc-btn-primary" onClick={() => onDownload?.(doc)}>Download to view</button>
                )}
              </div>
            )}
          </div>

          <div className="doc-preview-sidebar">
            <div className="doc-preview-meta-group">
              <h4 className="doc-preview-meta-title">Document Info</h4>
              <div className="doc-preview-meta-row">
                <span className="doc-preview-meta-label">Type</span>
                <span className="doc-preview-meta-value">{doc.documentType.replace(/_/g, ' ')}</span>
              </div>
              <div className="doc-preview-meta-row">
                <span className="doc-preview-meta-label">Category</span>
                <span className="doc-preview-meta-value">{doc.documentCategory}</span>
              </div>
              <div className="doc-preview-meta-row">
                <span className="doc-preview-meta-label">File Name</span>
                <span className="doc-preview-meta-value doc-preview-meta-truncate">{doc.originalFileName}</span>
              </div>
              <div className="doc-preview-meta-row">
                <span className="doc-preview-meta-label">Size</span>
                <span className="doc-preview-meta-value">{formatFileSize(doc.fileSizeBytes)}</span>
              </div>
            </div>

            <div className="doc-preview-meta-group">
              <h4 className="doc-preview-meta-title">Status</h4>
              <div className="doc-preview-meta-row">
                <span className="doc-preview-meta-label">Verification</span>
                <DocumentVerificationBadge status={doc.verificationStatus} />
              </div>
              <div className="doc-preview-meta-row">
                <span className="doc-preview-meta-label">Expiry</span>
                <DocumentExpiryBadge expiryDate={doc.expiryDate} />
                {!doc.expiryDate && <span className="doc-preview-meta-value">No expiry</span>}
              </div>
              <div className="doc-preview-meta-row">
                <span className="doc-preview-meta-label">Linked To</span>
                <span className="doc-preview-meta-value">{getLinkedLabel(doc)}</span>
              </div>
            </div>

            <div className="doc-preview-meta-group">
              <h4 className="doc-preview-meta-title">History</h4>
              <div className="doc-preview-meta-row">
                <span className="doc-preview-meta-label">Uploaded</span>
                <span className="doc-preview-meta-value">{formatDate(doc.createdAt)}</span>
              </div>
              {doc.uploadedBy && (
                <div className="doc-preview-meta-row">
                  <span className="doc-preview-meta-label">By</span>
                  <span className="doc-preview-meta-value">{doc.uploadedBy.name}</span>
                </div>
              )}
              {doc.verifiedAt && (
                <div className="doc-preview-meta-row">
                  <span className="doc-preview-meta-label">Verified</span>
                  <span className="doc-preview-meta-value">{formatDate(doc.verifiedAt)}</span>
                </div>
              )}
            </div>

            {doc.description && (
              <div className="doc-preview-meta-group">
                <h4 className="doc-preview-meta-title">Description</h4>
                <p className="doc-preview-description">{doc.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="doc-drawer-footer">
          {canDownload && <button className="doc-btn doc-btn-secondary" onClick={() => onDownload?.(doc)}>Download</button>}
          {canVerify && doc.verificationStatus !== 'VERIFIED' && (
            <button className="doc-btn doc-btn-success" onClick={() => onVerify?.(doc, 'VERIFIED')}>Verify</button>
          )}
          {canArchive && doc.documentStatus === 'ACTIVE' && (
            <button className="doc-btn doc-btn-warning" onClick={() => onArchive?.(doc)}>Archive</button>
          )}
          {canDelete && (
            <button className="doc-btn doc-btn-danger" onClick={() => onDelete?.(doc)}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}
