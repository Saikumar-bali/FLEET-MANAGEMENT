import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createDriver, getDriver, updateDriver, updateDriverStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { DriverRecord } from '../types/auth';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { LinkedDocumentsPanel } from '../components/documents/LinkedDocumentsPanel';

type DriverForm = {
  name: string;
  mobile: string;
  alternateMobile: string;
  licenseNumber: string;
  licenseExpiry: string;
  address: string;
  emergencyContact: string;
  experienceYears: string;
};

const initialForm: DriverForm = {
  name: '',
  mobile: '',
  alternateMobile: '',
  licenseNumber: '',
  licenseExpiry: '',
  address: '',
  emergencyContact: '',
  experienceYears: '',
};

type SectionTab = 'personal' | 'license' | 'documents' | 'status';

const sectionTabs: { key: SectionTab; label: string }[] = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'license', label: 'License' },
  { key: 'documents', label: 'Documents' },
  { key: 'status', label: 'Status' },
];

export function DriverDetailPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const auth = useAuth();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<DriverRecord | null>(null);
  const [form, setForm] = useState<DriverForm>(initialForm);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionTab>('personal');
  const [statusValue, setStatusValue] = useState('');

  useEffect(() => {
    if (isNew || !id) return;
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getDriver(auth.accessToken, id);
        setDriver(response.data);
        setStatusValue(response.data.status);
        setForm({
          name: response.data.name,
          mobile: response.data.mobile,
          alternateMobile: response.data.alternateMobile ?? '',
          licenseNumber: response.data.licenseNumber,
          licenseExpiry: response.data.licenseExpiry ?? '',
          address: response.data.address ?? '',
          emergencyContact: response.data.emergencyContact ?? '',
          experienceYears: response.data.experienceYears?.toString() ?? '',
        });
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setError(caughtError.message);
        else setError('Failed to load driver.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken, id, isNew]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        mobile: form.mobile,
        licenseNumber: form.licenseNumber,
      };
      if (form.alternateMobile) payload.alternateMobile = form.alternateMobile;
      if (form.licenseExpiry) payload.licenseExpiry = form.licenseExpiry;
      if (form.address) payload.address = form.address;
      if (form.emergencyContact) payload.emergencyContact = form.emergencyContact;
      if (form.experienceYears) payload.experienceYears = parseInt(form.experienceYears);

      let response;
      if (isNew) {
        response = await createDriver(auth.accessToken, payload as any);
        setMessage('Driver created successfully.');
        navigate(`/drivers/${response.data.id}`, { replace: true });
      } else if (id) {
        response = await updateDriver(auth.accessToken, id, payload as any);
        setDriver(response.data);
        setMessage('Driver updated successfully.');
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to save driver.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange() {
    if (!auth.accessToken || !id || isNew) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await updateDriverStatus(auth.accessToken, id, statusValue);
      setDriver(response.data);
      setMessage(`Driver status updated to ${statusValue.replace(/_/g, ' ')}.`);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to update status.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingState message="Loading driver..." />;
  if (error && !driver && !isNew) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const canEdit = auth.hasPermission('driver_update');
  const canChangeStatus = auth.hasAnyPermission(['driver_update', 'driver_delete']);

  return (
    <section className="page-content">
      <div className="section-header">
        <div>
          <a href="/drivers" className="trip-back-link">Back to Drivers</a>
          <PageHeader
            title={isNew ? 'Add Driver' : driver ? driver.name : 'Driver'}
            description={isNew ? 'Register a new driver' : undefined}
          />
        </div>
        <div className="action-panel">
          {!isNew && driver ? <StatusBadge status={driver.status} /> : null}
          {canEdit && !isNew ? (
            <button type="submit" form="driver-form" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="success-banner">{message}</div> : null}

      {!isNew ? (
        <div className="detail-tabs">
          {sectionTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`detail-tab${activeSection === tab.key ? ' detail-tab-active' : ''}`}
              onClick={() => setActiveSection(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      <form id="driver-form" className="form-main" onSubmit={handleSubmit}>
        {isNew || activeSection === 'personal' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Personal Information</h4>
            <label>
              <span className="field-label">Name *</span>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required disabled={!isNew && !canEdit} />
            </label>
            <div className="form-two-column">
              <label>
                <span className="field-label">Mobile *</span>
                <input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} required disabled={!isNew && !canEdit} />
              </label>
              <label>
                <span className="field-label">Alternate Mobile</span>
                <input value={form.alternateMobile} onChange={(e) => setForm((f) => ({ ...f, alternateMobile: e.target.value }))} disabled={!canEdit} />
              </label>
            </div>
            <label>
              <span className="field-label">Address</span>
              <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} disabled={!canEdit} />
            </label>
            <label>
              <span className="field-label">Emergency Contact</span>
              <input value={form.emergencyContact} onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))} disabled={!canEdit} />
            </label>
            {isNew ? (
              <>
                <h4 className="role-edit-h4">License Information</h4>
                <label>
                  <span className="field-label">License Number *</span>
                  <input value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} required />
                </label>
                <div className="form-two-column">
                  <label>
                    <span className="field-label">License Expiry</span>
                    <input type="date" value={form.licenseExpiry ? form.licenseExpiry.substring(0, 10) : ''} onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))} />
                  </label>
                  <label>
                    <span className="field-label">Experience (Years)</span>
                    <input type="number" min={0} value={form.experienceYears} onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))} />
                  </label>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {!isNew && activeSection === 'license' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">License Information</h4>
            <label>
              <span className="field-label">License Number *</span>
              <input value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} required disabled={!isNew && !canEdit} />
            </label>
            <div className="form-two-column">
              <label>
                <span className="field-label">License Expiry</span>
                <input type="date" value={form.licenseExpiry ? form.licenseExpiry.substring(0, 10) : ''} onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))} disabled={!canEdit} />
              </label>
              <label>
                <span className="field-label">Experience (Years)</span>
                <input type="number" min={0} value={form.experienceYears} onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))} disabled={!canEdit} />
              </label>
            </div>
          </div>
        ) : null}

        {!isNew && activeSection === 'documents' && driver ? (
          <div className="card form-section-grid">
            <LinkedDocumentsPanel
              linkedEntityType="DRIVER"
              linkedEntityId={driver.id}
              driverId={driver.id}
              defaultDocumentCategory="DRIVER"
              allowedDocumentTypes={['DRIVER_LICENSE', 'DRIVER_ID_PROOF', 'GENERAL']}
              title={`Documents — ${driver.name}`}
              subtitle={`${driver.licenseNumber ? `License: ${driver.licenseNumber}` : 'Upload license, ID proof, and other driver documents'}`}
              canUpload={auth.hasPermission('documents_upload')}
              canDownload={auth.hasPermission('documents_download')}
              canArchive={auth.hasPermission('documents_archive')}
              canDelete={auth.hasPermission('documents_delete')}
              canVerify={auth.hasPermission('documents_verify')}
            />
          </div>
        ) : null}

        {!isNew && activeSection === 'status' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Status Management</h4>
            {canChangeStatus ? (
              <div className="action-panel">
                <label className="role-status-label">
                  <span className="field-label">Status:</span>
                  <select
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value)}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>
                <button type="button" className="primary-button" onClick={() => void handleStatusChange()} disabled={isSaving}>
                  {isSaving ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            ) : (
              <p className="helper-text">You do not have permission to change status.</p>
            )}
            {driver ? (
              <div className="form-two-column">
                <div>
                  <p className="detail-label">Created</p>
                  <p className="detail-value">{new Date(driver.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="detail-label">Last Updated</p>
                  <p className="detail-value">{new Date(driver.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {isNew ? (
          <div className="action-panel">
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Driver'}
            </button>
            <button type="button" className="secondary-button" onClick={() => navigate('/drivers')}>
              Cancel
            </button>
          </div>
        ) : null}
      </form>
    </section>
  );
}
