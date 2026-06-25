import { DocumentCard } from './DocumentCard';
import type { DocumentRecord } from '../../types/auth';

type Props = {
  documents: DocumentRecord[];
  onView: (doc: DocumentRecord) => void;
  onDownload: (doc: DocumentRecord) => void;
  onArchive: (doc: DocumentRecord) => void;
  onDelete: (doc: DocumentRecord) => void;
};

export function DocumentList({ documents, onView, onDownload, onArchive, onDelete }: Props) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500" data-testid="documents-empty">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="mt-2 text-sm">No documents found</p>
        <p className="mt-1 text-xs">Upload a document to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="document-list">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onView={onView}
          onDownload={onDownload}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
