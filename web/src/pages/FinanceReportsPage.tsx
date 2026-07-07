import { PageHeader } from '../components/PageHeader';

export function FinanceReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate financial reports"
      />
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">Financial reports module — coming soon.</p>
      </div>
    </div>
  );
}

export default FinanceReportsPage;
