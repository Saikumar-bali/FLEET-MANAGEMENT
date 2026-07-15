import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormSection } from '../components/FormSection';
import { DataTable } from '../components/DataTable';
import { navigationItems } from '../config/navigation';
import {
  getUser,
  getRoles,
  getPermissions,
  getUserEffectivePermissions,
  getUserPermissionOverrides,
  setUserPermissionOverride,
  removeUserPermissionOverride,
  getUserDataScopes,
  grantUserDataScope,
  removeUserDataScope,
  getUserActivity,
  updateUserStatus,
  updateUser,
  getUserProfileLinks,
  createUserProfileLink,
  revokeUserProfileLink,
  getAvailableDrivers,
  getAvailableUsers,
  getAvailableVendors,
  getAvailableCustomers,
  getVehicles,
} from '../services/api';
import type {
  UserRecord, RoleRecord, PermissionRecord, ProfileLinkRecord,
  EffectivePermissionsResponse, UserPermissionOverrideRecord, UserDataScopeRecord, UserActivityRecord,
} from '../types/auth';
import type { AvailableDriver, AvailableUser, AvailableVendor, AvailableCustomer } from '../services/api';

type TabId = 'overview' | 'account' | 'access' | 'profile-links' | 'activity';

const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'account', label: 'Account' },
  { id: 'access', label: 'Access' },
  { id: 'profile-links', label: 'Profile Links' },
  { id: 'activity', label: 'Activity' },
];

const SCOPE_TYPES = ['OWN', 'USER', 'DRIVER', 'VEHICLE', 'TRIP', 'ASSET', 'CUSTOMER', 'VENDOR', 'BRANCH', 'DEPARTMENT', 'FINANCE', 'GLOBAL'];
const ACCESS_LEVELS = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'MANAGE'];

function formatDate(d: string | null | undefined) { if (!d) return 'Never'; return new Date(d).toLocaleString(); }
function isExpired(expiresAt: string | null | undefined) { if (!expiresAt) return false; return new Date(expiresAt) < new Date(); }

