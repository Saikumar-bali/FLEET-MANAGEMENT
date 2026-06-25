import { useEffect } from 'react';
import type { DocumentRecord } from '../../types/auth';

type Props = {
  document: DocumentRecord | null;
  onClose: () => void;
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentPreviewModal({ document: doc, onClose }: Props) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="document-preview-modal"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Document Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Title</label>
              <p className="text-sm text-gray-900">{doc.title}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Document Number</label>
              <p className="text-sm text-gray-900">{doc.documentNumber || '--'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Type</label>
              <p className="text-sm text-gray-900">{doc.documentType.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Category</label>
              <p className="text-sm text-gray-900">{doc.documentCategory}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">File Name</label>
              <p className="text-sm text-gray-900">{doc.originalFileName}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">File Size</label>
              <p className="text-sm text-gray-900">{formatFileSize(doc.fileSizeBytes)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">MIME Type</label>
              <p className="text-sm text-gray-900">{doc.mimeType}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Status</label>
              <p className="text-sm text-gray-900">{doc.documentStatus}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Verification</label>
              <p className="text-sm text-gray-900">{doc.verificationStatus}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Uploaded</label>
              <p className="text-sm text-gray-900">{formatDate(doc.createdAt)}</p>
            </div>
            {doc.expiryDate && (
              <div>
                <label className="text-xs font-medium text-gray-500">Expiry Date</label>
                <p className="text-sm text-gray-900">{formatDate(doc.expiryDate)}</p>
              </div>
            )}
            {doc.uploadedBy && (
              <div>
                <label className="text-xs font-medium text-gray-500">Uploaded By</label>
                <p className="text-sm text-gray-900">{doc.uploadedBy.name}</p>
              </div>
            )}
            {doc.vehicle && (
              <div>
                <label className="text-xs font-medium text-gray-500">Vehicle</label>
                <p className="text-sm text-gray-900">{doc.vehicle.vehicleNumber}</p>
              </div>
            )}
            {doc.driver && (
              <div>
                <label className="text-xs font-medium text-gray-500">Driver</label>
                <p className="text-sm text-gray-900">{doc.driver.name}</p>
              </div>
            )}
            {doc.trip && (
              <div>
                <label className="text-xs font-medium text-gray-500">Trip</label>
                <p className="text-sm text-gray-900">{doc.trip.tripNumber}</p>
              </div>
            )}
          </div>

          {doc.description && (
            <div>
              <label className="text-xs font-medium text-gray-500">Description</label>
              <p className="text-sm text-gray-900">{doc.description}</p>
            </div>
          )}

          {doc.mimeType === 'application/pdf' && doc.fileUrl && (
            <div>
              <label className="text-xs font-medium text-gray-500">Preview</label>
              <iframe src={doc.fileUrl} className="w-full h-64 border rounded" title="PDF Preview" />
            </div>
          )}

          {doc.mimeType?.startsWith('image/') && doc.fileUrl && (
            <div>
              <label className="text-xs font-medium text-gray-500">Preview</label>
              <img src={doc.fileUrl} alt={doc.title} className="max-w-full h-auto rounded border" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
