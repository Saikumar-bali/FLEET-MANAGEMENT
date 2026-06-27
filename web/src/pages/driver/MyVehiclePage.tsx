import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyVehicle } from '../../services/api';
import type { VehicleRecord } from '../../types/auth';
import { PageShell } from '../../components/ui/PageShell';
import { StatusPill } from '../../components/ui/StatusPill';

export function MyVehiclePage() {
  const auth = useAuth();
  const [vehicle, setVehicle] = useState<VehicleRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    try { const res = await getMyVehicle(auth.accessToken); setVehicle(res.data); } catch {} finally { setIsLoading(false); }
  }, [auth.accessToken]);

  useEffect(() => { void load(); }, [load]);

  return (
    <PageShell>
      <h2 style={{ margin: '0 0 var(--space-4)' }}>My Vehicle</h2>
      {isLoading ? <div className="centered-state">Loading...</div> : !vehicle ? (
        <div className="empty-state-panel"><p>No vehicle assigned to you.</p></div>
      ) : (
        <div className="card" style={{ maxWidth: '500px' }}>
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
      )}
    </PageShell>
  );
}
