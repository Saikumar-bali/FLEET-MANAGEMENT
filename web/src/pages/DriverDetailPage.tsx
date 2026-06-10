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

  useEffect(() => {
    if (isNew || !id) return;
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getDriver(auth.accessToken, id);
        setDriver(response.data);
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

  async function handleStatusChange(status: string) {
    if (!auth.accessToken || !id || isNew) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await updateDriverStatus(auth.accessToken, id, status);
      setDriver(response.data);
      setMessage(`Driver status updated to ${status.replace(/_/g, ' ')}.`);
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
    <section>
      <PageHeader
        title={isNew ? 'Add Driver' : driver ? driver.name : 'Driver'}
        description={isNew ? 'Register a new driver' : driver ? `License: ${driver.licenseNumber}` : undefined}
        actions={!isNew && driver ? [<StatusBadge key="badge" status={driver.status} />] : undefined}
      />

      {error ? <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div> : null}
      {message ? <div className="success-banner" style={{ marginBottom: '1rem' }}>{message}</div> : null}

      <div className="page-grid">
        <form className="card stack-form" onSubmit={handleSubmit}>
          <h3>Personal Information</h3>

          <label>
            <span>Name *</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required disabled={!isNew && !canEdit} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <label>
              <span>Mobile *</span>
              <input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} required disabled={!isNew && !canEdit} />
            </label>
            <label>
              <span>Alternate Mobile</span>
              <input value={form.alternateMobile} onChange={(e) => setForm((f) => ({ ...f, alternateMobile: e.target.value }))} disabled={!canEdit} />
            </label>
          </div>

          <label>
            <span>Address</span>
            <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} disabled={!canEdit} />
          </label>

          <label>
            <span>Emergency Contact</span>
            <input value={form.emergencyContact} onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))} disabled={!canEdit} />
          </label>

          <h3 style={{ marginTop: '1rem' }}>License Information</h3>

          <label>
            <span>License Number *</span>
            <input value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} required disabled={!isNew && !canEdit} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <label>
              <span>License Expiry</span>
              <input type="date" value={form.licenseExpiry ? form.licenseExpiry.substring(0, 10) : ''} onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))} disabled={!canEdit} />
            </label>
            <label>
              <span>Experience (Years)</span>
              <input type="number" min={0} value={form.experienceYears} onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))} disabled={!canEdit} />
            </label>
          </div>

          {canEdit ? (
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : isNew ? 'Create Driver' : 'Update Driver'}
            </button>
          ) : null}
        </form>

        {!isNew && driver ? (
          <div className="card stack-form">
            <h3>Status Management</h3>
            {canChangeStatus ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button type="button" className="secondary-button" onClick={() => handleStatusChange('AVAILABLE')}>Available</button>
                <button type="button" className="secondary-button" onClick={() => handleStatusChange('ON_LEAVE')}>On Leave</button>
                <button type="button" className="secondary-button" onClick={() => handleStatusChange('INACTIVE')}>Inactive</button>
              </div>
            ) : null}

            <h3 style={{ marginTop: '1rem' }}>Documents</h3>
            <p style={{ color: '#5a6474', fontSize: '0.9rem' }}>Documents section placeholder. Add license, ID, and other documents here.</p>

            <h3 style={{ marginTop: '1rem' }}>Details</h3>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div><strong>Created:</strong> {new Date(driver.createdAt).toLocaleDateString()}</div>
              <div><strong>Last Updated:</strong> {new Date(driver.updatedAt).toLocaleDateString()}</div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
