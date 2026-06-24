import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getComplianceDashboard, getExpiringSoon, getExpired } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { ComplianceDashboard, VehicleComplianceDocument } from '../types/auth';
import { PageShell } from '../components/ui/PageShell';
import { StatCard } from '../components/ui/StatCard';
import { KpiGrid } from '../components/ui/KpiGrid';
import { ChartCard } from '../components/ui/ChartCard';
import { DataTable } from '../components/ui/DataTable';
import type { ColumnDef } from '../components/ui/DataTable';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ActionButton } from '../components/ui/ActionToolbar';
import { ShieldIcon, AlertIcon, ClockIcon, AlertTriangleIcon, CheckCircleIcon } from '../components/ui/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysLeft(dateStr: Date | string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

interface ExpiryRow {
  id: string;
  vehicle: string;
  vehicleLink: string;
  type: string;
  docNumber: string;
  expiresOn: string;
  daysLeft: number;
}

export function ComplianceDashboardPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const [dashboard, setDashboard] = useState<ComplianceDashboard | null>(null);
  const [expiring, setExpiring] = useState<VehicleComplianceDocument[]>([]);
  const [expired, setExpired] = useState<VehicleComplianceDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [dash, exp7, exp] = await Promise.all([
        getComplianceDashboard(auth.accessToken),
        getExpiringSoon(auth.accessToken, 30),
        getExpired(auth.accessToken),
      ]);
      setDashboard(dash.data as ComplianceDashboard);
      setExpiring((exp7.data as VehicleComplianceDocument[]) ?? []);
      setExpired((exp.data as VehicleComplianceDocument[]) ?? []);
    } catch {
      const msg = 'Failed to load compliance dashboard.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [auth.accessToken]);

  useEffect(() => { void load(); }, [load]);

  const hasPermission = auth.hasPermission('vehicle_compliance_view');

  if (isLoading) {
    return (
      <PageShell>
        <LoadingSkeleton rows={4} columns={4} />
      </PageShell>
    );
  }

  if (!hasPermission) {
    return (
      <PageShell>
        <div className="empty-state-panel">
          <p>You do not have permission to view the compliance dashboard.</p>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="error-banner">{error}</div>
        <ActionButton label="Retry" variant="primary" onClick={load} />
      </PageShell>
    );
  }

  const expiredRows: ExpiryRow[] = expired.map((doc) => ({
    id: doc.id,
    vehicle: doc.vehicle?.vehicleNumber ?? doc.vehicleId.slice(0, 8),
    vehicleLink: doc.vehicleId,
    type: doc.complianceType.replace(/_/g, ' '),
    docNumber: doc.documentNumber ?? '--',
    expiresOn: formatDate(doc.validTo),
    daysLeft: doc.validTo ? daysLeft(doc.validTo) : 0,
  }));

  const expiringRows: ExpiryRow[] = expiring.map((doc) => ({
    id: doc.id,
    vehicle: doc.vehicle?.vehicleNumber ?? doc.vehicleId.slice(0, 8),
    vehicleLink: doc.vehicleId,
    type: doc.complianceType.replace(/_/g, ' '),
    docNumber: doc.documentNumber ?? '--',
    expiresOn: formatDate(doc.validTo),
    daysLeft: doc.validTo ? daysLeft(doc.validTo) : 0,
  }));

  const docTypeData = dashboard
    ? [
        { name: 'Expired', value: dashboard.expired },
        { name: 'Expiring 7d', value: dashboard.expiring7Days },
        { name: 'Expiring 30d', value: dashboard.expiring30Days },
        { name: 'Pending Verif.', value: dashboard.pendingVerification },
      ]
    : [];

  const allDocs = dashboard ? [
    { name: 'Valid', value: dashboard.totalDocuments - dashboard.expired - dashboard.expiring30Days - dashboard.expiring7Days - dashboard.pendingVerification },
    { name: 'Expiring', value: dashboard.expiring30Days + dashboard.expiring7Days },
    { name: 'Expired', value: dashboard.expired },
    { name: 'Pending', value: dashboard.pendingVerification },
  ].filter((d) => d.value >= 0) : [];

  const riskLevel = (dashboard?.expired ?? 0) > 0 ? 'high' : (dashboard?.expiring7Days ?? 0) > 0 ? 'medium' : 'low';

  const expiredColumns: ColumnDef<ExpiryRow>[] = [
    { header: 'Vehicle', accessor: (row) => <Link to={`/vehicles/${row.vehicleLink}`} className="table-link">{row.vehicle}</Link> },
    { header: 'Type', accessor: 'type' },
    { header: 'Document #', accessor: 'docNumber' },
    { header: 'Expired On', accessor: 'expiresOn' },
  ];

  const expiringColumns: ColumnDef<ExpiryRow>[] = [
    { header: 'Vehicle', accessor: (row) => <Link to={`/vehicles/${row.vehicleLink}`} className="table-link">{row.vehicle}</Link> },
    { header: 'Type', accessor: 'type' },
    { header: 'Document #', accessor: 'docNumber' },
    { header: 'Expires On', accessor: 'expiresOn' },
    {
      header: 'Days Left',
      accessor: (row) => (
        <span className={row.daysLeft <= 7 ? 'text-danger' : 'text-warning'} style={{ fontWeight: 600 }}>
          {row.daysLeft}d
        </span>
      ),
      align: 'right',
    },
  ];

  return (
    <PageShell>
      <div className="dashboard-command-header">
        <div className="dashboard-command-header-main">
          <h1>Compliance Control Center</h1>
          <p className="dashboard-command-subtitle">
            Insurance, permit, fitness, PUC, road tax, FASTag, and AIS-140 GPS tracking
          </p>
        </div>
        <div className="dashboard-command-meta">
          <span className={`compliance-risk-badge compliance-risk-badge-${riskLevel}`}>
            {riskLevel === 'high' ? 'High Risk' : riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk'}
          </span>
          <ActionButton label="Refresh" variant="ghost" onClick={load} />
          <ActionButton label="My Fleet" variant="secondary" onClick={() => window.location.href = '/vehicles'} />
        </div>
      </div>

      {dashboard ? (
        <>
          <KpiGrid columns={5}>
            <StatCard label="Total Documents" value={dashboard.totalDocuments} subtext="Compliance documents tracked" variant="default" icon={<ShieldIcon />} />
            <StatCard label="Expired" value={dashboard.expired} subtext="Past expiry date" variant={dashboard.expired > 0 ? 'danger' : 'muted'} icon={<AlertIcon />} />
            <StatCard label="Expiring in 7 Days" value={dashboard.expiring7Days} subtext="Action required soon" variant={dashboard.expiring7Days > 0 ? 'warning' : 'muted'} icon={<ClockIcon />} />
            <StatCard label="Expiring in 30 Days" value={dashboard.expiring30Days} subtext="Plan renewal" variant={dashboard.expiring30Days > 0 ? 'warning' : 'muted'} icon={<AlertTriangleIcon />} />
            <StatCard label="Pending Verification" value={dashboard.pendingVerification} subtext="Awaiting admin review" variant={dashboard.pendingVerification > 0 ? 'info' : 'muted'} icon={<CheckCircleIcon />} />
          </KpiGrid>

          <div className="dashboard-chart-grid">
            <ChartCard title="Document Status" subtitle="Current compliance document health">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={allDocs}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {allDocs.map((entry, i) => {
                      const fill = entry.name === 'Expired' ? '#d93025' : entry.name === 'Expiring' ? '#e37400' : entry.name === 'Pending' ? '#1a73e8' : '#1e8e3e';
                      return <Cell key={i} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Expiry Timeline" subtitle="Documents by expiry status">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={docTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {docTypeData.map((_, i) => {
                      const fill = ['#d93025', '#e37400', '#f59e0b', '#1a73e8'][i % 4];
                      return <Cell key={i} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {expiredRows.length > 0 && (
            <div className="dashboard-table-card">
              <div className="chart-card-header">
                <div>
                  <h3 className="chart-card-title text-danger">Expired Documents</h3>
                  <p className="chart-card-subtitle">These documents have already expired and need immediate attention.</p>
                </div>
              </div>
              <DataTable columns={expiredColumns} data={expiredRows} keyExtractor={(r) => r.id} />
            </div>
          )}

          {expiringRows.length > 0 && (
            <div className="dashboard-table-card">
              <div className="chart-card-header">
                <div>
                  <h3 className="chart-card-title text-warning">Expiring Within 30 Days</h3>
                  <p className="chart-card-subtitle">Plan renewals for these documents before they expire.</p>
                </div>
              </div>
              <DataTable columns={expiringColumns} data={expiringRows} keyExtractor={(r) => r.id} />
            </div>
          )}

          {expiredRows.length === 0 && expiringRows.length === 0 && (
            <div className="success-banner">All compliance documents are current. No expired or expiring documents found.</div>
          )}

          <div className="card">
            <div className="section-header" style={{ marginBottom: 'var(--space-4)' }}>
              <div>
                <h3 className="chart-card-title">Quick Links</h3>
                <p className="chart-card-subtitle">Navigate to key areas</p>
              </div>
            </div>
            <div className="quick-link-grid">
              <Link to="/vehicles" className="quick-link-card">
                <strong>My Fleet</strong>
                <span>View all vehicles and their compliance status</span>
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </PageShell>
  );
}
