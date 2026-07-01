import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { createDriver, getDriver, updateDriver, updateDriverStatus, getDriverProfileLinks, createUserProfileLink, getUsers, revokeUserProfileLink, getRoles, createUser as createUserRequest, getVehicles, updateVehicle } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { DriverRecord, ProfileLinkRecord, UserRecord, VehicleRecord } from '../types/auth';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { LinkedDocumentsPanel } from '../components/documents/LinkedDocumentsPanel';

type DriverForm = {
  name: string; mobile: string; alternateMobile: string; licenseNumber: string;
  licenseExpiry: string; address: string; emergencyContact: string; experienceYears: string;
};

const initialForm: DriverForm = {
  name: '', mobile: '', alternateMobile: '', licenseNumber: '', licenseExpiry: '',
  address: '', emergencyContact: '', experienceYears: '',
};

type SectionTab = 'personal' | 'license' | 'documents' | 'status' | 'profile-link' | 'vehicle-assignment';

const sectionTabs: { key: SectionTab; label: string }[] = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'license', label: 'License' },
  { key: 'documents', label: 'Documents' },
  { key: 'status', label: 'Status' },
  { key: 'profile-link', label: 'Linked Account' },
  { key: 'vehicle-assignment', label: 'Vehicle' },
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

  // Profile link state
  const [profileLinks, setProfileLinks] = useState<ProfileLinkRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showAllUsers, setShowAllUsers] = useState(false);

  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountUsername, setAccountUsername] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);
  const [createdAccountResult, setCreatedAccountResult] = useState<{ username: string; password: string } | null>(null);
  const [driverRoleId, setDriverRoleId] = useState('');

  // Vehicle assignment state
  const [assignedVehicle, setAssignedVehicle] = useState<VehicleRecord | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<VehicleRecord[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAssignVehicleId, setSelectedAssignVehicleId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [confirmRemoveTarget, setConfirmRemoveTarget] = useState(false);

  useEffect(() => {
    if (isNew || !id) return;
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true); setError(null);
      try {
        const response = await getDriver(auth.accessToken, id);
        setDriver(response.data); setStatusValue(response.data.status);
        setForm({
          name: response.data.name, mobile: response.data.mobile, alternateMobile: response.data.alternateMobile ?? '',
          licenseNumber: response.data.licenseNumber, licenseExpiry: response.data.licenseExpiry ?? '',
          address: response.data.address ?? '', emergencyContact: response.data.emergencyContact ?? '',
          experienceYears: response.data.experienceYears?.toString() ?? '',
        });
        try {
          const plRes = await getDriverProfileLinks(auth.accessToken, id);
          const plData = plRes.data as unknown as { items: ProfileLinkRecord[]; total: number } | ProfileLinkRecord[];
          setProfileLinks(Array.isArray(plData) ? plData : plData.items ?? []);
        } catch {}
        try { const usersRes = await getUsers(auth.accessToken); setAllUsers(usersRes.data); } catch {}
        try {
          const rolesRes = await getRoles(auth.accessToken);
          const driverRole = rolesRes.data.find((r: any) => r.key === 'driver');
          if (driverRole) setDriverRoleId(driverRole.id);
        } catch {}
        try {
          const allVehRes = await getVehicles(auth.accessToken, { limit: 200 });
          const allVehicles = allVehRes.data.items || [];
          const assigned = allVehicles.find((v: any) => v.currentDriverId === id);
          if (assigned) setAssignedVehicle(assigned);
          setAvailableVehicles(allVehicles.filter((v: any) => v.status === 'AVAILABLE' && v.currentDriverId !== id));
        } catch {}
      } catch (caughtError) {
        setError(caughtError instanceof ApiError ? caughtError.message : 'Failed to load driver.');
      } finally { setIsLoading(false); }
    };
    void load();
  }, [auth.accessToken, id, isNew]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;
    setIsSaving(true); setError(null); setMessage(null);
    try {
      const payload: Record<string, unknown> = { name: form.name, mobile: form.mobile, licenseNumber: form.licenseNumber };
      if (form.alternateMobile) payload.alternateMobile = form.alternateMobile;
      if (form.licenseExpiry) payload.licenseExpiry = form.licenseExpiry;
      if (form.address) payload.address = form.address;
      if (form.emergencyContact) payload.emergencyContact = form.emergencyContact;
      if (form.experienceYears) payload.experienceYears = parseInt(form.experienceYears);
      let response;
      if (isNew) { response = await createDriver(auth.accessToken, payload as any); setMessage('Driver created successfully.'); navigate(`/drivers/${response.data.id}`, { replace: true }); }
      else if (id) { response = await updateDriver(auth.accessToken, id, payload as any); setDriver(response.data); setMessage('Driver updated successfully.'); }
    } catch (caughtError) { setError(caughtError instanceof ApiError ? caughtError.message : 'Failed to save driver.'); }
    finally { setIsSaving(false); }
  }

  async function handleStatusChange() {
    if (!auth.accessToken || !id || isNew) return;
    setIsSaving(true); setError(null);
    try { const response = await updateDriverStatus(auth.accessToken, id, statusValue); setDriver(response.data); setMessage(`Driver status updated to ${statusValue.replace(/_/g, ' ')}.`); }
    catch (caughtError) { setError(caughtError instanceof ApiError ? caughtError.message : 'Failed to update status.'); }
    finally { setIsSaving(false); }
  }

  async function handleLinkUser() {
    if (!auth.accessToken || !selectedUserId || !id) return;
    setIsLinking(true); setLinkError(null);
    try {
      await createUserProfileLink(auth.accessToken, selectedUserId, { profileType: 'DRIVER', profileId: id, isPrimary: true });
      setMessage('User linked to driver successfully.');
      const plRes = await getDriverProfileLinks(auth.accessToken, id);
      const plData = plRes.data as unknown as { items: ProfileLinkRecord[]; total: number } | ProfileLinkRecord[];
      setProfileLinks(Array.isArray(plData) ? plData : plData.items ?? []);
      setSelectedUserId('');
    } catch (e) { setLinkError(e instanceof ApiError ? e.message : 'Failed to link user.'); }
    finally { setIsLinking(false); }
  }

  async function handleRevokeLink(linkId: string) {
    if (!auth.accessToken) return;
    setIsRevoking(true);
    try {
      await revokeUserProfileLink(auth.accessToken, linkId);
      setProfileLinks(prev => prev.filter(pl => pl.id !== linkId));
      setRevokeTarget(null); setMessage('Profile link revoked.');
    } catch (e) { setLinkError(e instanceof ApiError ? e.message : 'Failed to revoke.'); }
    finally { setIsRevoking(false); }
  }

  async function handleAssignVehicle() {
    if (!auth.accessToken || !id || !selectedAssignVehicleId) return;
    setIsAssigning(true); setAssignError(null);
    try {
      const res = await updateVehicle(auth.accessToken, selectedAssignVehicleId, { currentDriverId: id } as any);
      setAssignedVehicle(res.data);
      setAvailableVehicles(prev => prev.filter(v => v.id !== selectedAssignVehicleId));
      setShowAssignModal(false);
      setSelectedAssignVehicleId('');
      setMessage(`Vehicle ${res.data.vehicleNumber} assigned.`);
    } catch (e) { setAssignError(e instanceof ApiError ? e.message : 'Failed to assign vehicle.'); }
    finally { setIsAssigning(false); }
  }

  async function handleRemoveAssignment() {
    if (!auth.accessToken || !assignedVehicle) return;
    setIsAssigning(true);
    try {
      await updateVehicle(auth.accessToken, assignedVehicle.id, { currentDriverId: null } as any);
      setAssignedVehicle(null);
      setAvailableVehicles(prev => [...prev, assignedVehicle]);
      setConfirmRemoveTarget(false);
      setMessage(`Vehicle ${assignedVehicle.vehicleNumber} unassigned.`);
    } catch (e) { setAssignError(e instanceof ApiError ? e.message : 'Failed to remove assignment.'); }
    finally { setIsAssigning(false); }
  }

  async function handleCreateAccount() {
    if (!auth.accessToken || !id || !accountName || !accountUsername || !accountEmail || !accountPassword || !driverRoleId) return;
    setIsCreatingAccount(true); setCreateAccountError(null); setCreatedAccountResult(null);
    try {
      const userRes = await createUserRequest(auth.accessToken, {
        name: accountName, username: accountUsername, email: accountEmail,
        password: accountPassword, roleId: driverRoleId, status: 'ACTIVE',
      });
      try {
        await createUserProfileLink(auth.accessToken, userRes.data.id, { profileType: 'DRIVER', profileId: id, isPrimary: true });
      } catch {
        setCreateAccountError('User created but driver profile link failed. Link manually from Linked Account tab.');
        const plRes = await getDriverProfileLinks(auth.accessToken, id);
        const plData = plRes.data as unknown as { items: ProfileLinkRecord[]; total: number } | ProfileLinkRecord[];
        setProfileLinks(Array.isArray(plData) ? plData : plData.items ?? []);
        try { const usersRes = await getUsers(auth.accessToken); setAllUsers(usersRes.data); } catch {}
        return;
      }
      const plRes = await getDriverProfileLinks(auth.accessToken, id);
      const plData = plRes.data as unknown as { items: ProfileLinkRecord[]; total: number } | ProfileLinkRecord[];
      setProfileLinks(Array.isArray(plData) ? plData : plData.items ?? []);
      try { const usersRes = await getUsers(auth.accessToken); setAllUsers(usersRes.data); } catch {}
      setCreatedAccountResult({ username: accountUsername, password: accountPassword });
      setShowCreateAccount(false);
    } catch (e) { setCreateAccountError(e instanceof ApiError ? e.message : 'Failed to create user account.'); }
    finally { setIsCreatingAccount(false); }
  }

  function renderVehicleAssignmentCard() {
    const canAssign = auth.hasPermission('vehicle_update');
    return (
      <div className="card form-section-grid" style={{ marginTop: '1rem' }}>
        <h4 className="role-edit-h4">Vehicle Assignment</h4>

        {assignedVehicle ? (
          <div>
            <div className="detail-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '1rem' }}>
              <div><p className="detail-label">Assigned Vehicle</p><p className="detail-value" style={{ fontWeight: 600 }}>{assignedVehicle.vehicleNumber}</p></div>
              <div><p className="detail-label">Type</p><p className="detail-value">{assignedVehicle.vehicleType}</p></div>
              <div><p className="detail-label">Brand / Model</p><p className="detail-value">{assignedVehicle.brand ?? '-'} {assignedVehicle.model ?? ''}</p></div>
              <div><p className="detail-label">Status</p><StatusBadge status={assignedVehicle.status} /></div>
            </div>
            {canAssign && (
              <div className="action-panel">
                <button type="button" className="secondary-button" onClick={() => { setSelectedAssignVehicleId(''); setAssignError(null); setShowAssignModal(true); }}>Change Vehicle</button>
                <button type="button" className="danger-button" onClick={() => setConfirmRemoveTarget(true)}>Remove Assignment</button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>No vehicle is currently assigned to this driver.</p>
            {canAssign && (
              <button type="button" className="primary-button" onClick={() => { setSelectedAssignVehicleId(''); setAssignError(null); setShowAssignModal(true); }}>Assign Vehicle</button>
            )}
          </div>
        )}

        <Modal isOpen={showAssignModal} title="Assign Vehicle" description="Select a vehicle to assign to this driver."
          onClose={() => { setShowAssignModal(false); setAssignError(null); }}
          footer={
            <div className="button-row">
              <button type="button" className="ghost-button" onClick={() => { setShowAssignModal(false); setAssignError(null); }}>Cancel</button>
              <button type="button" className="primary-button" onClick={handleAssignVehicle} disabled={!selectedAssignVehicleId || isAssigning}>
                {isAssigning ? 'Assigning...' : 'Assign Vehicle'}
              </button>
            </div>
          }
        >
          {assignError && <div className="error-banner" style={{ marginBottom: '0.75rem' }}>{assignError}</div>}
          <div className="form-group">
            <label>Vehicle</label>
            <select value={selectedAssignVehicleId} onChange={e => setSelectedAssignVehicleId(e.target.value)}>
              <option value="">Select a vehicle...</option>
              {[...availableVehicles, ...(assignedVehicle ? [assignedVehicle] : [])]
                .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i)
                .map(v => (
                  <option key={v.id} value={v.id}>{v.vehicleNumber} — {v.vehicleType} {v.id === assignedVehicle?.id ? '(currently assigned)' : ''}</option>
                ))}
            </select>
          </div>
        </Modal>

        <ConfirmDialog isOpen={confirmRemoveTarget} title="Remove Vehicle Assignment"
          description={`Remove vehicle "${assignedVehicle?.vehicleNumber}" from driver ${driver?.name}?`}
          confirmLabel="Remove" tone="danger" isConfirming={isAssigning}
          onCancel={() => setConfirmRemoveTarget(false)} onConfirm={handleRemoveAssignment} />
      </div>
    );
  }

  if (isLoading) return <LoadingState message="Loading driver..." />;
  if (error && !driver && !isNew) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const canEdit = auth.hasPermission('driver_update');
  const canChangeStatus = auth.hasAnyPermission(['driver_update', 'driver_delete']);

  function renderLinkedAccountCard() {
    const activeLink = profileLinks.find(pl => pl.status === 'ACTIVE');
    if (!activeLink) {
      return (
        <div className="card form-section-grid" style={{ marginTop: '1rem' }}>
          <h4 className="role-edit-h4">Linked Account</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
            No user account linked to this driver. Linking a user account lets the driver log in and access the Driver Portal.
          </p>
          {linkError && <div className="error-banner">{linkError}</div>}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {auth.hasPermission('profile_link_create') && (
              <div style={{ flex: 1, minWidth: 250 }}>
                <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Link Existing User</h5>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input type="checkbox" checked={showAllUsers} onChange={e => setShowAllUsers(e.target.checked)} />
                  <span style={{ fontSize: '0.85rem' }}>Show all users</span>
                </label>
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', fontSize: '0.85rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
                />
                <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Choose a user...</option>
                  {allUsers
                    .filter(u => {
                      if (!showAllUsers && u.status !== 'ACTIVE') return false;
                      if (!showAllUsers && u.role?.key !== 'driver') return false;
                      if (!userSearch) return true;
                      const q = userSearch.toLowerCase();
                      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                    })
                    .map(u => <option key={u.id} value={u.id}>{u.name} ({u.email}) [{u.role?.key || 'unknown'}]</option>)}
                </select>
                <button type="button" className="primary-button" disabled={!selectedUserId || isLinking} onClick={handleLinkUser} style={{ marginTop: '0.5rem' }}>
                  {isLinking ? 'Linking...' : 'Link User'}
                </button>
              </div>
            )}
            {auth.hasPermission('user_create') && auth.hasPermission('profile_link_create') && (
              <div style={{ flex: 1, minWidth: 250, borderLeft: '1px solid var(--color-border)', paddingLeft: '1rem' }}>
                <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Create Login Account</h5>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
                  Create a new user account and link it to this driver automatically.
                </p>
                <button type="button" className="primary-button" onClick={() => {
                  setAccountName(driver?.name || '');
                  setAccountUsername((driver?.name || '').toLowerCase().replace(/\s+/g, '.'));
                  setAccountEmail('');
                  setAccountPassword('');
                  setCreateAccountError(null);
                  setCreatedAccountResult(null);
                  setShowCreateAccount(true);
                }}>Create Login Account</button>
              </div>
            )}
          </div>
        </div>
      );
    }

    const linkedUser = allUsers.find(u => u.id === activeLink.userId);
    return (
      <div className="card form-section-grid" style={{ marginTop: '1rem' }}>
        <h4 className="role-edit-h4">Linked Account</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>{linkedUser?.name || 'User'}</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              {linkedUser?.email || activeLink.userId}
            </p>
            {linkedUser && (
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
                <span><strong>Username:</strong> @{linkedUser.username ?? 'unset'}</span>
                <span><StatusBadge status={linkedUser.status} /></span>
                <span><strong>Last login:</strong> {linkedUser.lastLoginAt ? new Date(linkedUser.lastLoginAt).toLocaleDateString() : 'Never'}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {linkedUser && (
              <Link to={`/users/${linkedUser.id}`} className="secondary-button" style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}>
                View User Account
              </Link>
            )}
            <button type="button" className="danger-button" style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }} onClick={() => setRevokeTarget(activeLink.id)}>
              Revoke Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="page-content">
      <div className="section-header">
        <div>
          <a href="/drivers" className="trip-back-link">Back to Drivers</a>
          <PageHeader title={isNew ? 'Add Driver' : driver ? driver.name : 'Driver'} description={isNew ? 'Register a new driver' : undefined} />
        </div>
        <div className="action-panel">
          {!isNew && driver ? <StatusBadge status={driver.status} /> : null}
          {canEdit && !isNew ? (<button type="submit" form="driver-form" className="primary-button" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>) : null}
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="success-banner">{message}</div> : null}

      {!isNew && (
        <div className="detail-tabs">
          {sectionTabs.map(tab => (
            <button key={tab.key} type="button" className={`detail-tab${activeSection === tab.key ? ' detail-tab-active' : ''}`} onClick={() => setActiveSection(tab.key)}>{tab.label}</button>
          ))}
        </div>
      )}

      <form id="driver-form" className="form-main" onSubmit={handleSubmit}>
        {isNew || activeSection === 'personal' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Personal Information</h4>
            <label><span className="field-label">Name *</span><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required disabled={!isNew && !canEdit} /></label>
            <div className="form-two-column">
              <label><span className="field-label">Mobile *</span><input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} required disabled={!isNew && !canEdit} /></label>
              <label><span className="field-label">Alternate Mobile</span><input value={form.alternateMobile} onChange={e => setForm(f => ({ ...f, alternateMobile: e.target.value }))} disabled={!canEdit} /></label>
            </div>
            <label><span className="field-label">Address</span><textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} disabled={!canEdit} /></label>
            <label><span className="field-label">Emergency Contact</span><input value={form.emergencyContact} onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))} disabled={!canEdit} /></label>
            {isNew && (<><h4 className="role-edit-h4">License Information</h4><label><span className="field-label">License Number *</span><input value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} required /></label>
              <div className="form-two-column"><label><span className="field-label">License Expiry</span><input type="date" value={form.licenseExpiry ? form.licenseExpiry.substring(0, 10) : ''} onChange={e => setForm(f => ({ ...f, licenseExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))} /></label>
              <label><span className="field-label">Experience (Years)</span><input type="number" min={0} value={form.experienceYears} onChange={e => setForm(f => ({ ...f, experienceYears: e.target.value }))} /></label></div></>)}
          </div>
        ) : null}

        {!isNew && activeSection === 'license' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">License Information</h4>
            <label><span className="field-label">License Number *</span><input value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} required disabled={!isNew && !canEdit} /></label>
            <div className="form-two-column">
              <label><span className="field-label">License Expiry</span><input type="date" value={form.licenseExpiry ? form.licenseExpiry.substring(0, 10) : ''} onChange={e => setForm(f => ({ ...f, licenseExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))} disabled={!canEdit} /></label>
              <label><span className="field-label">Experience (Years)</span><input type="number" min={0} value={form.experienceYears} onChange={e => setForm(f => ({ ...f, experienceYears: e.target.value }))} disabled={!canEdit} /></label>
            </div>
          </div>
        ) : null}

        {!isNew && activeSection === 'documents' && driver ? (
          <div className="card form-section-grid">
            <LinkedDocumentsPanel linkedEntityType="DRIVER" linkedEntityId={driver.id} driverId={driver.id}
              defaultDocumentCategory="DRIVER" allowedDocumentTypes={['DRIVER_LICENSE', 'DRIVER_ID_PROOF', 'GENERAL']}
              title={`Documents — ${driver.name}`} subtitle={`${driver.licenseNumber ? `License: ${driver.licenseNumber}` : 'Upload license, ID proof, and other driver documents'}`}
              canUpload={auth.hasPermission('documents_upload')} canDownload={auth.hasPermission('documents_download')}
              canArchive={auth.hasPermission('documents_archive')} canDelete={auth.hasPermission('documents_delete')} canVerify={auth.hasPermission('documents_verify')} />
          </div>
        ) : null}

        {!isNew && activeSection === 'status' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Status Management</h4>
            {canChangeStatus ? (
              <div className="action-panel">
                <label className="role-status-label"><span className="field-label">Status:</span>
                  <select value={statusValue} onChange={e => setStatusValue(e.target.value)}>
                    <option value="AVAILABLE">Available</option><option value="ON_LEAVE">On Leave</option><option value="INACTIVE">Inactive</option>
                  </select>
                </label>
                <button type="button" className="primary-button" onClick={handleStatusChange} disabled={isSaving}>{isSaving ? 'Updating...' : 'Update Status'}</button>
              </div>
            ) : (<p className="helper-text">You do not have permission to change status.</p>)}
            {driver && (<div className="form-two-column"><div><p className="detail-label">Created</p><p className="detail-value">{new Date(driver.createdAt).toLocaleDateString()}</p></div>
              <div><p className="detail-label">Last Updated</p><p className="detail-value">{new Date(driver.updatedAt).toLocaleDateString()}</p></div></div>)}
          </div>
        ) : null}

        {!isNew && activeSection === 'profile-link' && driver ? renderLinkedAccountCard() : null}
        {!isNew && activeSection === 'vehicle-assignment' && driver ? renderVehicleAssignmentCard() : null}

        {isNew ? (
          <div className="action-panel">
            <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Driver'}</button>
            <button type="button" className="secondary-button" onClick={() => navigate('/drivers')}>Cancel</button>
          </div>
        ) : null}
      </form>

      <Modal isOpen={showCreateAccount} title="Create Login Account"
        description={`Create a user account for driver: ${driver?.name || ''}`}
        onClose={() => { setShowCreateAccount(false); setCreateAccountError(null); setCreatedAccountResult(null); }}
        footer={
          <div className="button-row">
            <button type="button" className="ghost-button" onClick={() => { setShowCreateAccount(false); setCreatedAccountResult(null); }}>Close</button>
            {!createdAccountResult && (
              <button type="button" className="primary-button" onClick={handleCreateAccount} disabled={isCreatingAccount || !accountName || !accountUsername || !accountEmail || !accountPassword}>
                {isCreatingAccount ? 'Creating...' : 'Create Account'}
              </button>
            )}
          </div>
        }
      >
        {createdAccountResult ? (
          <div>
            <div className="success-banner" style={{ marginBottom: '1rem' }}>Account created and linked successfully.</div>
            <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>Username:</strong> {createdAccountResult.username}</p>
            <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>Temporary password:</strong></p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <code style={{ padding: '0.4rem 0.75rem', background: 'var(--color-bg-muted)', borderRadius: '4px', fontSize: '0.9rem', letterSpacing: '0.05em' }}>{createdAccountResult.password}</code>
              <button type="button" className="secondary-button" style={{ fontSize: '0.8rem' }} onClick={() => navigator.clipboard.writeText(createdAccountResult.password)}>Copy</button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
              Share this password securely with the driver. They should change it on first login.
            </p>
          </div>
        ) : (
          <div className="stack-form">
            {createAccountError && <div className="error-banner">{createAccountError}</div>}
            <label><span>Name</span><input value={accountName} onChange={e => setAccountName(e.target.value)} /></label>
            <label><span>Username</span><input value={accountUsername} onChange={e => setAccountUsername(e.target.value)} placeholder="driver.username" /></label>
            <label><span>Email</span><input type="email" value={accountEmail} onChange={e => setAccountEmail(e.target.value)} placeholder="driver@fleet.local" /></label>
            <label><span>Password</span><input type="password" value={accountPassword} onChange={e => setAccountPassword(e.target.value)} placeholder="Min 8 characters" /></label>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!revokeTarget} title="Revoke profile link"
        description="Remove the user account link from this driver? The driver will lose Driver Portal access."
        confirmLabel="Revoke" tone="danger" isConfirming={isRevoking}
        onCancel={() => setRevokeTarget(null)} onConfirm={() => revokeTarget ? handleRevokeLink(revokeTarget) : Promise.resolve()} />
    </section>
  );
}
