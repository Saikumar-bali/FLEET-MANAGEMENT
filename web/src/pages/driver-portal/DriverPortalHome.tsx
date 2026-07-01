import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyDriverProfile, getMyDriverTrips, getMyDriverVehicles, getMyDriverFuel, getMyDriverExpenses } from '../../services/api';
import type { DriverPortalProfile, DriverPortalTrip, DriverPortalVehicle, DriverPortalFuelEntry, DriverPortalExpense } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';

type TripWithStatus = DriverPortalTrip & { statusLabel?: string };

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function DriverStatusCard({ profile }: { profile: DriverPortalProfile | null }) {
  if (!profile) return null;
  return (
    <article className="card" style={{ gridColumn: 'span 1' }}>
      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--color-accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '1.25rem',
          }}>
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 600, margin: 0 }}>{profile.name}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', margin: 0 }}>{profile.mobile}</p>
          </div>
        </div>
        <div className="detail-grid" style={{ gap: '0.5rem' }}>
          <div>
            <p className="detail-label">License</p>
            <p className="detail-value" style={{ fontSize: '0.85rem' }}>{profile.licenseNumber}</p>
          </div>
          <div>
            <p className="detail-label">Status</p>
            <StatusBadge status={profile.status as 'AVAILABLE' | 'ON_TRIP' | 'ON_LEAVE' | 'SUSPENDED' | 'INACTIVE'} />
          </div>
          {profile.licenseExpiry && (
            <div>
              <p className="detail-label">License Expiry</p>
              <p className="detail-value" style={{ fontSize: '0.85rem' }}>{formatDate(profile.licenseExpiry)}</p>
            </div>
          )}
          {profile.experienceYears && (
            <div>
              <p className="detail-label">Experience</p>
              <p className="detail-value" style={{ fontSize: '0.85rem' }}>{profile.experienceYears} yrs</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function AssignedVehicleCard({ vehicles }: { vehicles: DriverPortalVehicle[] }) {
  if (vehicles.length === 0) return null;
  const v = vehicles[0];
  return (
    <article className="card" style={{ gridColumn: 'span 1' }}>
      <div style={{ padding: '1.25rem' }}>
        <p className="detail-label" style={{ marginBottom: '0.5rem' }}>Assigned Vehicle</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: 'var(--color-success-bg, #e8f5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-success)' }}>
              <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div>
            <p style={{ fontWeight: 600, margin: 0 }}>{v.vehicleNumber}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', margin: 0 }}>{v.vehicleType} · {v.brand || ''} {v.model || ''}</p>
          </div>
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <StatusBadge status={v.status as 'AVAILABLE' | 'ON_TRIP' | 'UNDER_MAINTENANCE' | 'UNDER_REPAIR' | 'INACTIVE' | 'SOLD' | 'ACCIDENT'} />
        </div>
        <Link to="/driver-portal/vehicles" style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--color-accent)' }}>
          View details →
        </Link>
      </div>
    </article>
  );
}

