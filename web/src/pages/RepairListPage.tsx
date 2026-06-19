import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { getRepairs } from '../services/api';
import type { RepairRecord } from '../types/auth';

export function RepairListPage() {
  const auth = useAuth(); const navigate = useNavigate();
  const [items, setItems] = useState<RepairRecord[]>([]); const [search, setSearch] = useState(''); const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { void (async () => { if (!auth.accessToken) return; setLoading(true); try { const r = await getRepairs(auth.accessToken, { search, status }); setItems(r.data.items); setError(null); } catch { setError('Failed to load repairs.'); } finally { setLoading(false); } })(); }, [auth.accessToken, search, status]);
  if (loading) return <LoadingState message="Loading repairs..." />; if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  const columns = [
    { key: 'repairType', header: 'Type', render: (x: RepairRecord) => x.repairType },
    { key: 'vehicle', header: 'Vehicle', render: (x: RepairRecord) => x.vehicle.vehicleNumber },
    { key: 'mechanic', header: 'Mechanic', render: (x: RepairRecord) => x.assignedMechanic?.name ?? '-' },
    { key: 'status', header: 'Status', render: (x: RepairRecord) => <StatusBadge status={x.status} /> },
    { key: 'cost', header: 'Cost', render: (x: RepairRecord) => x.totalCost != null ? Number(x.totalCost).toFixed(2) : '-' },
    { key: 'createdAt', header: 'Created', render: (x: RepairRecord) => new Date(x.createdAt).toLocaleDateString() },
  ];
  return <section><PageHeader title="Repairs" description={`${items.length} records`} actions={auth.hasPermission('repair_create') ? [<button key="new" className="primary-button" onClick={() => navigate('/repairs/new')}>Create Repair</button>] : undefined} />
    <div className="card trips-filter-card"><div className="trips-filter-row"><input className="trips-search-input" placeholder="Search repairs..." value={search} onChange={(e) => setSearch(e.target.value)} /><select className="trips-filter-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{['DRAFT','SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'].map((s) => <option key={s}>{s}</option>)}</select></div></div>
    {items.length ? <div className="card"><DataTable columns={columns} data={items} keyExtractor={(x) => x.id} onRowClick={(x) => navigate(`/repairs/${x.id}`)} /></div> : <EmptyState message="No repairs found." />}</section>;
}
