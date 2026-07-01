import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { FormSection } from '../components/FormSection';
import { navigationRegistry, getVisibleNavItems } from '../config/navigation';
import { explainMenuVisibility } from '../utils/navigation-visibility';
import { getMyAccessSummary } from '../services/api';
import type { MyAccessSummary, UserActivityRecord, ProfileLinkRecord } from '../types/auth';

const TABS = ['Summary', 'Linked Profiles', 'Visible Menus', 'Hidden Menus', 'Permissions', 'Activity'] as const;

function formatDate(d: string | null | undefined) {
  if (!d) return 'Never';
  return new Date(d).toLocaleString();
}

function PermissionList({ permissions, title }: { permissions: string[]; title: string }) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const filtered = search ? permissions.filter(p => p.toLowerCase().includes(search.toLowerCase())) : permissions;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem' }}>{title} ({permissions.length})</p>
        <button type="button" className="secondary-button" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
      {!collapsed && (
        <>
          <input
            type="text"
            placeholder="Search permissions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.85rem', border: '1px solid var(--color-border)', borderRadius: 4, marginBottom: '0.5rem', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
          />
          <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: '0.8rem', columns: '3 180px' }}>
            {filtered.map(p => <div key={p} style={{ padding: '0.1rem 0' }}>{p}</div>)}
            {filtered.length === 0 && <p style={{ color: 'var(--color-text-tertiary)' }}>No permissions match "{search}"</p>}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryTab({ summary }: { summary: MyAccessSummary }) {
  const isDriver = summary.role.key === 'driver';
  const hasDriverProfile = summary.profileTypes.includes('DRIVER');
  const isAdmin = summary.effectivePermissions.includes('user_view') || summary.effectivePermissions.includes('role_view');
  const totalPerms = summary.effectivePermissions.length;
  const totalScopes = summary.dataScopes.length;
  const totalLinks = summary.profileLinks.length;
  const totalActivity = summary.recentActivity.length;

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
        {[
          { label: 'Effective Permissions', value: totalPerms, color: 'var(--color-accent)' },
          { label: 'Data Scopes', value: totalScopes, color: 'var(--color-success)' },
          { label: 'Profile Links', value: totalLinks, color: 'var(--color-warning)' },
          { label: 'Recent Activity', value: totalActivity, color: 'var(--color-info, #1976d2)' },
        ].map(stat => (
          <article key={stat.label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: stat.color }}>{stat.value}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>{stat.label}</p>
          </article>
        ))}
      </div>

      {/* Account info */}
      <article className="card">
        <div style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Account Overview</h3>
          <div className="detail-grid">
            <div>
              <p className="detail-label">Name</p>
              <p className="detail-value">{summary.user.name}</p>
            </div>
            <div>
              <p className="detail-label">Username</p>
              <p className="detail-value">@{summary.user.username ?? 'unset'}</p>
            </div>
            <div>
              <p className="detail-label">Email</p>
              <p className="detail-value">{summary.user.email}</p>
            </div>
            <div>
              <p className="detail-label">Status</p>
              <StatusBadge status={summary.user.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'} />
            </div>
            <div>
              <p className="detail-label">Role</p>
              <p className="detail-value">{summary.role.name} ({summary.role.key})</p>
            </div>
            <div>
              <p className="detail-label">Profile Types</p>
              <p className="detail-value">{summary.profileTypes.length > 0 ? summary.profileTypes.join(', ') : 'None'}</p>
            </div>
          </div>
        </div>
      </article>

      {/* Driver warning */}
      {isDriver && !hasDriverProfile && (
        <article className="card" style={{ border: '2px solid var(--color-danger)', borderRadius: 8 }}>
          <div style={{ padding: '1rem', backgroundColor: 'var(--color-danger-bg, #fff0f0)', borderRadius: 6 }}>
            <h4 style={{ color: 'var(--color-danger)', marginTop: 0, fontSize: '0.95rem' }}>Driver profile not linked</h4>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              Your account has the <strong>driver</strong> role but no driver profile is linked.
              Driver Portal features will not appear until an administrator links this account to a driver record.
            </p>
            {summary.effectivePermissions.includes('user_view') && (
              <div style={{ marginTop: '0.75rem' }}>
                <Link to="/users" className="primary-button" style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
                  Manage Users
                </Link>
              </div>
            )}
          </div>
        </article>
      )}

      {/* Driver profile info */}
      {summary.primaryDriverProfile && (
        <article className="card">
          <div style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Linked Driver: {summary.primaryDriverProfile.name}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 0.75rem' }}>
              Driver role is active and linked to this driver profile.
            </p>
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
            <div style={{ marginTop: '0.75rem' }}>
              <Link to="/driver-portal" className="primary-button" style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
                Open Driver Portal
              </Link>
            </div>
          </div>
        </article>
      )}

      {isAdmin && (
        <article className="card">
          <div style={{ padding: '1.25rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              You have administrator-level access. Switch to the <strong>Effective Permissions</strong> tab for full technical detail.
            </p>
          </div>
        </article>
      )}
    </div>
  );
}

function LinkedProfilesTab({ summary }: { summary: MyAccessSummary }) {
  return (
    <article className="card">
      <FormSection title="Linked Profiles" description={`${summary.profileLinks.length} profile(s) linked to your account.`}>
        {summary.profileLinks.length === 0 ? (
          <p>No profiles linked to your account.</p>
        ) : (
          <ul>
            {summary.profileLinks.map((pl: ProfileLinkRecord) => (
              <li key={pl.id} style={{ padding: '0.5rem 0' }}>
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
        {summary.profileTypes.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <p className="detail-label">Linked profile types: {summary.profileTypes.join(', ')}</p>
          </div>
        )}
      </FormSection>
    </article>
  );
}

function EffectivePermissionsTab({ summary }: { summary: MyAccessSummary }) {
  const [search, setSearch] = useState('');
  const allPerms = summary.effectivePermissions;
  const filtered = search ? allPerms.filter(p => p.toLowerCase().includes(search.toLowerCase())) : allPerms;

  const userFriendly: Record<string, string> = {
    'trip_view': 'View trips',
    'trip_create': 'Create trips',
    'trip_update': 'Update trips',
    'trip_delete': 'Delete trips',
    'vehicle_view': 'View vehicles',
    'driver_view': 'View drivers',
    'fuel_view': 'View fuel entries',
    'fuel_create': 'Create fuel entries',
    'expense_view': 'View expenses',
    'expense_create': 'Create expenses',
    'maintenance_view': 'View maintenance requests',
    'repair_view': 'View repairs',
    'documents_view': 'View documents',
    'user_view': 'View users',
    'role_view': 'View roles and permissions',
    'finance_view': 'View finance dashboard',
    'driver_portal_view': 'Access Driver Portal',
    'driver_my_trips_view': 'View your trips',
    'driver_my_documents_view': 'View your documents',
    'driver_quick_fuel_create': 'Submit quick fuel entries',
    'driver_expense_create': 'Submit expense claims',
    'driver_fuel_view_own': 'View your fuel entries',
    'driver_expense_view_own': 'View your expenses',
    'driver_document_upload': 'Upload documents',
    'driver_issue_create': 'Report vehicle issues',
    'driver_inspection_create': 'Submit vehicle inspections',
  };

  return (
    <article className="card">
      <FormSection title="Effective Permissions" description={`${allPerms.length} effective permission(s).`}>
        <input
          type="text"
          placeholder="Search permissions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.9rem', border: '1px solid var(--color-border)', borderRadius: 4, marginBottom: '1rem', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
        />
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <p style={{ color: 'var(--color-text-tertiary)' }}>No permissions match "{search}"</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.25rem' }}>
              {filtered.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.5rem', borderRadius: 4, fontSize: '0.85rem' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <code style={{ fontSize: '0.8rem' }}>{p}</code>
                  {userFriendly[p] && <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>— {userFriendly[p]}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </FormSection>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        <div>
          <PermissionList permissions={summary.rolePermissions} title="From Role" />
        </div>
        <div>
          <PermissionList permissions={summary.userAllowedPermissions} title="ALLOW Overrides" />
        </div>
        {summary.userDeniedPermissions.length > 0 && (
          <div>
            <PermissionList permissions={summary.userDeniedPermissions} title="DENY Overrides" />
          </div>
        )}
      </div>
    </article>
  );
}

function VisibleMenusTab({ summary }: { summary: MyAccessSummary }) {
  const hasGlobalAccess = summary.dataScopes.some(s => s.scopeType === 'GLOBAL' && (s.accessLevel === 'MANAGE' || s.accessLevel === 'VIEW'));
  const visibleItems = getVisibleNavItems(summary.role.key, summary.effectivePermissions, summary.profileTypes, !!summary.primaryDriverProfile, hasGlobalAccess);
  return (
    <article className="card">
      <FormSection title="Visible Menus" description={`${visibleItems.length} menu(s) you can see.`}>
        {visibleItems.length === 0 ? (
          <p>No menus visible.</p>
        ) : (
          <ul>
            {visibleItems.map(item => (
              <li key={item.id} style={{ padding: '0.4rem 0' }}>
                <strong>{item.label}</strong> <span className="table-secondary">→ {item.path}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginLeft: '0.5rem' }}>({item.section})</span>
              </li>
            ))}
          </ul>
        )}
      </FormSection>
    </article>
  );
}

function HiddenMenusTab({ summary }: { summary: MyAccessSummary }) {
  const isSuperAdmin = summary.role.key === 'super_admin';
  const hasGlobalAccess = summary.dataScopes.some(s => s.scopeType === 'GLOBAL' && (s.accessLevel === 'MANAGE' || s.accessLevel === 'VIEW'));

  const hiddenItems = useMemo(() => {
    return navigationRegistry
      .map(item => ({
        item,
        result: explainMenuVisibility(item, {
          roleKey: summary.role.key,
          effectivePermissions: summary.effectivePermissions,
          profileTypes: summary.profileTypes,
          hasPrimaryDriverProfile: !!summary.primaryDriverProfile,
          hasGlobalAccess,
        }),
      }))
      .filter(({ result }) => !result.visible);
  }, [summary, hasGlobalAccess]);

  if (isSuperAdmin) {
    return (
      <article className="card">
        <FormSection title="Hidden Menus" description="No menus hidden for super_admin.">
          <p>super_admin role has access to all menus.</p>
        </FormSection>
      </article>
    );
  }

  return (
    <article className="card">
      <FormSection title="Hidden Menus" description={`${hiddenItems.length} menu(s) hidden from you.`}>
        {hiddenItems.length === 0 ? (
          <p>No menus hidden.</p>
        ) : (
          <ul>
            {hiddenItems.map(({ item, result }) => (
              <li key={item.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{item.label}</strong> <span className="table-secondary">→ {item.path}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginLeft: '0.5rem' }}>({item.section})</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-danger)', margin: '0.25rem 0 0' }}>
                  {result.reason}
                </p>
                {result.missingPermissions.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                    Missing: {result.missingPermissions.join(', ')}
                  </div>
                )}
                {result.missingProfileTypes.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    Missing profile type(s): {result.missingProfileTypes.join(', ')}
                  </div>
                )}
                {result.missingPrimaryDriverProfile && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    No active primary DRIVER profile link
                  </div>
                )}
                {result.missingScope && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    Requires global access scope
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </FormSection>
    </article>
  );
}

function RecentActivityTab({ summary }: { summary: MyAccessSummary }) {
  return (
    <article className="card">
      <FormSection title="Recent Activity" description={`${summary.recentActivity.length} recent event(s).`}>
        {summary.recentActivity.length === 0 ? (
          <p>No recent activity recorded.</p>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
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
  );
}

export function MyAccessPage() {
  const auth = useAuth();
  const [summary, setSummary] = useState<MyAccessSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('Summary');

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

  if (isLoading && !summary) return <LoadingState message="Loading your access information..." />;
  if (error && !summary) return <ErrorState message={error} onRetry={loadData} />;
  if (!summary) return null;

  const tabContent: Record<string, JSX.Element> = {
    Summary: <SummaryTab summary={summary} />,
    'Linked Profiles': <LinkedProfilesTab summary={summary} />,
    'Visible Menus': <VisibleMenusTab summary={summary} />,
    'Hidden Menus': <HiddenMenusTab summary={summary} />,
    Permissions: <EffectivePermissionsTab summary={summary} />,
    Activity: <RecentActivityTab summary={summary} />,
  };

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Access"
        title="My Access"
        description="Your permissions, scopes, and visible menus."
      />
      <div className="button-row" style={{ marginBottom: '1rem' }}>
        <button type="button" className="primary-button" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--color-border)', paddingBottom: 0, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab ? 600 : 400,
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
              marginBottom: '-2px',
              background: 'transparent',
              color: activeTab === tab ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {tabContent[activeTab]}
    </section>
  );
}
