import { useState, useRef, useEffect } from 'react';
import { uploadDocument } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DocumentTypeIcon } from './DocumentTypeIcon';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allowedTypes?: string[];
  defaultCategory?: string;
  defaultLinkedEntityType?: string;
  defaultLinkedEntityId?: string;
  defaultVehicleId?: string;
  defaultDriverId?: string;
  defaultTripId?: string;
  defaultStaffProfileId?: string;
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

const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'pif', 'vbs', 'js', 'mjs', 'cjs', 'ws', 'wsh',
  'ps1', 'psm1', 'psd1', 'sh', 'bash', 'csh', 'ksh', 'zsh', 'fish', 'php', 'py', 'rb', 'pl',
  'jar', 'apk', 'app', 'deb', 'rpm', 'dmg', 'iso', 'dll', 'sys', 'reg', 'lnk', 'hta',
]);
const MAX_SIZE = 10 * 1024 * 1024;

function fileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

export function DocumentUploadDrawer({
  open, onClose, onSuccess,
  allowedTypes,
  defaultCategory,
  defaultLinkedEntityType,
  defaultLinkedEntityId,
  defaultVehicleId,
  defaultDriverId,
  defaultTripId,
  defaultStaffProfileId,
}: Props) {
  const auth = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState(allowedTypes?.[0] || 'GENERAL');
  const [documentCategory, setDocumentCategory] = useState(defaultCategory || 'GENERAL');
  const [expiryDate, setExpiryDate] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null);
      setTitle('');
      setDescription('');
      setDocumentType(allowedTypes?.[0] || 'GENERAL');
      setDocumentCategory(defaultCategory || 'GENERAL');
      setExpiryDate('');
      setTags('');
    }
  }, [open, allowedTypes, defaultCategory]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleFileSelect = (selected: File) => {
    const ext = fileExtension(selected.name);
    if (!ext) {
      showToast('File must have an extension', 'error');
      return;
    }
    if (BLOCKED_EXTENSIONS.has(ext)) {
      showToast(`.${ext} files are blocked for security`, 'error');
      return;
    }
    if (selected.size > MAX_SIZE) {
      showToast('File size exceeds 10MB limit', 'error');
      return;
    }
    setFile(selected);
    if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
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
      if (expiryDate) formData.append('expiryDate', expiryDate);
      if (tags) formData.append('tags', tags);
      if (defaultLinkedEntityType) formData.append('linkedEntityType', defaultLinkedEntityType);
      if (defaultLinkedEntityId) formData.append('linkedEntityId', defaultLinkedEntityId);
      if (defaultVehicleId) formData.append('vehicleId', defaultVehicleId);
      if (defaultDriverId) formData.append('driverId', defaultDriverId);
      if (defaultTripId) formData.append('tripId', defaultTripId);
      if (defaultStaffProfileId) formData.append('staffProfileId', defaultStaffProfileId);

      await uploadDocument(auth.accessToken, formData);
      showToast('Document uploaded successfully', 'success');
      onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="doc-drawer-overlay" onClick={onClose}>
      <div className="doc-drawer doc-upload-drawer" ref={drawerRef} onClick={(e) => e.stopPropagation()}>
        <div className="doc-drawer-header">
          <h2 className="doc-drawer-title">Upload Document</h2>
          <button className="doc-drawer-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="doc-drawer-body">
          <div
            className={`doc-dropzone ${dragOver ? 'doc-dropzone-active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="doc-dropzone-input"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
            {file ? (
              <div className="doc-dropzone-selected">
                <DocumentTypeIcon mimeType={file.type} className="doc-dropzone-icon" />
                <div className="doc-dropzone-file-info">
                  <span className="doc-dropzone-file-name">{file.name}</span>
                  <span className="doc-dropzone-file-size">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button className="doc-dropzone-remove" onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remove</button>
              </div>
            ) : (
              <div className="doc-dropzone-empty">
                <svg className="doc-dropzone-icon-empty" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="doc-dropzone-label">Drag and drop a file here, or click to browse</p>
                <p className="doc-dropzone-hint">PDF, images including AVIF, Office files, sheets, CSV, text, and receipts up to 10MB. Executable/script files are blocked.</p>
              </div>
            )}
          </div>

          <div className="doc-form-section">
            <h3 className="doc-form-section-title">Basic Details</h3>
            <div className="doc-form-grid">
              <div className="doc-form-field">
                <label className="doc-form-label">Title *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="doc-form-input" placeholder="Document title" />
              </div>
              <div className="doc-form-field">
                <label className="doc-form-label">Description</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="doc-form-input" placeholder="Optional description" />
              </div>
            </div>
          </div>

          <div className="doc-form-section">
            <h3 className="doc-form-section-title">Classification</h3>
            <div className="doc-form-grid">
              <div className="doc-form-field">
                <label className="doc-form-label">Document Type</label>
                <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="doc-form-select">
                  {(allowedTypes || DOC_TYPES).map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="doc-form-field">
                <label className="doc-form-label">Category</label>
                <select value={documentCategory} onChange={(e) => setDocumentCategory(e.target.value)} className="doc-form-select">
                  {DOC_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="doc-form-section">
            <h3 className="doc-form-section-title">Validity</h3>
            <div className="doc-form-grid">
              <div className="doc-form-field">
                <label className="doc-form-label">Expiry Date</label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="doc-form-input" />
              </div>
              <div className="doc-form-field">
                <label className="doc-form-label">Tags (comma-separated)</label>
                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="doc-form-input" placeholder="e.g. insurance, annual" />
              </div>
            </div>
          </div>
        </div>

        <div className="doc-drawer-footer">
          <button onClick={onClose} className="doc-btn doc-btn-secondary">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!file || !title.trim() || uploading}
            className="doc-btn doc-btn-primary"
          >
            {uploading ? (
              <span className="doc-btn-loading">
                <span className="doc-spinner" /> Uploading...
              </span>
            ) : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
