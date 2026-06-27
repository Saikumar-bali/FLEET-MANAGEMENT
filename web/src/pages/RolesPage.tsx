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

const DRIVER_PERMISSION_LABELS: Record<string, string> = {
  driver_portal_view: 'Can access driver portal',
  driver_my_dashboard_view: 'Can view own dashboard',
  driver_my_trips_view: 'Can view own trip list',
  driver_my_documents_view: 'Can view own documents',
  driver_my_profile_view: 'Can view own profile',
  driver_trip_create: 'Driver can create own trips',
  driver_trip_view: 'Driver can view own trip details',
  driver_trip_start: 'Driver can start own trips',
  driver_trip_end: 'Driver can end own trips',
  driver_trip_cancel: 'Driver can cancel own trips',
  driver_trip_document_upload: 'Driver can upload trip documents',
  driver_pod_upload: 'Driver can upload proof of delivery',
  driver_lr_upload: 'Driver can upload LR document',
  driver_challan_upload: 'Driver can upload challan',
  driver_eway_bill_upload: 'Driver can upload e-way bill',
  driver_quick_fuel_create: 'Driver can create own fuel entry',
  driver_fuel_receipt_upload: 'Driver can upload own fuel receipt',
  driver_fuel_view_own: 'Driver can view own fuel entries',
  driver_expense_create: 'Driver can create own expense claim',
  driver_expense_view_own: 'Driver can view own expenses',
  driver_expense_receipt_upload: 'Driver can upload own expense receipt',
  driver_assigned_vehicle_view: 'Driver can view assigned vehicle',
  driver_vehicle_inspection_create: 'Driver can submit vehicle inspection',
  driver_vehicle_issue_report: 'Driver can report vehicle issue',
  driver_maintenance_report_create: 'Driver can report maintenance',
  driver_repair_report_create: 'Driver can report repair',
};

const DRIVER_DISPLAY_GROUPS: Record<string, { label: string; match: (key: string, mod: string) => boolean }> = {
  'Driver Portal': {
    label: 'Driver Portal',
    match: (key) => ['driver_portal_view', 'driver_my_dashboard_view', 'driver_my_trips_view', 'driver_my_documents_view', 'driver_my_profile_view'].includes(key),
  },
  'Driver Trips': {
    label: 'Driver Trips',
    match: (key) => ['driver_trip_create', 'driver_trip_view', 'driver_trip_start', 'driver_trip_end', 'driver_trip_cancel', 'driver_trip_document_upload', 'driver_pod_upload', 'driver_lr_upload', 'driver_challan_upload', 'driver_eway_bill_upload'].includes(key),
  },
  'Driver Fuel': {
    label: 'Driver Fuel',
    match: (key) => ['driver_quick_fuel_create', 'driver_fuel_receipt_upload', 'driver_fuel_view_own'].includes(key),
  },
  'Driver Expenses': {
    label: 'Driver Expenses',
    match: (key) => ['driver_expense_create', 'driver_expense_view_own', 'driver_expense_receipt_upload'].includes(key),
  },
  'Driver Vehicle': {
    label: 'Driver Vehicle',
    match: (key) => ['driver_assigned_vehicle_view', 'driver_vehicle_inspection_create', 'driver_vehicle_issue_report'].includes(key),
  },
  'Driver Maintenance / Repair': {
    label: 'Driver Maintenance / Repair',
    match: (key) => ['driver_maintenance_report_create', 'driver_repair_report_create'].includes(key),
  },
};

