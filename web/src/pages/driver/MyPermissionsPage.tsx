import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getEffectivePermissions } from '../../services/api';
import { PageShell } from '../../components/ui/PageShell';
import { DRIVER_CAPABILITIES, DRIVER_CAPABILITY_GROUPS } from '../../config/driverCapabilities';

type EffectivePermissionsResult = {
  rolePermissions: string[];
  userAllowedPermissions: string[];
  userDeniedPermissions: string[];
  effectivePermissions: string[];
};

type CapabilityStatus = {
  id: string;
  label: string;
  permission: string;
  group: string;
  enabled: boolean;
  source: 'role' | 'allow' | 'denied' | 'missing';
  reason: string;
};

function buildCapabilityStatuses(data: EffectivePermissionsResult): CapabilityStatus[] {
  const roleSet = new Set(data.rolePermissions);
  const allowSet = new Set(data.userAllowedPermissions);
  const denySet = new Set(data.userDeniedPermissions);
  const effectiveSet = new Set(data.effectivePermissions);

  return DRIVER_CAPABILITIES.map((cap) => {
    const inRole = roleSet.has(cap.permission);
    const inAllow = allowSet.has(cap.permission);
    const inDeny = denySet.has(cap.permission);
    const isEnabled = effectiveSet.has(cap.permission);

    let source: CapabilityStatus['source'] = 'missing';
    let reason = 'Not granted. Ask admin to assign this permission.';

    if (inDeny) {
      source = 'denied';
      reason = 'Blocked by individual deny override.';
    } else if (inAllow) {
      source = 'allow';
      reason = 'Granted by individual allow override.';
    } else if (inRole) {
      source = 'role';
      reason = 'Granted by role permissions.';
    } else if (isEnabled) {
      source = 'allow';
      reason = 'Granted by override.';
    }

    return { id: cap.id, label: cap.label, permission: cap.permission, group: cap.group, enabled: isEnabled, source, reason };
  });
}

export function MyPermissionsPage() {
  const auth = useAuth();
  const [data, setData] = useState<EffectivePermissionsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    try {
      const res = await getEffectivePermissions(auth.accessToken);
      setData(res.data);
      setLastRefreshed(new Date());
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [auth.accessToken]);

  useEffect(() => { void load(); }, [load]);

  const handleRefresh = async () => {
    await auth.refreshCurrentUser();
    await load();
  };

  if (isLoading) return <PageShell><div className="centered-state">Loading permissions...</div></PageShell>;

  const capabilities = data ? buildCapabilityStatuses(data) : [];
  const enabledCount = capabilities.filter((c) => c.enabled).length;
  const missingRequired = capabilities.filter((c) => !c.enabled && ['driver_trip_create', 'driver_assigned_vehicle_view', 'driver_quick_fuel_create', 'driver_fuel_receipt_upload', 'driver_expense_create'].includes(c.permission));

  return (
    <PageShell>
      <h2 style={{ margin: '0 0 var(--space-4)' }}>My Permissions</h2>

      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="section-header">
          <div>
            <h3 className="chart-card-title">Permission Summary</h3>
            <p className="chart-card-subtitle">{enabledCount} of {capabilities.length} capabilities enabled</p>
          </div>
          <div className="action-panel">
            <button type="button" className="primary-button" onClick={handleRefresh}>Refresh Permissions</button>
          </div>
        </div>
        <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
          <div className="detail-grid">
            <div><p className="detail-label">Role</p><p className="detail-value">{auth.user?.role?.name ?? 'N/A'}</p></div>
            <div><p className="detail-label">Linked Driver</p><p className="detail-value">{auth.user?.linkedDriver?.name ?? 'Not linked'}</p></div>
            <div><p className="detail-label">Account Status</p><p className="detail-value">{auth.user?.status ?? 'N/A'}</p></div>
            <div><p className="detail-label">Last Refreshed</p><p className="detail-value">{lastRefreshed ? lastRefreshed.toLocaleString() : 'Never'}</p></div>
          </div>
        </div>
      </div>

      {data && (
        <>
          {data.userAllowedPermissions.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
              <h4 className="role-edit-h4" style={{ padding: 'var(--space-3) var(--space-4)' }}>Individual Allow Overrides</h4>
              <div style={{ padding: '0 var(--space-4) var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {data.userAllowedPermissions.map((p) => (
                  <span key={p} style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9' }}>{p}</span>
                ))}
              </div>
            </div>
          )}
          {data.userDeniedPermissions.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
              <h4 className="role-edit-h4" style={{ padding: 'var(--space-3) var(--space-4)' }}>Individual Deny Overrides</h4>
              <div style={{ padding: '0 var(--space-4) var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {data.userDeniedPermissions.map((p) => (
                  <span key={p} style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a' }}>{p}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {missingRequired.length > 0 && (
        <div className="warning-banner" style={{ marginBottom: 'var(--space-4)' }}>
          <strong>Missing required capabilities:</strong> {missingRequired.map((c) => c.label).join(', ')}. Contact admin to grant these.
        </div>
      )}

      {DRIVER_CAPABILITY_GROUPS.map((group) => {
        const groupCaps = capabilities.filter((c) => c.group === group.key);
        return (
          <div key={group.key} className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <h4 className="role-edit-h4" style={{ padding: 'var(--space-3) var(--space-4)' }}>{group.label}</h4>
            <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
              {groupCaps.map((cap) => (
                <div key={cap.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cap.enabled ? '#4caf50' : cap.source === 'denied' ? '#f44336' : '#ff9800', flexShrink: 0 }} />
                  <span style={{ minWidth: '180px', fontSize: '13px', fontWeight: 500 }}>{cap.label}</span>
                  <code style={{ fontSize: '11px', minWidth: '220px', color: 'var(--color-text-secondary)' }}>{cap.permission}</code>
                  <span style={{ fontSize: '12px', color: cap.enabled ? 'var(--color-success-text, #2e7d32)' : cap.source === 'denied' ? '#c62828' : 'var(--color-text-secondary)' }}>
                    {cap.enabled ? 'Enabled' : cap.source === 'denied' ? 'Denied' : 'Missing'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', flex: 1 }}>{cap.reason}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </PageShell>
  );
}
