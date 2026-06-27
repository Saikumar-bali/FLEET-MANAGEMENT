import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getActiveDrivers } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

type DriverOps = {
  id: string;
  name: string;
  mobile: string;
  status: string;
  statusLabel: string;
  linkedAccount: { id: string; username: string; status: string; lastLoginAt: string | null } | null;
  currentVehicle: { id: string; vehicleNumber: string; vehicleType: string; status: string } | null;
  activeTrip: { id: string; tripNumber: string } | null;
  effectivePermissionsCount: number;
  recentAction: { action: string; at: string } | null;
  todayStats: { trips: number; fuel: number; expenses: number };
  licenseExpiry?: string | null;
  linkedUserLastLogin?: string | null;
};

type FilterKey = 'all' | 'hasAccount' | 'missingAccount' | 'missingVehicle' | 'hasActiveTrip' | 'missingCreateTrip' | 'noRecentLogin';

function getIssues(d: DriverOps): string[] {
  const issues: string[] = [];
  if (!d.linkedAccount) issues.push('No linked account');
  if (!d.currentVehicle) issues.push('No vehicle assigned');
  if (d.effectivePermissionsCount === 0) issues.push('No permissions');
  if (d.linkedAccount && !d.linkedAccount.lastLoginAt) issues.push('No recent login');
  if (d.linkedAccount && d.linkedAccount.status !== 'ACTIVE') issues.push('Account not active');
  return issues;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All Active' },
  { key: 'hasAccount', label: 'Has Account' },
  { key: 'missingAccount', label: 'Missing Account' },
  { key: 'missingVehicle', label: 'Missing Vehicle' },
  { key: 'hasActiveTrip', label: 'Active Trip' },
  { key: 'missingCreateTrip', label: 'No Create Trip' },
  { key: 'noRecentLogin', label: 'No Recent Login' },
];

export function ActiveDriversPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<DriverOps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getActiveDrivers(auth.accessToken);
      setDrivers(res.data);
    } catch (e: any) { setError(e.message || 'Failed to load'); }
    finally { setIsLoading(false); }
  }, [auth.accessToken]);

  useEffect(() => { void load(); }, [load]);

  const filtered = drivers.filter((d) => {
    switch (filter) {
      case 'hasAccount': return !!d.linkedAccount;
      case 'missingAccount': return !d.linkedAccount;
      case 'missingVehicle': return !d.currentVehicle;
      case 'hasActiveTrip': return !!d.activeTrip;
      case 'missingCreateTrip': return !d.linkedAccount || d.effectivePermissionsCount < 5;
      case 'noRecentLogin': return !d.linkedAccount?.lastLoginAt;
      default: return true;
    }
  });

  const totalDrivers = drivers.length;
  const withAccount = drivers.filter((d) => d.linkedAccount).length;
  const withVehicle = drivers.filter((d) => d.currentVehicle).length;
  const withActiveTrip = drivers.filter((d) => d.activeTrip).length;
  const totalTodayTrips = drivers.reduce((s, d) => s + d.todayStats.trips, 0);

  return (
    <section className="page-content">
      <div className="section-header">
        <div><PageHeader title="Active Drivers" description="Operations console for monitoring and managing active drivers." /></div>
        <div className="action-panel">
          <button type="button" className="secondary-button" onClick={load}>Refresh</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}><p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{totalDrivers}</p><p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>Total Active</p></div>
          <div style={{ textAlign: 'center' }}><p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#4caf50' }}>{withAccount}</p><p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>With Account</p></div>
          <div style={{ textAlign: 'center' }}><p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#2196f3' }}>{withVehicle}</p><p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>With Vehicle</p></div>
          <div style={{ textAlign: 'center' }}><p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#ff9800' }}>{withActiveTrip}</p><p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>On Trip</p></div>
          <div style={{ textAlign: 'center' }}><p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{totalTodayTrips}</p><p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>Today Trips</p></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {FILTER_OPTIONS.map((opt) => (
            <button key={opt.key} type="button" className={filter === opt.key ? 'primary-button' : 'ghost-button'} style={{ fontSize: '12px', padding: '4px 12px' }}
              onClick={() => setFilter(opt.key)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {isLoading ? <LoadingSkeleton rows={5} columns={4} /> : (
        <div className="card table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Account</th>
                  <th>Vehicle</th>
                  <th>Trip</th>
                  <th>Permissions</th>
                  <th>Today</th>
                  <th>Last Activity</th>
                  <th>Issues</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>No drivers match this filter.</td></tr>
                ) : filtered.map((d) => {
                  const issues = getIssues(d);
                  return (
                    <tr key={d.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{d.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{d.mobile}</div>
                      </td>
                      <td>
                        {d.linkedAccount ? (
                          <div>
                            <span style={{ fontSize: '12px' }}>@{d.linkedAccount.username}</span>
                            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: d.linkedAccount.status === 'ACTIVE' ? '#4caf50' : '#f44336', marginLeft: '4px' }} />
                          </div>
                        ) : <span style={{ color: '#f44336', fontSize: '12px' }}>None</span>}
                        {d.linkedAccount?.lastLoginAt && <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>Last: {formatRelativeTime(d.linkedAccount.lastLoginAt)}</div>}
                      </td>
                      <td>
                        {d.currentVehicle ? (
                          <span style={{ fontSize: '12px', fontWeight: 500 }}>{d.currentVehicle.vehicleNumber}</span>
                        ) : <span style={{ color: '#ff9800', fontSize: '12px' }}>None</span>}
                      </td>
                      <td>
                        {d.activeTrip ? (
                          <span style={{ fontSize: '12px', color: '#2196f3', fontWeight: 500 }}>{d.activeTrip.tripNumber}</span>
                        ) : <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>—</span>}
                      </td>
                      <td style={{ fontSize: '12px', fontWeight: 600 }}>{d.effectivePermissionsCount}</td>
                      <td style={{ fontSize: '12px' }}>
                        {d.todayStats.trips}t / {d.todayStats.fuel}f / {d.todayStats.expenses}e
                      </td>
                      <td style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        {d.recentAction ? (
                          <span title={d.recentAction.action}>{formatRelativeTime(d.recentAction.at)}</span>
                        ) : '—'}
                      </td>
                      <td>
                        {issues.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                            {issues.map((issue) => (
                              <span key={issue} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: '#fff3e0', color: '#e65100', border: '1px solid #ffe0b2' }}>{issue}</span>
                            ))}
                          </div>
                        ) : <span style={{ fontSize: '11px', color: '#4caf50' }}>OK</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <button type="button" className="ghost-button" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => navigate(`/drivers/${d.id}`)}>Detail</button>
                          {d.currentVehicle && <button type="button" className="ghost-button" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => navigate(`/vehicles/${d.currentVehicle!.id}`)}>Vehicle</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