function getPermissionLabel(key: string): string {
  if (DRIVER_PERMISSION_LABELS[key]) return DRIVER_PERMISSION_LABELS[key];
  return '';
}

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

  const isDriverRole = selectedRole?.key === 'driver';

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

    if (isDriverRole) {
      const driverPerms = filteredPermissions.filter((p) => p.module === 'driver');
      const otherPerms = filteredPermissions.filter((p) => p.module !== 'driver');

      const driverGroups: Record<string, PermissionRecord[]> = {};
      const unmatched: PermissionRecord[] = [];

      for (const perm of driverPerms) {
        let placed = false;
        for (const [, groupDef] of Object.entries(DRIVER_DISPLAY_GROUPS)) {
          if (groupDef.match(perm.key, perm.module)) {
            driverGroups[groupDef.label] = driverGroups[groupDef.label] ?? [];
            driverGroups[groupDef.label].push(perm);
            placed = true;
            break;
          }
        }
        if (!placed) {
          unmatched.push(perm);
        }
      }

      if (unmatched.length > 0) {
        driverGroups['Driver (Other)'] = unmatched;
      }

      const otherGroups = otherPerms.reduce<Record<string, PermissionRecord[]>>((groups, permission) => {
        const key = permission.module || 'general';
        groups[key] = groups[key] ?? [];
        groups[key].push(permission);
        return groups;
      }, {});

      return { ...driverGroups, ...otherGroups };
    }

    return filteredPermissions.reduce<Record<string, PermissionRecord[]>>((groups, permission) => {
      const key = permission.module || 'general';
      groups[key] = groups[key] ?? [];
      groups[key].push(permission);
      return groups;
    }, {});
  }, [permissionSearch, permissions, isDriverRole]);

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
      setPageMessage('Permissions saved. Driver must refresh permissions or log in again. Admin instruction: Tell the driver to open My Permissions and click Refresh, or log out and log in again.');
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

      {pageMessage ? (
        <div className="success-banner">{pageMessage}</div>
      ) : null}

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

        {isDriverRole && (
          <div className="warning-banner" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-warning-bg, #fff8e1)', border: '1px solid var(--color-warning-border, #ffc107)', borderRadius: '6px' }}>
            <strong>Driver Portal Permissions:</strong> Driver portal menu uses <code>driver_trip_create</code>, <code>driver_quick_fuel_create</code>, etc. Global permissions like <code>trip_create</code> are for admin/global modules and will <em>not</em> show driver portal actions.
          </div>
        )}

        {isDriverRole && (() => {
          const hasGlobalTripCreate = selectedPermissionKeys.includes('trip_create');
          const hasDriverTripCreate = selectedPermissionKeys.includes('driver_trip_create');
          const hasGlobalTripStart = selectedPermissionKeys.includes('trip_start');
          const hasDriverTripStart = selectedPermissionKeys.includes('driver_trip_start');
          const hasGlobalTripEnd = selectedPermissionKeys.includes('trip_end');
          const hasDriverTripEnd = selectedPermissionKeys.includes('driver_trip_end');
          const hasGlobalFuelCreate = selectedPermissionKeys.includes('fuel_create');
          const hasDriverFuelCreate = selectedPermissionKeys.includes('driver_quick_fuel_create');
          const hasGlobalExpenseCreate = selectedPermissionKeys.includes('expense_create');
          const hasDriverExpenseCreate = selectedPermissionKeys.includes('driver_expense_create');

          const warnings: string[] = [];

          if (hasGlobalTripCreate && !hasDriverTripCreate) {
            warnings.push('You selected global trip_create. To show "Create Trip" in the driver sidebar, also enable driver_trip_create.');
          }
          if (hasGlobalTripStart && !hasDriverTripStart) {
            warnings.push('You selected global trip_start. To show "Start Trip" in the driver sidebar, also enable driver_trip_start.');
          }
          if (hasGlobalTripEnd && !hasDriverTripEnd) {
            warnings.push('You selected global trip_end. To show "End Trip" in the driver sidebar, also enable driver_trip_end.');
          }
          if (hasGlobalFuelCreate && !hasDriverFuelCreate) {
            warnings.push('You selected global fuel_create. To show "Add Fuel" in the driver sidebar, also enable driver_quick_fuel_create.');
          }
          if (hasGlobalExpenseCreate && !hasDriverExpenseCreate) {
            warnings.push('You selected global expense_create. To show "Create Expense" in the driver sidebar, also enable driver_expense_create.');
          }

          if (warnings.length === 0) return null;

          return (
            <div className="warning-banner" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: '#fff3e0', border: '1px solid #ff9800', borderRadius: '6px', fontSize: 'var(--font-size-sm)' }}>
              <strong>Permission mapping notice:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          );
        })()}

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
                      const friendlyLabel = getPermissionLabel(permission.key);

                      return (
                        <tr key={permission.id}>
                          <td className="permission-desc">{permission.module}</td>
                          <td>
                            <code className="permission-code">{permission.key}</code>
                          </td>
                          <td className="permission-desc">
                            {friendlyLabel || permission.description || `${permission.module} ${permission.action}`}
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
