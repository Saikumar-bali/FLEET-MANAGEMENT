import { FormEvent, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { FormSection } from '../components/FormSection';
import { LoadingState } from '../components/LoadingState';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  createRole as createRoleRequest,
  getPermissions,
  getRoles,
  updateRole as updateRoleRequest,
  updateRolePermissions as updateRolePermissionsRequest,
} from '../services/api';
import type { PermissionRecord, RoleRecord } from '../types/auth';
import { ApiError } from '../types/api';

type RoleFormState = {
  name: string;
  key: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
};

const initialRoleFormState: RoleFormState = {
  name: '',
  key: '',
  description: '',
  status: 'ACTIVE',
};

function getRoleEditForm(role: RoleRecord): RoleFormState {
  return {
    name: role.name,
    key: role.key,
    description: role.description ?? '',
    status: role.status,
  };
}

export function RolesPage() {
  const auth = useAuth();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);
  const [roleForm, setRoleForm] = useState<RoleFormState>(initialRoleFormState);
  const [createRoleForm, setCreateRoleForm] = useState<RoleFormState>(initialRoleFormState);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const filteredPermissionGroups = useMemo(() => {
    const normalizedSearch = permissionSearch.trim().toLowerCase();
    const filteredPermissions = normalizedSearch
      ? permissions.filter((permission) =>
          [permission.key, permission.module, permission.action, permission.description ?? '']
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch),
        )
      : permissions;

    return filteredPermissions.reduce<Record<string, PermissionRecord[]>>((groups, permission) => {
      const key = permission.module || 'general';
      groups[key] = groups[key] ?? [];
      groups[key].push(permission);
      return groups;
    }, {});
  }, [permissionSearch, permissions]);

  const selectedCount = useMemo(
    () => selectedPermissionKeys.length,
    [selectedPermissionKeys],
  );

  const totalCount = useMemo(
    () => permissions.length,
    [permissions],
  );

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) {
        return;
      }

      setIsLoading(true);
      setPageError(null);

      try {
        const [rolesResponse, permissionsResponse] = await Promise.all([
          getRoles(auth.accessToken),
          getPermissions(auth.accessToken),
        ]);

        setRoles(rolesResponse.data);
        setPermissions(permissionsResponse.data);

        if (rolesResponse.data.length > 0) {
          const firstRole = rolesResponse.data[0];
          setSelectedRoleId(firstRole.id);
          setSelectedPermissionKeys((firstRole.rolePermissions ?? []).map((entry) => entry.permission.key));
          setRoleForm(getRoleEditForm(firstRole));
        }
      } catch (caughtError) {
        if (caughtError instanceof ApiError) {
          setPageError(caughtError.message);
        } else {
          setPageError('Failed to load roles and permissions.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [auth.accessToken]);

  useEffect(() => {
    if (!selectedRole) {
      return;
    }

    setSelectedPermissionKeys((selectedRole.rolePermissions ?? []).map((entry) => entry.permission.key));
    setRoleForm(getRoleEditForm(selectedRole));
    setRoleError(null);
    setPermissionError(null);
  }, [selectedRole]);

  async function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!auth.accessToken) {
      return;
    }

    setIsSavingRole(true);
    setRoleError(null);
    setPageMessage(null);

    try {
      const response = await createRoleRequest(auth.accessToken, createRoleForm);
      setRoles((current) => [...current, response.data]);
      setSelectedRoleId(response.data.id);
      setCreateRoleForm(initialRoleFormState);
      setIsCreateOpen(false);
      setPageMessage('Role created successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setRoleError(caughtError.message);
      } else {
        setRoleError('Failed to create role.');
      }
    } finally {
      setIsSavingRole(false);
    }
  }

  async function handleUpdateRole() {
    if (!auth.accessToken || !selectedRoleId) {
      return;
    }

    setIsSavingRole(true);
    setRoleError(null);
    setPageMessage(null);

    try {
      const response = await updateRoleRequest(auth.accessToken, selectedRoleId, roleForm);
      setRoles((currentRoles) =>
        currentRoles.map((role) => (role.id === selectedRoleId ? { ...role, ...response.data } : role)),
      );
      setPageMessage('Role updated successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setRoleError(caughtError.message);
      } else {
        setRoleError('Failed to update role.');
      }
    } finally {
      setIsSavingRole(false);
    }
  }

  async function handleSavePermissions() {
    if (!auth.accessToken || !selectedRoleId) {
      return;
    }

    setIsSavingPermissions(true);
    setPermissionError(null);
    setPageMessage(null);

    try {
      const response = await updateRolePermissionsRequest(auth.accessToken, selectedRoleId, selectedPermissionKeys);
      setRoles((currentRoles) =>
        currentRoles.map((role) => (role.id === selectedRoleId ? response.data : role)),
      );
      setPageMessage('Permissions updated successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setPermissionError(caughtError.message);
      } else {
        setPermissionError('Failed to update permissions.');
      }
    } finally {
      setIsSavingPermissions(false);
    }
  }

  function handleSelectAllInModule(module: string) {
    const moduleKeys = (filteredPermissionGroups[module] ?? []).map((p) => p.key);
    setSelectedPermissionKeys((current) => {
      const existing = new Set(current);
      for (const key of moduleKeys) {
        existing.add(key);
      }
      return Array.from(existing);
    });
  }

  function handleClearModule(module: string) {
    const moduleKeys = new Set((filteredPermissionGroups[module] ?? []).map((p) => p.key));
    setSelectedPermissionKeys((current) => current.filter((key) => !moduleKeys.has(key)));
  }

  if (isLoading) {
    return <LoadingState message="Loading roles and permission coverage..." />;
  }

  if (pageError) {
    return <ErrorState message={pageError} onRetry={() => window.location.reload()} />;
  }

  if (roles.length === 0) {
    return (
      <EmptyState
        title="No roles available"
        message="Create the first custom role to start assigning permission sets."
        action={auth.hasPermission('role_create') ? (
          <button type="button" className="primary-button" onClick={() => setIsCreateOpen(true)}>
            Create role
          </button>
        ) : null}
      />
    );
  }

  return (
    <section className="form-page">
      <div className="section-header">
        <div>
          <PageHeader
            eyebrow="Security"
            title="Roles and permissions"
            description="Review system roles, add custom roles, and manage permission coverage."
          />
        </div>
        <div className="action-panel">
          {auth.hasPermission('role_create') ? (
            <button type="button" className="primary-button" onClick={() => setIsCreateOpen(true)}>
              Create role
            </button>
          ) : null}
        </div>
      </div>

      {pageMessage ? (
        <div className="success-banner">{pageMessage}</div>
      ) : null}

      <div className="card table-card" style={{ maxWidth: '100%' }}>
        <div className="table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, whiteSpace: 'nowrap' }}>
              <span className="field-label">Role:</span>
              <select
                value={selectedRoleId ?? ''}
                onChange={(event) => setSelectedRoleId(event.target.value)}
                style={{ width: 'auto', minWidth: '200px' }}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} {role.isSystem ? '(System)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <input
              value={permissionSearch}
              onChange={(event) => setPermissionSearch(event.target.value)}
              placeholder="Search permissions"
              style={{ maxWidth: '280px' }}
            />
            <span className="table-secondary" style={{ whiteSpace: 'nowrap' }}>
              {selectedCount} / {totalCount} selected
            </span>
          </div>
          <div className="action-panel">
            {auth.hasPermission('permission_assign') ? (
              <button type="button" className="primary-button" onClick={() => void handleSavePermissions()} disabled={isSavingPermissions}>
                {isSavingPermissions ? 'Saving...' : 'Save Permissions'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {selectedRole ? (
        <div className="card form-section-grid" style={{ maxWidth: '100%' }}>
          <div className="section-header">
            <div>
              <h4 style={{ margin: 0 }}>{selectedRole.name}</h4>
              <p className="helper-text" style={{ margin: '0.2rem 0 0' }}>{selectedRole.description || 'No description'}</p>
            </div>
            <div className="action-panel">
              {selectedRole.isSystem ? <span className="system-badge">System</span> : <span className="permission-badge">Custom</span>}
              <StatusBadge status={selectedRole.status} />
            </div>
          </div>

          {auth.hasPermission('role_update') ? (
            <FormSection title="Edit role" description="Update role name, key, or status.">
              <div className="form-two-column">
                <label>
                  <span className="field-label">Name</span>
                  <input
                    value={roleForm.name}
                    onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
                    disabled={!auth.hasPermission('role_update')}
                  />
                </label>
                <label>
                  <span className="field-label">Key</span>
                  <input
                    value={roleForm.key}
                    onChange={(event) => setRoleForm((current) => ({ ...current, key: event.target.value }))}
                    disabled={!auth.hasPermission('role_update') || selectedRole.isSystem}
                  />
                </label>
              </div>
              <label>
                <span className="field-label">Description</span>
                <textarea
                  value={roleForm.description}
                  onChange={(event) => setRoleForm((current) => ({ ...current, description: event.target.value }))}
                  disabled={!auth.hasPermission('role_update')}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '200px' }}>
                <span className="field-label">Status</span>
                <select
                  value={roleForm.status}
                  onChange={(event) =>
                    setRoleForm((current) => ({
                      ...current,
                      status: event.target.value as RoleFormState['status'],
                    }))
                  }
                  disabled={!auth.hasPermission('role_update')}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
              {roleError ? <div className="error-banner">{roleError}</div> : null}
              {auth.hasPermission('role_update') ? (
                <div className="button-row">
                  <button type="button" className="primary-button" onClick={() => void handleUpdateRole()} disabled={isSavingRole}>
                    {isSavingRole ? 'Saving...' : 'Update role'}
                  </button>
                </div>
              ) : null}
            </FormSection>
          ) : null}
        </div>
      ) : null}

      <div className="card table-card" id="permission-matrix" style={{ maxWidth: '100%' }}>
        <h4 style={{ margin: 0 }}>Permissions</h4>

        {Object.entries(filteredPermissionGroups).length === 0 ? (
          <p className="muted-copy">No permissions match your search.</p>
        ) : (
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>Module</th>
                  <th style={{ width: '200px' }}>Permission</th>
                  <th>Description</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Enabled</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(filteredPermissionGroups).map(([module, modulePermissions]) => (
                  <>
                    <tr key={module} style={{ background: 'var(--bg-panel-subtle)' }}>
                      <td colSpan={4} style={{ padding: '0.5rem 0.68rem', fontWeight: 600, fontSize: '0.82rem' }}>
                        <span style={{ textTransform: 'capitalize' }}>{module}</span>
                        <span className="table-secondary" style={{ marginLeft: '0.5rem', fontWeight: 400 }}>
                          ({modulePermissions.length} permissions)
                        </span>
                        <span style={{ float: 'right' }}>
                          <button
                            type="button"
                            className="ghost-button"
                            style={{ fontSize: '0.78rem', minHeight: '24px', padding: '0.15rem 0.5rem' }}
                            onClick={() => handleSelectAllInModule(module)}
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            style={{ fontSize: '0.78rem', minHeight: '24px', padding: '0.15rem 0.5rem' }}
                            onClick={() => handleClearModule(module)}
                          >
                            Clear
                          </button>
                        </span>
                      </td>
                    </tr>
                    {modulePermissions.map((permission) => {
                      const isChecked = selectedPermissionKeys.includes(permission.key);

                      return (
                        <tr key={permission.id}>
                          <td style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{permission.module}</td>
                          <td>
                            <code style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>{permission.key}</code>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {permission.description || `${permission.module} ${permission.action}`}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={!auth.hasPermission('permission_assign')}
                              onChange={() => {
                                setSelectedPermissionKeys((currentKeys) =>
                                  isChecked
                                    ? currentKeys.filter((permissionKey) => permissionKey !== permission.key)
                                    : [...currentKeys, permission.key],
                                );
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {permissionError ? <div className="error-banner" style={{ marginTop: '0.9rem' }}>{permissionError}</div> : null}

        <div className="permission-toolbar">
          <p className="helper-text">
            {selectedRole
              ? `${selectedCount} of ${totalCount} permissions selected for ${selectedRole.name}`
              : 'Select a role to edit permissions.'}
          </p>
          <div className="action-panel">
            <span className="table-secondary">{selectedCount} selected</span>
            {auth.hasPermission('permission_assign') ? (
              <button type="button" className="primary-button" onClick={() => void handleSavePermissions()} disabled={isSavingPermissions}>
                {isSavingPermissions ? 'Saving...' : 'Save Permissions'}
              </button>
            ) : (
              <span className="table-secondary">View only</span>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isCreateOpen}
        title="Create role"
        description="Add a custom role first, then assign its permissions from the matrix."
        onClose={() => {
          setIsCreateOpen(false);
          setCreateRoleForm(initialRoleFormState);
          setRoleError(null);
        }}
        footer={(
          <div className="button-row">
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setIsCreateOpen(false);
                setCreateRoleForm(initialRoleFormState);
                setRoleError(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" form="create-role-form" className="primary-button" disabled={isSavingRole}>
              {isSavingRole ? 'Creating...' : 'Create role'}
            </button>
          </div>
        )}
      >
        <form id="create-role-form" className="stack-form" onSubmit={handleCreateRole}>
          <FormSection title="Role basics" description="Keep create mode separate so editing an existing role never overwrites the new-role form.">
            <div className="form-grid">
              <label>
                <span>Name</span>
                <input
                  value={createRoleForm.name}
                  onChange={(event) => setCreateRoleForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Key</span>
                <input
                  value={createRoleForm.key}
                  onChange={(event) => setCreateRoleForm((current) => ({ ...current, key: event.target.value }))}
                  required
                />
              </label>
            </div>
            <label>
              <span>Description</span>
              <textarea
                value={createRoleForm.description}
                onChange={(event) => setCreateRoleForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <label>
              <span>Status</span>
              <select
                value={createRoleForm.status}
                onChange={(event) =>
                  setCreateRoleForm((current) => ({
                    ...current,
                    status: event.target.value as RoleFormState['status'],
                  }))
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
          </FormSection>
          {roleError ? <div className="error-banner">{roleError}</div> : null}
        </form>
      </Modal>
    </section>
  );
}
