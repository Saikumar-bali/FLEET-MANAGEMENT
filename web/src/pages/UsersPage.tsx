import { useEffect, useMemo, useState } from 'react';
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
import {
  createUser as createUserRequest,
  getRoles,
  getUsers,
  updateUser as updateUserRequest,
  updateUserPassword as updateUserPasswordRequest,
  updateUserStatus as updateUserStatusRequest,
} from '../services/api';
import type { RoleRecord, UserRecord } from '../types/auth';
import { ApiError } from '../types/api';

type UserFormState = {
  name: string;
  username: string;
  email: string;
  mobile: string;
  password: string;
  roleId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
};

const initialUserFormState: UserFormState = {
  name: '',
  username: '',
  email: '',
  mobile: '',
  password: '',
  roleId: '',
  status: 'ACTIVE',
};

function getCreateFormState(roles: RoleRecord[]): UserFormState {
  return {
    ...initialUserFormState,
    roleId: roles[0]?.id ?? '',
  };
}

function getEditFormState(user: UserRecord): UserFormState {
  return {
    name: user.name,
    username: user.username ?? '',
    email: user.email,
    mobile: user.mobile ?? '',
    password: '',
    roleId: user.role.id,
    status: user.status,
  };
}

export function UsersPage() {
  const auth = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<UserFormState>(initialUserFormState);
  const [editForm, setEditForm] = useState<UserFormState>(initialUserFormState);
  const [passwordReset, setPasswordReset] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSavingCreate, setIsSavingCreate] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [statusTarget, setStatusTarget] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | null>(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const canCreateUser = auth.hasPermission('user_create');
  const canUpdateUser = auth.hasPermission('user_update');
  const canManageStatus = auth.hasAnyPermission(['user_delete', 'user_deactivate']);

  const loadUsers = async () => {
    if (!auth.accessToken) {
      return;
    }

    const response = await getUsers(auth.accessToken);
    setUsers(response.data);
    setSelectedUserId((current) => current ?? response.data[0]?.id ?? null);
  };

  const loadRoles = async () => {
    if (!auth.accessToken) {
      return;
    }

    const response = await getRoles(auth.accessToken);
    setRoles(response.data);
    setCreateForm((current) => ({
      ...current,
      roleId: current.roleId || response.data[0]?.id || '',
    }));
  };

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) {
        return;
      }

      setIsLoading(true);
      setPageError(null);
      setRolesError(null);

      try {
        await Promise.all([loadUsers(), loadRoles()]);
      } catch (caughtError) {
        if (caughtError instanceof ApiError) {
          setPageError(caughtError.message);
        } else {
          setPageError('Failed to load users.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [auth.accessToken]);

  useEffect(() => {
    if (!selectedUser) {
      setEditForm(getCreateFormState(roles));
      return;
    }

    setEditForm(getEditFormState(selectedUser));
    setEditError(null);
    setPasswordReset('');
  }, [selectedUser, roles]);

  async function refreshUsersAndSelect(userId?: string) {
    await loadUsers();
    if (userId) {
      setSelectedUserId(userId);
    }
  }

  function openCreateMode() {
    setCreateForm(getCreateFormState(roles));
    setCreateError(null);
    setPageMessage(null);
    setIsCreateOpen(true);
  }

  function closeCreateMode() {
    setIsCreateOpen(false);
    setCreateError(null);
    setCreateForm(getCreateFormState(roles));
  }

  async function handleCreateUser() {
    if (!auth.accessToken) {
      return;
    }

    setIsSavingCreate(true);
    setCreateError(null);
    setPageMessage(null);

    try {
      const response = await createUserRequest(auth.accessToken, createForm);
      await refreshUsersAndSelect(response.data.id);
      setPageMessage('User created successfully.');
      closeCreateMode();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setCreateError(caughtError.message);
      } else {
        setCreateError('Failed to create user.');
      }
    } finally {
      setIsSavingCreate(false);
    }
  }

  async function handleUpdateUser() {
    if (!auth.accessToken || !selectedUser) {
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    setPageMessage(null);

    try {
      const response = await updateUserRequest(auth.accessToken, selectedUser.id, {
        name: editForm.name,
        username: editForm.username,
        mobile: editForm.mobile,
        roleId: editForm.roleId,
        status: editForm.status,
      });
      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === selectedUser.id ? response.data : user)),
      );
      setSelectedUserId(response.data.id);
      setPageMessage('User updated successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setEditError(caughtError.message);
      } else {
        setEditError('Failed to update user.');
      }
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleConfirmStatusUpdate() {
    if (!auth.accessToken || !selectedUser || !statusTarget) {
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    setPageMessage(null);

    try {
      const response = await updateUserStatusRequest(auth.accessToken, selectedUser.id, statusTarget);
      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === selectedUser.id ? response.data : user)),
      );
      setSelectedUserId(response.data.id);
      setPageMessage(`User marked ${statusTarget.toLowerCase()}.`);
      setStatusTarget(null);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setEditError(caughtError.message);
      } else {
        setEditError('Failed to update user status.');
      }
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handlePasswordReset() {
    if (!auth.accessToken || !selectedUser || passwordReset.length < 8) {
      return;
    }

    setIsSavingPassword(true);
    setEditError(null);
    setPageMessage(null);

    try {
      await updateUserPasswordRequest(auth.accessToken, selectedUser.id, passwordReset);
      setPasswordReset('');
      setPageMessage('User password updated successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setEditError(caughtError.message);
      } else {
        setEditError('Failed to update password.');
      }
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading users, roles, and access controls..." />;
  }

  if (pageError) {
    return <ErrorState message={pageError} onRetry={() => window.location.reload()} />;
  }

  const onlySeededAdminExists =
    users.length === 1 &&
    users[0]?.role.key === 'super_admin';

  return (
    <section className="page-grid">
      <div className="content-span-12">
        <PageHeader
          eyebrow="Security"
          title="Users"
          description="Create team accounts, assign roles, and handle password or status changes without losing context."
          actions={canCreateUser ? (
            <button type="button" className="primary-button" onClick={openCreateMode}>
              Create user
            </button>
          ) : null}
        />
      </div>

      {pageMessage ? (
        <div className="content-span-12">
          <div className="success-banner">{pageMessage}</div>
        </div>
      ) : null}

      {rolesError ? (
        <div className="content-span-12">
          <div className="error-banner">{rolesError}</div>
        </div>
      ) : null}

      <div className="content-span-12 list-detail-layout">
        <article className="card table-card selection-panel">
          <div className="table-toolbar">
            <div>
              <h3 className="table-toolbar-title">User directory</h3>
              <p className="table-toolbar-copy">
                {onlySeededAdminExists
                  ? 'Only the seeded admin exists. Create your first team user.'
                  : 'Select a user to edit details, reset password, or change status.'}
              </p>
            </div>
            <div className="table-toolbar-actions">
              <span className="table-secondary">{users.length} total users</span>
            </div>
          </div>

          {users.length === 0 ? (
            <EmptyState
              title="No managed users yet"
              message="Create the first team user to move beyond the seeded admin account."
              action={canCreateUser ? (
                <button type="button" className="primary-button" onClick={openCreateMode}>
                  Create user
                </button>
              ) : null}
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'User',
                  render: (user) => (
                    <div className="user-name-cell">
                      <strong>{user.name}</strong>
                      <span className="table-secondary">@{user.username ?? 'unassigned'} • {user.email}</span>
                    </div>
                  ),
                },
                {
                  key: 'username',
                  header: 'Username',
                  render: (user) => user.username ? `@${user.username}` : 'Not set',
                },
                {
                  key: 'role',
                  header: 'Role',
                  render: (user) => user.role.name,
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (user) => <StatusBadge status={user.status} />,
                  width: '120px',
                },
                {
                  key: 'mobile',
                  header: 'Mobile',
                  render: (user) => user.mobile || 'Not set',
                },
                {
                  key: 'lastLoginAt',
                  header: 'Last login',
                  render: (user) => user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never',
                },
              ]}
              data={users}
              keyExtractor={(user) => user.id}
              onRowClick={(user) => setSelectedUserId(user.id)}
            />
          )}
        </article>

        <aside className="detail-panel">
          <article className="card detail-card">
            <div className="table-toolbar">
              <div>
                <h3 className="table-toolbar-title">User details</h3>
                <p className="table-toolbar-copy">
                  Edit mode is separate from create mode so the seeded admin never blocks adding another user.
                </p>
              </div>
            </div>

            {selectedUser ? (
              <>
                <div className="detail-grid">
                  <div>
                    <p className="detail-label">Email</p>
                    <p className="detail-value">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="detail-label">Username</p>
                    <p className="detail-value">{selectedUser.username ? `@${selectedUser.username}` : 'Not set'}</p>
                  </div>
                  <div>
                    <p className="detail-label">Status</p>
                    <StatusBadge status={selectedUser.status} />
                  </div>
                  <div>
                    <p className="detail-label">Role</p>
                    <p className="detail-value">{selectedUser.role.name}</p>
                  </div>
                  <div>
                    <p className="detail-label">Last login</p>
                    <p className="detail-value">{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString() : 'Never'}</p>
                  </div>
                </div>

                <FormSection title="Edit user" description="Update the selected user without affecting create mode.">
                  <div className="form-grid">
                    <label>
                      <span>Name</span>
                      <input
                        value={editForm.name}
                        onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                        disabled={!canUpdateUser}
                      />
                    </label>
                    <label>
                      <span>Username</span>
                      <input
                        value={editForm.username}
                        onChange={(event) => setEditForm((current) => ({ ...current, username: event.target.value }))}
                        disabled={!canUpdateUser}
                      />
                    </label>
                    <label>
                      <span>Mobile</span>
                      <input
                        value={editForm.mobile}
                        onChange={(event) => setEditForm((current) => ({ ...current, mobile: event.target.value }))}
                        disabled={!canUpdateUser}
                      />
                    </label>
                    <label>
                      <span>Role</span>
                      <select
                        value={editForm.roleId}
                        onChange={(event) => setEditForm((current) => ({ ...current, roleId: event.target.value }))}
                        disabled={!canUpdateUser || roles.length === 0}
                      >
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Status</span>
                      <select
                        value={editForm.status}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            status: event.target.value as UserFormState['status'],
                          }))
                        }
                        disabled={!canUpdateUser}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="SUSPENDED">Suspended</option>
                      </select>
                    </label>
                  </div>
                  {canUpdateUser ? (
                    <div className="button-row">
                      <button type="button" className="primary-button" onClick={() => void handleUpdateUser()} disabled={isSavingEdit || roles.length === 0}>
                        {isSavingEdit ? 'Saving...' : 'Update user'}
                      </button>
                    </div>
                  ) : null}
                </FormSection>

                <FormSection title="Access actions" description="Password reset and status changes stay separate from record editing.">
                  {editError ? <div className="error-banner">{editError}</div> : null}

                  {canManageStatus ? (
                    <div className="button-row wrap-row">
                      <button type="button" className="secondary-button" onClick={() => setStatusTarget('ACTIVE')}>
                        Mark active
                      </button>
                      <button type="button" className="secondary-button" onClick={() => setStatusTarget('INACTIVE')}>
                        Mark inactive
                      </button>
                      <button type="button" className="danger-button" onClick={() => setStatusTarget('SUSPENDED')}>
                        Suspend user
                      </button>
                    </div>
                  ) : null}

                  {canUpdateUser ? (
                    <div className="stack-form">
                      <label>
                        <span>Reset password</span>
                        <input
                          type="password"
                          value={passwordReset}
                          onChange={(event) => setPasswordReset(event.target.value)}
                          placeholder="Enter a new password"
                        />
                      </label>
                      <div className="button-row">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => void handlePasswordReset()}
                          disabled={isSavingPassword || passwordReset.length < 8}
                        >
                          {isSavingPassword ? 'Updating password...' : 'Reset password'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </FormSection>
              </>
            ) : (
              <EmptyState
                title="Select a user"
                message="Pick a user from the directory to review details, update role/status, or reset password."
              />
            )}
          </article>
        </aside>
      </div>

      <Modal
        isOpen={isCreateOpen}
        title="Create user"
        description="Add a new team member with an email, password, role, and starting status."
        onClose={closeCreateMode}
        footer={(
          <div className="button-row">
            <button type="button" className="ghost-button" onClick={closeCreateMode}>
              Cancel
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleCreateUser()}
              disabled={isSavingCreate || roles.length === 0}
            >
              {isSavingCreate ? 'Creating...' : 'Create user'}
            </button>
          </div>
        )}
      >
        <div className="stack-form">
          <FormSection title="Identity" description="Email stays editable in create mode and password is required here only.">
            <div className="form-grid">
              <label>
                <span>Name</span>
                <input
                  value={createForm.name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Username</span>
                <input
                  value={createForm.username}
                  onChange={(event) => setCreateForm((current) => ({ ...current, username: event.target.value }))}
                  placeholder="admin"
                  required
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Mobile</span>
                <input
                  value={createForm.mobile}
                  onChange={(event) => setCreateForm((current) => ({ ...current, mobile: event.target.value }))}
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>
            </div>
          </FormSection>

          <FormSection title="Access" description="Choose the starting role and status for the new user.">
            <div className="form-grid">
              <label>
                <span>Role</span>
                <select
                  value={createForm.roleId}
                  onChange={(event) => setCreateForm((current) => ({ ...current, roleId: event.target.value }))}
                  disabled={roles.length === 0}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Status</span>
                <select
                  value={createForm.status}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      status: event.target.value as UserFormState['status'],
                    }))
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </label>
            </div>
          </FormSection>

          {createError ? <div className="error-banner">{createError}</div> : null}
          {!createError && roles.length === 0 ? (
            <div className="info-banner">Role dropdown is unavailable, so create mode is temporarily blocked.</div>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!statusTarget}
        title="Confirm status change"
        description={`Update ${selectedUser?.name ?? 'this user'} to ${statusTarget?.toLowerCase() ?? 'the selected'} status?`}
        confirmLabel="Update status"
        tone={statusTarget === 'SUSPENDED' ? 'danger' : 'default'}
        isConfirming={isSavingEdit}
        onCancel={() => setStatusTarget(null)}
        onConfirm={() => void handleConfirmStatusUpdate()}
      />
    </section>
  );
}
