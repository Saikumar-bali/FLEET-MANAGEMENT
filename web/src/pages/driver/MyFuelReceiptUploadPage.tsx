import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageShell } from '../../components/ui/PageShell';
import { API_BASE_URL } from '../../config/api';
import { ApiError } from '../../types/api';

export function MyFuelReceiptUploadPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken || !file) return;
    setIsSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || `Fuel Receipt - ${file.name}`);
      formData.append('documentType', 'FUEL_RECEIPT');
      if (description) formData.append('description', description);

      const res = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.accessToken}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new ApiError(data.message || 'Failed to upload receipt', res.status);
      setSuccess(true);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to upload fuel receipt.');
    } finally { setIsSaving(false); }
  }

  if (success) {
    return (
      <PageShell>
        <div style={{ maxWidth: '500px' }}>
          <div className="success-banner" style={{ marginBottom: 'var(--space-4)' }}>Fuel receipt uploaded successfully.</div>
          <button type="button" className="primary-button" onClick={() => navigate('/my-fuel')}>View Fuel Entries</button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div style={{ maxWidth: '500px' }}>
        <h2 style={{ margin: '0 0 var(--space-4)' }}>Upload Fuel Receipt</h2>
        <p className="helper-text" style={{ marginBottom: 'var(--space-4)' }}>Upload a fuel bill or receipt for your fuel entries.</p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit} className="stack-form" encType="multipart/form-data">
          <label><span className="field-label">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fuel receipt title" />
          </label>
          <label><span className="field-label">File *</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          </label>
          <label><span className="field-label">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional notes about this receipt" />
          </label>
          <div className="button-row">
            <button type="submit" className="primary-button" disabled={isSaving || !file}>{isSaving ? 'Uploading...' : 'Upload Receipt'}</button>
            <button type="button" className="secondary-button" onClick={() => navigate('/my-fuel')}>Cancel</button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
