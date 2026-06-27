import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCurrentUser } from '../../services/api';
import { PageShell } from '../../components/ui/PageShell';

const CAPABILITY_EXPLANATIONS: Record<string, string> = {
  driver_trip_create: 'Create Trip requires driver_trip_create',
  driver_quick_fuel_create: 'Quick Fuel Entry requires driver_quick_fuel_create',
  driver_fuel_receipt_upload: 'Upload Fuel Bill requires driver_fuel_receipt_upload',
  driver_assigned_vehicle_view: 'My Vehicle requires driver_assigned_vehicle_view. Vehicle must be assigned by admin before My Vehicle shows data.',
  driver_trip_view: 'View Trip Details requires driver_trip_view',
  driver_trip_start: 'Start Trip requires driver_trip_start',
  driver_trip_end: 'End Trip requires driver_trip_end',
  driver_trip_cancel: 'Cancel Trip requires driver_trip_cancel',
  driver_pod_upload: 'Upload POD requires driver_pod_upload',
  driver_lr_upload: 'Upload LR requires driver_lr_upload',
  driver_challan_upload: 'Upload Challan requires driver_challan_upload',
  driver_eway_bill_upload: 'Upload E-Way Bill requires driver_eway_bill_upload',
  driver_trip_document_upload: 'Upload Trip Document requires driver_trip_document_upload',
  driver_fuel_view_own: 'View Fuel Entries requires driver_fuel_view_own',
  driver_expense_create: 'Create Expense requires driver_expense_create',
  driver_expense_view_own: 'View Expenses requires driver_expense_view_own',
  driver_expense_receipt_upload: 'Upload Expense Receipt requires driver_expense_receipt_upload',
  driver_vehicle_inspection_create: 'Vehicle Inspection requires driver_vehicle_inspection_create',
  driver_vehicle_issue_report: 'Report Vehicle Issue requires driver_vehicle_issue_report',
  driver_maintenance_report_create: 'Report Maintenance requires driver_maintenance_report_create',
  driver_repair_report_create: 'Report Repair requires driver_repair_report_create',
};

const COMMON_DRIVER_PERMISSIONS = [
  'driver_portal_view', 'driver_my_dashboard_view', 'driver_my_trips_view',
  'driver_my_documents_view', 'driver_my_profile_view',
];

type EffectivePermissionsResult = {
  rolePermissions: string[];
  userAllowedPermissions: string[];
  userDeniedPermissions: string[];
  effectivePermissions: string[];
};

export function MyPermissionsPage() {
  const auth = useAuth();
  const [permissions, setPermissions] = useState<EffectivePermissionsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    try {
      const res = await getCurrentUser(auth.accessToken);
      const perms = res.data.permissions;
      setPermissions({
        rolePermissions: perms,
        userAllowedPermissions: [],
        userDeniedPermissions: [],
        effectivePermissions: perms,
      });
      setLastRefreshed(new Date());
    } catch {
      setPermissions(null);
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

  const effectiveKeys = permissions?.effectivePermissions ?? auth.permissions;
  const missingCommon = COMMON_DRIVER_PERMISSIONS.filter(p => !effectiveKeys.includes(p));

  return (
    <PageShell>
      <h2 style={{ margin: '0 0 var(--space-4)' }}>My Permissions</h2>

      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="section-header">
          <div>
            <h3 className="chart-card-title">Permission Summary</h3>
            <p className="chart-card-subtitle">Your effective permissions for the driver portal</p>
          </div>
          <div className="action-panel">
            <button type="button" className="primary-button" onClick={handleRefresh}>Refresh Permissions</button>
          </div>
        </div>
        <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
          <div className="detail-grid">
            <div><p className="detail-label">Role</p><p className="detail-value">{auth.user?.role?.name ?? 'N/A'}</p></div>
            <div><p className="detail-label">Linked Driver ID</p><p className="detail-value">{auth.user?.linkedDriver?.id ?? 'Not linked'}</p></div>
            <div><p className="detail-label">Linked Driver Name</p><p className="detail-value">{auth.user?.linkedDriver?.name ?? 'N/A'}</p></div>
            <div><p className="detail-label">Account Status</p><p className="detail-value">{auth.user?.status ?? 'N/A'}</p></div>
            <div><p className="detail-label">Last Refreshed</p><p className="detail-value">{lastRefreshed ? lastRefreshed.toLocaleString() : 'Never'}</p></div>
            <div><p className="detail-label">Total Effective Permissions</p><p className="detail-value">{effectiveKeys.length}</p></div>
          </div>
        </div>
      </div>

      {missingCommon.length > 0 && (
        <div className="warning-banner" style={{ marginBottom: 'var(--space-4)' }}>
          <strong>Missing common capabilities:</strong> {missingCommon.join(', ')}. Contact admin to grant these.
        </div>
      )}

      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3 className="chart-card-title" style={{ padding: 'var(--space-4) var(--space-4) 0' }}>Effective Permissions</h3>
        <div style={{ padding: 'var(--space-3) var(--space-4) var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {effectiveKeys.length === 0 ? (
            <p className="muted-copy">No effective permissions found.</p>
          ) : (
            effectiveKeys.map(p => (
              <span key={p} style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', background: 'var(--color-success-bg, #e8f5e9)', color: 'var(--color-success-text, #2e7d32)', border: '1px solid var(--color-success-border, #a5d6a7)' }}>{p}</span>
            ))
          )}
        </div>
      </div>

      {permissions?.userAllowedPermissions && permissions.userAllowedPermissions.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h3 className="chart-card-title" style={{ padding: 'var(--space-4) var(--space-4) 0' }}>Individual Allow Overrides</h3>
          <div style={{ padding: 'var(--space-3) var(--space-4) var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {permissions.userAllowedPermissions.map(p => (
              <span key={p} style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9' }}>{p}</span>
            ))}
          </div>
        </div>
      )}

      {permissions?.userDeniedPermissions && permissions.userDeniedPermissions.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h3 className="chart-card-title" style={{ padding: 'var(--space-4) var(--space-4) 0' }}>Individual Deny Overrides</h3>
          <div style={{ padding: 'var(--space-3) var(--space-4) var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {permissions.userDeniedPermissions.map(p => (
              <span key={p} style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a' }}>{p}</span>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="chart-card-title" style={{ padding: 'var(--space-4) var(--space-4) 0' }}>Permission Explanations</h3>
        <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
          {Object.entries(CAPABILITY_EXPLANATIONS).map(([perm, explanation]) => {
            const has = effectiveKeys.includes(perm);
            return (
              <div key={perm} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: has ? '#4caf50' : '#f44336', flexShrink: 0 }} />
                <code style={{ fontSize: '12px', minWidth: '220px' }}>{perm}</code>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{explanation}</span>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
