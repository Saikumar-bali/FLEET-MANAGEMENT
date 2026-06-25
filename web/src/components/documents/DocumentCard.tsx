import { DocumentTypeIcon } from './DocumentTypeIcon';
import { DocumentVerificationBadge } from './DocumentVerificationBadge';
import { DocumentExpiryBadge } from './DocumentExpiryBadge';
import { DocumentActionsMenu } from './DocumentActionsMenu';
import type { DocumentRecord } from '../../types/auth';

type Props = {
  document: DocumentRecord;
  onView: (doc: DocumentRecord) => void;
  onDownload: (doc: DocumentRecord) => void;
  onArchive?: (doc: DocumentRecord) => void;
  onDelete?: (doc: DocumentRecord) => void;
  onVerify?: (doc: DocumentRecord, status: string) => void;
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
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DocumentCard({ document: doc, onView, onDownload, onArchive, onDelete, onVerify, canArchive, canDelete, canVerify }: Props) {
  return (
    <div className="doc-card" data-testid="document-card">
      <div className="doc-card-header">
        <div className="doc-card-title-row">
          <DocumentTypeIcon mimeType={doc.mimeType} className="doc-card-icon" />
          <div className="doc-card-title-text">
            <span className="doc-card-title">{doc.title}</span>
            <span className="doc-card-subtitle">{doc.documentNumber || doc.originalFileName}</span>
          </div>
        </div>
        <DocumentActionsMenu
          document={doc}
          onView={onView}
          onDownload={onDownload}
          onArchive={onArchive}
          onDelete={onDelete}
          onVerify={onVerify}
          canArchive={canArchive}
          canDelete={canDelete}
          canVerify={canVerify}
        />
      </div>
      <div className="doc-card-meta">
        <span className="doc-card-type">{doc.documentType.replace(/_/g, ' ')}</span>
        <span className="doc-card-size">{formatFileSize(doc.fileSizeBytes)}</span>
        <span className="doc-card-date">{formatDate(doc.createdAt)}</span>
      </div>
      <div className="doc-card-footer">
        <DocumentVerificationBadge status={doc.verificationStatus} />
        <DocumentExpiryBadge expiryDate={doc.expiryDate} />
        {doc.vehicle && <span className="doc-card-linked">{doc.vehicle.vehicleNumber}</span>}
        {doc.driver && <span className="doc-card-linked">{doc.driver.name}</span>}
        {doc.trip && <span className="doc-card-linked">{doc.trip.tripNumber}</span>}
      </div>
    </div>
  );
}
