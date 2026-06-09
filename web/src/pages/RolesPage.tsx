import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createRole as createRoleRequest,
  getPermissions,
  getRoles,
  updateRole as updateRoleRequest,
  updateRolePermissions as updateRolePermissionsRequest,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
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

export function RolesPage() {
  const auth = useAuth();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);
  const [roleForm, setRoleForm] = useState<RoleFormState>(initialRoleFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) {
        return;
      }

      setIsLoading(true);
      setError(null);

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
          setSelectedPermissionKeys(firstRole.rolePermissions.map((entry) => entry.permission.key));
          setRoleForm({
            name: firstRole.name,
            key: firstRole.key,
            description: firstRole.description ?? '',
            status: firstRole.status,
          });
        }
      } catch (caughtError) {
        if (caughtError instanceof ApiError) {
          setError(caughtError.message);
        } else {
          setError('Failed to load roles and permissions.');
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

    setSelectedPermissionKeys(selectedRole.rolePermissions.map((entry) => entry.permission.key));
    setRoleForm({
      name: selectedRole.name,
      key: selectedRole.key,
      description: selectedRole.description ?? '',
      status: selectedRole.status,
    });
    setFormMessage(null);
  }, [selectedRole]);

  async function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!auth.accessToken) {
      return;
    }

    setIsSavingRole(true);
    setFormMessage(null);
    setError(null);

    try {
      const response = await createRoleRequest(auth.accessToken, roleForm);
      const nextRoles = [...roles, response.data];
      setRoles(nextRoles);
      setSelectedRoleId(response.data.id);
      setFormMessage('Role created successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        setError('Failed to create role.');
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
    setFormMessage(null);
    setError(null);

    try {
      const response = await updateRoleRequest(auth.accessToken, selectedRoleId, roleForm);
      setRoles((currentRoles) =>
        currentRoles.map((role) => (role.id === selectedRoleId ? { ...role, ...response.data } : role)),
      );
      setFormMessage('Role updated successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        setError('Failed to update role.');
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
    setFormMessage(null);
    setError(null);

    try {
      const response = await updateRolePermissionsRequest(auth.accessToken, selectedRoleId, selectedPermissionKeys);
      setRoles((currentRoles) =>
        currentRoles.map((role) => (role.id === selectedRoleId ? response.data : role)),
      );
      setFormMessage('Permissions updated successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        setError('Failed to update permissions.');
      }
    } finally {
      setIsSavingPermissions(false);
    }
  }

  if (isLoading) {
    return <div className="centered-state">Loading roles and permissions...</div>;
  }

  if (error && roles.length === 0) {
    return <div className="error-banner">{error}</div>;
  }

  if (roles.length === 0) {
    return <div className="empty-state">No roles found yet. Create the first custom role to begin.</div>;
  }

  return (
    <section className="page-grid roles-grid">
      <article className="card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Roles</p>
            <h3>Available roles</h3>
          </div>
        </div>

        <div className="role-list">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              className={`role-card${role.id === selectedRoleId ? ' role-card-active' : ''}`}
              onClick={() => setSelectedRoleId(role.id)}
            >
              <strong>{role.name}</strong>
              <span>{role.key}</span>
              <small>{role.rolePermissions.length} permissions</small>
            </button>
          ))}
        </div>
      </article>

      <article className="card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Role editor</p>
            <h3>{selectedRole?.name ?? 'Create a role'}</h3>
          </div>
          {selectedRole?.isSystem ? <span className="status-pill">System role</span> : null}
        </div>

        <form className="stack-form" onSubmit={handleCreateRole}>
          <label>
            <span>Name</span>
            <input
              value={roleForm.name}
              onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </label>

          <label>
            <span>Key</span>
            <input
              value={roleForm.key}
              onChange={(event) => setRoleForm((current) => ({ ...current, key: event.target.value }))}
              required
              disabled={selectedRole?.isSystem}
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              value={roleForm.description}
              onChange={(event) => setRoleForm((current) => ({ ...current, description: event.target.value }))}
              rows={3}
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
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>

          {error ? <div className="error-banner">{error}</div> : null}
          {formMessage ? <div className="success-banner">{formMessage}</div> : null}

          <div className="button-row">
            {auth.hasPermission('role_create') ? (
              <button type="submit" className="primary-button" disabled={isSavingRole}>
                {isSavingRole ? 'Saving...' : 'Create role'}
              </button>
            ) : null}

            {selectedRole && auth.hasPermission('role_update') ? (
              <button type="button" className="secondary-button" onClick={() => void handleUpdateRole()} disabled={isSavingRole}>
                {isSavingRole ? 'Updating...' : 'Update role'}
              </button>
            ) : null}
          </div>
        </form>
      </article>

      <article className="card wide-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Permission assignment</p>
            <h3>{selectedRole?.name ?? 'Select a role'}</h3>
          </div>
        </div>

        <div className="permission-grid">
          {permissions.map((permission) => {
            const isChecked = selectedPermissionKeys.includes(permission.key);

            return (
              <label key={permission.id} className="permission-tile">
                <input
                  type="checkbox"
                  checked={isChecked}
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

        {auth.hasPermission('permission_assign') ? (
          <button type="button" className="primary-button" onClick={() => void handleSavePermissions()} disabled={isSavingPermissions}>
            {isSavingPermissions ? 'Saving permissions...' : 'Save permissions'}
          </button>
        ) : (
          <div className="empty-state">Your current account can view this matrix but cannot change it.</div>
        )}
      </article>
    </section>
  );
}
