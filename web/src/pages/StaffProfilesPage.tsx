import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  listStaffProfiles,
  deleteStaffProfile,
} from '../services/api';
import type { StaffProfileRecord } from '../services/api';

export function StaffProfilesPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [profiles, setProfiles] = useState<StaffProfileRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileTypeFilter, setProfileTypeFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StaffProfileRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canCreate = auth.hasPermission('profile_link_create');
  const canDelete = auth.hasPermission('profile_link_delete');

  const PROFILE_TYPE_OPTIONS = [
    { value: '', label: 'All Types' },
    { value: 'MECHANIC', label: 'Mechanic' },
    { value: 'FINANCE', label: 'Finance' },
    { value: 'COLLECTOR', label: 'Collector' },
    { value: 'EMPLOYEE', label: 'Employee' },
  ];

  async function loadProfiles() {
    if (!auth.accessToken) return;
    setIsLoading(true); setError(null);
    try {
      const r = await listStaffProfiles(auth.accessToken, {
        profileType: profileTypeFilter || undefined,
        page,
        limit: 20,
      });
      setProfiles(r.data.items);
      setTotal(r.data.total);
      setPage(r.data.page);
      setTotalPages(r.data.totalPages);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load staff profiles.');
    } finally { setIsLoading(false); }
  }

  useEffect(() => { void loadProfiles(); }, [auth.accessToken, profileTypeFilter, page]);

  async function handleDelete() {
    if (!auth.accessToken || !deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteStaffProfile(auth.accessToken, deleteTarget.id);
      showToast(`Staff profile "${deleteTarget.name}" deleted.`, 'success');
      setProfiles(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Failed to delete.', 'error');
    } finally { setIsDeleting(false); }
  }

  if (isLoading) return <LoadingState message="Loading staff profiles..." />;
  if (error) return <ErrorState message={error} onRetry={loadProfiles} />;

  return (
    <section className="page-content">
      <div className="section-header">
        <div>
          <PageHeader eyebrow="Admin" title="Staff Profiles"
            description="Manage operational profiles for mechanics, finance, collectors, and custom roles." />
        </div>
        <div className="action-panel">
          {canCreate ? (
            <button type="button" className="primary-button" onClick={() => navigate('/staff-profiles/new')}>
              Create Staff Profile
            </button>
          ) : null}
        </div>
      </div>

      <article className="card">
        <div className="table-toolbar">
          <h3 className="table-toolbar-title">Profiles</h3>
          <p className="table-toolbar-copy">{total} total</p>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem' }}>
              <span>Filter: </span>
              <select value={profileTypeFilter} onChange={e => { setProfileTypeFilter(e.target.value); setPage(1); }}>
                {PROFILE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
        </div>
        {profiles.length === 0 ? (
          <EmptyState title="No staff profiles" message="Create your first staff profile."
            action={canCreate ? <button type="button" className="primary-button" onClick={() => navigate('/staff-profiles/new')}>Create Staff Profile</button> : null} />
        ) : (
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (p: StaffProfileRecord) => <span style={{ fontWeight: 500 }}>{p.name}</span> },
              { key: 'profileType', header: 'Type', render: (p: StaffProfileRecord) => PROFILE_TYPE_OPTIONS.find(o => o.value === p.profileType)?.label ?? p.profileType },
              { key: 'email', header: 'Email', render: (p: StaffProfileRecord) => p.email ?? '-' },
              { key: 'phone', header: 'Phone', render: (p: StaffProfileRecord) => p.phone ?? '-' },
              { key: 'status', header: 'Status', render: (p: StaffProfileRecord) => <StatusBadge status={p.status} />, width: '100px' },
              {
                key: 'actions', header: '', width: '150px',
                render: (p: StaffProfileRecord) => (
                  <div className="action-panel" style={{ gap: '0.25rem' }}>
                    <button type="button" className="secondary-button" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                      onClick={e => { e.stopPropagation(); navigate(`/staff-profiles/${p.id}`); }}>View</button>
                    {canDelete && (
                      <button type="button" className="danger-button" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                        onClick={e => { e.stopPropagation(); setDeleteTarget(p); }}>Delete</button>
                    )}
                  </div>
                ),
              },
            ]}
            data={profiles}
            keyExtractor={(p: StaffProfileRecord) => p.id}
            onRowClick={(p) => navigate(`/staff-profiles/${p.id}`)}
          />
        )}
      </article>

      {totalPages > 1 && (
        <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button type="button" className="secondary-button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span style={{ padding: '0.5rem', fontSize: '0.85rem' }}>Page {page} of {totalPages}</span>
          <button type="button" className="secondary-button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete staff profile"
        description={`Permanently delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete" tone="danger" isConfirming={isDeleting}
        onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} />
    </section>
  );
}
