import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
} from '../services/api';
import type {
  UserRecord,
  RoleRecord,
  PermissionRecord,
  EffectivePermissionsResponse,
  UserPermissionOverrideRecord,
  UserDataScopeRecord,
  UserActivityRecord,
} from '../types/auth';

type TabId = 'profile' | 'account' | 'role' | 'permissions' | 'overrides' | 'scopes' | 'activity' | 'menu-preview';

const tabs: { id: TabId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'account', label: 'Account' },
  { id: 'role', label: 'Role' },
  { id: 'permissions', label: 'Effective Permissions' },
  { id: 'overrides', label: 'Permission Overrides' },
  { id: 'scopes', label: 'Data Scopes' },
  { id: 'activity', label: 'Activity' },
  { id: 'menu-preview', label: 'Menu Preview' },
];

const SCOPE_TYPES = ['OWN', 'USER', 'DRIVER', 'VEHICLE', 'TRIP', 'ASSET', 'CUSTOMER', 'VENDOR', 'BRANCH', 'DEPARTMENT', 'FINANCE', 'GLOBAL'];
const ACCESS_LEVELS = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'MANAGE'];

function formatDate(d: string | null | undefined) {
  if (!d) return 'Never';
  return new Date(d).toLocaleString();
}

function isExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function UserDetailPage() {
  const { id } = useParams();
  const auth = useAuth();
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
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [statusTarget, setStatusTarget] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [overridePermKey, setOverridePermKey] = useState('');
  const [overrideEffect, setOverrideEffect] = useState<'ALLOW' | 'DENY'>('ALLOW');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideExpiresAt, setOverrideExpiresAt] = useState('');
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const [scopeType, setScopeType] = useState('VEHICLE');
  const [scopeId, setScopeId] = useState('');
  const [scopeAccessLevel, setScopeAccessLevel] = useState('VIEW');
  const [scopeReason, setScopeReason] = useState('');
  const [scopeExpiresAt, setScopeExpiresAt] = useState('');
  const [isSavingScope, setIsSavingScope] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

  const [permSearch, setPermSearch] = useState('');
  const [permModuleFilter, setPermModuleFilter] = useState('');

  const isSuperAdmin = auth.user?.role.key === 'super_admin';

  const loadAll = async () => {
    if (!auth.accessToken || !id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [userRes, rolesRes, permsRes, effRes, ovrRes, scopesRes, actRes] = await Promise.all([
        getUser(auth.accessToken, id),
        getRoles(auth.accessToken),
        getPermissions(auth.accessToken),
        getUserEffectivePermissions(auth.accessToken, id),
        getUserPermissionOverrides(auth.accessToken, id),
        getUserDataScopes(auth.accessToken, id),
        getUserActivity(auth.accessToken, id),
      ]);
      setUser(userRes.data);
      setRoles(rolesRes.data);
      setAllPermissions(permsRes.data);
      setEffectivePerms(effRes.data);
      setOverrides(ovrRes.data);
      setDataScopes(scopesRes.data);
      setActivity(actRes.data);
      setEditName(userRes.data.name);
      setEditUsername(userRes.data.username ?? '');
      setEditMobile(userRes.data.mobile ?? '');
      setEditRoleId(userRes.data.role.id);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to load user details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadAll(); }, [id, auth.accessToken]);

  const filteredPermissions = useMemo(() => {
    let perms = allPermissions;
    if (permSearch) perms = perms.filter(p => p.key.toLowerCase().includes(permSearch.toLowerCase()) || p.module.toLowerCase().includes(permSearch.toLowerCase()));
    if (permModuleFilter) perms = perms.filter(p => p.module === permModuleFilter);
    return perms;
  }, [allPermissions, permSearch, permModuleFilter]);

  const modules = useMemo(() => {
    const mods = new Set(allPermissions.map(p => p.module));
    return Array.from(mods).sort();
  }, [allPermissions]);

  async function handleUpdateProfile() {
    if (!auth.accessToken || !id) return;
    setIsSaving(true); setMessage(null); setError(null);
    try {
      const res = await updateUser(auth.accessToken, id, { name: editName, username: editUsername, mobile: editMobile });
      setUser(res.data);
      setMessage('Profile updated.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to update.');
    } finally { setIsSaving(false); }
  }

  async function handleStatusUpdate() {
    if (!auth.accessToken || !id || !statusTarget) return;
    setIsSaving(true);
    try {
      const res = await updateUserStatus(auth.accessToken, id, statusTarget);
      setUser(res.data);
      setMessage(`Status changed to ${statusTarget.toLowerCase()}.`);
      setStatusTarget(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to update status.');
    } finally { setIsSaving(false); }
  }

  async function refreshActivity() {
    if (!auth.accessToken || !id) return;
    try {
      const actRes = await getUserActivity(auth.accessToken, id);
      setActivity(actRes.data);
    } catch {
      // non-critical
    }
  }

  async function handleAddOverride() {
    if (!auth.accessToken || !id || !overridePermKey) return;
    setIsSavingOverride(true); setOverrideError(null);
    try {
      const res = await setUserPermissionOverride(auth.accessToken, id, {
        permissionKey: overridePermKey,
        effect: overrideEffect,
        reason: overrideReason || undefined,
        expiresAt: overrideExpiresAt || undefined,
      });
      setOverrides(prev => {
        const idx = prev.findIndex(o => o.permission.key === overridePermKey);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...res.data, permission: { ...next[idx].permission, ...res.data.permission } };
          return next;
        }
        return [...prev, res.data];
      });
      setOverridePermKey(''); setOverrideReason(''); setOverrideExpiresAt('');
      const effRes = await getUserEffectivePermissions(auth.accessToken, id);
      setEffectivePerms(effRes.data);
      await refreshActivity();
    } catch (e) {
      setOverrideError(e instanceof ApiError ? e.message : 'Failed to set override.');
    } finally { setIsSavingOverride(false); }
  }

  async function handleRemoveOverride(permissionId: string) {
    if (!auth.accessToken || !id) return;
    try {
      await removeUserPermissionOverride(auth.accessToken, id, permissionId);
      setOverrides(prev => prev.filter(o => o.permissionId !== permissionId));
      const effRes = await getUserEffectivePermissions(auth.accessToken, id);
      setEffectivePerms(effRes.data);
      await refreshActivity();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to remove override.');
    }
  }

  async function handleGrantScope() {
    if (!auth.accessToken || !id) return;
    setIsSavingScope(true); setScopeError(null);
    try {
      const res = await grantUserDataScope(auth.accessToken, id, {
        scopeType,
        scopeId: scopeType !== 'GLOBAL' && scopeType !== 'OWN' ? scopeId : undefined,
        accessLevel: scopeAccessLevel,
        reason: scopeReason || undefined,
        expiresAt: scopeExpiresAt || undefined,
      });
      setDataScopes(prev => [...prev, res.data]);
      setScopeId(''); setScopeReason(''); setScopeExpiresAt('');
      await refreshActivity();
    } catch (e) {
      setScopeError(e instanceof ApiError ? e.message : 'Failed to grant scope.');
    } finally { setIsSavingScope(false); }
  }

  async function handleRemoveScope(scopeRecordId: string) {
    if (!auth.accessToken || !id) return;
    try {
      await removeUserDataScope(auth.accessToken, id, scopeRecordId);
      setDataScopes(prev => prev.filter(s => s.id !== scopeRecordId));
      await refreshActivity();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to remove scope.');
    }
  }

  const visibleMenus = useMemo(() => {
    if (!effectivePerms) return { visible: [], hidden: [] as typeof navigationItems };
    const visible: typeof navigationItems = [];
    const hidden: typeof navigationItems = [];
    for (const item of navigationItems) {
      if (item.permissionKeys.length === 0 || item.permissionKeys.some(k => effectivePerms.effectivePermissions.includes(k))) {
        visible.push(item);
      } else {
        hidden.push(item);
      }
    }
    return { visible, hidden };
  }, [effectivePerms]);

  if (isLoading) return <LoadingState message="Loading user..." />;
  if (error && !user) return <ErrorState message={error} onRetry={loadAll} />;
  if (!user) return <ErrorState message="User not found." />;

  return (
    <section className="page-content">
      <PageHeader
        eyebrow={`User / ${user.role.name}`}
        title={user.name}
        description={`${user.email} — ${user.status.toLowerCase()}`}
      />
      <button type="button" className="ghost-button" onClick={() => navigate('/users')} style={{ marginBottom: '1rem' }}>
        &larr; Back to users
      </button>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="section-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            className={`tab-button ${activeTab === t.id ? 'active-tab' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Profile Tab ─── */}
      {activeTab === 'profile' && (
        <article className="card">
          <div className="detail-grid">
            <div>
              <p className="detail-label">Name</p>
              <p className="detail-value">{user.name}</p>
            </div>
            <div>
              <p className="detail-label">Email</p>
              <p className="detail-value">{user.email}</p>
            </div>
            <div>
              <p className="detail-label">Username</p>
              <p className="detail-value">@{user.username ?? 'unset'}</p>
            </div>
            <div>
              <p className="detail-label">Mobile</p>
              <p className="detail-value">{user.mobile || 'Not set'}</p>
            </div>
            <div>
              <p className="detail-label">Role</p>
              <p className="detail-value">{user.role.name} ({user.role.key})</p>
            </div>
            <div>
              <p className="detail-label">Status</p>
              <StatusBadge status={user.status} />
            </div>
            <div>
              <p className="detail-label">Last login</p>
              <p className="detail-value">{formatDate(user.lastLoginAt)}</p>
            </div>
            <div>
              <p className="detail-label">Created</p>
              <p className="detail-value">{formatDate(user.createdAt)}</p>
            </div>
          </div>
        </article>
      )}

      {/* ─── Account Tab ─── */}
      {activeTab === 'account' && (
        <article className="card">
          <FormSection title="Edit Account" description="Update name, username, or mobile.">
            <div className="form-grid">
              <label><span>Name</span><input value={editName} onChange={e => setEditName(e.target.value)} /></label>
              <label><span>Username</span><input value={editUsername} onChange={e => setEditUsername(e.target.value)} /></label>
              <label><span>Mobile</span><input value={editMobile} onChange={e => setEditMobile(e.target.value)} /></label>
            </div>
            <div className="button-row">
              <button type="button" className="primary-button" onClick={handleUpdateProfile} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Update profile'}
              </button>
            </div>
          </FormSection>

          <FormSection title="Account Status" description="Change user status or disable account.">
            <div className="button-row wrap-row">
              <button type="button" className="secondary-button" onClick={() => setStatusTarget('ACTIVE')}>Mark active</button>
              <button type="button" className="secondary-button" onClick={() => setStatusTarget('INACTIVE')}>Deactivate</button>
              <button type="button" className="danger-button" onClick={() => setStatusTarget('SUSPENDED')}>Suspend</button>
            </div>
          </FormSection>
        </article>
      )}

      {/* ─── Role Tab ─── */}
      {activeTab === 'role' && (
        <article className="card">
          <FormSection title="Change Role" description="Assign a different role to this user.">
            <div className="form-grid">
              <label>
                <span>Current role</span>
                <p className="detail-value">{user.role.name} ({user.role.key})</p>
              </label>
              <label>
                <span>New role</span>
                <select value={editRoleId} onChange={e => setEditRoleId(e.target.value)}>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
            </div>
            <div className="button-row">
              <button type="button" className="primary-button" onClick={async () => {
                if (!auth.accessToken || !id) return;
                setIsSaving(true); setError(null); setMessage(null);
                try {
                  const res = await updateUser(auth.accessToken, id, { roleId: editRoleId });
                  setUser(res.data);
                  setMessage('Role updated.');
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'Failed to update role.');
                } finally { setIsSaving(false); }
              }} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Change role'}
              </button>
            </div>
          </FormSection>
        </article>
      )}

      {/* ─── Effective Permissions Tab ─── */}
      {activeTab === 'permissions' && effectivePerms && (
        <article className="card">
          <FormSection title="Effective Permissions" description={`${effectivePerms.effectivePermissions.length} permissions effective`}>
            {auth.user?.role.key === 'super_admin' && (
              <div className="info-banner">Super admin has access to all permissions by role.</div>
            )}
            {!isSuperAdmin && effectivePerms.effectivePermissions.some(p => p.startsWith('role_') || p.startsWith('permission_') || p.startsWith('user_') || p.startsWith('settings_')) && (
              <div className="info-banner">This user has critical permissions (role/permission/user/settings).</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <h4>Role permissions ({effectivePerms.rolePermissions.length})</h4>
                <ul style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '0.85rem' }}>
                  {effectivePerms.rolePermissions.map(p => <li key={p}>{p}</li>)}
                </ul>
              </div>
              <div>
                <h4>ALLOW overrides ({effectivePerms.userAllowedPermissions.length})</h4>
                <ul style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '0.85rem' }}>
                  {effectivePerms.userAllowedPermissions.map(p => <li key={p}>{p}</li>)}
                </ul>
              </div>
              <div>
                <h4>DENY overrides ({effectivePerms.userDeniedPermissions.length})</h4>
                <ul style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '0.85rem' }}>
                  {effectivePerms.userDeniedPermissions.map(p => <li key={p}>{p} <span style={{ color: 'var(--color-danger)' }}>(blocked)</span></li>)}
                </ul>
              </div>
            </div>
            <hr />
            <h4>Final effective list ({effectivePerms.effectivePermissions.length})</h4>
            <div style={{ maxHeight: '400px', overflowY: 'auto', fontSize: '0.85rem', columns: '3 200px' }}>
              {effectivePerms.effectivePermissions.map(p => <div key={p}>{p}</div>)}
            </div>
          </FormSection>
        </article>
      )}

      {/* ─── Permission Overrides Tab ─── */}
      {activeTab === 'overrides' && (
        <article className="card">
          {overrideError ? <div className="error-banner">{overrideError}</div> : null}

          <FormSection title="Add Override" description="Grant or deny an individual permission.">
            <div className="form-grid">
              <label>
                <span>Search permission</span>
                <input value={permSearch} onChange={e => setPermSearch(e.target.value)} placeholder="Type to search..." />
              </label>
              <label>
                <span>Filter by module</span>
                <select value={permModuleFilter} onChange={e => setPermModuleFilter(e.target.value)}>
                  <option value="">All modules</option>
                  {modules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <label>
                <span>Permission key</span>
                <select value={overridePermKey} onChange={e => setOverridePermKey(e.target.value)}>
                  <option value="">Select permission</option>
                  {filteredPermissions.map(p => (
                    <option key={p.id} value={p.key}>{p.key} ({p.module})</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Effect</span>
                <select value={overrideEffect} onChange={e => setOverrideEffect(e.target.value as 'ALLOW' | 'DENY')}>
                  <option value="ALLOW">ALLOW</option>
                  <option value="DENY">DENY</option>
                </select>
              </label>
              <label>
                <span>Reason</span>
                <input value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Optional reason" />
              </label>
              <label>
                <span>Expires at</span>
                <input type="datetime-local" value={overrideExpiresAt} onChange={e => setOverrideExpiresAt(e.target.value)} />
              </label>
            </div>
            <div className="button-row">
              <button type="button" className="primary-button" onClick={handleAddOverride} disabled={isSavingOverride || !overridePermKey}>
                {isSavingOverride ? 'Adding...' : 'Add override'}
              </button>
            </div>
          </FormSection>

          <FormSection title="Current Overrides" description={`${overrides.length} override(s) configured`}>
            {overrides.length === 0 ? (
              <p>No permission overrides configured.</p>
            ) : (
              <DataTable
                columns={[
                  { key: 'permission', header: 'Permission', render: (o: UserPermissionOverrideRecord) => <span><strong>{o.permission.key}</strong> <span className="table-secondary">({o.permission.module})</span></span> },
                  { key: 'effect', header: 'Effect', render: (o: UserPermissionOverrideRecord) => <StatusBadge status={o.effect === 'ALLOW' ? 'ACTIVE' : 'SUSPENDED'} /> },
                  { key: 'reason', header: 'Reason', render: (o: UserPermissionOverrideRecord) => o.reason || '-' },
                  { key: 'expiresAt', header: 'Expiry', render: (o: UserPermissionOverrideRecord) => isExpired(o.expiresAt) ? <span style={{ color: 'var(--color-danger)' }}>Expired {formatDate(o.expiresAt)}</span> : formatDate(o.expiresAt) },
                  { key: 'grantedBy', header: 'Granted by', render: (o: UserPermissionOverrideRecord) => o.grantedBy?.name || '-' },
                  { key: 'actions', header: '', render: (o: UserPermissionOverrideRecord) => (
                    <button type="button" className="danger-button" onClick={() => handleRemoveOverride(o.permissionId)}>Remove</button>
                  )},
                ]}
                data={overrides}
                keyExtractor={(o: UserPermissionOverrideRecord) => o.id}
              />
            )}
          </FormSection>
        </article>
      )}

      {/* ─── Data Scopes Tab ─── */}
      {activeTab === 'scopes' && (
        <article className="card">
          {scopeError ? <div className="error-banner">{scopeError}</div> : null}
          {!isSuperAdmin && (
            <div className="info-banner">GLOBAL and MANAGE scopes are super_admin-only.</div>
          )}

          <FormSection title="Grant Scope" description="Add a data scope to this user.">
            <div className="form-grid">
              <label>
                <span>Scope type</span>
                <select value={scopeType} onChange={e => setScopeType(e.target.value)}>
                  {SCOPE_TYPES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </label>
              <label>
                <span>Scope ID</span>
                <input
                  value={scopeId}
                  onChange={e => setScopeId(e.target.value)}
                  placeholder={scopeType === 'GLOBAL' || scopeType === 'OWN' ? 'Not needed' : 'e.g. vehicle-123'}
                  disabled={scopeType === 'GLOBAL' || scopeType === 'OWN'}
                />
              </label>
              <label>
                <span>Access level</span>
                <select value={scopeAccessLevel} onChange={e => setScopeAccessLevel(e.target.value)}>
                  {ACCESS_LEVELS.map(al => <option key={al} value={al}>{al}</option>)}
                </select>
              </label>
              <label>
                <span>Reason</span>
                <input value={scopeReason} onChange={e => setScopeReason(e.target.value)} placeholder="Optional reason" />
              </label>
              <label>
                <span>Expires at</span>
                <input type="datetime-local" value={scopeExpiresAt} onChange={e => setScopeExpiresAt(e.target.value)} />
              </label>
            </div>
            <div className="button-row">
              <button type="button" className="primary-button" onClick={handleGrantScope} disabled={isSavingScope}>
                {isSavingScope ? 'Granting...' : 'Grant scope'}
              </button>
            </div>
          </FormSection>

          <FormSection title="Current Scopes" description={`${dataScopes.length} scope(s) configured`}>
            {dataScopes.length === 0 ? (
              <p>No data scopes configured.</p>
            ) : (
              <DataTable
                columns={[
                  { key: 'scopeType', header: 'Type', render: (s: UserDataScopeRecord) => <strong>{s.scopeType}</strong> },
                  { key: 'scopeId', header: 'Scope ID', render: (s: UserDataScopeRecord) => s.scopeId || <span className="table-secondary">All</span> },
                  { key: 'accessLevel', header: 'Level', render: (s: UserDataScopeRecord) => s.accessLevel },
                  { key: 'reason', header: 'Reason', render: (s: UserDataScopeRecord) => s.reason || '-' },
                  { key: 'expiresAt', header: 'Expiry', render: (s: UserDataScopeRecord) => isExpired(s.expiresAt) ? <span style={{ color: 'var(--color-danger)' }}>Expired</span> : formatDate(s.expiresAt) },
                  { key: 'grantedBy', header: 'Granted by', render: (s: UserDataScopeRecord) => s.grantedBy?.name || '-' },
                  { key: 'actions', header: '', render: (s: UserDataScopeRecord) => (
                    <button type="button" className="danger-button" onClick={() => handleRemoveScope(s.id)}>Remove</button>
                  )},
                ]}
                data={dataScopes}
                keyExtractor={(s: UserDataScopeRecord) => s.id}
              />
            )}
          </FormSection>
        </article>
      )}

      {/* ─── Activity Tab ─── */}
      {activeTab === 'activity' && (
        <article className="card">
          <h3>Activity Timeline</h3>
          <p className="table-toolbar-copy">Showing {activity.length} recent activities for this user.</p>
          {activity.length === 0 ? (
            <p>No activity recorded.</p>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {activity.map(a => {
                const meta = a.metadata as Record<string, unknown> | null;
                const actorUserId = meta?.actorUserId as string | undefined;
                const targetUserId = meta?.targetUserId as string | undefined;
                const permissionKey = meta?.permissionKey as string | undefined;
                const effect = meta?.effect as string | undefined;
                const scopeType = meta?.scopeType as string | undefined;
                return (
                  <div key={a.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{a.action}</strong>
                      <span className="table-secondary">{formatDate(a.createdAt)}</span>
                    </div>
                    <div className="table-secondary">
                      entityType: {a.entityType} | entityId: {a.entityId || '-'}
                    </div>
                    {actorUserId && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                        actor: {actorUserId}{targetUserId && targetUserId !== actorUserId ? ` → target: ${targetUserId}` : ''}
                        {permissionKey ? ` | ${permissionKey}` : ''}{effect ? ` (${effect})` : ''}
                        {scopeType ? ` | scope: ${scopeType}` : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </article>
      )}

      {/* ─── Menu Preview Tab ─── */}
      {activeTab === 'menu-preview' && (
        <article className="card">
          <FormSection title="Menu Preview" description="Which menus are visible to this user based on effective permissions.">
            {auth.user?.role.key === 'super_admin' && (
              <div className="info-banner">As super_admin, all menus are visible to you. This shows what the target user sees.</div>
            )}
            <h4>Visible Menus ({visibleMenus.visible.length})</h4>
            <ul>
              {visibleMenus.visible.map(item => (
                <li key={item.path} style={{ padding: '0.25rem 0' }}>
                  <strong>{item.label}</strong> <span className="table-secondary">→ {item.path}</span>
                </li>
              ))}
            </ul>
            {visibleMenus.hidden.length > 0 && (
              <>
                <h4 style={{ marginTop: '1rem' }}>Hidden Menus ({visibleMenus.hidden.length})</h4>
                <ul>
                  {visibleMenus.hidden.map(item => (
                    <li key={item.path} style={{ padding: '0.25rem 0' }}>
                      <strong>{item.label}</strong> <span className="table-secondary">→ {item.path}</span>
                      <br />
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>
                        Missing: {item.permissionKeys.filter(k => !effectivePerms?.effectivePermissions.includes(k)).join(', ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </FormSection>
        </article>
      )}

      <ConfirmDialog
        isOpen={!!statusTarget}
        title="Confirm status change"
        description={`Set ${user.name} to ${statusTarget?.toLowerCase()}?`}
        confirmLabel="Update status"
        tone={statusTarget === 'SUSPENDED' ? 'danger' : 'default'}
        isConfirming={isSaving}
        onCancel={() => setStatusTarget(null)}
        onConfirm={handleStatusUpdate}
      />
    </section>
  );
}
