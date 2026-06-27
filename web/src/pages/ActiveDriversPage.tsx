import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { API_BASE_URL } from '../config/api';

type DriverOperationSummary = {
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
};

function getStatusColor(label: string): string {
  const map: Record<string, string> = {
    AVAILABLE: '#4caf50', ON_TRIP: '#2196f3', ON_LEAVE: '#ff9800', SUSPENDED: '#f44336', INACTIVE: '#9e9e9e',
    NO_ACCOUNT: '#f44336', NO_VEHICLE: '#ff9800', OFFLINE: '#9e9e9e',
  };
  return map[label] ?? '#9e9e9e';
}

type FilterState = { hasAccount: boolean | null; hasVehicle: boolean | null; hasActiveTrip: boolean | null; missingVehicle: boolean | null };

export function ActiveDriversPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<DriverOperationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ hasAccount: null, hasVehicle: null, hasActiveTrip: null, missingVehicle: null });

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/drivers/active-operations`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load');
      setDrivers(data.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setIsLoading(false); }
  }, [auth.accessToken]);

  useEffect(() => { void load(); }, [load]);

  const filtered = drivers.filter((d) => {
    if (filters.hasAccount === true && !d.linkedAccount) return false;
    if (filters.hasAccount === false && d.linkedAccount) return false;
    if (filters.hasVehicle === true && !d.currentVehicle) return false;
    if (filters.hasVehicle === false && d.currentVehicle) return false;
    if (filters.hasActiveTrip === true && !d.activeTrip) return false;
    if (filters.hasActiveTrip === false && d.activeTrip) return false;
    if (filters.missingVehicle === true && d.currentVehicle) return false;
    if (filters.missingVehicle === false && !d.currentVehicle) return false;
    return true;
  });

  return (
    <section className="page-content">
      <div className="section-header">
        <div><PageHeader title="Active Drivers" description="Monitor driver operations, assignments, and recent activity." /></div>
        <div className="action-panel"><button type="button" className="secondary-button" onClick={load}>Refresh</button></div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginRight: '8px' }}>Filters:</span>
          {([['hasAccount', 'Has Account'], ['hasVehicle', 'Has Vehicle'], ['hasActiveTrip', 'Active Trip'], ['missingVehicle', 'Missing Vehicle']] as const).map(([key, label]) => (
            <button key={key} type="button" className={`ghost-button${filters[key] === true ? ' primary-button' : ''}`} style={{ fontSize: '12px' }}
              onClick={() => setFilters(f => ({ ...f, [key]: f[key] === true ? null : true }))}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <LoadingSkeleton rows={5} columns={4} /> : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {filtered.length === 0 ? <div className="empty-state-panel"><p>No drivers found.</p></div> : filtered.map((d) => (
            <div key={d.id} className="card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{d.name}</span>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(d.statusLabel) }} />
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{d.statusLabel}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span>Account: {d.linkedAccount ? `${d.linkedAccount.username} (${d.linkedAccount.status})` : 'None'}</span>
                    <span>Vehicle: {d.currentVehicle ? d.currentVehicle.vehicleNumber : 'None'}</span>
                    <span>Trip: {d.activeTrip ? d.activeTrip.tripNumber : 'None'}</span>
                    <span>Permissions: {d.effectivePermissionsCount}</span>
                    <span>Today: {d.todayStats.trips} trips, {d.todayStats.fuel} fuel, {d.todayStats.expenses} expenses</span>
                  </div>
                  {d.recentAction && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      Last action: {d.recentAction.action} at {new Date(d.recentAction.at).toLocaleString()}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="ghost-button" style={{ fontSize: '12px' }} onClick={() => navigate(`/drivers/${d.id}`)}>Detail</button>
                  {d.currentVehicle && <button type="button" className="ghost-button" style={{ fontSize: '12px' }} onClick={() => navigate(`/vehicles/${d.currentVehicle!.id}`)}>Vehicle</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
