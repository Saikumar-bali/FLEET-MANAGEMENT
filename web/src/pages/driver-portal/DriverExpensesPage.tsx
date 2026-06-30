import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyDriverExpenses } from '../../services/api';
import type { DriverPortalExpense } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

function formatCurrency(amount: number) {
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

export function DriverExpensesPage() {
  const auth = useAuth();
  const [expenses, setExpenses] = useState<DriverPortalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = (p: number) => {
    if (!auth.accessToken) return;
    setLoading(true);
    getMyDriverExpenses(auth.accessToken, { page: p, limit: 20 })
      .then((res) => {
        setExpenses(res.data?.items || []);
        setTotalPages(res.data?.totalPages || 1);
      })
      .catch((e) => setError(e.message || 'Failed to load expenses'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(page); }, [auth.accessToken, page]);

  if (loading && expenses.length === 0) return <LoadingState message="Loading expenses..." />;
  if (error && expenses.length === 0) return <ErrorState message={error} onRetry={() => loadData(page)} />;

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Driver Portal"
        title="My Expenses"
        description="Expenses logged for your trips."
      />

      {expenses.length === 0 ? (
        <div className="state-panel">
          <div>
            <h3>No expenses found</h3>
            <p>No expenses are recorded for your trips yet.</p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>{new Date(exp.expenseDate).toLocaleDateString()}</td>
                    <td>{exp.vehicle.vehicleNumber}</td>
                    <td>{exp.category}</td>
                    <td>{formatCurrency(exp.amount)}</td>
                    <td><span className="status-badge">{exp.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" className="secondary-button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span style={{ padding: '0.5rem 1rem' }}>Page {page} of {totalPages}</span>
              <button type="button" className="secondary-button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
