import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { SvgShapes } from '../../components/ui/SvgIcon';

const SUBMISSION_TYPES = [
  { id: 'fuel', label: 'Fuel', path: '/driver-submissions/fuel', icon: 'Fuel', description: 'Review fuel submissions from drivers' },
  { id: 'expenses', label: 'Expenses', path: '/driver-submissions/expenses', icon: 'Expenses', description: 'Review expense claims from drivers' },
  { id: 'documents', label: 'Documents', path: '/driver-submissions/documents', icon: 'Documents', description: 'Review uploaded driver documents' },
  { id: 'issues', label: 'Issues', path: '/driver-submissions/issues', icon: 'Issues', description: 'Review reported vehicle issues' },
  { id: 'inspections', label: 'Inspections', path: '/driver-submissions/inspections', icon: 'Inspections', description: 'Review vehicle inspection reports' },
];

const SVG_ICONS: Record<string, string> = {
  Fuel: '<path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17"/><path d="M15 10h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V9l-3-3"/><path d="M3 22h12"/><rect x="6" y="7" width="6" height="4" rx="1"/>',
  Expenses: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  Documents: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  Issues: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  Inspections: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.77 4 4 0 0 1 0 6.76 4 4 0 0 1-4.78 4.77 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
};

export function DriverSubmissionsPage() {
  const navigate = useNavigate();
  const auth = useAuth();

  const canView = auth.permissions?.includes('driver_submission_view');
  const canReview = auth.permissions?.includes('driver_submission_review');
  const hasAccess = canView || canReview;

  return (
    <section className="page-content">
      <PageHeader
        title="Driver Submissions"
        description="Review and approve driver-submitted fuel, expenses, documents, issues, and inspections"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', padding: '1rem' }}>
        {hasAccess && SUBMISSION_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => navigate(type.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              padding: '1.5rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'box-shadow 0.15s, transform 0.15s',
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
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-accent)' }}>
              <SvgShapes fragment={SVG_ICONS[type.icon] ?? ''} />
            </svg>
            <div>
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600 }}>{type.label}</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{type.description}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
