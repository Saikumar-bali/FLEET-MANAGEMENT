import { useEffect, useState, useCallback } from 'react';
import { getMyDriverProfile, getMyVehicle } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { DriverRecord, VehicleRecord } from '../types/auth';
import { PageShell } from '../components/ui/PageShell';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { StatusPill } from '../components/ui/StatusPill';

export function MyProfilePage() {
  const auth = useAuth();
  const [profile, setProfile] = useState<DriverRecord | null>(null);
  const [vehicle, setVehicle] = useState<VehicleRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [profileRes, vehicleRes] = await Promise.all([
        getMyDriverProfile(auth.accessToken),
        getMyVehicle(auth.accessToken),
      ]);
      setProfile(profileRes.data);
      setVehicle(vehicleRes.data);
    } catch {
      setError('Failed to load profile.');
    } finally {
      setIsLoading(false);
    }
  }, [auth.accessToken]);

  useEffect(() => { void load(); }, [load]);

  if (isLoading) {
    return (
      <PageShell>
        <LoadingSkeleton rows={4} columns={2} />
      </PageShell>
    );
  }

  if (error || !profile) {
    return (
      <PageShell>
        <div className="empty-state-panel">
          <h3>Profile not available</h3>
          <p>{error || 'Could not load driver profile.'}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div style={{ maxWidth: '600px' }}>
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', background: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', fontWeight: 700, color: '#fff',
              }}>
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ margin: 0 }}>{profile.name}</h2>
                <StatusPill status={profile.status} />
              </div>
            </div>

            <div className="detail-grid">
              <div>
                <p className="detail-label">Mobile</p>
                <p className="detail-value">{profile.mobile}</p>
              </div>
              {profile.alternateMobile ? (
                <div>
                  <p className="detail-label">Alternate Mobile</p>
                  <p className="detail-value">{profile.alternateMobile}</p>
                </div>
              ) : null}
              <div>
                <p className="detail-label">License Number</p>
                <p className="detail-value">{profile.licenseNumber}</p>
              </div>
              <div>
                <p className="detail-label">License Expiry</p>
                <p className="detail-value">
                  {profile.licenseExpiry
                    ? new Date(profile.licenseExpiry).toLocaleDateString('en-IN')
                    : 'Not set'}
                </p>
              </div>
              {profile.emergencyContact ? (
                <div>
                  <p className="detail-label">Emergency Contact</p>
                  <p className="detail-value">{profile.emergencyContact}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {vehicle ? (
          <div className="card">
            <div style={{ padding: 'var(--space-4)' }}>
              <h3 style={{ margin: '0 0 var(--space-3)' }}>Assigned Vehicle</h3>
              <div className="detail-grid">
                <div>
                  <p className="detail-label">Vehicle Number</p>
                  <p className="detail-value" style={{ fontSize: '1.2rem', fontWeight: 600 }}>{vehicle.vehicleNumber}</p>
                </div>
                <div>
                  <p className="detail-label">Type</p>
                  <p className="detail-value">{vehicle.vehicleType}</p>
                </div>
                <div>
                  <p className="detail-label">Status</p>
                  <StatusPill status={vehicle.status} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div style={{ padding: 'var(--space-4)' }}>
              <p className="helper-text">No vehicle assigned.</p>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
