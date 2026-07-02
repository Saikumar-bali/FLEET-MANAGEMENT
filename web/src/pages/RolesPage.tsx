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
import {
  createRole as createRoleRequest,
  getPermissions,
  getRoles,
  updateRole as updateRoleRequest,
  updateRolePermissions as updateRolePermissionsRequest,
} from '../services/api';
import type { PermissionRecord, RoleRecord } from '../types/auth';
import { ApiError } from '../types/api';

const ROLE_TEMPLATES: { name: string; key: string; description: string; permissions: string[] }[] = [
  {
    name: 'Driver Basic',
    key: 'driver_basic',
    description: 'Basic driver portal access with trip, fuel, expense, document, issue, and inspection capabilities',
    permissions: ['driver_portal_view', 'driver_my_dashboard_view', 'driver_my_trips_view', 'driver_my_documents_view', 'driver_my_profile_view', 'driver_trip_create', 'driver_trip_start', 'driver_trip_end', 'driver_trip_cancel', 'driver_quick_fuel_create', 'driver_expense_create', 'driver_document_upload', 'driver_vehicle_issue_report', 'driver_vehicle_inspection_create'],
  },
  {
    name: 'Driver With Pool Vehicle',
    key: 'driver_pool_vehicle',
    description: 'Driver Basic plus pool vehicle selection, self-checkout, and return',
    permissions: ['driver_portal_view', 'driver_my_dashboard_view', 'driver_my_trips_view', 'driver_my_documents_view', 'driver_my_profile_view', 'driver_trip_create', 'driver_trip_start', 'driver_trip_end', 'driver_trip_cancel', 'driver_quick_fuel_create', 'driver_expense_create', 'driver_document_upload', 'driver_vehicle_issue_report', 'driver_vehicle_inspection_create', 'driver_available_vehicle_select', 'driver_vehicle_self_checkout', 'driver_vehicle_return', 'driver_vehicle_checkout_view_own'],
  },
  {
    name: 'Manager Operations',
    key: 'manager_operations',
    description: 'Operations management with vehicle, driver, trip, and submission review',
    permissions: ['trip_view', 'trip_create', 'trip_update', 'trip_start', 'trip_end', 'trip_cancel', 'vehicle_view', 'vehicle_create', 'vehicle_update', 'driver_view', 'driver_create', 'driver_update', 'fuel_view', 'expense_view', 'driver_submission_view', 'driver_submission_review', 'driver_fuel_approve', 'driver_expense_approve', 'driver_document_verify', 'driver_issue_review', 'driver_inspection_review', 'maintenance_view', 'repair_view'],
  },
  {
    name: 'Finance Billing',
    key: 'finance_billing',
    description: 'Finance management with billing, payments, and expense approval',
    permissions: ['finance_view', 'finance_create', 'finance_update', 'finance_approve', 'fuel_view', 'fuel_approve', 'expense_view', 'expense_approve', 'trip_billing_view', 'trip_billing_create', 'trip_billing_update', 'trip_billing_mark_paid', 'payments_view', 'payments_create', 'payments_update', 'customers_view', 'customers_create', 'customers_update', 'vendors_view', 'vendors_create', 'vendors_update', 'report_view', 'report_export'],
  },
  {
    name: 'Mechanic Maintenance',
    key: 'mechanic_maintenance',
    description: 'Maintenance and repair access with vehicle inspection capabilities',
    permissions: ['repair_view', 'repair_create', 'repair_update', 'repair_close', 'maintenance_view', 'maintenance_create', 'maintenance_update', 'maintenance_submit', 'vehicle_view', 'vehicle_compliance_view', 'vehicle_compliance_create', 'vehicle_compliance_update', 'documents_view', 'documents_upload', 'documents_download'],
  },
  {
    name: 'Viewer Read Only',
    key: 'viewer_read_only',
    description: 'Read-only access to all operational modules',
    permissions: ['vehicle_view', 'driver_view', 'asset_view', 'trip_view', 'fuel_view', 'expense_view', 'repair_view', 'maintenance_view', 'report_view', 'vehicle_compliance_view', 'compliance_alerts_view', 'compliance_history_view', 'document_metadata_view', 'documents_view', 'role_view', 'user_view', 'permission_view', 'profile_link_view'],
  },
];

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
  const { showToast } = useToast();
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
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState('');

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

    try {
      const response = await createRoleRequest(auth.accessToken, createRoleForm);
      setRoles((current) => [...current, response.data]);
      setSelectedRoleId(response.data.id);
      setCreateRoleForm(initialRoleFormState);
      setIsCreateOpen(false);
      showToast('Role created successfully.', 'success');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setRoleError(caughtError.message);
        showToast(caughtError.message, 'error');
      } else {
        setRoleError('Failed to create role.');
        showToast('Failed to create role.', 'error');
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

    try {
      const response = await updateRoleRequest(auth.accessToken, selectedRoleId, roleForm);
      setRoles((currentRoles) =>
        currentRoles.map((role) => (role.id === selectedRoleId ? { ...role, ...response.data } : role)),
      );
      showToast('Role updated successfully.', 'success');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setRoleError(caughtError.message);
        showToast(caughtError.message, 'error');
      } else {
        setRoleError('Failed to update role.');
        showToast('Failed to update role.', 'error');
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

    try {
      const response = await updateRolePermissionsRequest(auth.accessToken, selectedRoleId, selectedPermissionKeys);
      setRoles((currentRoles) =>
        currentRoles.map((role) => (role.id === selectedRoleId ? response.data : role)),
      );
      showToast('Permissions updated successfully.', 'success');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setPermissionError(caughtError.message);
        showToast(caughtError.message, 'error');
      } else {
        setPermissionError('Failed to update permissions.');
        showToast('Failed to update permissions.', 'error');
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
    <section className="page-content">
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

      <div className="card table-card">
        <div className="table-toolbar">
          <div className="role-permission-toolbar">
            <label className="role-selector-row">
              <span className="field-label">Role:</span>
              <select
                className="role-selector-input"
                value={selectedRoleId ?? ''}
                onChange={(event) => setSelectedRoleId(event.target.value)}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} {role.isSystem ? '(System)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <input
              className="role-search-input"
              value={permissionSearch}
              onChange={(event) => setPermissionSearch(event.target.value)}
              placeholder="Search permissions"
            />
            <span className="table-secondary permission-count">
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
        <div className="card form-section-grid">
          <div className="section-header">
            <div>
              <h4 className="role-edit-h4">{selectedRole.name}</h4>
              <p className="helper-text role-edit-desc">{selectedRole.description || 'No description'}</p>
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
              <label className="role-status-label">
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

      {selectedRole && auth.hasPermission('permission_assign') ? (
        <div className="card">
          <FormSection title="Apply template" description="Quick-set permissions from a predefined template.">
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <label style={{ flex: 1 }}>
                <span className="field-label">Template</span>
                <select
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Select a template --</option>
                  {ROLE_TEMPLATES.map((tmpl) => (
                    <option key={tmpl.key} value={tmpl.key}>{tmpl.name}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="primary-button"
                disabled={!templateKey || isSavingPermissions}
                onClick={() => {
                  const tmpl = ROLE_TEMPLATES.find(t => t.key === templateKey);
                  if (!tmpl) return;
                  if (!window.confirm(`Apply "${tmpl.name}" template? This will add ${tmpl.permissions.length} permissions to ${selectedRole.name}. Existing permissions are preserved.`)) return;
                  setSelectedPermissionKeys(prev => {
                    const s = new Set(prev);
                    for (const p of tmpl.permissions) s.add(p);
                    return Array.from(s);
                  });
                  void handleSavePermissions();
                }}
              >
                Apply template
              </button>
            </div>
            {templateKey && (() => {
              const t = ROLE_TEMPLATES.find(x => x.key === templateKey);
              return t ? <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>{t.description} ({t.permissions.length} permissions)</p> : null;
            })()}
          </FormSection>
        </div>
      ) : null}

      <div className="card table-card" id="permission-matrix">
        <div className="section-header wrap-row">
          <div>
            <h4 className="role-edit-h4">Permissions</h4>
            <p className="helper-text permission-matrix-editing">
              {selectedRole
                ? `Editing permissions for: ${selectedRole.name}`
                : 'Select a role to edit permissions.'}
            </p>
          </div>
          {!auth.hasPermission('permission_assign') ? (
            <span className="permission-matrix-view-only">View only: you do not have permission to assign changes.</span>
          ) : null}
        </div>

        {Object.entries(filteredPermissionGroups).length === 0 ? (
          <p className="muted-copy">No permissions match your search.</p>
        ) : (
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="permission-col-module">Module</th>
                  <th className="permission-col-key">Permission</th>
                  <th>Description</th>
                  <th className="permission-col-enabled">Enabled</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(filteredPermissionGroups).map(([module, modulePermissions]) => (
                  <>
                    <tr key={module} className="permission-module-row">
                      <td colSpan={4} className="permission-module-cell">
                        <span className="permission-module-name">{module}</span>
                        <span className="table-secondary permission-module-count">
                          ({modulePermissions.length} permissions)
                        </span>
                        <span className="permission-module-actions">
                          <button
                            type="button"
                            className="ghost-button compact-module-btn"
                            onClick={() => handleSelectAllInModule(module)}
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            className="ghost-button compact-module-btn"
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
                          <td className="permission-desc">{permission.module}</td>
                          <td>
                            <code className="permission-code">{permission.key}</code>
                          </td>
                          <td className="permission-desc">
                            {permission.description || `${permission.module} ${permission.action}`}
                          </td>
                          <td className="permission-cell">
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

        {permissionError ? <div className="error-banner permission-error-spacing">{permissionError}</div> : null}

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
