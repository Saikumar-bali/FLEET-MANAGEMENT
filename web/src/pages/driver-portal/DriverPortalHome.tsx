import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyDriverProfile, getMyDriverTrips, getMyDriverVehicles, getMyDriverFuel, getMyDriverExpenses } from '../../services/api';
import type { DriverPortalProfile, DriverPortalTrip, DriverPortalVehicle, DriverPortalFuelEntry, DriverPortalExpense } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

export function DriverPortalHome() {
  const auth = useAuth();
  const [profile, setProfile] = useState<DriverPortalProfile | null>(null);
  const [trips, setTrips] = useState<DriverPortalTrip[]>([]);
  const [vehicles, setVehicles] = useState<DriverPortalVehicle[]>([]);
  const [fuel, setFuel] = useState<DriverPortalFuelEntry[]>([]);
  const [expenses, setExpenses] = useState<DriverPortalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.accessToken) return;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      getMyDriverProfile(auth.accessToken),
      getMyDriverTrips(auth.accessToken, { limit: 5 }),
      getMyDriverVehicles(auth.accessToken),
      getMyDriverFuel(auth.accessToken, { limit: 5 }),
      getMyDriverExpenses(auth.accessToken, { limit: 5 }),
    ])
      .then(([profileRes, tripsRes, vehiclesRes, fuelRes, expensesRes]) => {
        if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
        if (tripsRes.status === 'fulfilled') setTrips(tripsRes.value.data?.items || []);
        if (vehiclesRes.status === 'fulfilled') setVehicles(vehiclesRes.value.data || []);
        if (fuelRes.status === 'fulfilled') setFuel(fuelRes.value.data?.items || []);
        if (expensesRes.status === 'fulfilled') setExpenses(expensesRes.value.data?.items || []);

        const errors = [profileRes, tripsRes, vehiclesRes, fuelRes, expensesRes]
          .filter(r => r.status === 'rejected')
          .map(r => (r as PromiseRejectedResult).reason?.message || 'Failed to load');
        if (errors.length > 0) setError(errors[0]);
      })
      .finally(() => setLoading(false));
  }, [auth.accessToken]);

  if (loading) return <LoadingState message="Loading your dashboard..." />;
  if (error && !profile) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Driver Portal"
        title={`Welcome, ${profile?.name || auth.user?.name || 'Driver'}`}
        description="Your personalized driver dashboard."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link to="/driver-portal/trips" style={{ textDecoration: 'none' }}>
          <article className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: '1.5rem' }}>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent)' }}>{trips.length}</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Recent Trips</p>
          </article>
        </Link>
        <Link to="/driver-portal/vehicles" style={{ textDecoration: 'none' }}>
          <article className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: '1.5rem' }}>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>{vehicles.length}</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Vehicles</p>
          </article>
        </Link>
        <Link to="/driver-portal/fuel" style={{ textDecoration: 'none' }}>
          <article className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: '1.5rem' }}>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-warning)' }}>{fuel.length}</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Recent Fuel</p>
          </article>
        </Link>
        <Link to="/driver-portal/expenses" style={{ textDecoration: 'none' }}>
          <article className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: '1.5rem' }}>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-danger)' }}>{expenses.length}</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Recent Expenses</p>
          </article>
        </Link>
      </div>

      {profile && (
        <article className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem' }}>
            <h3 style={{ margin: '0 0 0.75rem' }}>My Profile</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <p className="detail-label">Name</p>
                <p className="detail-value">{profile.name}</p>
              </div>
              <div>
                <p className="detail-label">Mobile</p>
                <p className="detail-value">{profile.mobile}</p>
              </div>
              <div>
                <p className="detail-label">License</p>
                <p className="detail-value">{profile.licenseNumber}</p>
              </div>
              <div>
                <p className="detail-label">Status</p>
                <p className="detail-value">{profile.status.replace(/_/g, ' ')}</p>
              </div>
              {profile.experienceYears && (
                <div>
                  <p className="detail-label">Experience</p>
                  <p className="detail-value">{profile.experienceYears} years</p>
                </div>
              )}
            </div>
          </div>
        </article>
      )}

      {trips.length > 0 && (
        <article className="card">
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>Recent Trips</h3>
              <Link to="/driver-portal/trips" style={{ fontSize: '0.875rem', color: 'var(--color-accent)' }}>View all →</Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Trip #</th>
                    <th>Route</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip) => (
                    <tr key={trip.id}>
                      <td>{trip.tripNumber}</td>
                      <td>{trip.originName} → {trip.destinationName}</td>
                      <td>{trip.vehicle.vehicleNumber}</td>
                      <td><span className="status-badge">{trip.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}