export function UserDetailPage() {
  const { id } = useParams();
  const auth = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserRecord | null>(null);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionRecord[]>([]);
  const [effectivePerms, setEffectivePerms] = useState<EffectivePermissionsResponse | null>(null);
  const [overrides, setOverrides] = useState<UserPermissionOverrideRecord[]>([]);
  const [dataScopes, setDataScopes] = useState<UserDataScopeRecord[]>([]);
  const [activity, setActivity] = useState<UserActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Account form
  const [editName, setEditName] = useState(''); const [editUsername, setEditUsername] = useState('');
  const [editMobile, setEditMobile] = useState(''); const [editRoleId, setEditRoleId] = useState('');
  const [statusTarget, setStatusTarget] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Override form
  const [overridePermKey, setOverridePermKey] = useState('');
  const [overrideEffect, setOverrideEffect] = useState<'ALLOW' | 'DENY'>('ALLOW');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideExpiresAt, setOverrideExpiresAt] = useState('');
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Scope form
  const [scopeType, setScopeType] = useState('VEHICLE');
  const [scopeId, setScopeId] = useState('');
  const [scopeAccessLevel, setScopeAccessLevel] = useState('VIEW');
  const [scopeReason, setScopeReason] = useState('');
  const [scopeExpiresAt, setScopeExpiresAt] = useState('');
  const [isSavingScope, setIsSavingScope] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

  // Profile links
  const [profileLinks, setProfileLinks] = useState<ProfileLinkRecord[]>([]);
  const [allDrivers, setAllDrivers] = useState<AvailableDriver[]>([]);
  const [driverSearch, setDriverSearch] = useState('');
  const [driverLoadError, setDriverLoadError] = useState<string | null>(null);
  const [linkProfileType, setLinkProfileType] = useState<string>('DRIVER');
  const [linkEntityId, setLinkEntityId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [showAllDrivers, setShowAllDrivers] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [availableVendors, setAvailableVendors] = useState<AvailableVendor[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<AvailableCustomer[]>([]);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Vehicle list for scope dropdown
  const [allVehicles, setAllVehicles] = useState<{ id: string; vehicleNumber: string; vehicleType: string; status: string }[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);

  const [permSearch, setPermSearch] = useState('');
  const [permModuleFilter, setPermModuleFilter] = useState('');

  const isSuperAdmin = auth.user?.role.key === 'super_admin';

  const loadAll = async () => {
    if (!auth.accessToken || !id) return;
    setIsLoading(true); setError(null);
    try {
      const [userRes, rolesRes, permsRes, effRes, ovrRes, scopesRes, actRes, plRes] = await Promise.all([
        getUser(auth.accessToken, id), getRoles(auth.accessToken), getPermissions(auth.accessToken),
        getUserEffectivePermissions(auth.accessToken, id), getUserPermissionOverrides(auth.accessToken, id),
        getUserDataScopes(auth.accessToken, id), getUserActivity(auth.accessToken, id),
        getUserProfileLinks(auth.accessToken, id).catch(() => ({ data: [] })),
      ]);
      setUser(userRes.data); setRoles(rolesRes.data); setAllPermissions(permsRes.data);
      setEffectivePerms(effRes.data); setOverrides(ovrRes.data); setDataScopes(scopesRes.data);
      setActivity(actRes.data); setProfileLinks(Array.isArray(plRes.data) ? plRes.data : []);
      setEditName(userRes.data.name); setEditUsername(userRes.data.username ?? '');
      setEditMobile(userRes.data.mobile ?? ''); setEditRoleId(userRes.data.role.id);
      try {
        const dRes = await getAvailableDrivers(auth.accessToken, { showAll: true });
        setAllDrivers(Array.isArray(dRes.data) ? dRes.data : []);
        setDriverLoadError(null);
      } catch (e) {
        setAllDrivers([]);
        setDriverLoadError(e instanceof ApiError ? e.message : 'Unable to load drivers.');
      }
      try {
        const uRes = await getAvailableUsers(auth.accessToken, 'MECHANIC');
        setAvailableUsers(Array.isArray(uRes.data) ? uRes.data : []);
      } catch { setAvailableUsers([]); }
      try {
        const vRes = await getAvailableVendors(auth.accessToken);
        setAvailableVendors(Array.isArray(vRes.data) ? vRes.data : []);
      } catch { setAvailableVendors([]); }
      try {
        const cRes = await getAvailableCustomers(auth.accessToken);
        setAvailableCustomers(Array.isArray(cRes.data) ? cRes.data : []);
      } catch { setAvailableCustomers([]); }
      try {
        const vRes = await getVehicles(auth.accessToken, { limit: 100 });
        setAllVehicles(vRes.data?.items ?? []);
      } catch { setAllVehicles([]); }
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Failed to load user details.');
    } finally { setIsLoading(false); }
  };

  useEffect(() => { void loadAll(); }, [id, auth.accessToken]);

  const filteredPermissions = useMemo(() => {
    let perms = allPermissions;
    if (permSearch) perms = perms.filter(p => p.key.toLowerCase().includes(permSearch.toLowerCase()) || p.module.toLowerCase().includes(permSearch.toLowerCase()));
    if (permModuleFilter) perms = perms.filter(p => p.module === permModuleFilter);
    return perms;
  }, [allPermissions, permSearch, permModuleFilter]);

  const modules = useMemo(() => { const mods = new Set(allPermissions.map(p => p.module)); return Array.from(mods).sort(); }, [allPermissions]);

  async function handleUpdateProfile() {
    if (!auth.accessToken || !id) return;
    setIsSaving(true); setMessage(null); setError(null);
    try { const res = await updateUser(auth.accessToken, id, { name: editName, username: editUsername, mobile: editMobile }); setUser(res.data); showToast('Profile updated.', 'success'); }
    catch (e) { const msg = e instanceof ApiError ? e.message : 'Failed to update.'; showToast(msg, 'error'); setError(msg); } finally { setIsSaving(false); }
  }

  async function handleStatusUpdate() {
    if (!auth.accessToken || !id || !statusTarget) return;
    setIsSaving(true);
    try { const res = await updateUserStatus(auth.accessToken, id, statusTarget); setUser(res.data); showToast(`Status changed to ${statusTarget.toLowerCase()}.`, 'success'); setStatusTarget(null); }
    catch (e) { const msg = e instanceof ApiError ? e.message : 'Failed to update status.'; showToast(msg, 'error'); setError(msg); } finally { setIsSaving(false); }
  }

  async function handleAddOverride() {
    if (!auth.accessToken || !id || !overridePermKey) return;
    setIsSavingOverride(true); setOverrideError(null);
    try {
      const res = await setUserPermissionOverride(auth.accessToken, id, { permissionKey: overridePermKey, effect: overrideEffect, reason: overrideReason || undefined, expiresAt: overrideExpiresAt || undefined });
      setOverrides(prev => { const idx = prev.findIndex(o => o.permission.key === overridePermKey); if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...res.data, permission: { ...next[idx].permission, ...res.data.permission } }; return next; } return [...prev, res.data]; });
      setOverridePermKey(''); setOverrideReason(''); setOverrideExpiresAt('');
      const effRes = await getUserEffectivePermissions(auth.accessToken, id); setEffectivePerms(effRes.data);
    } catch (e) { setOverrideError(e instanceof ApiError ? e.message : 'Failed to set override.'); } finally { setIsSavingOverride(false); }
  }

  async function handleRemoveOverride(permissionId: string) {
    if (!auth.accessToken || !id) return;
    try { await removeUserPermissionOverride(auth.accessToken, id, permissionId); setOverrides(prev => prev.filter(o => o.permissionId !== permissionId)); const effRes = await getUserEffectivePermissions(auth.accessToken, id); setEffectivePerms(effRes.data); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to remove override.'); }
  }

  async function handleGrantScope() {
    if (!auth.accessToken || !id) return;
    setIsSavingScope(true); setScopeError(null);
    try {
      if (scopeType === 'VEHICLE' && selectedVehicleIds.length > 0) {
        const results: UserDataScopeRecord[] = [];
        for (const vid of selectedVehicleIds) {
          const res = await grantUserDataScope(auth.accessToken, id, { scopeType, scopeId: vid, accessLevel: scopeAccessLevel, reason: scopeReason || undefined, expiresAt: scopeExpiresAt || undefined });
          results.push(res.data);
        }
        setDataScopes(prev => [...prev, ...results]);
      } else {
        const res = await grantUserDataScope(auth.accessToken, id, { scopeType, scopeId: scopeType !== 'GLOBAL' && scopeType !== 'OWN' ? scopeId : undefined, accessLevel: scopeAccessLevel, reason: scopeReason || undefined, expiresAt: scopeExpiresAt || undefined });
        setDataScopes(prev => [...prev, res.data]);
      }
      setScopeId(''); setScopeReason(''); setScopeExpiresAt(''); setSelectedVehicleIds([]); setVehicleSearch('');
    } catch (e) { setScopeError(e instanceof ApiError ? e.message : 'Failed to grant scope.'); } finally { setIsSavingScope(false); }
  }

  async function handleRemoveScope(scopeRecordId: string) {
    if (!auth.accessToken || !id) return;
    try { await removeUserDataScope(auth.accessToken, id, scopeRecordId); setDataScopes(prev => prev.filter(s => s.id !== scopeRecordId)); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to remove scope.'); }
  }

  async function handleLinkProfile() {
    if (!auth.accessToken || !id || !linkEntityId) return;
    setIsLinking(true); setLinkError(null);
    try {
      await createUserProfileLink(auth.accessToken, id, { profileType: linkProfileType, profileId: linkEntityId, isPrimary: true });
      showToast('Profile linked successfully.', 'success');
      const plRes = await getUserProfileLinks(auth.accessToken, id); setProfileLinks(plRes.data); setLinkEntityId(''); setDriverSearch('');
      const dRes = await getAvailableDrivers(auth.accessToken, { showAll: showAllDrivers });
      setAllDrivers(Array.isArray(dRes.data) ? dRes.data : []);
    } catch (e) { setLinkError(e instanceof ApiError ? e.message : 'Failed to link profile.'); } finally { setIsLinking(false); }
  }

  async function handleRevokeLink(linkId: string) {
    if (!auth.accessToken) return;
    setIsRevoking(true);
    try {
      await revokeUserProfileLink(auth.accessToken, linkId); setProfileLinks(prev => prev.filter(pl => pl.id !== linkId)); setRevokeTarget(null); showToast('Profile link revoked.', 'success');
      const dRes = await getAvailableDrivers(auth.accessToken, { showAll: showAllDrivers });
      setAllDrivers(Array.isArray(dRes.data) ? dRes.data : []);
      try {
        const uRes = await getAvailableUsers(auth.accessToken, 'MECHANIC');
        setAvailableUsers(Array.isArray(uRes.data) ? uRes.data : []);
      } catch { setAvailableUsers([]); }
      try {
        const vRes = await getAvailableVendors(auth.accessToken);
        setAvailableVendors(Array.isArray(vRes.data) ? vRes.data : []);
      } catch { setAvailableVendors([]); }
      try {
        const cRes = await getAvailableCustomers(auth.accessToken);
        setAvailableCustomers(Array.isArray(cRes.data) ? cRes.data : []);
      } catch { setAvailableCustomers([]); }
    }
    catch (e) { setLinkError(e instanceof ApiError ? e.message : 'Failed to revoke.'); } finally { setIsRevoking(false); }
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
        try { const r = await getAvailableUsers(auth.accessToken, profileType); setAvailableUsers(Array.isArray(r.data) ? r.data : []); } catch {}
        break;
      case 'VENDOR_CONTACT':
        try { const r = await getAvailableVendors(auth.accessToken); setAvailableVendors(Array.isArray(r.data) ? r.data : []); } catch {}
        break;
      case 'CUSTOMER_CONTACT':
        try { const r = await getAvailableCustomers(auth.accessToken); setAvailableCustomers(Array.isArray(r.data) ? r.data : []); } catch {}
        break;
    }
  }

  async function refreshDrivers() {
    if (!auth.accessToken) return;
    try {
      const dRes = await getAvailableDrivers(auth.accessToken, { showAll: showAllDrivers });
      setAllDrivers(Array.isArray(dRes.data) ? dRes.data : []);
      setDriverLoadError(null);
    } catch (e) {
      setDriverLoadError(e instanceof ApiError ? e.message : 'Unable to load drivers.');
    }
  }

  const visibleMenus = useMemo(() => {
    if (!effectivePerms) return { visible: [], hidden: [] as typeof navigationItems };
    const visible: typeof navigationItems = []; const hidden: typeof navigationItems = [];
    for (const item of navigationItems) {
      if (item.permissionKeys.length === 0 || item.permissionKeys.some(k => effectivePerms.effectivePermissions.includes(k))) visible.push(item);
      else hidden.push(item);
    }
    return { visible, hidden };
  }, [effectivePerms]);

  if (isLoading) return <LoadingState message="Loading user..." />;
  if (error && !user) return <ErrorState message={error} onRetry={loadAll} />;
  if (!user) return <ErrorState message="User not found." />;

  return (
    <section className="page-content">
      <PageHeader eyebrow={`User / ${user.role.name}`} title={user.name} description={`${user.email} — ${user.status.toLowerCase()}`} />
      <button type="button" className="ghost-button" onClick={() => navigate('/users')} style={{ marginBottom: '1rem' }}>&larr; Back to users</button>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="section-tabs">
        {tabs.map(t => (
          <button key={t.id} type="button" className={`tab-button ${activeTab === t.id ? 'active-tab' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ─── Overview Tab ─── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <article className="card" style={{ padding: '1.25rem' }}>
            <div className="detail-grid">
              <div><p className="detail-label">Name</p><p className="detail-value">{user.name}</p></div>
              <div><p className="detail-label">Username</p><p className="detail-value">@{user.username ?? 'unset'}</p></div>
              <div><p className="detail-label">Email</p><p className="detail-value">{user.email}</p></div>
              <div><p className="detail-label">Mobile</p><p className="detail-value">{user.mobile || 'Not set'}</p></div>
              <div><p className="detail-label">Role</p><p className="detail-value">{user.role.name} ({user.role.key})</p></div>
              <div><p className="detail-label">Status</p><StatusBadge status={user.status} /></div>
              <div><p className="detail-label">Last login</p><p className="detail-value">{formatDate(user.lastLoginAt)}</p></div>
              <div><p className="detail-label">Created</p><p className="detail-value">{formatDate(user.createdAt)}</p></div>
            </div>
          </article>

          {/* Linked Profile Card */}
          <article className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>Linked Profiles</h4>
            {profileLinks.length > 0 ? (
              profileLinks.map(pl => {
                const driver = allDrivers.find(d => d.driverId === pl.profileId);
                const linkedUser = availableUsers.find(u => u.userId === pl.profileId);
                const linkedVendor = availableVendors.find(v => v.vendorId === pl.profileId);
                const linkedCustomer = availableCustomers.find(c => c.customerId === pl.profileId);
                const displayName = driver?.name || linkedUser?.name || linkedVendor?.name || linkedCustomer?.name || pl.profileId;
                return (
                  <div key={pl.id} style={{ padding: '0.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{displayName}</p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        {pl.profileType} — <StatusBadge status={pl.status as 'ACTIVE' | 'INACTIVE' | 'REVOKED'} /> {pl.isPrimary ? '(primary)' : ''}
                      </p>
                    </div>
                    <button type="button" className="secondary-button" style={{ fontSize: '0.8rem' }} onClick={() => setActiveTab('profile-links')}>Manage</button>
                  </div>
                );
              })
            ) : (
              <div>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>No profile linked.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
                  User is the login account. Profiles represent operational roles (driver, mechanic, finance, etc.). Linking them lets the user access role-specific data.
                </p>
                <button type="button" className="primary-button" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }} onClick={() => setActiveTab('profile-links')}>Link Profile</button>
              </div>
            )}
          </article>

          {/* Stats */}
          {effectivePerms && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <article className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-accent)' }}>{effectivePerms.effectivePermissions.length}</p>
                <p style={{ fontSize: '0.75rem', margin: '0.25rem 0 0', color: 'var(--color-text-secondary)' }}>Effective Permissions</p>
              </article>
              <article className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-success)' }}>{dataScopes.length}</p>
                <p style={{ fontSize: '0.75rem', margin: '0.25rem 0 0', color: 'var(--color-text-secondary)' }}>Data Scopes</p>
              </article>
              <article className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-warning)' }}>{overrides.length}</p>
                <p style={{ fontSize: '0.75rem', margin: '0.25rem 0 0', color: 'var(--color-text-secondary)' }}>Overrides</p>
              </article>
            </div>
          )}
        </div>
      )}

      {/* ─── Account Tab ─── */}
      {activeTab === 'account' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <article className="card" style={{ padding: '1.25rem' }}>
            <FormSection title="Edit Account" description="Update name, username, or mobile.">
              <div className="form-grid">
                <label><span>Name</span><input value={editName} onChange={e => setEditName(e.target.value)} /></label>
                <label><span>Username</span><input value={editUsername} onChange={e => setEditUsername(e.target.value)} /></label>
                <label><span>Mobile</span><input value={editMobile} onChange={e => setEditMobile(e.target.value)} /></label>
              </div>
              <div className="button-row"><button type="button" className="primary-button" onClick={handleUpdateProfile} disabled={isSaving}>{isSaving ? 'Saving...' : 'Update profile'}</button></div>
            </FormSection>
          </article>
          <article className="card" style={{ padding: '1.25rem' }}>
            <FormSection title="Account Status" description="Change user status or disable account.">
              <div className="button-row wrap-row">
                <button type="button" className="secondary-button" onClick={() => setStatusTarget('ACTIVE')}>Mark active</button>
                <button type="button" className="secondary-button" onClick={() => setStatusTarget('INACTIVE')}>Deactivate</button>
                <button type="button" className="danger-button" onClick={() => setStatusTarget('SUSPENDED')}>Suspend</button>
              </div>
            </FormSection>
          </article>
        </div>
      )}

      {/* ─── Access Tab (collapsible sections) ─── */}
      {activeTab === 'access' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {overrideError ? <div className="error-banner">{overrideError}</div> : null}
          {scopeError ? <div className="error-banner">{scopeError}</div> : null}

          {/* Role */}
          <article className="card" style={{ padding: '1.25rem' }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Role</summary>
              <div style={{ marginTop: '0.75rem' }}>
                <div className="form-grid">
                  <label><span>Current role</span><p className="detail-value">{user.role.name} ({user.role.key})</p></label>
                  <label><span>New role</span><select value={editRoleId} onChange={e => setEditRoleId(e.target.value)}>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
                </div>
                <div className="button-row">
                  <button type="button" className="primary-button" onClick={async () => {
                    if (!auth.accessToken || !id) return;
                    setIsSaving(true); setError(null); setMessage(null);
                    try { const res = await updateUser(auth.accessToken, id, { roleId: editRoleId }); setUser(res.data); showToast('Role updated.', 'success'); }
                    catch (e) { const msg = e instanceof ApiError ? e.message : 'Failed to update role.'; showToast(msg, 'error'); setError(msg); } finally { setIsSaving(false); }
                  }} disabled={isSaving}>{isSaving ? 'Saving...' : 'Change role'}</button>
                </div>
              </div>
            </details>
          </article>

          {/* Effective Permissions */}
          <article className="card" style={{ padding: '1.25rem' }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Effective Permissions ({effectivePerms?.effectivePermissions.length ?? 0})</summary>
              {effectivePerms && (
                <div style={{ marginTop: '0.75rem' }}>
                  {isSuperAdmin && <div className="info-banner">Super admin has access to all permissions by role.</div>}
                  {!isSuperAdmin && effectivePerms.effectivePermissions.some(p => p.startsWith('role_') || p.startsWith('permission_') || p.startsWith('user_') || p.startsWith('settings_')) && <div className="info-banner">This user has critical permissions (role/permission/user/settings).</div>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    <div><h4>Role permissions ({effectivePerms.rolePermissions.length})</h4><ul style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '0.85rem' }}>{effectivePerms.rolePermissions.map(p => <li key={p}>{p}</li>)}</ul></div>
                    <div><h4>ALLOW overrides ({effectivePerms.userAllowedPermissions.length})</h4><ul style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '0.85rem' }}>{effectivePerms.userAllowedPermissions.map(p => <li key={p}>{p}</li>)}</ul></div>
                    <div><h4>DENY overrides ({effectivePerms.userDeniedPermissions.length})</h4><ul style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '0.85rem' }}>{effectivePerms.userDeniedPermissions.map(p => <li key={p}>{p} <span style={{ color: 'var(--color-danger)' }}>(blocked)</span></li>)}</ul></div>
                  </div>
                  <hr />
                  <h4>Final effective list ({effectivePerms.effectivePermissions.length})</h4>
                  <div style={{ maxHeight: '400px', overflowY: 'auto', fontSize: '0.85rem', columns: '3 200px' }}>{effectivePerms.effectivePermissions.map(p => <div key={p}>{p}</div>)}</div>
                </div>
              )}
            </details>
          </article>

          {/* Permission Overrides */}
          <article className="card" style={{ padding: '1.25rem' }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Permission Overrides ({overrides.length})</summary>
              <div style={{ marginTop: '0.75rem' }}>
                <FormSection title="Add Override" description="Grant or deny an individual permission.">
                  <div className="form-grid">
                    <label><span>Search permission</span><input value={permSearch} onChange={e => setPermSearch(e.target.value)} placeholder="Type to search..." /></label>
                    <label><span>Filter by module</span><select value={permModuleFilter} onChange={e => setPermModuleFilter(e.target.value)}><option value="">All modules</option>{modules.map(m => <option key={m} value={m}>{m}</option>)}</select></label>
                    <label><span>Permission key</span><select value={overridePermKey} onChange={e => setOverridePermKey(e.target.value)}><option value="">Select permission</option>{filteredPermissions.map(p => <option key={p.id} value={p.key}>{p.key} ({p.module})</option>)}</select></label>
                    <label><span>Effect</span><select value={overrideEffect} onChange={e => setOverrideEffect(e.target.value as 'ALLOW' | 'DENY')}><option value="ALLOW">ALLOW</option><option value="DENY">DENY</option></select></label>
                    <label><span>Reason</span><input value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Optional reason" /></label>
                    <label><span>Expires at</span><input type="datetime-local" value={overrideExpiresAt} onChange={e => setOverrideExpiresAt(e.target.value)} /></label>
                  </div>
                  <div className="button-row"><button type="button" className="primary-button" onClick={handleAddOverride} disabled={isSavingOverride || !overridePermKey}>{isSavingOverride ? 'Adding...' : 'Add override'}</button></div>
                </FormSection>
                <FormSection title="Current Overrides" description={`${overrides.length} override(s) configured`}>
                  {overrides.length === 0 ? <p>No permission overrides configured.</p> : (
                    <DataTable columns={[
                      { key: 'permission', header: 'Permission', render: (o: UserPermissionOverrideRecord) => <span><strong>{o.permission.key}</strong> <span className="table-secondary">({o.permission.module})</span></span> },
                      { key: 'effect', header: 'Effect', render: (o: UserPermissionOverrideRecord) => <StatusBadge status={o.effect === 'ALLOW' ? 'ACTIVE' : 'SUSPENDED'} /> },
                      { key: 'reason', header: 'Reason', render: (o: UserPermissionOverrideRecord) => o.reason || '-' },
                      { key: 'expiresAt', header: 'Expiry', render: (o: UserPermissionOverrideRecord) => isExpired(o.expiresAt) ? <span style={{ color: 'var(--color-danger)' }}>Expired {formatDate(o.expiresAt)}</span> : formatDate(o.expiresAt) },
                      { key: 'grantedBy', header: 'Granted by', render: (o: UserPermissionOverrideRecord) => o.grantedBy?.name || '-' },
                      { key: 'actions', header: '', render: (o: UserPermissionOverrideRecord) => <button type="button" className="danger-button" onClick={() => handleRemoveOverride(o.permissionId)}>Remove</button> },
                    ]} data={overrides} keyExtractor={(o: UserPermissionOverrideRecord) => o.id} />
                  )}
                </FormSection>
              </div>
            </details>
          </article>

          {/* Data Scopes */}
          <article className="card" style={{ padding: '1.25rem' }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Data Scopes ({dataScopes.length})</summary>
              <div style={{ marginTop: '0.75rem' }}>
                {!isSuperAdmin && <div className="info-banner">GLOBAL and MANAGE scopes are super_admin-only.</div>}
                <FormSection title="Grant Scope" description="Add a data scope to this user.">
                  <div className="form-grid">
                    <label><span>Scope type</span><select value={scopeType} onChange={e => { setScopeType(e.target.value); setScopeId(''); setVehicleSearch(''); }}>{SCOPE_TYPES.map(st => <option key={st} value={st}>{st}</option>)}</select></label>
                    {scopeType === 'VEHICLE' ? (
                      <div>
                        <label><span>Select vehicles</span></label>
                        <input value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)} placeholder="Search by number or type..." style={{ width: '100%', marginBottom: '0.5rem', padding: '0.4rem', fontSize: '0.85rem', border: '1px solid var(--color-border)', borderRadius: '4px' }} />
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                          {allVehicles
                            .filter(v => {
                              if (!vehicleSearch) return true;
                              const q = vehicleSearch.toLowerCase();
                              return v.vehicleNumber.toLowerCase().includes(q) || v.vehicleType.toLowerCase().includes(q);
                            })
                            .map(v => (
                              <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.5rem', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', fontSize: '0.85rem' }}>
                                <input type="checkbox" checked={selectedVehicleIds.includes(v.id)} onChange={() => setSelectedVehicleIds(prev => prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id])} />
                                {v.vehicleNumber} ({v.vehicleType}) - {v.status}
                              </label>
                            ))}
                        </div>
                        {selectedVehicleIds.length > 0 && <p style={{ fontSize: '0.75rem', color: 'var(--color-accent)', marginTop: '0.25rem' }}>{selectedVehicleIds.length} vehicle(s) selected</p>}
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>Select vehicles to grant access to. Leave all unchecked for all vehicles.</p>
                      </div>
                    ) : (
                      <label><span>Scope ID</span><input value={scopeId} onChange={e => setScopeId(e.target.value)} placeholder={scopeType === 'GLOBAL' || scopeType === 'OWN' ? 'Not needed' : 'e.g. driver-123'} disabled={scopeType === 'GLOBAL' || scopeType === 'OWN'} /></label>
                    )}
                    <label><span>Access level</span><select value={scopeAccessLevel} onChange={e => setScopeAccessLevel(e.target.value)}>{ACCESS_LEVELS.map(al => <option key={al} value={al}>{al}</option>)}</select></label>
                    <label><span>Reason</span><input value={scopeReason} onChange={e => setScopeReason(e.target.value)} placeholder="Optional reason" /></label>
                    <label><span>Expires at</span><input type="datetime-local" value={scopeExpiresAt} onChange={e => setScopeExpiresAt(e.target.value)} /></label>
                  </div>
                  <div className="button-row"><button type="button" className="primary-button" onClick={handleGrantScope} disabled={isSavingScope}>{isSavingScope ? 'Granting...' : 'Grant scope'}</button></div>
                </FormSection>
                <FormSection title="Current Scopes" description={`${dataScopes.length} scope(s) configured`}>
                  {dataScopes.length === 0 ? <p>No data scopes configured.</p> : (
                    <DataTable columns={[
                      { key: 'scopeType', header: 'Type', render: (s: UserDataScopeRecord) => <strong>{s.scopeType}</strong> },
                      { key: 'scopeId', header: 'Scope ID', render: (s: UserDataScopeRecord) => s.scopeId || <span className="table-secondary">All</span> },
                      { key: 'accessLevel', header: 'Level', render: (s: UserDataScopeRecord) => s.accessLevel },
                      { key: 'reason', header: 'Reason', render: (s: UserDataScopeRecord) => s.reason || '-' },
                      { key: 'expiresAt', header: 'Expiry', render: (s: UserDataScopeRecord) => isExpired(s.expiresAt) ? <span style={{ color: 'var(--color-danger)' }}>Expired</span> : formatDate(s.expiresAt) },
                      { key: 'grantedBy', header: 'Granted by', render: (s: UserDataScopeRecord) => s.grantedBy?.name || '-' },
                      { key: 'actions', header: '', render: (s: UserDataScopeRecord) => <button type="button" className="danger-button" onClick={() => handleRemoveScope(s.id)}>Remove</button> },
                    ]} data={dataScopes} keyExtractor={(s: UserDataScopeRecord) => s.id} />
                  )}
                </FormSection>
              </div>
            </details>
          </article>

          {/* Menu Preview */}
          <article className="card" style={{ padding: '1.25rem' }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Menu Preview</summary>
              <div style={{ marginTop: '0.75rem' }}>
                {isSuperAdmin && <div className="info-banner">As super_admin, all menus are visible. This shows what the target user sees.</div>}
                <h4>Visible Menus ({visibleMenus.visible.length})</h4>
                <ul>{visibleMenus.visible.map(item => <li key={item.path} style={{ padding: '0.25rem 0' }}><strong>{item.label}</strong> <span className="table-secondary">→ {item.path}</span></li>)}</ul>
                {visibleMenus.hidden.length > 0 && (
                  <><h4 style={{ marginTop: '1rem' }}>Hidden Menus ({visibleMenus.hidden.length})</h4>
                    <ul>{visibleMenus.hidden.map(item => <li key={item.path} style={{ padding: '0.25rem 0' }}><strong>{item.label}</strong> <span className="table-secondary">→ {item.path}</span><br /><span style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>Missing: {item.permissionKeys.filter(k => !effectivePerms?.effectivePermissions.includes(k)).join(', ')}</span></li>)}</ul>
                  </>
                )}
              </div>
            </details>
          </article>
        </div>
      )}

      {/* ─── Profile Links Tab ─── */}
      {activeTab === 'profile-links' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <article className="card" style={{ padding: '1.25rem' }}>
            {linkError ? <div className="error-banner">{linkError}</div> : null}
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Current Linked Profiles</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }}>
              User is the login account. Profiles represent operational roles (driver, mechanic, finance, etc.). Linking them lets the user access role-specific data.
            </p>
            {profileLinks.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>No profile linked.</p>
            ) : (
              profileLinks.map(pl => {
                const driver = allDrivers.find(d => d.driverId === pl.profileId);
                const linkedUser = availableUsers.find(u => u.userId === pl.profileId);
                const linkedVendor = availableVendors.find(v => v.vendorId === pl.profileId);
                const linkedCustomer = availableCustomers.find(c => c.customerId === pl.profileId);
                const displayName = driver?.name || linkedUser?.name || linkedVendor?.name || linkedCustomer?.name || pl.profileId;
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
                  <div>
                    {driverLoadError ? (
                      <div>
                        <p className="error-banner">{driverLoadError}</p>
                        <button type="button" className="secondary-button" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }} onClick={() => void refreshDrivers()}>Retry</button>
                      </div>
                    ) : (
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input type="checkbox" checked={showAllDrivers} onChange={e => { setShowAllDrivers(e.target.checked); void refreshDrivers(); }} />
                          <span style={{ fontSize: '0.85rem' }}>Show all drivers</span>
                        </label>
                        <input
                          type="text"
                          value={driverSearch}
                          onChange={e => setDriverSearch(e.target.value)}
                          placeholder="Search by name, mobile, or license number..."
                          style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', fontSize: '0.85rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
                        />
                        {allDrivers.length === 0 ? (
                          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>No drivers available.</p>
                        ) : (
                          <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                            {allDrivers
                              .filter(d => {
                                if (!showAllDrivers && d.status === 'INACTIVE') return false;
                                if (!driverSearch) return true;
                                const q = driverSearch.toLowerCase();
                                return d.name.toLowerCase().includes(q) || d.mobile.toLowerCase().includes(q) || d.licenseNumber.toLowerCase().includes(q);
                              })
                              .map(d => (
                                <div
                                  key={d.driverId}
                                  onClick={() => !d.isLinked && setLinkEntityId(d.driverId)}
                                  style={{
                                    padding: '0.5rem 0.75rem',
                                    cursor: d.isLinked ? 'default' : 'pointer',
                                    backgroundColor: linkEntityId === d.driverId ? 'var(--color-accent-light)' : d.isLinked ? 'var(--color-bg-muted)' : 'transparent',
                                    borderBottom: '1px solid var(--color-border)',
                                    opacity: d.isLinked ? 0.6 : 1,
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600 }}>{d.name}</span>
                                    {d.isLinked ? (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-muted)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>Linked</span>
                                    ) : (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{d.status}</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                                    {d.mobile} | {d.licenseNumber}
                                    {d.isLinked && d.linkedUsername ? ` | linked to @${d.linkedUsername}` : ''}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {(linkProfileType === 'MECHANIC' || linkProfileType === 'EMPLOYEE' || linkProfileType === 'FINANCE' || linkProfileType === 'COLLECTOR') && (
                  <label>
                    <span>Select {linkProfileType.toLowerCase()}</span>
                    <select value={linkEntityId} onChange={e => setLinkEntityId(e.target.value)}>
                      <option value="">Choose a {linkProfileType.toLowerCase()}...</option>
                      {availableUsers.filter(u => !u.isLinked).map(u => (
                        <option key={u.userId} value={u.userId}>{u.name} ({u.email}) — {u.roleKey}</option>
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
              </div>
              <div className="button-row" style={{ marginTop: '0.75rem' }}>
                <button type="button" className="primary-button" disabled={!linkEntityId || isLinking} onClick={handleLinkProfile}>
                  {isLinking ? 'Linking...' : `Link ${linkProfileType.toLowerCase().replace(/_/g, ' ')}`}
                </button>
              </div>
            </article>
          )}
        </div>
      )}

      {/* ─── Activity Tab ─── */}
      {activeTab === 'activity' && (
        <article className="card" style={{ padding: '1.25rem' }}>
          <h3>Activity Timeline</h3>
          <p className="table-toolbar-copy">Showing {activity.length} recent activities for this user.</p>
          {activity.length === 0 ? <p>No activity recorded.</p> : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {activity.map(a => {
                const meta = a.metadata as Record<string, unknown> | null;
                const actorUserId = meta?.actorUserId as string | undefined;
                const targetUserId = meta?.targetUserId as string | undefined;
                const permissionKey = meta?.permissionKey as string | undefined;
                const effect = meta?.effect as string | undefined;
                const scopeTypeMeta = meta?.scopeType as string | undefined;
                return (
                  <div key={a.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{a.action}</strong><span className="table-secondary">{formatDate(a.createdAt)}</span></div>
                    <div className="table-secondary">entityType: {a.entityType} | entityId: {a.entityId || '-'}</div>
                    {actorUserId && <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>actor: {actorUserId}{targetUserId && targetUserId !== actorUserId ? ` → target: ${targetUserId}` : ''}{permissionKey ? ` | ${permissionKey}` : ''}{effect ? ` (${effect})` : ''}{scopeTypeMeta ? ` | scope: ${scopeTypeMeta}` : ''}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </article>
      )}

      <ConfirmDialog isOpen={!!statusTarget} title="Confirm status change"
        description={`Set ${user.name} to ${statusTarget?.toLowerCase()}?`}
        confirmLabel="Update status" tone={statusTarget === 'SUSPENDED' ? 'danger' : 'default'}
        isConfirming={isSaving} onCancel={() => setStatusTarget(null)} onConfirm={handleStatusUpdate} />

      <ConfirmDialog isOpen={!!revokeTarget} title="Revoke profile link"
        description="Remove this profile link from the user? Role-specific access will be removed."
        confirmLabel="Revoke" tone="danger" isConfirming={isRevoking}
        onCancel={() => setRevokeTarget(null)} onConfirm={() => revokeTarget ? handleRevokeLink(revokeTarget) : Promise.resolve()} />
    </section>
  );
}
