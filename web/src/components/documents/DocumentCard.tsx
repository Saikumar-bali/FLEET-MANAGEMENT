import { DocumentStatusBadge } from './DocumentStatusBadge';
import type { DocumentRecord } from '../../types/auth';

type Props = {
  document: DocumentRecord;
  onView: (doc: DocumentRecord) => void;
  onDownload: (doc: DocumentRecord) => void;
  onArchive: (doc: DocumentRecord) => void;
  onDelete: (doc: DocumentRecord) => void;
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

function getFileIcon(mimeType: string | null) {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType?.startsWith('image/')) return '🖼️';
  return '📁';
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    VEHICLE: 'Vehicle',
    DRIVER: 'Driver',
    TRIP: 'Trip',
    COMPLIANCE: 'Compliance',
    FINANCE: 'Finance',
    MAINTENANCE: 'Maintenance',
    REPAIR: 'Repair',
    VENDOR: 'Vendor',
    CUSTOMER: 'Customer',
    GENERAL: 'General',
  };
  return labels[category] || category;
}

export function DocumentCard({ document: doc, onView, onDownload, onArchive, onDelete }: Props) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white" data-testid="document-card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">{getFileIcon(doc.mimeType)}</span>
          <div className="min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
            <p className="text-xs text-gray-500 truncate">{doc.documentNumber || doc.originalFileName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DocumentStatusBadge status={doc.documentStatus} />
          <DocumentStatusBadge status={doc.verificationStatus} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div><span className="font-medium">Type:</span> {doc.documentType.replace(/_/g, ' ')}</div>
        <div><span className="font-medium">Category:</span> {getCategoryLabel(doc.documentCategory)}</div>
        <div><span className="font-medium">Size:</span> {formatFileSize(doc.fileSizeBytes)}</div>
        <div><span className="font-medium">Uploaded:</span> {formatDate(doc.createdAt)}</div>
        {doc.expiryDate && (
          <div><span className="font-medium">Expires:</span> {formatDate(doc.expiryDate)}</div>
        )}
        {doc.uploadedBy && (
          <div><span className="font-medium">By:</span> {doc.uploadedBy.name}</div>
        )}
        {doc.vehicle && (
          <div><span className="font-medium">Vehicle:</span> {doc.vehicle.vehicleNumber}</div>
        )}
        {doc.driver && (
          <div><span className="font-medium">Driver:</span> {doc.driver.name}</div>
        )}
        {doc.trip && (
          <div><span className="font-medium">Trip:</span> {doc.trip.tripNumber}</div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
        <button onClick={() => onView(doc)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
          View
        </button>
        <button onClick={() => onDownload(doc)} className="text-xs text-green-600 hover:text-green-800 font-medium">
          Download
        </button>
        {doc.documentStatus === 'ACTIVE' && (
          <button onClick={() => onArchive(doc)} className="text-xs text-yellow-600 hover:text-yellow-800 font-medium">
            Archive
          </button>
        )}
        <button onClick={() => onDelete(doc)} className="text-xs text-red-600 hover:text-red-800 font-medium">
          Delete
        </button>
      </div>
    </div>
  );
}
