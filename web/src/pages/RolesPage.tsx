import { FormEvent, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { FormSection } from '../components/FormSection';
import { LoadingState } from '../components/LoadingState';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createRole as createRoleRequest, getPermissions, getRoles, updateRole as updateRoleRequest, updateRolePermissions as updateRolePermissionsRequest } from '../services/api';
import type { PermissionRecord, RoleRecord } from '../types/auth';
import { ApiError } from '../types/api';

type RoleFormState = { name: string; key: string; description: string; status: 'ACTIVE' | 'INACTIVE' };
const initialRoleFormState: RoleFormState = { name: '', key: '', description: '', status: 'ACTIVE' };

function getRoleEditForm(role: RoleRecord): RoleFormState {
  return { name: role.name, key: role.key, description: role.description ?? '', status: role.status as RoleFormState['status'] };
}

function getKeys(role: RoleRecord | null) {
  return (role?.rolePermissions ?? []).map((entry) => entry.permission.key);
}

export function RolesPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);
  const [roleForm, setRoleForm] = useState<RoleFormState>(initialRoleFormState);
  const [createRoleForm, setCreateRoleForm] = useState<RoleFormState>(initialRoleFormState);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const selectedRole = useMemo(() => roles.find((role) => role.id === selectedRoleId) ?? null, [roles, selectedRoleId]);
  const modules = useMemo(() => Array.from(new Set(permissions.map((p) => p.module || 'general'))).sort(), [permissions]);
  const groupedPermissions = useMemo(() => {
    const search = permissionSearch.trim().toLowerCase();
    return permissions
      .filter((permission) => {
        const moduleName = permission.module || 'general';
        const matchesModule = moduleFilter === 'all' || moduleName === moduleFilter;
        const matchesSearch = !search || [permission.key, permission.module, permission.action, permission.description ?? ''].join(' ').toLowerCase().includes(search);
        return matchesModule && matchesSearch;
      })
      .reduce<Record<string, PermissionRecord[]>>((groups, permission) => {
        const moduleName = permission.module || 'general';
        groups[moduleName] = groups[moduleName] ?? [];
        groups[moduleName].push(permission);
        return groups;
      }, {});
  }, [moduleFilter, permissionSearch, permissions]);

  const visibleKeys = useMemo(() => Object.values(groupedPermissions).flat().map((permission) => permission.key), [groupedPermissions]);
  const selectedCount = selectedPermissionKeys.length;
  const activeRoles = roles.filter((role) => role.status === 'ACTIVE').length;
  const systemRoles = roles.filter((role) => role.isSystem).length;

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setPageError(null);
      try {
        const [rolesResponse, permissionsResponse] = await Promise.all([getRoles(auth.accessToken), getPermissions(auth.accessToken)]);
        setRoles(rolesResponse.data);
        setPermissions(permissionsResponse.data);
        const firstRole = rolesResponse.data[0];
        if (firstRole) {
          setSelectedRoleId(firstRole.id);
          setSelectedPermissionKeys(getKeys(firstRole));
          setRoleForm(getRoleEditForm(firstRole));
        }
      } catch (error) {
        setPageError(error instanceof ApiError ? error.message : 'Failed to load roles and permissions.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken]);

  useEffect(() => {
    if (!selectedRole) return;
    setSelectedPermissionKeys(getKeys(selectedRole));
    setRoleForm(getRoleEditForm(selectedRole));
    setRoleError(null);
    setPermissionError(null);
  }, [selectedRole]);

  async function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;
    setIsSavingRole(true);
    setRoleError(null);
    try {
      const response = await createRoleRequest(auth.accessToken, createRoleForm);
      setRoles((current) => [...current, response.data]);
      setSelectedRoleId(response.data.id);
      setCreateRoleForm(initialRoleFormState);
      setIsCreateOpen(false);
      showToast('Role created successfully.', 'success');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to create role.';
      setRoleError(message);
      showToast(message, 'error');
    } finally {
      setIsSavingRole(false);
    }
  }

  async function handleUpdateRole() {
    if (!auth.accessToken || !selectedRoleId) return;
    setIsSavingRole(true);
    setRoleError(null);
    try {
      const response = await updateRoleRequest(auth.accessToken, selectedRoleId, roleForm);
      setRoles((current) => current.map((role) => (role.id === selectedRoleId ? { ...role, ...response.data } : role)));
      showToast('Role updated successfully.', 'success');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to update role.';
      setRoleError(message);
      showToast(message, 'error');
    } finally {
      setIsSavingRole(false);
    }
  }

  async function handleSavePermissions() {
    if (!auth.accessToken || !selectedRoleId) return;
    setIsSavingPermissions(true);
    setPermissionError(null);
    try {
      const response = await updateRolePermissionsRequest(auth.accessToken, selectedRoleId, selectedPermissionKeys);
      setRoles((current) => current.map((role) => (role.id === selectedRoleId ? response.data : role)));
      showToast('Permissions updated successfully.', 'success');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to update permissions.';
      setPermissionError(message);
      showToast(message, 'error');
    } finally {
      setIsSavingPermissions(false);
    }
  }

  function selectVisible() {
    setSelectedPermissionKeys((current) => Array.from(new Set([...current, ...visibleKeys])));
  }

  function clearVisible() {
    const visible = new Set(visibleKeys);
    setSelectedPermissionKeys((current) => current.filter((key) => !visible.has(key)));
  }

  if (isLoading) return <LoadingState message="Loading roles and permission coverage..." />;
  if (pageError) return <ErrorState message={pageError} onRetry={() => window.location.reload()} />;
  if (roles.length === 0) return <EmptyState title="No roles available" message="Create the first custom role to start assigning permission sets." action={auth.hasPermission('role_create') ? <button type="button" className="primary-button" onClick={() => setIsCreateOpen(true)}>Create role</button> : null} />;

  return (
    <section className="page-content">
      <div className="section-header">
        <PageHeader eyebrow="Admin" title="Roles and Permissions" description="Manage role details and permission coverage from one professional console." />
        <div className="action-panel">{auth.hasPermission('role_create') ? <button type="button" className="primary-button" onClick={() => setIsCreateOpen(true)}>Create Role</button> : null}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: '1rem' }}><p className="helper-text">Total Roles</p><h2 style={{ margin: 0 }}>{roles.length}</h2></div>
        <div className="card" style={{ padding: '1rem' }}><p className="helper-text">Active Roles</p><h2 style={{ margin: 0 }}>{activeRoles}</h2></div>
        <div className="card" style={{ padding: '1rem' }}><p className="helper-text">System Roles</p><h2 style={{ margin: 0 }}>{systemRoles}</h2></div>
        <div className="card" style={{ padding: '1rem' }}><p className="helper-text">Selected Access</p><h2 style={{ margin: 0 }}>{selectedCount}/{permissions.length}</h2></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: '1rem', alignItems: 'start' }}>
        <aside className="card" style={{ padding: '1rem', position: 'sticky', top: 88 }}>
          <h3 style={{ marginTop: 0 }}>Roles</h3>
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {roles.map((role) => <button key={role.id} type="button" onClick={() => setSelectedRoleId(role.id)} className={role.id === selectedRoleId ? 'primary-button' : 'secondary-button'} style={{ justifyContent: 'space-between', textAlign: 'left' }}><span>{role.name}</span>{role.isSystem ? <span>System</span> : null}</button>)}
          </div>
        </aside>

        <main style={{ display: 'grid', gap: '1rem' }}>
          {selectedRole ? (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="section-header wrap-row"><div><h3 style={{ margin: 0 }}>{selectedRole.name}</h3><p className="helper-text" style={{ marginBottom: 0 }}>{selectedRole.description || 'No description'}</p></div><div className="action-panel">{selectedRole.isSystem ? <span className="system-badge">System</span> : <span className="permission-badge">Custom</span>}<StatusBadge status={selectedRole.status} /></div></div>
              {auth.hasPermission('role_update') ? <div style={{ marginTop: '1rem' }}><div className="form-two-column"><label className="form-group"><span>Name</span><input value={roleForm.name} onChange={(e) => setRoleForm((c) => ({ ...c, name: e.target.value }))} /></label><label className="form-group"><span>Key</span><input value={roleForm.key} onChange={(e) => setRoleForm((c) => ({ ...c, key: e.target.value }))} disabled={selectedRole.isSystem} /></label></div><label className="form-group"><span>Description</span><textarea value={roleForm.description} onChange={(e) => setRoleForm((c) => ({ ...c, description: e.target.value }))} rows={3} /></label><label className="form-group" style={{ maxWidth: 260 }}><span>Status</span><select value={roleForm.status} onChange={(e) => setRoleForm((c) => ({ ...c, status: e.target.value as RoleFormState['status'] }))}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>{roleError ? <div className="error-banner">{roleError}</div> : null}<button type="button" className="primary-button" onClick={() => void handleUpdateRole()} disabled={isSavingRole}>{isSavingRole ? 'Saving...' : 'Update Role'}</button></div> : null}
            </div>
          ) : null}

          <div className="card" style={{ padding: '1.25rem' }}>
            <div className="section-header wrap-row"><div><h3 style={{ margin: 0 }}>Permission Matrix</h3><p className="helper-text" style={{ marginBottom: 0 }}>{selectedRole ? `Editing ${selectedRole.name}` : 'Select a role to edit.'}</p></div><div className="action-panel"><button type="button" className="secondary-button" onClick={selectVisible} disabled={!auth.hasPermission('permission_assign')}>Select Visible</button><button type="button" className="secondary-button" onClick={clearVisible} disabled={!auth.hasPermission('permission_assign')}>Clear Visible</button>{auth.hasPermission('permission_assign') ? <button type="button" className="primary-button" onClick={() => void handleSavePermissions()} disabled={isSavingPermissions}>{isSavingPermissions ? 'Saving...' : 'Save Permissions'}</button> : <span className="table-secondary">View only</span>}</div></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: '0.75rem', margin: '1rem 0' }}><input value={permissionSearch} onChange={(e) => setPermissionSearch(e.target.value)} placeholder="Search permissions" /><select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}><option value="all">All modules</option>{modules.map((module) => <option key={module} value={module}>{module}</option>)}</select></div>
            {permissionError ? <div className="error-banner">{permissionError}</div> : null}
            <div style={{ display: 'grid', gap: '1rem' }}>{Object.entries(groupedPermissions).map(([module, items]) => <section key={module} className="card" style={{ padding: '1rem', background: 'var(--color-bg-surface-subtle)' }}><div className="section-header wrap-row"><div><h4 style={{ margin: 0 }}>{module}</h4><p className="helper-text" style={{ marginBottom: 0 }}>{items.length} permissions</p></div></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>{items.map((permission) => { const checked = selectedPermissionKeys.includes(permission.key); return <label key={permission.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.85rem', border: '1px solid var(--color-border-subtle)', borderRadius: 12, background: checked ? 'var(--color-bg-surface)' : 'transparent' }}><input type="checkbox" checked={checked} disabled={!auth.hasPermission('permission_assign')} onChange={() => setSelectedPermissionKeys((current) => checked ? current.filter((key) => key !== permission.key) : [...current, permission.key])} /><span><code className="permission-code">{permission.key}</code><span className="helper-text" style={{ display: 'block', marginTop: 4 }}>{permission.description || `${permission.module} ${permission.action}`}</span></span></label>; })}</div></section>)}</div>
          </div>
        </main>
      </div>

      <Modal isOpen={isCreateOpen} title="Create role" description="Add a custom role, then assign permissions from the matrix." onClose={() => { setIsCreateOpen(false); setCreateRoleForm(initialRoleFormState); setRoleError(null); }} footer={<div className="button-row"><button type="button" className="ghost-button" onClick={() => setIsCreateOpen(false)}>Cancel</button><button type="submit" form="create-role-form" className="primary-button" disabled={isSavingRole}>{isSavingRole ? 'Creating...' : 'Create role'}</button></div>}>
        <form id="create-role-form" className="stack-form" onSubmit={handleCreateRole}><FormSection title="Role basics" description="Create the role first, then assign permissions."><div className="form-grid"><label><span>Name</span><input value={createRoleForm.name} onChange={(e) => setCreateRoleForm((c) => ({ ...c, name: e.target.value }))} required /></label><label><span>Key</span><input value={createRoleForm.key} onChange={(e) => setCreateRoleForm((c) => ({ ...c, key: e.target.value }))} required /></label></div><label><span>Description</span><textarea value={createRoleForm.description} onChange={(e) => setCreateRoleForm((c) => ({ ...c, description: e.target.value }))} /></label><label><span>Status</span><select value={createRoleForm.status} onChange={(e) => setCreateRoleForm((c) => ({ ...c, status: e.target.value as RoleFormState['status'] }))}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label></FormSection>{roleError ? <div className="error-banner">{roleError}</div> : null}</form>
      </Modal>
    </section>
  );
}
