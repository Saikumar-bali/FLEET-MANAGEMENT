import { DocumentCard } from './DocumentCard';
import type { DocumentRecord } from '../../types/auth';

type Props = {
  documents: DocumentRecord[];
  onView: (doc: DocumentRecord) => void;
  onDownload: (doc: DocumentRecord) => void;
  onArchive?: (doc: DocumentRecord) => void;
  onDelete?: (doc: DocumentRecord) => void;
  onVerify?: (doc: DocumentRecord, status: string) => void;
  canArchive?: boolean;
  canDelete?: boolean;
  canVerify?: boolean;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
};

export function DocumentList({ documents, onView, onDownload, onArchive, onDelete, onVerify, canArchive, canDelete, canVerify, emptyMessage, emptyAction }: Props) {
  if (documents.length === 0) {
    return (
      <div className="doc-empty-state" data-testid="documents-empty">
        <svg className="doc-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 12h6M9 8h6M9 16h4" strokeLinecap="round" />
        </svg>
        <p className="doc-empty-label">{emptyMessage || 'No documents found'}</p>
        <p className="doc-empty-hint">Upload a document to get started</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="doc-card-grid" data-testid="document-list">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
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
      ))}
    </div>
  );
}
