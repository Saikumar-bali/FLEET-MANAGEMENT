import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyVehicle } from '../../services/api';
import type { VehicleRecord } from '../../types/auth';
import { PageShell } from '../../components/ui/PageShell';
import { StatusPill } from '../../components/ui/StatusPill';

export function MyVehiclePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<VehicleRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    try { const res = await getMyVehicle(auth.accessToken); setVehicle(res.data); } catch {} finally { setIsLoading(false); }
  }, [auth.accessToken]);

  useEffect(() => { void load(); }, [load]);

  const quickActions = [
    { perm: 'driver_vehicle_inspection_create', label: 'Vehicle Inspection', path: '/my-vehicle/inspection' },
    { perm: 'driver_vehicle_issue_report', label: 'Report Issue', path: '/my-vehicle/report-issue' },
    { perm: 'driver_quick_fuel_create', label: 'Add Fuel', path: '/my-fuel/new' },
  ].filter((a) => auth.hasPermission(a.perm));

  return (
    <PageShell>
      <h2 style={{ margin: '0 0 var(--space-4)' }}>My Vehicle</h2>
      {isLoading ? <div className="centered-state">Loading...</div> : !vehicle ? (
        <div className="card" style={{ maxWidth: '500px' }}>
          <div style={{ padding: 'var(--space-4)' }}>
            <h3 style={{ margin: '0 0 var(--space-2)' }}>No vehicle assigned</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>Ask admin to assign a vehicle from Driver Detail → Assigned Vehicle.</p>
            {auth.user?.linkedDriver && (
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                Driver: {auth.user.linkedDriver.name} | Account: {auth.user.status}
              </div>
            )}
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
              Permissions: {auth.permissions.length} effective. <a href="/my-permissions" style={{ color: 'var(--color-primary)' }}>View My Permissions</a>
            </p>
            <button type="button" className="secondary-button" onClick={() => auth.refreshCurrentUser().then(load)}>Refresh Permissions</button>
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ maxWidth: '600px', marginBottom: 'var(--space-4)' }}>
            <div className="detail-grid">
              <div><p className="detail-label">Vehicle Number</p><p className="detail-value" style={{ fontSize: '1.2rem', fontWeight: 600 }}>{vehicle.vehicleNumber}</p></div>
              <div><p className="detail-label">Type</p><p className="detail-value">{vehicle.vehicleType}</p></div>
              <div><p className="detail-label">Brand</p><p className="detail-value">{vehicle.brand ?? '—'}</p></div>
              <div><p className="detail-label">Model</p><p className="detail-value">{vehicle.model ?? '—'}</p></div>
              <div><p className="detail-label">Fuel Type</p><p className="detail-value">{vehicle.fuelType}</p></div>
              <div><p className="detail-label">Odometer</p><p className="detail-value">{vehicle.currentOdometer.toLocaleString()} km</p></div>
              <div><p className="detail-label">Status</p><StatusPill status={vehicle.status} /></div>
            </div>
          </div>
          {quickActions.length > 0 && (
            <div className="card">
              <h3 className="chart-card-title" style={{ padding: 'var(--space-4) var(--space-4) 0' }}>Quick Actions</h3>
              <div style={{ padding: 'var(--space-3) var(--space-4) var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {quickActions.map((a) => (
                  <button key={a.path} type="button" className="secondary-button" onClick={() => navigate(a.path)}>{a.label}</button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
