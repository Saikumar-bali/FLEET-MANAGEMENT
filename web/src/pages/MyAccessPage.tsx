import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { FormSection } from '../components/FormSection';
import { navigationItems } from '../config/navigation';
import { getMyEffectivePermissions, getUserDataScopes } from '../services/api';
import type { EffectivePermissionsResponse, UserDataScopeRecord } from '../types/auth';

export function MyAccessPage() {
  const auth = useAuth();
  const [effectivePerms, setEffectivePerms] = useState<EffectivePermissionsResponse | null>(null);
  const [dataScopes, setDataScopes] = useState<UserDataScopeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const effRes = await getMyEffectivePermissions(auth.accessToken);
      setEffectivePerms(effRes.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load access data.');
    }
    try {
      const scopesRes = await getUserDataScopes(auth.accessToken, auth.user!.id);
      setDataScopes(scopesRes.data);
    } catch {
      // self-service users may not have user_view permission
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
    if (!effectivePerms) return { visibleMenus: [], hiddenMenus: [] as typeof navigationItems };
    const visible: typeof navigationItems = [];
    const hidden: typeof navigationItems = [];
    for (const item of navigationItems) {
      if (item.permissionKeys.length === 0 || item.permissionKeys.some(k => effectivePerms.effectivePermissions.includes(k))) {
        visible.push(item);
      } else {
        hidden.push(item);
      }
    }
    return { visibleMenus: visible, hiddenMenus: hidden };
  }, [effectivePerms]);

  if (isLoading && !effectivePerms) return <LoadingState message="Loading your access information..." />;
  if (error && !effectivePerms) return <ErrorState message={error} onRetry={loadData} />;

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
                <p className="detail-value">{auth.user?.name}</p>
              </div>
              <div>
                <p className="detail-label">Email</p>
                <p className="detail-value">{auth.user?.email}</p>
              </div>
              <div>
                <p className="detail-label">Username</p>
                <p className="detail-value">@{auth.user?.username ?? 'unset'}</p>
              </div>
              <div>
                <p className="detail-label">Status</p>
                <StatusBadge status={auth.user?.status ?? 'ACTIVE'} />
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
                <p className="detail-value">{auth.user?.role.name}</p>
              </div>
              <div>
                <p className="detail-label">Role key</p>
                <p className="detail-value">{auth.user?.role.key}</p>
              </div>
              <div>
                <p className="detail-label">Role status</p>
                <StatusBadge status={auth.user?.role.status ?? 'ACTIVE'} />
              </div>
            </div>
          </FormSection>
        </article>

        {/* Effective Permissions */}
        <article className="card">
          <FormSection title="My Effective Permissions" description={`${effectivePerms?.effectivePermissions.length ?? 0} effective permission(s).`}>
            {auth.user?.role.key === 'super_admin' && (
              <div className="info-banner">You have super_admin access — all permissions are granted.</div>
            )}
            {effectivePerms && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <h4>Role permissions ({effectivePerms.rolePermissions.length})</h4>
                  <ul style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.85rem' }}>
                    {effectivePerms.rolePermissions.map(p => <li key={p}>{p}</li>)}
                  </ul>
                </div>
                <div>
                  <h4>ALLOW overrides ({effectivePerms.userAllowedPermissions.length})</h4>
                  <ul style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.85rem' }}>
                    {effectivePerms.userAllowedPermissions.map(p => <li key={p}>{p}</li>)}
                  </ul>
                </div>
                <div>
                  <h4>DENY overrides ({effectivePerms.userDeniedPermissions.length})</h4>
                  <ul style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.85rem' }}>
                    {effectivePerms.userDeniedPermissions.map(p => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {effectivePerms && (
              <>
                <hr />
                <h4>Full effective list</h4>
                <div style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '0.85rem', columns: '3 200px' }}>
                  {effectivePerms.effectivePermissions.map(p => <div key={p}>{p}</div>)}
                </div>
              </>
            )}
          </FormSection>
        </article>

        {/* Data Scopes */}
        <article className="card">
          <FormSection title="My Data Scopes" description={`${dataScopes.length} scope(s) assigned.`}>
            {dataScopes.length === 0 ? (
              <p>No data scopes assigned. You can only access your own records.</p>
            ) : (
              <ul>
                {dataScopes.map(s => (
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
            </FormSection>
          )}
        </article>
      </div>
    </section>
  );
}
