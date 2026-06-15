import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { getExpenses, getFuelEntries } from '../services/api';
import type { ExpenseRecord, FuelRecord } from '../types/auth';

export function WorkflowListPage({ kind }: { kind: 'fuel' | 'expense' }) {
  const auth = useAuth(); const navigate = useNavigate();
  const [items, setItems] = useState<Array<FuelRecord | ExpenseRecord>>([]); const [search, setSearch] = useState(''); const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { void (async () => { if (!auth.accessToken) return; setLoading(true); try { const r = kind === 'fuel' ? await getFuelEntries(auth.accessToken, { search, status }) : await getExpenses(auth.accessToken, { search, status }); setItems(r.data.items); setError(null); } catch { setError(`Failed to load ${kind} records.`); } finally { setLoading(false); } })(); }, [auth.accessToken, kind, search, status]);
  if (loading) return <LoadingState message={`Loading ${kind} records...`} />; if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  const createPermission = `${kind}_create`;
  const columns = [
    { key: 'date', header: 'Date', render: (x: FuelRecord | ExpenseRecord) => new Date(kind === 'fuel' ? (x as FuelRecord).fuelDate : (x as ExpenseRecord).expenseDate).toLocaleDateString() },
    { key: 'vehicle', header: 'Vehicle', render: (x: FuelRecord | ExpenseRecord) => x.vehicle.vehicleNumber },
    { key: 'reference', header: kind === 'fuel' ? 'Station / Fuel' : 'Category / Vendor', render: (x: FuelRecord | ExpenseRecord) => kind === 'fuel' ? `${(x as FuelRecord).stationName ?? '-'} / ${(x as FuelRecord).fuelType}` : `${(x as ExpenseRecord).category} / ${(x as ExpenseRecord).vendor ?? '-'}` },
    { key: 'amount', header: 'Amount', render: (x: FuelRecord | ExpenseRecord) => Number(kind === 'fuel' ? (x as FuelRecord).totalAmount : (x as ExpenseRecord).amount).toFixed(2) },
    { key: 'status', header: 'Status', render: (x: FuelRecord | ExpenseRecord) => <StatusBadge status={x.status} /> },
  ];
  return <section><PageHeader title={kind === 'fuel' ? 'Fuel' : 'Expenses'} description={`${items.length} records`} actions={auth.hasPermission(createPermission) ? [<button key="new" className="primary-button" onClick={() => navigate(`/${kind === 'fuel' ? 'fuel' : 'expenses'}/new`)}>Create {kind === 'fuel' ? 'Fuel Entry' : 'Expense'}</button>] : undefined} />
    <div className="card trips-filter-card"><div className="trips-filter-row"><input className="trips-search-input" placeholder={`Search ${kind}...`} value={search} onChange={(e) => setSearch(e.target.value)} /><select className="trips-filter-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{['DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED'].map((s) => <option key={s}>{s}</option>)}</select></div></div>
    {items.length ? <div className="card"><DataTable columns={columns} data={items} keyExtractor={(x) => x.id} onRowClick={(x) => navigate(`/${kind === 'fuel' ? 'fuel' : 'expenses'}/${x.id}`)} /></div> : <EmptyState message={`No ${kind} records found.`} />}</section>;
}
