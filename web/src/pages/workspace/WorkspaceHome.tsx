import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useAuth } from '../../context/AuthContext';
import { useMemo } from 'react';
import { LoadingState } from '../../components/LoadingState';
import { getVisibleActions, getActionsBySection } from '../../config/actions';
import type { QuickActionDef } from '../../types/workspace';

const SECTION_LABELS: Record<string, string> = {
  driver: 'Driver Actions',
  operations: 'Operations',
  finance: 'Finance',
  admin: 'Administration',
  reports: 'Reports',
};

function QuickActionCard({ action, onClick }: { action: QuickActionDef; onClick: () => void }) {
  const svgPaths: Record<string, string> = {
    NewTrip: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    MyVehicle: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    MyFuel: '<path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17"/><path d="M15 10h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V9l-3-3"/><path d="M3 22h12"/><rect x="6" y="7" width="6" height="4" rx="1"/>',
    MyExpenses: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    MyDocuments: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
    Issues: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    Inspections: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.77 4 4 0 0 1 0 6.76 4 4 0 0 1-4.78 4.77 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
    Trips: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
    Vehicles: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    Drivers: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    Fuel: '<path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17"/><path d="M15 10h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V9l-3-3"/><path d="M3 22h12"/><rect x="6" y="7" width="6" height="4" rx="1"/>',
    Expenses: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    FinanceDashboard: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1L4 2z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h4"/>',
    Reports: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    DriverPortal: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    Users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    Roles: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    Submissions: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '1.25rem 1rem',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.15s',
        minWidth: '120px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-accent)' }}>
        <g dangerouslySetInnerHTML={{ __html: svgPaths[action.icon] ?? '' }} />
      </svg>
      <span style={{ fontSize: '0.8rem', fontWeight: 500, textAlign: 'center' }}>{action.label}</span>
    </button>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
};

function EmptyStateCard({ title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      padding: '1.5rem',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      textAlign: 'center',
    }}>
      <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>{title}</p>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: action ? '1rem' : 0 }}>{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function DriverHome() {
  const { emptyStates, diagnostics, capabilities, primaryProfiles } = useWorkspace();
  const navigate = useNavigate();
  const hasDriverProfile = !!(primaryProfiles?.driver);

  const hasCheckoutCap = capabilities?.canSelfCheckoutVehicle || capabilities?.canViewAvailableVehicles;

  const filteredActions = useMemo(() => {
    const caps = capabilities ?? {} as Record<string, boolean>;
    return getVisibleActions(caps as any, hasDriverProfile);
  }, [capabilities, hasDriverProfile]);

  const actionsBySection = useMemo(() => getActionsBySection(filteredActions), [filteredActions]);

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ marginBottom: '0.25rem' }}>Driver Workspace</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '1.5rem' }}>
        {primaryProfiles?.driver ? `Driver: ${primaryProfiles.driver.name}` : 'Driver Portal'}
      </p>

      {emptyStates.length > 0 && emptyStates.map((state, i) => (
        <EmptyStateCard key={i} title="Notice" description={state} />
      ))}

      {Object.entries(actionsBySection).map(([section, actions]) => (
        <div key={section} style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>
            {SECTION_LABELS[section] ?? section}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {actions.map((action) => (
              <QuickActionCard key={action.id} action={action} onClick={() => navigate(action.path)} />
            ))}
          </div>
        </div>
      ))}

      {hasCheckoutCap && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Vehicle
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {capabilities?.canSelfCheckoutVehicle && (
              <QuickActionCard
                action={{ id: 'checkout_vehicle', label: 'Take Vehicle', path: '/driver-portal/vehicles', icon: 'MyVehicle', priority: 0 }}
                onClick={() => navigate('/driver-portal/vehicles')}
              />
            )}
            <QuickActionCard
              action={{ id: 'view_vehicle', label: 'My Vehicle', path: '/driver-portal/vehicles', icon: 'MyVehicle', priority: 0 }}
              onClick={() => navigate('/driver-portal/vehicles')}
            />
          </div>
        </div>
      )}

      {diagnostics.length > 0 && diagnostics.length < 3 && (
        <details style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
          <summary style={{ cursor: 'pointer' }}>Access Diagnostics</summary>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
            {diagnostics.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

function FinanceHome() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ marginBottom: '0.25rem' }}>Finance Workspace</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '1.5rem' }}>
        Financial management and reporting
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <QuickActionCard
          action={{ id: 'finance_dashboard', label: 'Finance Dashboard', path: '/finance', icon: 'FinanceDashboard', priority: 100 }}
          onClick={() => navigate('/finance')}
        />
        <QuickActionCard
          action={{ id: 'trip_billing', label: 'Trip Billing', path: '/finance/billings', icon: 'Billing', priority: 110 }}
          onClick={() => navigate('/finance/billings')}
        />
        <QuickActionCard
          action={{ id: 'payments', label: 'Payments', path: '/finance/payments', icon: 'Payments', priority: 120 }}
          onClick={() => navigate('/finance/payments')}
        />
      </div>
    </div>
  );
}

