import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createUser as createUserRequest,
  getRoles,
  getUsers,
  updateUser as updateUserRequest,
  updateUserPassword as updateUserPasswordRequest,
  updateUserStatus as updateUserStatusRequest,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { RoleRecord, UserRecord } from '../types/auth';
import { ApiError } from '../types/api';

type UserFormState = {
  name: string;
  email: string;
  mobile: string;
  password: string;
  roleId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
};

const initialUserFormState: UserFormState = {
  name: '',
  email: '',
  mobile: '',
  password: '',
  roleId: '',
  status: 'ACTIVE',
};

export function UsersPage() {
  const auth = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(initialUserFormState);
  const [passwordReset, setPasswordReset] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  useEffect(() => {
    const load = async () => {
      if (!auth.accessToken) {
        return;
      }

      setIsLoading(true);
      setError(null);
      setRolesError(null);

      try {
        const usersResponse = await getUsers(auth.accessToken);

        setUsers(usersResponse.data);

        if (usersResponse.data.length > 0) {
          const firstUser = usersResponse.data[0];
          setSelectedUserId(firstUser.id);
          setUserForm({
            name: firstUser.name,
            email: firstUser.email,
            mobile: firstUser.mobile ?? '',
            password: '',
            roleId: firstUser.role.id,
            status: firstUser.status,
          });
        }

        if (auth.hasAnyPermission(['role_view', 'user_create', 'user_update'])) {
          try {
            const rolesResponse = await getRoles(auth.accessToken);
            setRoles(rolesResponse.data);

            if (rolesResponse.data.length > 0) {
              setUserForm((current) => ({
                ...current,
                roleId: current.roleId || rolesResponse.data[0].id,
              }));
            }
          } catch (caughtError) {
            if (caughtError instanceof ApiError) {
              setRolesError(caughtError.message);
            } else {
              setRolesError('Failed to load available roles.');
            }
          }
        }
      } catch (caughtError) {
        if (caughtError instanceof ApiError) {
          setError(caughtError.message);
        } else {
          setError('Failed to load users and roles.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [auth.accessToken]);

  useEffect(() => {
    if (!selectedUser) {
      return;
    }

    setUserForm({
      name: selectedUser.name,
      email: selectedUser.email,
      mobile: selectedUser.mobile ?? '',
      password: '',
      roleId: selectedUser.role.id,
      status: selectedUser.status,
    });
    setPasswordReset('');
    setMessage(null);
  }, [selectedUser]);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!auth.accessToken) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await createUserRequest(auth.accessToken, userForm);
      setUsers((currentUsers) => [...currentUsers, response.data]);
      setSelectedUserId(response.data.id);
      setMessage('User created successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        setError('Failed to create user.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateUser() {
    if (!auth.accessToken || !selectedUserId) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await updateUserRequest(auth.accessToken, selectedUserId, {
        name: userForm.name,
        mobile: userForm.mobile,
        roleId: userForm.roleId,
        status: userForm.status,
      });
      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === selectedUserId ? response.data : user)),
      );
      setMessage('User updated successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        setError('Failed to update user.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusUpdate(status: UserFormState['status']) {
    if (!auth.accessToken || !selectedUserId) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await updateUserStatusRequest(auth.accessToken, selectedUserId, status);
      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === selectedUserId ? response.data : user)),
      );
      setUserForm((current) => ({ ...current, status: response.data.status }));
      setMessage('User status updated successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        setError('Failed to update user status.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePasswordReset() {
    if (!auth.accessToken || !selectedUserId || !passwordReset) {
      return;
    }

    setIsSavingPassword(true);
    setError(null);
    setMessage(null);

    try {
      await updateUserPasswordRequest(auth.accessToken, selectedUserId, passwordReset);
      setPasswordReset('');
      setMessage('User password updated successfully.');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        setError('Failed to update password.');
      }
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (isLoading) {
    return <div className="centered-state">Loading users and roles...</div>;
  }

  if (error && users.length === 0) {
    return <div className="error-banner">{error}</div>;
  }

  return (
    <section className="page-grid roles-grid">
      <article className="card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Users</p>
            <h3>Access roster</h3>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="empty-state">No users found yet. Create the first managed user to continue.</div>
        ) : (
          <div className="role-list">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                className={`role-card${user.id === selectedUserId ? ' role-card-active' : ''}`}
                onClick={() => setSelectedUserId(user.id)}
              >
                <strong>{user.name}</strong>
                <span>{user.email}</span>
                <small>{user.role.name} | {user.status}</small>
              </button>
            ))}
          </div>
        )}
      </article>

      <article className="card">
        <div className="section-header">
          <div>
            <p className="eyebrow">User editor</p>
            <h3>{selectedUser?.name ?? 'Create user'}</h3>
          </div>
        </div>

        <form className="stack-form" onSubmit={handleCreateUser}>
          <label>
            <span>Name</span>
            <input
              value={userForm.name}
              onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </label>

          <label>
            <span>Email</span>
            <input
              type="email"
              value={userForm.email}
              onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
              required
              disabled={!!selectedUser}
            />
          </label>

          <label>
            <span>Mobile</span>
            <input
              value={userForm.mobile}
              onChange={(event) => setUserForm((current) => ({ ...current, mobile: event.target.value }))}
            />
          </label>

          {!selectedUser ? (
            <label>
              <span>Password</span>
              <input
                type="password"
                value={userForm.password}
                onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </label>
          ) : null}

          <label>
            <span>Role</span>
            <select
              value={userForm.roleId}
              onChange={(event) => setUserForm((current) => ({ ...current, roleId: event.target.value }))}
              disabled={roles.length === 0}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          {rolesError ? <div className="error-banner">{rolesError}</div> : null}
          {!rolesError && roles.length === 0 && auth.hasAnyPermission(['user_create', 'user_update']) ? (
            <div className="empty-state">Role options are unavailable for this account right now.</div>
          ) : null}

          <label>
            <span>Status</span>
            <select
              value={userForm.status}
              onChange={(event) =>
                setUserForm((current) => ({
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

          {error ? <div className="error-banner">{error}</div> : null}
          {message ? <div className="success-banner">{message}</div> : null}

          <div className="button-row">
            {auth.hasPermission('user_create') ? (
              <button type="submit" className="primary-button" disabled={isSaving || roles.length === 0}>
                {isSaving ? 'Saving...' : 'Create user'}
              </button>
            ) : null}

            {selectedUser && auth.hasPermission('user_update') ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleUpdateUser()}
                disabled={isSaving || roles.length === 0}
              >
                {isSaving ? 'Updating...' : 'Update user'}
              </button>
            ) : null}
          </div>
        </form>
      </article>

      <article className="card wide-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Status and password</p>
            <h3>{selectedUser?.email ?? 'Select a user'}</h3>
          </div>
        </div>

        {selectedUser ? (
          <div className="stack-form">
            <div className="button-row wrap-row">
              {auth.hasAnyPermission(['user_delete', 'user_deactivate']) ? (
                <>
                  <button type="button" className="secondary-button" onClick={() => void handleStatusUpdate('ACTIVE')}>
                    Mark active
                  </button>
                  <button type="button" className="secondary-button" onClick={() => void handleStatusUpdate('INACTIVE')}>
                    Mark inactive
                  </button>
                  <button type="button" className="secondary-button" onClick={() => void handleStatusUpdate('SUSPENDED')}>
                    Suspend user
                  </button>
                </>
              ) : null}
            </div>

            {auth.hasPermission('user_update') ? (
              <>
                <label>
                  <span>Reset password</span>
                  <input
                    type="password"
                    value={passwordReset}
                    onChange={(event) => setPasswordReset(event.target.value)}
                    placeholder="Enter a new password"
                  />
                </label>
                <button type="button" className="primary-button" onClick={() => void handlePasswordReset()} disabled={isSavingPassword || passwordReset.length < 8}>
                  {isSavingPassword ? 'Updating password...' : 'Update password'}
                </button>
              </>
            ) : null}
          </div>
        ) : (
          <div className="empty-state">Select a user to change status or reset password.</div>
        )}
      </article>
    </section>
  );
}
