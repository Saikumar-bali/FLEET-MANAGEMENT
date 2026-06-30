import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { getMyAccessSummary } from '../../services/api';
import { LoadingState } from '../../components/LoadingState';

const PORTAL_LINKS = [
  { label: 'Dashboard', path: '/driver-portal' },
  { label: 'Profile', path: '/driver-portal/profile' },
  { label: 'Trips', path: '/driver-portal/trips' },
  { label: 'Vehicles', path: '/driver-portal/vehicles' },
  { label: 'Documents', path: '/driver-portal/documents' },
  { label: 'Fuel', path: '/driver-portal/fuel' },
  { label: 'Expenses', path: '/driver-portal/expenses' },
];

export function DriverPortalLayout() {
  const auth = useAuth();
  const location = useLocation();
  const [hasDriverProfile, setHasDriverProfile] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!auth.accessToken) {
      setChecking(false);
      return;
    }
    getMyAccessSummary(auth.accessToken)
      .then((res) => {
        const summary = res.data;
        const hasProfile = summary.profileTypes.includes('DRIVER') || !!summary.primaryDriverProfile;
        setHasDriverProfile(hasProfile);
      })
      .catch(() => {
        setHasDriverProfile(false);
      })
      .finally(() => setChecking(false));
  }, [auth.accessToken]);

  if (checking) {
    return <LoadingState message="Checking driver profile..." />;
  }

  if (!auth.accessToken || !auth.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!hasDriverProfile) {
    return (
      <section className="page-content">
        <div className="state-panel">
          <div>
            <h3>No driver profile linked</h3>
            <p>No driver profile linked to this account. Contact your administrator to link a driver profile.</p>
            <button type="button" className="secondary-button" onClick={() => window.location.href = '/'}>
              Back to Home
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)' }}>
      <nav
        data-testid="driver-portal-nav"
        style={{
          width: '220px',
          borderRight: '1px solid var(--color-border)',
          padding: '1rem 0',
          flexShrink: 0,
        }}
      >
        <p style={{ padding: '0 1rem 0.5rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
          Driver Portal
        </p>
        {PORTAL_LINKS.map((link) => {
          const isActive = link.path === '/driver-portal'
            ? location.pathname === '/driver-portal'
            : location.pathname.startsWith(link.path);
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={`nav-item${isActive ? ' nav-item-active' : ''}`}
              style={{ display: 'block', padding: '0.5rem 1rem', fontSize: '0.875rem', textDecoration: 'none', color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
            >
              {link.label}
            </NavLink>
          );
        })}
        <div style={{ padding: '1rem', marginTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <NavLink
            to="/"
            style={{ display: 'block', padding: '0.5rem 0', fontSize: '0.875rem', textDecoration: 'none', color: 'var(--color-text-secondary)' }}
          >
            ← Back to Fleet App
          </NavLink>
        </div>
      </nav>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
