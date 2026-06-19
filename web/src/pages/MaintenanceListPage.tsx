import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { getMaintenances } from '../services/api';
import type { MaintenanceRecord } from '../types/auth';

export function MaintenanceListPage() {
  const auth = useAuth(); const navigate = useNavigate();
  const [items, setItems] = useState<MaintenanceRecord[]>([]); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [priority, setPriority] = useState('');
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { void (async () => { if (!auth.accessToken) return; setLoading(true); try { const r = await getMaintenances(auth.accessToken, { search, status, priority }); setItems(r.data.items); setError(null); } catch { setError('Failed to load maintenance requests.'); } finally { setLoading(false); } })(); }, [auth.accessToken, search, status, priority]);
  if (loading) return <LoadingState message="Loading maintenance requests..." />; if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  const columns = [
    { key: 'issueTitle', header: 'ID / Title', render: (x: MaintenanceRecord) => `${x.id.slice(0, 8)} - ${x.issueTitle}` },
    { key: 'vehicle', header: 'Vehicle', render: (x: MaintenanceRecord) => x.vehicle.vehicleNumber },
    { key: 'priority', header: 'Priority', render: (x: MaintenanceRecord) => <StatusBadge status={x.priority} /> },
    { key: 'status', header: 'Status', render: (x: MaintenanceRecord) => <StatusBadge status={x.status} /> },
    { key: 'reportedAt', header: 'Date reported', render: (x: MaintenanceRecord) => new Date(x.reportedAt).toLocaleDateString() },
  ];
  return <section><PageHeader title="Maintenance Requests" description={`${items.length} records`} actions={auth.hasPermission('maintenance_create') ? [<button key="new" className="primary-button" onClick={() => navigate('/maintenance/new')}>Create Request</button>] : undefined} />
    <div className="card trips-filter-card"><div className="trips-filter-row"><input className="trips-search-input" placeholder="Search maintenance..." value={search} onChange={(e) => setSearch(e.target.value)} /><select className="trips-filter-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{['DRAFT','SUBMITTED','APPROVED','IN_PROGRESS','COMPLETED','REJECTED','CANCELLED'].map((s) => <option key={s}>{s}</option>)}</select><select className="trips-filter-select" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="">All priorities</option>{['LOW','MEDIUM','HIGH','CRITICAL'].map((p) => <option key={p}>{p}</option>)}</select></div></div>
    {items.length ? <div className="card"><DataTable columns={columns} data={items} keyExtractor={(x) => x.id} onRowClick={(x) => navigate(`/maintenance/${x.id}`)} /></div> : <EmptyState message="No maintenance requests found." />}</section>;
}
