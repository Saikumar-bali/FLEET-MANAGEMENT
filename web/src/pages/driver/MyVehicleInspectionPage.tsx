import { PageShell } from '../../components/ui/PageShell';

export function MyVehicleInspectionPage() {
  return (
    <PageShell>
      <h2 style={{ margin: '0 0 var(--space-4)' }}>Vehicle Inspection</h2>
      <div className="card" style={{ maxWidth: '500px', padding: 'var(--space-4)' }}>
        <p className="helper-text">Vehicle inspection form will be available in the next update.</p>
        <p className="helper-text" style={{ marginTop: 'var(--space-2)' }}>
          For now, please contact your supervisor to submit an inspection report.
        </p>
      </div>
    </PageShell>
  );
}
