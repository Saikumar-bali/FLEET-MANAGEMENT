import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { FormSection } from '../components/FormSection';
import { LinkedDocumentsPanel } from '../components/documents/LinkedDocumentsPanel';
import {
  createStaffProfile,
  getStaffProfile,
  updateStaffProfile,
  deleteStaffProfile,
} from '../services/api';
import type { StaffProfileRecord } from '../services/api';

const PROFILE_TYPES = [
  { value: 'MECHANIC', label: 'Mechanic' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'COLLECTOR', label: 'Collector' },
  { value: 'EMPLOYEE', label: 'Employee' },
];

type TabId = 'details' | 'documents';

export function StaffProfileDetailPage() {
  const { id } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isNew = !id || id === 'new';

  const [profile, setProfile] = useState<StaffProfileRecord | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('details');

  const [profileType, setProfileType] = useState('MECHANIC');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  const canCreate = auth.hasPermission('profile_link_create');
  const canUpdate = auth.hasPermission('profile_link_update');
  const canDelete = auth.hasPermission('profile_link_delete');

  useEffect(() => {
    if (isNew) return;
    const load = async () => {
      if (!auth.accessToken || !id) return;
      setIsLoading(true); setError(null);
      try {
        const r = await getStaffProfile(auth.accessToken, id);
        setProfile(r.data);
        setProfileType(r.data.profileType);
        setName(r.data.name);
        setEmail(r.data.email ?? '');
        setPhone(r.data.phone ?? '');
        setStatus(r.data.status);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Failed to load staff profile.');
      } finally { setIsLoading(false); }
    };
    void load();
  }, [id, auth.accessToken]);

  async function handleSave() {
    if (!auth.accessToken) return;
    setIsSaving(true); setError(null); setMessage(null);
    try {
      const payload = { profileType, name, email: email || undefined, phone: phone || undefined, status };
      if (isNew) {
        const r = await createStaffProfile(auth.accessToken, payload);
        setProfile(r.data);
        showToast('Staff profile created.', 'success');
        navigate(`/staff-profiles/${r.data.id}`, { replace: true });
      } else if (id) {
        const r = await updateStaffProfile(auth.accessToken, id, payload);
        setProfile(r.data);
        setMessage('Staff profile updated.');
        showToast('Staff profile updated.', 'success');
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to save.';
      setError(msg); showToast(msg, 'error');
    } finally { setIsSaving(false); }
  }

  async function handleDelete() {
    if (!auth.accessToken || !id || isNew) return;
    setIsDeleting(true);
    try {
      await deleteStaffProfile(auth.accessToken, id);
      showToast('Staff profile deleted.', 'success');
      navigate('/staff-profiles');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to delete.';
      setError(msg); showToast(msg, 'error');
    } finally { setIsDeleting(false); }
  }

  if (isLoading) return <LoadingState message="Loading staff profile..." />;
  if (error && !profile && !isNew) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const title = isNew ? 'Create Staff Profile' : profile?.name ?? 'Staff Profile';
  const description = isNew ? 'Add a new operational profile for any role.' : `${profile?.profileType ?? ''} profile`;

  return (
    <section className="page-content">
      <PageHeader eyebrow="Staff Profiles" title={title} description={description} />
      <button type="button" className="ghost-button" onClick={() => navigate('/staff-profiles')} style={{ marginBottom: '1rem' }}>&larr; Back to staff profiles</button>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {!isNew && (
        <div className="section-tabs">
          <button type="button" className={`tab-button ${activeTab === 'details' ? 'active-tab' : ''}`} onClick={() => setActiveTab('details')}>Details</button>
          <button type="button" className={`tab-button ${activeTab === 'documents' ? 'active-tab' : ''}`} onClick={() => setActiveTab('documents')}>Documents</button>
        </div>
      )}

      {activeTab === 'details' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <article className="card" style={{ padding: '1.25rem' }}>
            <FormSection title="Personal Information" description="Basic details for this staff profile.">
              <div className="form-grid">
                {isNew && (
                  <label><span>Profile type</span>
                    <select value={profileType} onChange={e => setProfileType(e.target.value)}>
                      {PROFILE_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                    </select>
                  </label>
                )}
                {!isNew && profile && (
                  <label><span>Profile type</span>
                    <p className="detail-value">{PROFILE_TYPES.find(pt => pt.value === profile.profileType)?.label ?? profile.profileType}</p>
                  </label>
                )}
                <label><span>Name</span>
                  <input value={name} onChange={e => setName(e.target.value)} disabled={!isNew && !canUpdate} required />
                </label>
                <label><span>Email</span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={!isNew && !canUpdate} />
                </label>
                <label><span>Phone</span>
                  <input value={phone} onChange={e => setPhone(e.target.value)} disabled={!isNew && !canUpdate} />
                </label>
                {!isNew && (
                  <label><span>Status</span>
                    <select value={status} onChange={e => setStatus(e.target.value)} disabled={!canUpdate}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </label>
                )}
              </div>
              <div className="button-row" style={{ marginTop: '1rem' }}>
                {(isNew && canCreate) || (!isNew && canUpdate) ? (
                  <button type="button" className="primary-button" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : isNew ? 'Create Staff Profile' : 'Save'}
                  </button>
                ) : null}
                {!isNew && canDelete && (
                  <button type="button" className="danger-button" onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </FormSection>
          </article>

          {/* Linked Profile Card */}
          {profile && (
            <article className="card" style={{ padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>Linked Account</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
                Go to the Users page to link a user account to this staff profile.
              </p>
              <button type="button" className="secondary-button" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}
                onClick={() => navigate('/users')}>
                Manage Users
              </button>
            </article>
          )}
        </div>
      )}

      {activeTab === 'documents' && profile && (
        <LinkedDocumentsPanel
          title="Staff Profile Documents"
          linkedEntityType="STAFF_PROFILE"
          linkedEntityId={profile.id}
          allowedDocumentTypes={['DOCUMENT', 'GENERAL']}
        />
      )}
    </section>
  );
}
