import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { FormSection } from '../components/FormSection';
import { LoadingState } from '../components/LoadingState';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  createUser as createUserRequest,
  deleteUser as deleteUserRequest,
  getAvailableDrivers,
  getAvailableStaffProfiles,
  getAvailableVendors,
  getAvailableCustomers,
  getRoles,
  getUsers,
  updateUser as updateUserRequest,
  updateUserPassword as updateUserPasswordRequest,
  updateUserStatus as updateUserStatusRequest,
  getUsersAccessSummary,
  getUserProfileLinks,
  createUserProfileLink,
  revokeUserProfileLink,
} from '../services/api';
import type { AvailableDriver, AvailableStaffProfile, AvailableVendor, AvailableCustomer } from '../services/api';
import type { RoleRecord, UserAccessSummaryRecord, UserRecord, ProfileLinkRecord } from '../types/auth';
import { ApiError } from '../types/api';

type UserFormState = {
  name: string; username: string; email: string; mobile: string;
  password: string; roleId: string; status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
};

const initialForm: UserFormState = { name: '', username: '', email: '', mobile: '', password: '', roleId: '', status: 'ACTIVE' };

export function UsersPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [summaries, setSummaries] = useState<UserAccessSummaryRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<UserFormState>(initialForm);
  const [editForm, setEditForm] = useState<UserFormState>(initialForm);
  const [passwordReset, setPasswordReset] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSavingCreate, setIsSavingCreate] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusTarget, setStatusTarget] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | null>(null);
  const [viewUser, setViewUser] = useState<UserRecord | null>(null);
  const [viewTab, setViewTab] = useState('overview');
  const [profileLinks, setProfileLinks] = useState<ProfileLinkRecord[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [linkProfileType, setLinkProfileType] = useState<string>('DRIVER');
  const [linkEntityId, setLinkEntityId] = useState('');
  const [showAllDrivers, setShowAllDrivers] = useState(false);
  const [allDrivers, setAllDrivers] = useState<AvailableDriver[]>([]);
  const [availableStaffProfiles, setAvailableStaffProfiles] = useState<AvailableStaffProfile[]>([]);
  const [availableVendors, setAvailableVendors] = useState<AvailableVendor[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<AvailableCustomer[]>([]);
  const [linkEntityIdOnCreate, setLinkEntityIdOnCreate] = useState('');
  const [linkErrorOnCreate, setLinkErrorOnCreate] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);

  const canCreate = auth.hasPermission('user_create');
  const canUpdate = auth.hasPermission('user_update');
  const canDelete = auth.hasPermission('user_delete');

  const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId) ?? null, [selectedUserId, users]);

  async function loadUsers() {
    if (!auth.accessToken) return;
    const r = await getUsers(auth.accessToken);
    setUsers(r.data);
  }

  async function loadRoles() {
    if (!auth.accessToken) return;
    const r = await getRoles(auth.accessToken);
    setRoles(r.data);
    setCreateForm(f => ({ ...f, roleId: f.roleId || r.data[0]?.id || '' }));
  }

  async function loadSummaries() {
    if (!auth.accessToken || !auth.hasPermission('user_view')) return;
    try { const r = await getUsersAccessSummary(auth.accessToken); setSummaries(r.data); } catch {}
  }

  async function loadDrivers() {
    if (!auth.accessToken) return;
    try { const r = await getAvailableDrivers(auth.accessToken, { showAll: true }); setAllDrivers(Array.isArray(r.data) ? r.data : []); } catch {}
  }

  async function loadEntitiesForType(profileType: string) {
    if (!auth.accessToken) return;
    setLinkEntityId('');
    switch (profileType) {
      case 'DRIVER':
        try { const r = await getAvailableDrivers(auth.accessToken, { showAll: true }); setAllDrivers(Array.isArray(r.data) ? r.data : []); } catch {}
        break;
      case 'MECHANIC':
      case 'EMPLOYEE':
      case 'FINANCE':
      case 'COLLECTOR':
        try { const r = await getAvailableStaffProfiles(auth.accessToken, profileType); setAvailableStaffProfiles(Array.isArray(r.data) ? r.data : []); } catch {}
        break;
      case 'VENDOR_CONTACT':
        try { const r = await getAvailableVendors(auth.accessToken); setAvailableVendors(Array.isArray(r.data) ? r.data : []); } catch {}
        break;
      case 'CUSTOMER_CONTACT':
        try { const r = await getAvailableCustomers(auth.accessToken); setAvailableCustomers(Array.isArray(r.data) ? r.data : []); } catch {}
        break;
    }
  }

  useEffect(() => {
    const go = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true); setPageError(null);
      try { await Promise.all([loadUsers(), loadRoles(), loadSummaries(), loadDrivers()]); }
      catch (e) { setPageError(e instanceof ApiError ? e.message : 'Failed to load users.'); }
      finally { setIsLoading(false); }
    };
    void go();
  }, [auth.accessToken]);

  useEffect(() => {
    if (!selectedUser) { setEditForm(initialForm); return; }
    setEditForm({
      name: selectedUser.name, username: selectedUser.username ?? '', email: selectedUser.email,
      mobile: selectedUser.mobile ?? '', password: '', roleId: selectedUser.role.id, status: selectedUser.status,
    });
    setEditError(null); setPasswordReset('');
  }, [selectedUser]);

  function getSummary(userId: string) { return summaries.find(s => s.userId === userId); }

  function openView(user: UserRecord) {
    setViewUser(user); setViewTab('overview'); setLinkError(null); setLinkEntityId(''); setLinkProfileType('DRIVER');
    setProfileLinks([]);
    if (auth.accessToken) {
      getUserProfileLinks(auth.accessToken, user.id).then(r => setProfileLinks(r.data)).catch(() => {});
    }
  }

  async function handleCreate() {
    if (!auth.accessToken) return;
    setIsSavingCreate(true); setCreateError(null); setPageMessage(null); setLinkErrorOnCreate(null);
    try {
      const r = await createUserRequest(auth.accessToken, createForm);
      const selectedRole = roles.find(rl => rl.id === createForm.roleId);
      if (selectedRole?.key === 'driver' && linkEntityIdOnCreate) {
        try {
          await createUserProfileLink(auth.accessToken, r.data.id, { profileType: 'DRIVER', profileId: linkEntityIdOnCreate, isPrimary: true });
        } catch (linkErr) {
          setLinkErrorOnCreate(linkErr instanceof ApiError ? linkErr.message : 'User created but driver profile link failed. Link manually from user details.');
        }
      }
      await loadUsers();
      setSelectedUserId(r.data.id);
      setPageMessage(selectedRole?.key === 'driver' && linkEntityIdOnCreate && !linkErrorOnCreate ? 'User created and driver profile linked.' : 'User created successfully.');
      showToast(selectedRole?.key === 'driver' && linkEntityIdOnCreate && !linkErrorOnCreate ? 'User created and driver profile linked.' : 'User created successfully.', 'success');
      setLinkEntityIdOnCreate('');
      setIsCreateOpen(false);
    } catch (e) { setCreateError(e instanceof ApiError ? e.message : 'Failed to create.'); }
    finally { setIsSavingCreate(false); }
  }

  async function handleUpdate() {
    if (!auth.accessToken || !selectedUser) return;
    setIsSavingEdit(true); setEditError(null); setPageMessage(null);
    try {
      const r = await updateUserRequest(auth.accessToken, selectedUser.id, {
        name: editForm.name, username: editForm.username, mobile: editForm.mobile, roleId: editForm.roleId, status: editForm.status,
      });
      setUsers(cur => cur.map(u => u.id === selectedUser.id ? r.data : u));
      if (viewUser?.id === selectedUser.id) setViewUser(r.data);
      setPageMessage('User updated.');
      showToast('User updated.', 'success');
    } catch (e) { const msg = e instanceof ApiError ? e.message : 'Failed to update.'; setEditError(msg); showToast(msg, 'error'); }
    finally { setIsSavingEdit(false); }
  }

  async function handleStatus() {
    if (!auth.accessToken || !selectedUser || !statusTarget) return;
    setIsSavingEdit(true);
    try {
      const r = await updateUserStatusRequest(auth.accessToken, selectedUser.id, statusTarget);
      setUsers(cur => cur.map(u => u.id === selectedUser.id ? r.data : u));
      if (viewUser?.id === selectedUser.id) setViewUser(r.data);
      setPageMessage(`Status changed to ${statusTarget.toLowerCase()}.`);
      showToast(`Status changed to ${statusTarget.toLowerCase()}.`, 'success');
      setStatusTarget(null);
    } catch (e) { setEditError(e instanceof ApiError ? e.message : 'Failed.'); }
    finally { setIsSavingEdit(false); }
  }

  async function handlePassword() {
    if (!auth.accessToken || !selectedUser || passwordReset.length < 8) return;
    setIsSavingPassword(true);
    try {
      await updateUserPasswordRequest(auth.accessToken, selectedUser.id, passwordReset);
      setPasswordReset(''); setPageMessage('Password updated.');
      showToast('Password updated.', 'success');
    } catch (e) { const msg = e instanceof ApiError ? e.message : 'Failed.'; setEditError(msg); showToast(msg, 'error'); }
    finally { setIsSavingPassword(false); }
  }

  async function handleDelete() {
    if (!auth.accessToken || !deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteUserRequest(auth.accessToken, deleteTarget.id);
      setPageMessage(`User "${deleteTarget.name}" deleted.`);
      showToast(`User "${deleteTarget.name}" deleted.`, 'success');
      setUsers(cur => cur.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (viewUser?.id === deleteTarget.id) setViewUser(null);
    } catch (e) { setPageError(e instanceof ApiError ? e.message : 'Failed to delete.'); }
    finally { setIsDeleting(false); }
  }

  async function handleLinkProfile() {
    if (!auth.accessToken || !viewUser || !linkEntityId) return;
    setIsLinking(true); setLinkError(null);
    try {
      await createUserProfileLink(auth.accessToken, viewUser.id, {
        profileType: linkProfileType, profileId: linkEntityId, isPrimary: true,
      });
      setPageMessage('Profile linked successfully.');
      showToast('Profile linked successfully.', 'success');
      const r = await getUserProfileLinks(auth.accessToken, viewUser.id);
      setProfileLinks(r.data); setLinkEntityId('');
    } catch (e) { setLinkError(e instanceof ApiError ? e.message : 'Failed to link.'); }
    finally { setIsLinking(false); }
  }

  async function handleRevoke(linkId: string) {
    if (!auth.accessToken) return;
    setIsRevoking(true);
    try {
      await revokeUserProfileLink(auth.accessToken, linkId);
      setProfileLinks(prev => prev.filter(pl => pl.id !== linkId));
      setRevokeTarget(null); setPageMessage('Profile link revoked.');
      showToast('Profile link revoked.', 'success');
    } catch (e) { setLinkError(e instanceof ApiError ? e.message : 'Failed to revoke.'); }
    finally { setIsRevoking(false); }
  }

  if (isLoading) return <LoadingState message="Loading users..." />;
  if (pageError) return <ErrorState message={pageError} onRetry={() => window.location.reload()} />;

  return (
    <section className="page-content">
      <div className="section-header">
        <div>
          <PageHeader eyebrow="Admin" title="Users" description="User directory — manage accounts, roles, and profile links." />
        </div>
        <div className="action-panel">
          {canCreate ? <button type="button" className="primary-button" onClick={() => { setCreateForm({ ...initialForm, roleId: roles[0]?.id || '' }); setCreateError(null); setPageMessage(null); setIsCreateOpen(true); }}>Create user</button> : null}
        </div>
      </div>

      {pageMessage ? <div className="success-banner">{pageMessage}</div> : null}

      <article className="card">
        <div className="table-toolbar">
          <h3 className="table-toolbar-title">User Directory</h3>
          <p className="table-toolbar-copy">{users.length} total users</p>
        </div>
        {users.length === 0 ? (
          <EmptyState title="No users yet" message="Create the first team user." action={canCreate ? <button type="button" className="primary-button" onClick={() => setIsCreateOpen(true)}>Create user</button> : null} />
        ) : (
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (u: UserRecord) => <span style={{ fontWeight: 500 }}>{u.name}</span> },
              { key: 'username', header: 'Username', render: (u: UserRecord) => u.username ? `@${u.username}` : <span className="table-secondary">Not set</span> },
              { key: 'email', header: 'Email', render: (u: UserRecord) => u.email },
              { key: 'role', header: 'Role', render: (u: UserRecord) => u.role.name },
              { key: 'status', header: 'Status', render: (u: UserRecord) => <StatusBadge status={u.status} />, width: '100px' },
              { key: 'lastLoginAt', header: 'Last Login', render: (u: UserRecord) => u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : <span className="table-secondary">Never</span> },
              {
                key: 'actions', header: '', width: '200px',
                render: (u: UserRecord) => (
                  <div className="action-panel" style={{ gap: '0.25rem' }}>
                    <button type="button" className="secondary-button" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} onClick={e => { e.stopPropagation(); openView(u); }}>View</button>
                    <button type="button" className="secondary-button" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} onClick={e => { e.stopPropagation(); navigate(`/users/${u.id}`); }}>Manage Access</button>
                  </div>
                ),
              },
            ]}
            data={users}
            keyExtractor={(u: UserRecord) => u.id}
            onRowClick={(user) => openView(user)}
          />
        )}
      </article>

      {/* Create User Modal */}
      <Modal isOpen={isCreateOpen} title="Create user" description="Add a new team member." onClose={() => { setIsCreateOpen(false); setCreateError(null); }}
        footer={
          <div className="button-row">
            <button type="button" className="ghost-button" onClick={() => { setIsCreateOpen(false); setCreateError(null); }}>Cancel</button>
            <button type="button" className="primary-button" onClick={handleCreate} disabled={isSavingCreate || roles.length === 0}>
              {isSavingCreate ? 'Creating...' : 'Create user'}
            </button>
          </div>
        }
      >
        <div className="stack-form">
          <FormSection title="Identity">
            <div className="form-grid">
              <label><span>Name</span><input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required /></label>
              <label><span>Username</span><input value={createForm.username} onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))} placeholder="username" required /></label>
              <label><span>Email</span><input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} required /></label>
              <label><span>Mobile</span><input value={createForm.mobile} onChange={e => setCreateForm(f => ({ ...f, mobile: e.target.value }))} /></label>
              <label><span>Password</span><input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} required /></label>
            </div>
          </FormSection>
          <FormSection title="Access">
            <div className="form-grid">
              <label><span>Role</span>
                <select value={createForm.roleId} onChange={e => { setCreateForm(f => ({ ...f, roleId: e.target.value })); setLinkEntityIdOnCreate(''); }} disabled={roles.length === 0}>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
              <label><span>Status</span>
                <select value={createForm.status} onChange={e => setCreateForm(f => ({ ...f, status: e.target.value as UserFormState['status'] }))}>
                  <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="SUSPENDED">Suspended</option>
                </select>
              </label>
            </div>
            {roles.find(rl => rl.id === createForm.roleId)?.key === 'driver' && (
              <div style={{ marginTop: '0.75rem' }}>
                <label><span>Link Driver Profile (required for Driver role)</span>
                  <select value={linkEntityIdOnCreate} onChange={e => setLinkEntityIdOnCreate(e.target.value)}>
                    <option value="">Choose a driver...</option>
                    {allDrivers.filter(d => d.status !== 'INACTIVE').map(d => (
                      <option key={d.driverId} value={d.driverId} disabled={d.isLinked}>{d.name} ({d.mobile}) - {d.status}{d.isLinked ? ' (Linked)' : ''}</option>
                    ))}
                  </select>
                </label>
                {allDrivers.filter(d => d.status !== 'INACTIVE' && !d.isLinked).length === 0 && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>No unlinked drivers available. Create the driver first.</p>
                )}
                {linkErrorOnCreate && <div className="error-banner" style={{ marginTop: '0.5rem' }}>{linkErrorOnCreate}</div>}
              </div>
            )}
          </FormSection>
          {createError ? <div className="error-banner">{createError}</div> : null}
        </div>
      </Modal>

      {/* Confirm Status Dialog */}
      <ConfirmDialog isOpen={!!statusTarget} title="Confirm status change"
        description={`Update ${selectedUser?.name ?? 'this user'} to ${statusTarget?.toLowerCase() ?? 'selected'} status?`}
        confirmLabel="Update status" tone={statusTarget === 'SUSPENDED' ? 'danger' : 'default'}
        isConfirming={isSavingEdit} onCancel={() => setStatusTarget(null)} onConfirm={handleStatus} />

      {/* Revoke Link Confirmation */}
      <ConfirmDialog isOpen={!!revokeTarget} title="Revoke profile link"
        description="Remove this profile link from the user? Role-specific access will be removed."
        confirmLabel="Revoke" tone="danger" isConfirming={isRevoking}
        onCancel={() => setRevokeTarget(null)} onConfirm={() => revokeTarget ? handleRevoke(revokeTarget) : Promise.resolve()} />

      {/* View User Modal */}
      <Modal isOpen={!!viewUser} title={viewUser?.name ?? ''}
        description={viewUser ? `${viewUser.email} — ${viewUser.role.name}` : ''}
        onClose={() => { setViewUser(null); setViewTab('overview'); }}
        footer={
          <div className="button-row" style={{ justifyContent: 'space-between' }}>
            <div>
              {canDelete && viewUser ? <button type="button" className="danger-button" onClick={() => setDeleteTarget(viewUser)}>Delete user</button> : null}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="ghost-button" onClick={() => { setViewUser(null); setViewTab('overview'); }}>Close</button>
            </div>
          </div>
        }
        size="large"
      >
        {viewUser && (
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid var(--color-border)', marginBottom: '1rem', overflowX: 'auto' }}>
              {['Overview', 'Account', 'Access', 'Profile Links', 'Activity'].map(tab => (
                <button key={tab} type="button" className={`tab-button ${viewTab === tab.toLowerCase() ? 'active-tab' : ''}`} onClick={() => setViewTab(tab.toLowerCase())} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{tab}</button>
              ))}
            </div>

            {viewTab === 'overview' && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <article className="card" style={{ padding: '1.25rem' }}>
                  <div className="detail-grid">
                    <div><p className="detail-label">Name</p><p className="detail-value">{viewUser.name}</p></div>
                    <div><p className="detail-label">Username</p><p className="detail-value">@{viewUser.username ?? 'unset'}</p></div>
                    <div><p className="detail-label">Email</p><p className="detail-value">{viewUser.email}</p></div>
                    <div><p className="detail-label">Mobile</p><p className="detail-value">{viewUser.mobile || 'Not set'}</p></div>
                    <div><p className="detail-label">Role</p><p className="detail-value">{viewUser.role.name} ({viewUser.role.key})</p></div>
                    <div><p className="detail-label">Status</p><StatusBadge status={viewUser.status} /></div>
                    <div><p className="detail-label">Last login</p><p className="detail-value">{viewUser.lastLoginAt ? new Date(viewUser.lastLoginAt).toLocaleString() : 'Never'}</p></div>
                    <div><p className="detail-label">Created</p><p className="detail-value">{new Date(viewUser.createdAt).toLocaleString()}</p></div>
                  </div>
                </article>

                {/* Linked Profile Card */}
                <article className="card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>Linked Profiles</h4>
                  {profileLinks.length > 0 ? (
                    profileLinks.map(pl => {
                      const driver = allDrivers.find(d => d.driverId === pl.profileId);
                      const linkedStaff = availableStaffProfiles.find(s => s.profileId === pl.profileId);
                      const linkedVendor = availableVendors.find(v => v.vendorId === pl.profileId);
                      const linkedCustomer = availableCustomers.find(c => c.customerId === pl.profileId);
                      const displayName = driver?.name || linkedStaff?.name || linkedVendor?.name || linkedCustomer?.name || pl.profileId;
                      return (
                        <div key={pl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600 }}>{displayName}</p>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                              {pl.profileType} — <StatusBadge status={pl.status as 'ACTIVE' | 'INACTIVE' | 'REVOKED'} /> {pl.isPrimary ? '(primary)' : ''}
                            </p>
                          </div>
                          <button type="button" className="secondary-button" style={{ fontSize: '0.8rem' }} onClick={() => setViewTab('profile links')}>Manage</button>
                        </div>
                      );
                    })
                  ) : (
                    <div>
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>No profile linked.</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
                        User is the login account. Profiles represent operational roles (driver, mechanic, finance, etc.). Linking them lets the user access role-specific data.
                      </p>
                      <button type="button" className="primary-button" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }} onClick={() => setViewTab('profile links')}>Link Profile</button>
                    </div>
                  )}
                </article>

                {/* Stats */}
                {(() => { const s = getSummary(viewUser.id); return s ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <article className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-accent)' }}>{s.effectivePermissionsCount}</p>
                      <p style={{ fontSize: '0.75rem', margin: '0.25rem 0 0', color: 'var(--color-text-secondary)' }}>Permissions</p>
                    </article>
                    <article className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-success)' }}>{s.dataScopesCount}</p>
                      <p style={{ fontSize: '0.75rem', margin: '0.25rem 0 0', color: 'var(--color-text-secondary)' }}>Scopes</p>
                    </article>
                    <article className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-warning)' }}>{s.overridesCount}</p>
                      <p style={{ fontSize: '0.75rem', margin: '0.25rem 0 0', color: 'var(--color-text-secondary)' }}>Overrides</p>
                    </article>
                  </div>
                ) : null; })()}
              </div>
            )}

            {viewTab === 'account' && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <article className="card" style={{ padding: '1.25rem' }}>
                  <FormSection title="Edit Account">
                    <div className="form-grid">
                      <label><span>Name</span><input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} disabled={!canUpdate} /></label>
                      <label><span>Username</span><input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} disabled={!canUpdate} /></label>
                      <label><span>Mobile</span><input value={editForm.mobile} onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))} disabled={!canUpdate} /></label>
                    </div>
                    {canUpdate && <div className="button-row"><button type="button" className="primary-button" onClick={handleUpdate} disabled={isSavingEdit}>{isSavingEdit ? 'Saving...' : 'Update profile'}</button></div>}
                  </FormSection>
                </article>
                <article className="card" style={{ padding: '1.25rem' }}>
                  <FormSection title="Account Status">
                    <div className="button-row wrap-row">
                      <button type="button" className="secondary-button" onClick={() => setStatusTarget('ACTIVE')}>Mark active</button>
                      <button type="button" className="secondary-button" onClick={() => setStatusTarget('INACTIVE')}>Deactivate</button>
                      <button type="button" className="danger-button" onClick={() => setStatusTarget('SUSPENDED')}>Suspend</button>
                    </div>
                  </FormSection>
                </article>
                <article className="card" style={{ padding: '1.25rem' }}>
                  <FormSection title="Password Reset">
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
                      <label style={{ flex: 1 }}><span>New password</span><input type="password" value={passwordReset} onChange={e => setPasswordReset(e.target.value)} placeholder="Enter new password" /></label>
                      <button type="button" className="secondary-button" onClick={handlePassword} disabled={isSavingPassword || passwordReset.length < 8}>{isSavingPassword ? 'Updating...' : 'Reset'}</button>
                    </div>
                  </FormSection>
                </article>
              </div>
            )}

            {viewTab === 'access' && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {(() => { const s = getSummary(viewUser.id); return (
                  <>
                    <article className="card" style={{ padding: '1.25rem' }}>
                      <details>
                        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Role</summary>
                        <div style={{ marginTop: '0.75rem' }}>
                          <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Current: {viewUser.role.name} ({viewUser.role.key})</p>
                          <label><span>Change role</span>
                            <select value={editForm.roleId} onChange={e => setEditForm(f => ({ ...f, roleId: e.target.value }))} disabled={!canUpdate}>
                              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                          </label>
                          {canUpdate && <div className="button-row" style={{ marginTop: '0.5rem' }}><button type="button" className="primary-button" onClick={async () => {
                            if (!auth.accessToken) return;
                            setIsSavingEdit(true); setEditError(null); setPageMessage(null);
                            try {
                              const r = await updateUserRequest(auth.accessToken, viewUser.id, { roleId: editForm.roleId });
                              setUsers(cur => cur.map(u => u.id === viewUser.id ? { ...u, role: r.data.role } : u));
                              setViewUser({ ...viewUser, role: r.data.role });
                              setPageMessage('Role updated.');
                            } catch (e) { setEditError(e instanceof ApiError ? e.message : 'Failed.'); }
                            finally { setIsSavingEdit(false); }
                          }} disabled={isSavingEdit}>{isSavingEdit ? 'Saving...' : 'Change role'}</button></div>}
                        </div>
                      </details>
                    </article>
                    <article className="card" style={{ padding: '1.25rem' }}>
                      <details>
                        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Effective Permissions ({s?.effectivePermissionsCount ?? '-'})</summary>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0.5rem 0' }}>
                          {viewUser.role.key === 'super_admin' ? 'Super admin has access to all permissions.' : 'Permissions based on role and overrides. View full list on the user detail page.'}
                        </p>
                        <button type="button" className="secondary-button" style={{ fontSize: '0.85rem' }} onClick={() => navigate(`/users/${viewUser.id}`)}>View all permissions</button>
                      </details>
                    </article>
                    <article className="card" style={{ padding: '1.25rem' }}>
                      <details>
                        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Permission Overrides ({s?.overridesCount ?? 0})</summary>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0.5rem 0' }}>Individual grants or denials. Manage on the full user detail page.</p>
                        <button type="button" className="secondary-button" style={{ fontSize: '0.85rem' }} onClick={() => navigate(`/users/${viewUser.id}`)}>Manage overrides</button>
                      </details>
                    </article>
                    <article className="card" style={{ padding: '1.25rem' }}>
                      <details>
                        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Data Scopes ({s?.dataScopesCount ?? 0})</summary>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0.5rem 0' }}>Data access scopes. Manage on the full user detail page.</p>
                        <button type="button" className="secondary-button" style={{ fontSize: '0.85rem' }} onClick={() => navigate(`/users/${viewUser.id}`)}>Manage scopes</button>
                      </details>
                    </article>
                    <article className="card" style={{ padding: '1.25rem' }}>
                      <details>
                        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Menu Preview</summary>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0.5rem 0' }}>Which menus are visible based on permissions. View on user detail page.</p>
                        <button type="button" className="secondary-button" style={{ fontSize: '0.85rem' }} onClick={() => navigate(`/users/${viewUser.id}`)}>View menu preview</button>
                      </details>
                    </article>
                    {editError && <div className="error-banner">{editError}</div>}
                  </>
                ); })()}
              </div>
            )}

            {viewTab === 'profile links' && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <article className="card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Current Linked Profiles</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }}>
                    User is the login account. Profiles represent operational roles (driver, mechanic, finance, etc.). Linking them lets the user access role-specific data.
                  </p>
                  {linkError && <div className="error-banner">{linkError}</div>}
                  {profileLinks.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>No profile linked.</p>
                  ) : (
                    profileLinks.map(pl => {
                      const driver = allDrivers.find(d => d.driverId === pl.profileId);
                      const linkedStaff = availableStaffProfiles.find(s => s.profileId === pl.profileId);
                      const linkedVendor = availableVendors.find(v => v.vendorId === pl.profileId);
                      const linkedCustomer = availableCustomers.find(c => c.customerId === pl.profileId);
                      const displayName = driver?.name || linkedStaff?.name || linkedVendor?.name || linkedCustomer?.name || pl.profileId;
                      return (
                        <div key={pl.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600 }}>{displayName}</p>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                              {pl.profileType} — <StatusBadge status={pl.status as 'ACTIVE' | 'INACTIVE' | 'REVOKED'} /> {pl.isPrimary ? '(primary)' : ''}
                            </p>
                          </div>
                          <button type="button" className="danger-button" style={{ fontSize: '0.8rem' }} onClick={() => setRevokeTarget(pl.id)}>Revoke</button>
                        </div>
                      );
                    })
                  )}
                </article>

                {auth.hasPermission('profile_link_create') && (
                  <article className="card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>Link Profile</h4>
                    <div className="form-grid">
                      <label>
                        <span>Profile type</span>
                        <select value={linkProfileType} onChange={e => { setLinkProfileType(e.target.value); loadEntitiesForType(e.target.value); }}>
                          <option value="DRIVER">Driver</option>
                          <option value="MECHANIC">Mechanic</option>
                          <option value="EMPLOYEE">Employee</option>
                          <option value="FINANCE">Finance</option>
                          <option value="COLLECTOR">Collector</option>
                          <option value="VENDOR_CONTACT">Vendor Contact</option>
                          <option value="CUSTOMER_CONTACT">Customer Contact</option>
                        </select>
                      </label>
                      {linkProfileType === 'DRIVER' && (
                        <label>
                          <span>Select driver</span>
                          <select value={linkEntityId} onChange={e => setLinkEntityId(e.target.value)}>
                            <option value="">Choose a driver...</option>
                            {allDrivers.filter(d => showAllDrivers || d.status !== 'INACTIVE').map(d => (
                              <option key={d.driverId} value={d.driverId} disabled={d.isLinked}>{d.name} ({d.mobile}) - {d.status}{d.isLinked ? ' (Linked)' : ''}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      {(linkProfileType === 'MECHANIC' || linkProfileType === 'EMPLOYEE' || linkProfileType === 'FINANCE' || linkProfileType === 'COLLECTOR') && (
                        <label>
                          <span>Select {linkProfileType.toLowerCase()}</span>
                          <select value={linkEntityId} onChange={e => setLinkEntityId(e.target.value)}>
                            <option value="">Choose a {linkProfileType.toLowerCase()}...</option>
                      {availableStaffProfiles.filter(s => !s.isLinked).map(s => (
                        <option key={s.profileId} value={s.profileId}>{s.name}{s.email ? ` (${s.email})` : ''}</option>
                      ))}
                          </select>
                        </label>
                      )}
                      {linkProfileType === 'VENDOR_CONTACT' && (
                        <label>
                          <span>Select vendor</span>
                          <select value={linkEntityId} onChange={e => setLinkEntityId(e.target.value)}>
                            <option value="">Choose a vendor...</option>
                            {availableVendors.filter(v => !v.isLinked).map(v => (
                              <option key={v.vendorId} value={v.vendorId}>{v.name}{v.contactPerson ? ` (${v.contactPerson})` : ''}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      {linkProfileType === 'CUSTOMER_CONTACT' && (
                        <label>
                          <span>Select customer</span>
                          <select value={linkEntityId} onChange={e => setLinkEntityId(e.target.value)}>
                            <option value="">Choose a customer...</option>
                            {availableCustomers.filter(c => !c.isLinked).map(c => (
                              <option key={c.customerId} value={c.customerId}>{c.name}{c.contactPerson ? ` (${c.contactPerson})` : ''}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      {linkProfileType === 'DRIVER' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                          <input type="checkbox" checked={showAllDrivers} onChange={e => setShowAllDrivers(e.target.checked)} />
                          <span style={{ fontSize: '0.85rem' }}>Show all drivers</span>
                        </label>
                      )}
                    </div>
                    <div className="button-row">
                      <button type="button" className="primary-button" disabled={!linkEntityId || isLinking} onClick={handleLinkProfile}>
                        {isLinking ? 'Linking...' : `Link ${linkProfileType.toLowerCase().replace(/_/g, ' ')}`}
                      </button>
                    </div>
                  </article>
                )}
              </div>
            )}

            {viewTab === 'activity' && (
              <article className="card" style={{ padding: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                  View full activity timeline on the user detail page.
                </p>
                <button type="button" className="secondary-button" onClick={() => { setViewUser(null); navigate(`/users/${viewUser.id}`); }}>
                  Open user detail page
                </button>
              </article>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation (after view modal so it renders on top) */}
      <ConfirmDialog isOpen={!!deleteTarget} title="Delete user"
        description={`Permanently delete "${deleteTarget?.name}" (${deleteTarget?.email})? This action cannot be undone.`}
        confirmLabel="Delete" tone="danger" isConfirming={isDeleting}
        onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} />
    </section>
  );
}
