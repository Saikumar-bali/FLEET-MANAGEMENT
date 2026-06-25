import { useState, useRef } from 'react';
import { uploadDocument } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

const DOC_TYPES = [
  'VEHICLE_RC', 'VEHICLE_INSURANCE', 'VEHICLE_PERMIT', 'VEHICLE_FITNESS', 'VEHICLE_PUC',
  'ROAD_TAX', 'FASTAG', 'AIS140_GPS', 'DRIVER_LICENSE', 'DRIVER_ID_PROOF',
  'TRIP_POD', 'TRIP_CHALLAN', 'TRIP_LR', 'TRIP_EWAY_BILL',
  'CUSTOMER_PO', 'INVOICE', 'PAYMENT_PROOF', 'FUEL_BILL', 'EXPENSE_BILL',
  'MAINTENANCE_BILL', 'REPAIR_BILL', 'VENDOR_DOCUMENT', 'CUSTOMER_DOCUMENT', 'GENERAL',
];

const DOC_CATEGORIES = [
  'VEHICLE', 'DRIVER', 'TRIP', 'COMPLIANCE', 'FINANCE',
  'MAINTENANCE', 'REPAIR', 'VENDOR', 'CUSTOMER', 'GENERAL',
];

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024;

export function DocumentUploadPanel({ onSuccess, onCancel }: Props) {
  const auth = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState('GENERAL');
  const [documentCategory, setDocumentCategory] = useState('GENERAL');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (selected: File) => {
    if (!ALLOWED_TYPES.includes(selected.type)) {
      showToast('Only PDF, JPEG, PNG, and WebP files are allowed', 'error');
      return;
    }
    if (selected.size > MAX_SIZE) {
      showToast('File size exceeds 10MB limit', 'error');
      return;
    }
    setFile(selected);
    if (!title) {
      setTitle(selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleSubmit = async () => {
    if (!file || !title.trim() || !auth.accessToken) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('documentType', documentType);
      formData.append('documentCategory', documentCategory);
      if (description) formData.append('description', description);
      if (issueDate) formData.append('issueDate', issueDate);
      if (expiryDate) formData.append('expiryDate', expiryDate);
      if (tags) formData.append('tags', tags);

      await uploadDocument(auth.accessToken, formData);
      showToast('Document uploaded successfully', 'success');
      onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6" data-testid="document-upload-panel">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="file-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelect(f);
          }}
        />
        {file ? (
          <div>
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm text-gray-600">Drag and drop a file here, or click to select</p>
            <p className="mt-1 text-xs text-gray-500">PDF, JPEG, PNG, WebP up to 10MB</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Document title"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Document Type *</label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
          <select
            value={documentCategory}
            onChange={(e) => setDocumentCategory(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {DOC_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Optional description"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Issue Date</label>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. insurance, annual, vehicle-123"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!file || !title.trim() || uploading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          data-testid="upload-submit-button"
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
