import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyDriverExpenses } from '../../services/api';
import type { DriverPortalExpense } from '../../types/auth';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

function formatCurrency(amount: number) {
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function statusClass(status: string) {
  switch (status) {
    case 'APPROVED': return 'status-pill status-pill-success';
    case 'REJECTED': return 'status-pill status-pill-danger';
    case 'NEEDS_CHANGES': return 'status-pill status-pill-warning';
    case 'SUBMITTED': return 'status-pill status-pill-info';
    default: return 'status-pill status-pill-default';
  }
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

export function DriverExpensesPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<DriverPortalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.accessToken) return;
    setPermissions(auth.permissions || []);
  }, [auth.accessToken, auth.permissions]);

  const loadData = (p: number) => {
    if (!auth.accessToken) return;
    setLoading(true);
    getMyDriverExpenses(auth.accessToken, { page: p, limit: 20 })
      .then((res) => {
        setEntries(res.data?.items || []);
        setTotalPages(res.data?.totalPages || 1);
      })
      .catch((e) => setError(e.message || 'Failed to load expenses'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(page); }, [auth.accessToken, page]);

  const canCreate = permissions.includes('driver_expense_create');

  if (loading && entries.length === 0) return <LoadingState message="Loading expenses..." />;
  if (error && entries.length === 0) return <ErrorState message={error} onRetry={() => loadData(page)} />;

  return (
    <section className="page-content">
      <PageHeader
        eyebrow="Driver Portal"
        title="My Expenses"
        description="Expense claims submitted by you."
        actions={canCreate ? <button type="button" className="primary-button" onClick={() => navigate('/driver-portal/expenses/create')}>Expense Claim</button> : undefined}
      />

      {entries.length === 0 ? (
        <div className="state-panel">
          <div>
            <h3>No expenses found</h3>
            <p>You have no expense claims yet.</p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Vehicle</th>
                  <th>Amount</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Reviewer Notes</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.expenseDate).toLocaleDateString()}</td>
                    <td>{entry.category}</td>
                    <td>{entry.vehicle.vehicleNumber}</td>
                    <td>{formatCurrency(entry.amount)}</td>
                    <td>{entry.notes || '—'}</td>
                    <td><span className={statusClass(entry.status)}>{statusLabel(entry.status)}</span></td>
                    <td>{(entry as Record<string, unknown>).reviewComments ? String((entry as Record<string, unknown>).reviewComments) : '—'}</td>
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