function UpcomingTripCard({ trips }: { trips: TripWithStatus[] }) {
  const upcoming = trips.filter(t => t.status === 'SCHEDULED' || t.status === 'STARTED').slice(0, 1);
  const trip = upcoming[0];
  if (!trip) {
    return (
      <article className="card" style={{ gridColumn: 'span 1' }}>
        <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 0 0.5rem', color: 'var(--color-text-tertiary)' }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <p style={{ fontSize: '0.9rem', margin: 0 }}>No active trips</p>
          <Link to="/driver-portal/trips/create" className="primary-button" style={{ display: 'inline-block', marginTop: '0.75rem', textDecoration: 'none', padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
            Start a Trip
          </Link>
        </div>
      </article>
    );
  }
  return (
    <article className="card" style={{ gridColumn: 'span 1', border: '2px solid var(--color-accent)' }}>
      <div style={{ padding: '1.25rem' }}>
        <p className="detail-label" style={{ marginBottom: '0.5rem' }}>Current Trip</p>
        <p style={{ fontWeight: 600, margin: '0 0 0.25rem' }}>{trip.tripNumber}</p>
        <p style={{ fontSize: '0.85rem', margin: 0 }}>{trip.originName} → {trip.destinationName}</p>
        <div className="detail-grid" style={{ gap: '0.25rem', marginTop: '0.5rem' }}>
          <div>
            <p className="detail-label">Started</p>
            <p className="detail-value" style={{ fontSize: '0.8rem' }}>{formatDate(trip.actualStartAt || trip.plannedStartAt)}</p>
          </div>
          <div>
            <p className="detail-label">Vehicle</p>
            <p className="detail-value" style={{ fontSize: '0.8rem' }}>{trip.vehicle.vehicleNumber}</p>
          </div>
          <div>
            <p className="detail-label">Status</p>
            <StatusBadge status={trip.status as 'SCHEDULED' | 'STARTED' | 'COMPLETED' | 'CANCELLED'} />
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
          <Link to={`/driver-portal/trips`} style={{ fontSize: '0.85rem', color: 'var(--color-accent)' }}>
            View all →
          </Link>
        </div>
      </div>
    </article>
  );
}

type QuickAction = {
  label: string;
  path: string;
  icon: JSX.Element;
  color: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Create Trip', path: '/driver-portal/trips/create',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/><circle cx="12" cy="12" r="10"/></svg>,
    color: 'var(--color-accent)',
  },
  {
    label: 'Quick Fuel', path: '/driver-portal/fuel/create',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17"/><path d="M15 10h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V9l-3-3"/><rect x="6" y="7" width="6" height="4" rx="1"/></svg>,
    color: 'var(--color-warning)',
  },
  {
    label: 'Expense Claim', path: '/driver-portal/expenses/create',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    color: 'var(--color-danger)',
  },
  {
    label: 'Upload Document', path: '/driver-portal/documents/upload',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="12"/><line x1="15" y1="15" x2="12" y2="12"/></svg>,
    color: 'var(--color-info, #1976d2)',
  },
  {
    label: 'Report Issue', path: '/driver-portal/vehicles/issue',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    color: 'var(--color-danger)',
  },
  {
    label: 'Inspection', path: '/driver-portal/vehicles/inspect',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.77 4 4 0 0 1 0 6.76 4 4 0 0 1-4.78 4.77 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>,
    color: 'var(--color-success)',
  },
];

function QuickActionGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.path}
          to={action.path}
          style={{ textDecoration: 'none' }}
        >
          <article
            className="card"
            style={{
              cursor: 'pointer', textAlign: 'center', padding: '1rem',
              transition: 'transform 0.15s, box-shadow 0.15s',
              borderTop: `3px solid ${action.color}`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div style={{ color: action.color, marginBottom: '0.25rem', display: 'flex', justifyContent: 'center' }}>{action.icon}</div>
            <p style={{ fontSize: '0.8rem', fontWeight: 500, margin: 0 }}>{action.label}</p>
          </article>
        </Link>
      ))}
    </div>
  );
}

