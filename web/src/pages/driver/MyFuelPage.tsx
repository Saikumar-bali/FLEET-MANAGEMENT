import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyFuelEntries } from '../../services/api';
import type { FuelRecord } from '../../types/auth';
import { PageShell } from '../../components/ui/PageShell';
import { StatusPill } from '../../components/ui/StatusPill';

export function MyFuelPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<FuelRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    try { const res = await getMyFuelEntries(auth.accessToken); setEntries(res.data.items); } catch {} finally { setIsLoading(false); }
  }, [auth.accessToken]);

  useEffect(() => { void load(); }, [load]);

  return (
    <PageShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ margin: 0 }}>My Fuel Entries</h2>
        {auth.hasPermission('driver_quick_fuel_create') && (
          <button className="primary-button" onClick={() => navigate('/my-fuel/new')}>Add Fuel</button>
        )}
      </div>
      {isLoading ? <div className="centered-state">Loading...</div> : entries.length === 0 ? (
        <div className="empty-state-panel"><p>No fuel entries yet.</p></div>
      ) : (
        <div className="card"><div style={{ overflowX: 'auto' }}>
          <table className="doc-table doc-table-compact">
            <thead><tr><th>Vehicle</th><th>Qty</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>{entries.map((e) => (
              <tr key={e.id}>
                <td>{e.vehicle?.vehicleNumber ?? '—'}</td>
                <td>{e.quantityLiters ? `${e.quantityLiters}L` : '—'}</td>
                <td>₹{Number(e.totalAmount).toLocaleString('en-IN')}</td>
                <td>{new Date(e.fuelDate).toLocaleDateString('en-IN')}</td>
                <td><StatusPill status={e.status} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div></div>
      )}
    </PageShell>
  );
}
