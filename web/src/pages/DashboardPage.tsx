import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getHealth } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';

export function DashboardPage() {
  const auth = useAuth();
  const [healthLabel, setHealthLabel] = useState('Checking backend health...');
  const [healthState, setHealthState] = useState<'checking' | 'ok' | 'unavailable'>('checking');

  useEffect(() => {
    const run = async () => {
      try {
        const response = await getHealth();
        setHealthLabel(`API ${response.data.status}, database ${response.data.database}`);
        setHealthState(response.data.database === 'connected' ? 'ok' : 'unavailable');
      } catch {
        setHealthLabel('Backend health check is currently unavailable.');
        setHealthState('unavailable');
      }
    };

    void run();
  }, []);

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Workspace"
        title="Overview"
        description="Current user context, role coverage, and quick checks before access changes."
      />

      <article className="card">
        <div className="dashboard-grid">
          <div className="content-span-5 metric-card">
            <p className="metric-label">Current user</p>
            <p className="metric-value">{auth.user?.name ?? 'Unknown user'}</p>
            <p className="table-secondary">
              {auth.user?.username ? `@${auth.user.username} • ` : ''}
              {auth.user?.email}
            </p>
          </div>
          <div className="content-span-3 metric-card">
            <p className="metric-label">Current role</p>
            <p className="metric-value">{auth.user?.role.name ?? 'No role'}</p>
            <StatusBadge status={auth.user?.role.key === 'super_admin' ? 'SYSTEM' : auth.user?.role.status ?? 'ACTIVE'} />
          </div>
          <div className="content-span-2 metric-card">
            <p className="metric-label">Permissions</p>
            <p className="metric-value">{auth.permissions.length}</p>
            <p className="table-secondary">Active permission keys</p>
          </div>
          <div className="content-span-2 metric-card">
            <p className="metric-label">Backend status</p>
            <p className="metric-value">{healthState === 'ok' ? 'Healthy' : healthState === 'checking' ? 'Checking' : 'Attention'}</p>
            <p className="table-secondary">{healthLabel}</p>
          </div>
        </div>
      </article>

      <article className="card">
        <div className="table-toolbar">
          <div>
            <h3 className="table-toolbar-title">Quick links</h3>
            <p className="table-toolbar-copy">Jump straight into the areas people touch most.</p>
          </div>
        </div>
        <div className="quick-link-grid">
          {auth.hasPermission('user_view') ? (
            <Link className="quick-link-card" to="/users">
              <strong>Users</strong>
              <span>Create, edit, and review team access</span>
            </Link>
          ) : null}
          {auth.hasPermission('role_view') ? (
            <Link className="quick-link-card" to="/roles">
              <strong>Roles</strong>
              <span>Review system and custom roles</span>
            </Link>
          ) : null}
          {auth.hasAnyPermission(['vehicle_view']) ? (
            <Link className="quick-link-card" to="/vehicles">
              <strong>Vehicles</strong>
              <span>Manage vehicle master data</span>
            </Link>
          ) : null}
          {auth.hasAnyPermission(['trip_view']) ? (
            <Link className="quick-link-card" to="/trips">
              <strong>Trips</strong>
              <span>Manage trips and transfers</span>
            </Link>
          ) : null}
        </div>
      </article>

      <article className="card">
        <div className="table-toolbar">
          <div>
            <h3 className="table-toolbar-title">Session detail</h3>
            <p className="table-toolbar-copy">Useful context before you change users or roles.</p>
          </div>
        </div>
        <div className="detail-grid">
          <div>
            <p className="detail-label">Authentication</p>
            <p className="detail-value">{auth.accessToken ? 'Authenticated' : 'Signed out'}</p>
          </div>
          <div>
            <p className="detail-label">Username</p>
            <p className="detail-value">{auth.user?.username ? `@${auth.user.username}` : 'Not set'}</p>
          </div>
          <div>
            <p className="detail-label">Mobile</p>
            <p className="detail-value">{auth.user?.mobile || 'Not set'}</p>
          </div>
          <div>
            <p className="detail-label">Role key</p>
            <p className="detail-value">{auth.user?.role.key}</p>
          </div>
          <div>
            <p className="detail-label">Route protection</p>
            <p className="detail-value">Permission-enforced</p>
          </div>
        </div>
      </article>

      {auth.permissions.length === 0 ? (
        <EmptyState
          title="This account has no active permissions"
          message="Check role assignments before trying to manage any secured area."
        />
      ) : null}
    </section>
  );
}