function RecentActivityTimeline({ trips, fuel, expenses }: { trips: TripWithStatus[]; fuel: DriverPortalFuelEntry[]; expenses: DriverPortalExpense[] }) {
  type Activity = { date: string; label: string; type: string; status: string; link: string };
  const activities: Activity[] = [
    ...trips.map(t => ({ date: t.createdAt, label: `Trip ${t.tripNumber}: ${t.originName} → ${t.destinationName}`, type: 'Trip', status: t.status, link: '/driver-portal/trips' })),
    ...fuel.map(f => ({ date: f.createdAt, label: `Fuel: ₹${f.totalAmount} — ${f.fuelType}`, type: 'Fuel', status: f.status, link: '/driver-portal/fuel' })),
    ...expenses.map(e => ({ date: e.createdAt, label: `Expense: ₹${e.amount} — ${e.category}`, type: 'Expense', status: e.status, link: '/driver-portal/expenses' })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  if (activities.length === 0) return null;

  return (
    <article className="card">
      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Recent Activity</h3>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {activities.map((a, i) => (
            <Link key={i} to={a.link} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0', borderBottom: i < activities.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: a.status === 'COMPLETED' || a.status === 'APPROVED' ? 'var(--color-success)'
                    : a.status === 'SCHEDULED' || a.status === 'SUBMITTED' ? 'var(--color-warning)'
                    : a.status === 'CANCELLED' || a.status === 'REJECTED' ? 'var(--color-danger)'
                    : 'var(--color-text-tertiary)',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{formatDate(a.date)} · {formatTime(a.date)}</p>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{a.type}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

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
      getMyDriverTrips(auth.accessToken, { limit: 10 }),
      getMyDriverVehicles(auth.accessToken),
      getMyDriverFuel(auth.accessToken, { limit: 10 }),
      getMyDriverExpenses(auth.accessToken, { limit: 10 }),
    ])
      .then(([profileRes, tripsRes, vehiclesRes, fuelRes, expensesRes]) => {
        if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
        if (tripsRes.status === 'fulfilled') setTrips(tripsRes.value.data?.items || []);
        if (vehiclesRes.status === 'fulfilled') setVehicles(vehiclesRes.value.data || []);
        if (fuelRes.status === 'fulfilled') setFuel(fuelRes.value.data?.items || []);
        if (expensesRes.status === 'fulfilled') setExpenses(expensesRes.value.data?.items || []);

        const errors: string[] = [];
        for (const r of [profileRes, tripsRes, vehiclesRes, fuelRes, expensesRes]) {
          if (r.status === 'rejected') {
            const reason = (r as PromiseRejectedResult).reason;
            if (reason?.status === 404 && reason?.response?.data?.message?.toLowerCase().includes('no driver profile')) {
              setError('no-driver-profile');
              return;
            }
            errors.push(reason?.message || 'Failed to load');
          }
        }
        if (errors.length > 0) {
          console.error('Driver portal load errors:', errors);
          setError('partial-load-error');
        }
      })
      .finally(() => setLoading(false));
  }, [auth.accessToken]);

  if (loading) {
    return (
      <section className="page-content" style={{ maxWidth: 1200 }}>
        <PageHeader eyebrow="Driver Portal" title="Driver Workspace" description="Loading your workspace..." />
        <div className="card" style={{ padding: '2rem' }}>
          <div className="skeleton-line" />
          <div className="skeleton-line" style={{ width: '60%', marginTop: '0.5rem' }} />
          <div className="skeleton-line" style={{ width: '80%', marginTop: '0.5rem' }} />
          <div className="skeleton-line" style={{ width: '40%', marginTop: '0.5rem' }} />
        </div>
      </section>
    );
  }

  if (error === 'no-driver-profile') {
    return (
      <section className="page-content" style={{ maxWidth: 1200 }}>
        <PageHeader eyebrow="Driver Portal" title="Driver Workspace" description="No driver profile is linked to this account." />
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <h3 style={{ margin: '0 0 0.5rem' }}>No driver profile linked</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
            No driver profile is linked to this account. Contact your administrator to link a driver profile.
          </p>
          <button type="button" className="secondary-button" onClick={() => window.location.href = '/'}>
            Back to Home
          </button>
        </div>
      </section>
    );
  }

  if (error === 'partial-load-error' && !profile) {
    return (
      <section className="page-content" style={{ maxWidth: 1200 }}>
        <PageHeader eyebrow="Driver Portal" title="Driver Workspace" description="Unable to load driver workspace." />
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h3 style={{ margin: '0 0 0.5rem' }}>Unable to load access data</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
            Unable to load driver workspace. Please try again.
          </p>
          <button type="button" className="primary-button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-content" style={{ maxWidth: 1200 }}>
      <PageHeader
        eyebrow="Driver Portal"
        title={`Welcome back, ${profile?.name?.split(' ')[0] || auth.user?.name?.split(' ')[0] || 'Driver'}`}
        description="Your workspace — manage trips, fuel, expenses, and more."
      />

      {/* Status overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <DriverStatusCard profile={profile} />
        <AssignedVehicleCard vehicles={vehicles} />
        <UpcomingTripCard trips={trips} />
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>Quick Actions</h3>
        <QuickActionGrid />
      </div>

      {/* Recent activity */}
      <RecentActivityTimeline trips={trips} fuel={fuel} expenses={expenses} />
    </section>
  );
}
