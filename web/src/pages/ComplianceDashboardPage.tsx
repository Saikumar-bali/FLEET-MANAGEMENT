import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getComplianceDashboard, getExpiringSoon, getExpired } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import type { ComplianceDashboard, VehicleComplianceDocument } from '../types/auth';

export function ComplianceDashboardPage() {
  const auth = useAuth();
  const [dashboard, setDashboard] = useState<ComplianceDashboard | null>(null);
  const [expiring, setExpiring] = useState<VehicleComplianceDocument[]>([]);
  const [expired, setExpired] = useState<VehicleComplianceDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
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
        setError('Failed to load compliance dashboard.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken]);

  const hasPermission = auth.hasPermission('vehicle_compliance_view');

  return (
    <section className="page-content">
      <PageHeader
        title="Compliance Dashboard"
        description="India vehicle compliance overview — insurance, permits, fitness, PUC, road tax, FASTag, and AIS-140 GPS tracking."
      />

      {!hasPermission ? (
        <div className="card">
          <p className="helper-text">You do not have permission to view the compliance dashboard.</p>
        </div>
      ) : isLoading ? (
        <div className="card">
          <p className="helper-text">Loading compliance data...</p>
        </div>
      ) : error ? (
        <div className="card">
          <div className="error-banner">{error}</div>
        </div>
      ) : dashboard ? (
        <>
          <article className="card">
            <div className="dashboard-grid">
              <div className="content-span-2 metric-card">
                <p className="metric-label">Total Documents</p>
                <p className="metric-value">{dashboard.totalDocuments}</p>
                <p className="table-secondary">Compliance documents tracked</p>
              </div>
              <div className="content-span-2 metric-card">
                <p className="metric-label">Expired</p>
                <p className="metric-value" style={{ color: dashboard.expired > 0 ? '#dc3545' : undefined }}>{dashboard.expired}</p>
                <p className="table-secondary">Documents past expiry</p>
              </div>
              <div className="content-span-2 metric-card">
                <p className="metric-label">Expiring in 7 days</p>
                <p className="metric-value" style={{ color: dashboard.expiring7Days > 0 ? '#fd7e14' : undefined }}>{dashboard.expiring7Days}</p>
                <p className="table-secondary">Action required soon</p>
              </div>
              <div className="content-span-2 metric-card">
                <p className="metric-label">Expiring in 30 days</p>
                <p className="metric-value" style={{ color: dashboard.expiring30Days > 0 ? '#fd7e14' : undefined }}>{dashboard.expiring30Days}</p>
                <p className="table-secondary">Plan renewal</p>
              </div>
              <div className="content-span-2 metric-card">
                <p className="metric-label">Pending Verification</p>
                <p className="metric-value" style={{ color: dashboard.pendingVerification > 0 ? '#6c757d' : undefined }}>{dashboard.pendingVerification}</p>
                <p className="table-secondary">Awaiting admin review</p>
              </div>
            </div>
          </article>

          {expired.length > 0 ? (
            <article className="card">
              <div className="table-toolbar">
                <div>
                  <h3 className="table-toolbar-title" style={{ color: '#dc3545' }}>Expired Documents</h3>
                  <p className="table-toolbar-copy">These documents have already expired and need immediate attention.</p>
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Document #</th>
                    <th>Expired On</th>
                  </tr>
                </thead>
                <tbody>
                  {expired.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <Link to={`/vehicles/${doc.vehicleId}`} className="table-link">
                          {doc.vehicle?.vehicleNumber ?? doc.vehicleId}
                        </Link>
                      </td>
                      <td>{doc.complianceType.replace(/_/g, ' ')}</td>
                      <td>{doc.documentNumber ?? '--'}</td>
                      <td>{doc.validTo ? new Date(doc.validTo).toLocaleDateString() : '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ) : null}

          {expiring.length > 0 ? (
            <article className="card">
              <div className="table-toolbar">
                <div>
                  <h3 className="table-toolbar-title" style={{ color: '#fd7e14' }}>Expiring Within 30 Days</h3>
                  <p className="table-toolbar-copy">Plan renewals for these documents before they expire.</p>
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Document #</th>
                    <th>Expires On</th>
                    <th>Days Left</th>
                  </tr>
                </thead>
                <tbody>
                  {expiring.map((doc) => {
                    const daysLeft = Math.ceil((new Date(doc.validTo!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={doc.id}>
                        <td>
                          <Link to={`/vehicles/${doc.vehicleId}`} className="table-link">
                            {doc.vehicle?.vehicleNumber ?? doc.vehicleId}
                          </Link>
                        </td>
                        <td>{doc.complianceType.replace(/_/g, ' ')}</td>
                        <td>{doc.documentNumber ?? '--'}</td>
                        <td>{doc.validTo ? new Date(doc.validTo).toLocaleDateString() : '--'}</td>
                        <td style={{ color: daysLeft <= 7 ? '#dc3545' : '#fd7e14', fontWeight: 600 }}>{daysLeft}d</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </article>
          ) : null}

          {expired.length === 0 && expiring.length === 0 ? (
            <article className="card">
              <div className="info-banner">All compliance documents are current. No expired or expiring documents found.</div>
            </article>
          ) : null}

          <article className="card">
            <div className="table-toolbar">
              <div>
                <h3 className="table-toolbar-title">Quick Links</h3>
              </div>
            </div>
            <div className="quick-link-grid">
              <Link className="quick-link-card" to="/vehicles">
                <strong>My Fleet</strong>
                <span>View all vehicles and their compliance status</span>
              </Link>
            </div>
          </article>
        </>
      ) : null}
    </section>
  );
}
