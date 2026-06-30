import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { FormSection } from '../components/FormSection';
import { navigationItems } from '../config/navigation';
import { getMyAccessSummary } from '../services/api';
import type { MyAccessSummary, UserActivityRecord, ProfileLinkRecord } from '../types/auth';

function formatDate(d: string | null | undefined) {
  if (!d) return 'Never';
  return new Date(d).toLocaleString();
}

export function MyAccessPage() {
  const auth = useAuth();
  const [summary, setSummary] = useState<MyAccessSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getMyAccessSummary(auth.accessToken);
      setSummary(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load access data.');
    }
    setIsLoading(false);
  };

  useEffect(() => { void loadData(); }, [auth.accessToken]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const { visibleMenus, hiddenMenus } = useMemo(() => {
    if (!summary) return { visibleMenus: [], hiddenMenus: [] as typeof navigationItems };
    const visible: typeof navigationItems = [];
    const hidden: typeof navigationItems = [];
    for (const item of navigationItems) {
      if (item.permissionKeys.length === 0 || item.permissionKeys.some(k => summary.effectivePermissions.includes(k))) {
        visible.push(item);
      } else {
        hidden.push(item);
      }
    }
    return { visibleMenus: visible, hiddenMenus: hidden };
  }, [summary]);

  if (isLoading && !summary) return <LoadingState message="Loading your access information..." />;
  if (error && !summary) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Access"
        title="My Access"
        description="Your current permissions, scopes, and visible menus."
      />
      <div className="button-row" style={{ marginBottom: '1rem' }}>
        <button type="button" className="primary-button" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? 'Refreshing...' : 'Refresh access'}
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {/* My Account */}
        <article className="card">
          <FormSection title="My Account" description="Your identity and role on this platform.">
            <div className="detail-grid">
              <div>
                <p className="detail-label">Name</p>
                <p className="detail-value">{summary?.user.name ?? auth.user?.name}</p>
              </div>
              <div>
                <p className="detail-label">Email</p>
                <p className="detail-value">{summary?.user.email ?? auth.user?.email}</p>
              </div>
              <div>
                <p className="detail-label">Username</p>
                <p className="detail-value">@{summary?.user.username ?? auth.user?.username ?? 'unset'}</p>
              </div>
              <div>
                <p className="detail-label">Status</p>
                <StatusBadge status={(summary?.user.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') ?? auth.user?.status ?? 'ACTIVE'} />
              </div>
            </div>
          </FormSection>
        </article>

        {/* My Role */}
        <article className="card">
          <FormSection title="My Role" description="The role assigned to your account.">
            <div className="detail-grid">
              <div>
                <p className="detail-label">Role</p>
                <p className="detail-value">{summary?.role.name ?? auth.user?.role.name}</p>
              </div>
              <div>
                <p className="detail-label">Role key</p>
                <p className="detail-value">{summary?.role.key ?? auth.user?.role.key}</p>
              </div>
            </div>
          </FormSection>
        </article>

        {/* Effective Permissions */}
        <article className="card">
          <FormSection title="My Effective Permissions" description={`${summary?.effectivePermissions.length ?? 0} effective permission(s).`}>
            {auth.user?.role.key === 'super_admin' && (
              <div className="info-banner">You have super_admin access — all permissions are granted.</div>
            )}
            {summary && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <h4>Role permissions ({summary.rolePermissions.length})</h4>
                  <ul style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.85rem' }}>
                    {summary.rolePermissions.map(p => <li key={p}>{p}</li>)}
                  </ul>
                </div>
                <div>
                  <h4>ALLOW overrides ({summary.userAllowedPermissions.length})</h4>
                  <ul style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.85rem' }}>
                    {summary.userAllowedPermissions.map(p => <li key={p}>{p}</li>)}
                  </ul>
                </div>
                <div>
                  <h4>DENY overrides ({summary.userDeniedPermissions.length})</h4>
                  <ul style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.85rem' }}>
                    {summary.userDeniedPermissions.map(p => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {summary && (
              <>
                <hr />
                <h4>Full effective list</h4>
                <div style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '0.85rem', columns: '3 200px' }}>
                  {summary.effectivePermissions.map(p => <div key={p}>{p}</div>)}
                </div>
              </>
            )}
          </FormSection>
        </article>

        {/* Data Scopes */}
        <article className="card">
          <FormSection title="My Data Scopes" description={`${summary?.dataScopes.length ?? 0} scope(s) assigned.`}>
            {(!summary || summary.dataScopes.length === 0) ? (
              <p>No data scopes assigned. You can only access your own records.</p>
            ) : (
              <ul>
                {summary.dataScopes.map(s => (
                  <li key={s.id}>
                    <strong>{s.scopeType}</strong>
                    {s.scopeId ? ` / ${s.scopeId}` : ' (all)'}
                    {' — '}
                    {s.accessLevel}
                    {s.expiresAt && new Date(s.expiresAt) < new Date() ? (
                      <span style={{ color: 'var(--color-danger)' }}> (expired)</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </FormSection>
        </article>

        {/* Profile Links */}
        <article className="card">
          <FormSection title="My Profile Links" description={`${summary?.profileLinks.length ?? 0} linked profile(s).`}>
            {(!summary || summary.profileLinks.length === 0) ? (
              <p>No profiles linked to your account.</p>
            ) : (
              <ul>
                {summary.profileLinks.map((pl: ProfileLinkRecord) => (
                  <li key={pl.id} style={{ padding: '0.25rem 0' }}>
                    <strong>{pl.profileType}</strong>
                    {' — '}
                    {pl.profileId}
                    {pl.isPrimary && <span style={{ color: 'var(--color-primary)' }}> (primary)</span>}
                    {' '}
                    <StatusBadge status={pl.status as 'ACTIVE' | 'INACTIVE' | 'REVOKED'} />
                    {pl.linkedBy && <span className="table-secondary"> by {pl.linkedBy.name}</span>}
                  </li>
                ))}
              </ul>
            )}
            {summary?.primaryDriverProfile && (
              <div style={{ marginTop: '1rem' }}>
                <h4>Primary Driver Profile</h4>
                <div className="detail-grid">
                  <div>
                    <p className="detail-label">Name</p>
                    <p className="detail-value">{summary.primaryDriverProfile.name}</p>
                  </div>
                  <div>
                    <p className="detail-label">Mobile</p>
                    <p className="detail-value">{summary.primaryDriverProfile.mobile}</p>
                  </div>
                  <div>
                    <p className="detail-label">Status</p>
                    <StatusBadge status={summary.primaryDriverProfile.status as 'AVAILABLE' | 'ON_TRIP' | 'ON_LEAVE' | 'SUSPENDED' | 'INACTIVE'} />
                  </div>
                </div>
              </div>
            )}
            {summary?.profileTypes && summary.profileTypes.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <p className="detail-label">Linked profile types: {summary.profileTypes.join(', ')}</p>
              </div>
            )}
            {summary?.profileTypes.includes('DRIVER') || summary?.primaryDriverProfile ? (
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link to="/driver-portal" className="primary-button" style={{ textDecoration: 'none' }}>
                  Open Driver Portal
                </Link>
              </div>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                <p className="detail-label" style={{ color: 'var(--color-text-tertiary)' }}>No linked driver profile</p>
              </div>
            )}
          </FormSection>
        </article>

        {/* Recent Activity */}
        <article className="card">
          <FormSection title="Recent Activity" description={`${summary?.recentActivity.length ?? 0} recent event(s).`}>
            {(!summary || summary.recentActivity.length === 0) ? (
              <p>No recent activity recorded.</p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {summary.recentActivity.map((a: UserActivityRecord) => (
                  <div key={a.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{a.action}</strong>
                      <span className="table-secondary">{formatDate(a.createdAt)}</span>
                    </div>
                    <div className="table-secondary">
                      entityType: {a.entityType} | entityId: {a.entityId || '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </FormSection>
        </article>

        {/* Menus */}
        <article className="card">
          <FormSection title="My Visible Menus" description={`${visibleMenus.length} menu(s) you can see.`}>
            <ul>
              {visibleMenus.map(item => (
                <li key={item.path} style={{ padding: '0.25rem 0' }}>
                  <strong>{item.label}</strong> <span className="table-secondary">→ {item.path}</span>
                </li>
              ))}
            </ul>
          </FormSection>

          {hiddenMenus.length > 0 && (
            <FormSection title="Hidden Menus" description="Menus you cannot access and why.">
              <ul>
                {hiddenMenus.map(item => (
                  <li key={item.path} style={{ padding: '0.5rem 0' }}>
                    <strong>{item.label}</strong> <span className="table-secondary">→ {item.path}</span>
                    <br />
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>
                      Missing permission{item.permissionKeys.length > 1 ? 's' : ''}: {item.permissionKeys.join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="info-banner" style={{ marginTop: '1rem' }}>
                Scope-based menu checks are pending Phase 3.
              </div>
            </FormSection>
          )}
        </article>
      </div>
    </section>
  );
}
