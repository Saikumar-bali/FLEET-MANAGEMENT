import { PageShell } from '../../components/ui/PageShell';

export function MyFuelReceiptUploadPage() {
  return (
    <PageShell>
      <h2 style={{ margin: '0 0 var(--space-4)' }}>Upload Fuel Receipt</h2>
      <div className="card" style={{ maxWidth: '500px', padding: 'var(--space-4)' }}>
        <p className="helper-text">Fuel receipt upload will be available in the next update.</p>
        <p className="helper-text" style={{ marginTop: 'var(--space-2)' }}>
          For now, please use the Documents section to upload fuel receipts.
        </p>
      </div>
    </PageShell>
  );
}
