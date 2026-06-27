import { PageShell } from '../../components/ui/PageShell';

export function MyTripDocumentUploadPage() {
  return (
    <PageShell>
      <h2 style={{ margin: '0 0 var(--space-4)' }}>Upload Trip Document</h2>
      <div className="card" style={{ maxWidth: '500px', padding: 'var(--space-4)' }}>
        <p className="helper-text">Trip document upload will be available in the next update.</p>
        <p className="helper-text" style={{ marginTop: 'var(--space-2)' }}>
          For now, please use the Documents section or contact your supervisor.
        </p>
      </div>
    </PageShell>
  );
}
