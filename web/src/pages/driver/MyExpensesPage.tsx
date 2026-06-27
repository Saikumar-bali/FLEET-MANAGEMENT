import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyExpenses } from '../../services/api';
import type { ExpenseRecord } from '../../types/auth';
import { PageShell } from '../../components/ui/PageShell';
import { StatusPill } from '../../components/ui/StatusPill';

export function MyExpensesPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    try { const res = await getMyExpenses(auth.accessToken); setExpenses(res.data.items); } catch {} finally { setIsLoading(false); }
  }, [auth.accessToken]);

  useEffect(() => { void load(); }, [load]);

  return (
    <PageShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ margin: 0 }}>My Expenses</h2>
        {auth.hasPermission('driver_expense_create') && (
          <button className="primary-button" onClick={() => navigate('/my-expenses/new')}>Create Expense</button>
        )}
      </div>
      {isLoading ? <div className="centered-state">Loading...</div> : expenses.length === 0 ? (
        <div className="empty-state-panel"><p>No expenses yet.</p></div>
      ) : (
        <div className="card"><div style={{ overflowX: 'auto' }}>
          <table className="doc-table doc-table-compact">
            <thead><tr><th>Category</th><th>Vehicle</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>{expenses.map((e) => (
              <tr key={e.id}>
                <td>{e.category}</td>
                <td>{e.vehicle?.vehicleNumber ?? '—'}</td>
                <td>₹{Number(e.amount).toLocaleString('en-IN')}</td>
                <td>{new Date(e.expenseDate).toLocaleDateString('en-IN')}</td>
                <td><StatusPill status={e.status} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div></div>
      )}
    </PageShell>
  );
}