function ManagerHome() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ marginBottom: '0.25rem' }}>Manager Workspace</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '1.5rem' }}>
        Operations overview and submission review
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <QuickActionCard
          action={{ id: 'manage_trips', label: 'Manage Trips', path: '/trips', icon: 'Trips', priority: 100 }}
          onClick={() => navigate('/trips')}
        />
        <QuickActionCard
          action={{ id: 'vehicles', label: 'Vehicles', path: '/vehicles', icon: 'Vehicles', priority: 110 }}
          onClick={() => navigate('/vehicles')}
        />
        <QuickActionCard
          action={{ id: 'drivers', label: 'Drivers', path: '/drivers', icon: 'Drivers', priority: 120 }}
          onClick={() => navigate('/drivers')}
        />
        <QuickActionCard
          action={{ id: 'review_submissions', label: 'Review Submissions', path: '/driver-submissions', icon: 'Submissions', priority: 200 }}
          onClick={() => navigate('/driver-submissions')}
        />
      </div>
    </div>
  );
}

function MechanicHome() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ marginBottom: '0.25rem' }}>Maintenance Workspace</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '1.5rem' }}>
        Repairs, maintenance, and vehicle inspections
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <QuickActionCard
          action={{ id: 'repairs', label: 'Repairs', path: '/repairs', icon: 'Repairs', priority: 100 }}
          onClick={() => navigate('/repairs')}
        />
        <QuickActionCard
          action={{ id: 'maintenance', label: 'Maintenance', path: '/maintenance', icon: 'Maintenance', priority: 110 }}
          onClick={() => navigate('/maintenance')}
        />
        <QuickActionCard
          action={{ id: 'inspections', label: 'Inspections', path: '/compliance', icon: 'Compliance', priority: 120 }}
          onClick={() => navigate('/compliance')}
        />
      </div>
    </div>
  );
}

function ViewerHome() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ marginBottom: '0.25rem' }}>Viewer Workspace</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '1.5rem' }}>
        Read-only access to fleet data
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <QuickActionCard
          action={{ id: 'vehicles', label: 'Vehicles', path: '/vehicles', icon: 'Vehicles', priority: 100 }}
          onClick={() => navigate('/vehicles')}
        />
        <QuickActionCard
          action={{ id: 'drivers', label: 'Drivers', path: '/drivers', icon: 'Drivers', priority: 110 }}
          onClick={() => navigate('/drivers')}
        />
        <QuickActionCard
          action={{ id: 'trips', label: 'Trips', path: '/trips', icon: 'Trips', priority: 120 }}
          onClick={() => navigate('/trips')}
        />
        <QuickActionCard
          action={{ id: 'reports', label: 'Reports', path: '/finance/reports', icon: 'Reports', priority: 130 }}
          onClick={() => navigate('/finance/reports')}
        />
      </div>
    </div>
  );
}

function AdminHome() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ marginBottom: '0.25rem' }}>Admin Workspace</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '1.5rem' }}>
        Platform administration
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <QuickActionCard
          action={{ id: 'manage_users', label: 'Users', path: '/users', icon: 'Users', priority: 100 }}
          onClick={() => navigate('/users')}
        />
        <QuickActionCard
          action={{ id: 'manage_roles', label: 'Roles & Permissions', path: '/roles', icon: 'Roles', priority: 110 }}
          onClick={() => navigate('/roles')}
        />
        <QuickActionCard
          action={{ id: 'manage_trips', label: 'Manage Trips', path: '/trips', icon: 'Trips', priority: 200 }}
          onClick={() => navigate('/trips')}
        />
        <QuickActionCard
          action={{ id: 'manage_vehicles', label: 'Vehicles', path: '/vehicles', icon: 'Vehicles', priority: 210 }}
          onClick={() => navigate('/vehicles')}
        />
        <QuickActionCard
          action={{ id: 'manage_drivers', label: 'Drivers', path: '/drivers', icon: 'Drivers', priority: 220 }}
          onClick={() => navigate('/drivers')}
        />
      </div>
    </div>
  );
}

export function WorkspaceHome() {
  const { workspace, workspaceType, isLoading, error } = useWorkspace();
  const { user } = useAuth();

  if (isLoading) {
    return <LoadingState message="Loading workspace..." />;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!workspace || !user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-tertiary)' }}>Unable to load workspace. Please try refreshing.</p>
      </div>
    );
  }

  switch (workspaceType) {
    case 'DRIVER':
    case 'ASSISTANT_DRIVER':
    case 'MIXED':
      return <DriverHome />;
    case 'FINANCE':
      return <FinanceHome />;
    case 'MANAGER':
    case 'SUPERVISOR':
      return <ManagerHome />;
    case 'MECHANIC':
      return <MechanicHome />;
    case 'VIEWER':
      return <ViewerHome />;
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return <AdminHome />;
    default:
      return <AdminHome />;
  }
}
