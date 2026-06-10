import { FormEvent, useEffect, useMemo, useState } from 'react';
import { DataTable } from '../components/DataTable';
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
    <section className="page-grid">
      <div className="content-span-12">
        <PageHeader
          eyebrow="Security"
          title="Roles and permissions"
          description="Review system roles, add custom roles, and manage permission coverage with a grouped matrix."
          actions={auth.hasPermission('role_create') ? (
            <button type="button" className="primary-button" onClick={() => setIsCreateOpen(true)}>
              Create role
            </button>
          ) : null}
        />
      </div>

      {pageMessage ? (
        <div className="content-span-12">
          <div className="success-banner">{pageMessage}</div>
        </div>
      ) : null}

      <div className="content-span-12 list-detail-layout">
        <article className="card table-card selection-panel">
          <div className="table-toolbar">
            <div>
              <h3 className="table-toolbar-title">Role list</h3>
              <p className="table-toolbar-copy">System and custom roles stay visible in a compact list.</p>
            </div>
          </div>

          <DataTable
            columns={[
              {
                key: 'role',
                header: 'Role',
                render: (role) => (
                  <div className="user-name-cell">
                    <strong>{role.name}</strong>
                    <span className="table-secondary">{role.key}</span>
                  </div>
                ),
              },
              {
                key: 'type',
                header: 'Type',
                render: (role) => role.isSystem ? <span className="system-badge">System</span> : <span className="permission-badge">Custom</span>,
                width: '120px',
              },
              {
                key: 'status',
                header: 'Status',
                render: (role) => <StatusBadge status={role.status} />,
                width: '120px',
              },
              {
                key: 'permissions',
                header: 'Permissions',
                render: (role) => `${(role.rolePermissions ?? []).length} assigned`,
                width: '140px',
              },
            ]}
            data={roles}
            keyExtractor={(role) => role.id}
            onRowClick={(role) => setSelectedRoleId(role.id)}
          />
        </article>

        <aside className="detail-panel">
          <article className="card detail-card">
            <div className="table-toolbar">
              <div>
                <h3 className="table-toolbar-title">{selectedRole?.name ?? 'Role details'}</h3>
                <p className="table-toolbar-copy">Edit role metadata separately from the create-role flow.</p>
              </div>
              {selectedRole?.isSystem ? <span className="system-badge">System</span> : null}
            </div>

            {selectedRole ? (
              <>
                <FormSection title="Role details" description="System roles keep their key locked, while custom roles remain editable.">
                  <div className="form-grid">
                    <label>
                      <span>Name</span>
                      <input
                        value={roleForm.name}
                        onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
                        disabled={!auth.hasPermission('role_update')}
                      />
                    </label>
                    <label>
                      <span>Key</span>
                      <input
                        value={roleForm.key}
                        onChange={(event) => setRoleForm((current) => ({ ...current, key: event.target.value }))}
                        disabled={!auth.hasPermission('role_update') || selectedRole.isSystem}
                      />
                    </label>
                  </div>
                  <label>
                    <span>Description</span>
                    <textarea
                      value={roleForm.description}
                      onChange={(event) => setRoleForm((current) => ({ ...current, description: event.target.value }))}
                      disabled={!auth.hasPermission('role_update')}
                    />
                  </label>
                  <label>
                    <span>Status</span>
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
              </>
            ) : null}
          </article>
        </aside>
      </div>

      <article className="card content-span-12" id="permission-matrix">
        <div className="table-toolbar">
          <div>
            <h3 className="table-toolbar-title">Permission matrix</h3>
            <p className="table-toolbar-copy">Search by key or description, then save grouped permissions for the selected role.</p>
          </div>
          <div className="table-toolbar-actions">
            <input
              value={permissionSearch}
              onChange={(event) => setPermissionSearch(event.target.value)}
              placeholder="Search permissions"
            />
          </div>
        </div>

        <div className="permission-groups">
          {Object.entries(filteredPermissionGroups).map(([module, modulePermissions]) => (
            <section key={module} className="permission-module-card">
              <div>
                <h4 className="permission-module-title">{module}</h4>
                <p className="permission-help">{modulePermissions.length} permissions</p>
              </div>
              <div className="permission-grid">
                {modulePermissions.map((permission) => {
                  const isChecked = selectedPermissionKeys.includes(permission.key);

                  return (
                    <label key={permission.id} className="permission-tile">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!auth.hasPermission('permission_assign')}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setSelectedPermissionKeys((currentKeys) =>
                            checked
                              ? [...currentKeys, permission.key]
                              : currentKeys.filter((permissionKey) => permissionKey !== permission.key),
                          );
                        }}
                      />
                      <div>
                        <strong>{permission.key}</strong>
                        <p>{permission.description ?? `${permission.module} ${permission.action}`}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {permissionError ? <div className="error-banner" style={{ marginTop: '0.9rem' }}>{permissionError}</div> : null}

        <div className="permission-toolbar">
          <p className="permission-help">
            {selectedRole ? `Editing permission coverage for ${selectedRole.name}.` : 'Select a role to edit permissions.'}
          </p>
          {auth.hasPermission('permission_assign') ? (
            <button type="button" className="primary-button" onClick={() => void handleSavePermissions()} disabled={isSavingPermissions}>
              {isSavingPermissions ? 'Saving permissions...' : 'Save permissions'}
            </button>
          ) : (
            <span className="table-secondary">You can view this matrix but cannot change it.</span>
          )}
        </div>
      </article>

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
