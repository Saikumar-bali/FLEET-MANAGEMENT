import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createMyExpense } from '../../services/api';
import { ApiError } from '../../types/api';
import { PageShell } from '../../components/ui/PageShell';

export function MyExpenseCreatePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ category: 'FUEL', amount: '', vendor: '', notes: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;
    setIsSaving(true);
    setError(null);
    try {
      await createMyExpense(auth.accessToken, {
        category: form.category, amount: parseFloat(form.amount),
        vendor: form.vendor || undefined, notes: form.notes || undefined,
      });
      navigate('/my-expenses');
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to create expense.');
    } finally { setIsSaving(false); }
  }

  return (
    <PageShell>
      <div style={{ maxWidth: '500px' }}>
        <h2 style={{ margin: '0 0 var(--space-4)' }}>Create Expense</h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit} className="stack-form">
          <label><span className="field-label">Category *</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
              <option value="FUEL">Fuel</option><option value="TOLL">Toll</option><option value="PARKING">Parking</option>
              <option value="FOOD">Food</option><option value="LODGING">Lodging</option><option value="OTHER">Other</option>
            </select>
          </label>
          <label><span className="field-label">Amount *</span>
            <input type="number" min="1" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="500" />
          </label>
          <label><span className="field-label">Vendor</span>
            <input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Optional" />
          </label>
          <label><span className="field-label">Notes</span>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </label>
          <div className="button-row">
            <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? 'Saving...' : 'Create Expense'}</button>
            <button type="button" className="secondary-button" onClick={() => navigate('/my-expenses')}>Cancel</button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
