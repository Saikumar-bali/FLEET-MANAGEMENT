import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createDriver, getDriver, getDriverLinkedAccount, updateDriver, updateDriverStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { DriverRecord } from '../types/auth';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { LinkedDocumentsPanel } from '../components/documents/LinkedDocumentsPanel';
import { API_BASE_URL } from '../config/api';

type LinkedUserSummary = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  mobile: string | null;
  status: string;
  userDriverId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: { id: string; name: string; key: string };
};

type DriverForm = {
  name: string;
  mobile: string;
  alternateMobile: string;
  licenseNumber: string;
  licenseExpiry: string;
  address: string;
  emergencyContact: string;
  experienceYears: string;
};

const initialForm: DriverForm = {
  name: '',
  mobile: '',
  alternateMobile: '',
  licenseNumber: '',
  licenseExpiry: '',
  address: '',
  emergencyContact: '',
  experienceYears: '',
};

type SectionTab = 'personal' | 'license' | 'documents' | 'status' | 'account' | 'vehicle' | 'capabilities' | 'activity';

export function DriverDetailPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const auth = useAuth();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<DriverRecord | null>(null);
  const [form, setForm] = useState<DriverForm>(initialForm);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionTab>('personal');
  const [statusValue, setStatusValue] = useState('');
  const [linkedUser, setLinkedUser] = useState<LinkedUserSummary | null>(null);
  const [assignmentData, setAssignmentData] = useState<any>(null);
  const [activityData, setActivityData] = useState<any>(null);
  const [permissionsData, setPermissionsData] = useState<any>(null);
  const [assignVehicleId, setAssignVehicleId] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const canManageDriverAccount = auth.user?.role?.key !== 'driver' && auth.hasAnyPermission(['user_view', 'user_update']);

  useEffect(() => {
    if (isNew || !id) return;
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getDriver(auth.accessToken, id);
        setDriver(response.data);
        setStatusValue(response.data.status);
        setLinkedUser(null);
        setForm({
          name: response.data.name,
          mobile: response.data.mobile,
          alternateMobile: response.data.alternateMobile ?? '',
          licenseNumber: response.data.licenseNumber,
          licenseExpiry: response.data.licenseExpiry ?? '',
          address: response.data.address ?? '',
          emergencyContact: response.data.emergencyContact ?? '',
          experienceYears: response.data.experienceYears?.toString() ?? '',
        });
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setError(caughtError.message);
        else setError('Failed to load driver.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken, id, isNew]);

  // Fetch linked account data when Login Account tab is active
  useEffect(() => {
    if (isNew || !id || !auth.accessToken || activeSection !== 'account' || !canManageDriverAccount) return;
    const load = async () => {
      try {
        const res = await getDriverLinkedAccount(auth.accessToken!, id);
        setLinkedUser(res.data.linkedUser as LinkedUserSummary | null);
      } catch {
        setLinkedUser(null);
      }
    };
    void load();
  }, [auth.accessToken, id, isNew, activeSection, canManageDriverAccount]);

  // Load vehicle assignment data
  useEffect(() => {
    if (isNew || !id || !auth.accessToken || activeSection !== 'vehicle' || !canManageDriverAccount) return;
    const load = async () => {
      try {
        const [assignRes, vehiclesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/drivers/${id}/assignment`, { headers: { Authorization: `Bearer ${auth.accessToken}` } }).then(r => r.json()),
          fetch(`${API_BASE_URL}/vehicles?limit=100`, { headers: { Authorization: `Bearer ${auth.accessToken}` } }).then(r => r.json()),
        ]);
        setAssignmentData(assignRes.data);
        setVehicles(vehiclesRes.data?.items || []);
      } catch { setAssignmentData(null); }
    };
    void load();
  }, [auth.accessToken, id, isNew, activeSection, canManageDriverAccount]);

  // Load activity data
  useEffect(() => {
    if (isNew || !id || !auth.accessToken || activeSection !== 'activity' || !canManageDriverAccount) return;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/drivers/${id}/activity?limit=50`, { headers: { Authorization: `Bearer ${auth.accessToken}` } }).then(r => r.json());
        setActivityData(res.data);
      } catch { setActivityData(null); }
    };
    void load();
  }, [auth.accessToken, id, isNew, activeSection, canManageDriverAccount]);

  // Load permissions data
  useEffect(() => {
    if (isNew || !id || !auth.accessToken || activeSection !== 'capabilities' || !canManageDriverAccount) return;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/drivers/${id}/effective-permissions`, { headers: { Authorization: `Bearer ${auth.accessToken}` } }).then(r => r.json());
        setPermissionsData(res.data);
      } catch { setPermissionsData(null); }
    };
    void load();
  }, [auth.accessToken, id, isNew, activeSection, canManageDriverAccount]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        mobile: form.mobile,
        licenseNumber: form.licenseNumber,
      };
      if (form.alternateMobile) payload.alternateMobile = form.alternateMobile;
      if (form.licenseExpiry) payload.licenseExpiry = form.licenseExpiry;
      if (form.address) payload.address = form.address;
      if (form.emergencyContact) payload.emergencyContact = form.emergencyContact;
      if (form.experienceYears) payload.experienceYears = parseInt(form.experienceYears);

      let response;
      if (isNew) {
        response = await createDriver(auth.accessToken, payload as any);
        setMessage('Driver created successfully.');
        navigate(`/drivers/${response.data.id}`, { replace: true });
      } else if (id) {
        response = await updateDriver(auth.accessToken, id, payload as any);
        setDriver(response.data);
        setMessage('Driver updated successfully.');
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to save driver.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange() {
    if (!auth.accessToken || !id || isNew) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await updateDriverStatus(auth.accessToken, id, statusValue);
      setDriver(response.data);
      setMessage(`Driver status updated to ${statusValue.replace(/_/g, ' ')}.`);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to update status.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAssignVehicle() {
    if (!auth.accessToken || !id || !assignVehicleId) return;
    setIsAssigning(true);
    try {
      await fetch(`${API_BASE_URL}/drivers/${id}/assign-vehicle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId: assignVehicleId }),
      }).then(r => r.json());
      setAssignVehicleId('');
      setMessage('Vehicle assigned successfully.');
      const res = await fetch(`${API_BASE_URL}/drivers/${id}/assignment`, { headers: { Authorization: `Bearer ${auth.accessToken}` } }).then(r => r.json());
      setAssignmentData(res.data);
    } catch { setError('Failed to assign vehicle.'); }
    finally { setIsAssigning(false); }
  }

  async function handleUnassignVehicle() {
    if (!auth.accessToken || !id) return;
    setIsAssigning(true);
    try {
      await fetch(`${API_BASE_URL}/drivers/${id}/unassign-vehicle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      }).then(r => r.json());
      setMessage('Vehicle unassigned successfully.');
      const res = await fetch(`${API_BASE_URL}/drivers/${id}/assignment`, { headers: { Authorization: `Bearer ${auth.accessToken}` } }).then(r => r.json());
      setAssignmentData(res.data);
    } catch { setError('Failed to unassign vehicle.'); }
    finally { setIsAssigning(false); }
  }

  if (isLoading) return <LoadingState message="Loading driver..." />;
  if (error && !driver && !isNew) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const canEdit = auth.hasPermission('driver_update');
  const canChangeStatus = auth.hasAnyPermission(['driver_update', 'driver_delete']);

  const sectionTabs: { key: SectionTab; label: string }[] = [
    { key: 'personal', label: 'Personal Info' },
    { key: 'license', label: 'License' },
    { key: 'documents', label: 'Documents' },
    { key: 'status', label: 'Status' },
  ];
  if (canManageDriverAccount) {
    sectionTabs.push({ key: 'account', label: 'Login Account' });
    sectionTabs.push({ key: 'vehicle', label: 'Assigned Vehicle' });
    sectionTabs.push({ key: 'capabilities', label: 'Capabilities' });
    sectionTabs.push({ key: 'activity', label: 'Activity' });
  }
  // Reset activeSection if current section is no longer available
  const availableSections = new Set(sectionTabs.map((t) => t.key));
  const effectiveSection = availableSections.has(activeSection) ? activeSection : 'personal';

  return (
    <section className="page-content">
      <div className="section-header">
        <div>
          <a href="/drivers" className="trip-back-link">Back to Drivers</a>
          <PageHeader
            title={isNew ? 'Add Driver' : driver ? driver.name : 'Driver'}
            description={isNew ? 'Register a new driver' : undefined}
          />
        </div>
        <div className="action-panel">
          {!isNew && driver ? <StatusBadge status={driver.status} /> : null}
          {canEdit && !isNew ? (
            <button type="submit" form="driver-form" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="success-banner">{message}</div> : null}

      {!isNew ? (
        <div className="detail-tabs">
          {sectionTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`detail-tab${effectiveSection === tab.key ? ' detail-tab-active' : ''}`}
              onClick={() => setActiveSection(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      <form id="driver-form" className="form-main" onSubmit={handleSubmit}>
        {isNew || effectiveSection === 'personal' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Personal Information</h4>
            <label>
              <span className="field-label">Name *</span>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required disabled={!isNew && !canEdit} />
            </label>
            <div className="form-two-column">
              <label>
                <span className="field-label">Mobile *</span>
                <input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} required disabled={!isNew && !canEdit} />
              </label>
              <label>
                <span className="field-label">Alternate Mobile</span>
                <input value={form.alternateMobile} onChange={(e) => setForm((f) => ({ ...f, alternateMobile: e.target.value }))} disabled={!canEdit} />
              </label>
            </div>
            <label>
              <span className="field-label">Address</span>
              <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} disabled={!canEdit} />
            </label>
            <label>
              <span className="field-label">Emergency Contact</span>
              <input value={form.emergencyContact} onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))} disabled={!canEdit} />
            </label>
            {isNew ? (
              <>
                <h4 className="role-edit-h4">License Information</h4>
                <label>
                  <span className="field-label">License Number *</span>
                  <input value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} required />
                </label>
                <div className="form-two-column">
                  <label>
                    <span className="field-label">License Expiry</span>
                    <input type="date" value={form.licenseExpiry ? form.licenseExpiry.substring(0, 10) : ''} onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))} />
                  </label>
                  <label>
                    <span className="field-label">Experience (Years)</span>
                    <input type="number" min={0} value={form.experienceYears} onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))} />
                  </label>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {!isNew && effectiveSection === 'license' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">License Information</h4>
            <label>
              <span className="field-label">License Number *</span>
              <input value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} required disabled={!isNew && !canEdit} />
            </label>
            <div className="form-two-column">
              <label>
                <span className="field-label">License Expiry</span>
                <input type="date" value={form.licenseExpiry ? form.licenseExpiry.substring(0, 10) : ''} onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))} disabled={!canEdit} />
              </label>
              <label>
                <span className="field-label">Experience (Years)</span>
                <input type="number" min={0} value={form.experienceYears} onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))} disabled={!canEdit} />
              </label>
            </div>
          </div>
        ) : null}

        {!isNew && effectiveSection === 'documents' && driver ? (
          <div className="card form-section-grid">
            <LinkedDocumentsPanel
              linkedEntityType="DRIVER"
              linkedEntityId={driver.id}
              driverId={driver.id}
              defaultDocumentCategory="DRIVER"
              allowedDocumentTypes={['DRIVER_LICENSE', 'DRIVER_ID_PROOF', 'GENERAL']}
              title={`Documents — ${driver.name}`}
              subtitle={`${driver.licenseNumber ? `License: ${driver.licenseNumber}` : 'Upload license, ID proof, and other driver documents'}`}
              canUpload={auth.hasPermission('documents_upload')}
              canDownload={auth.hasPermission('documents_download')}
              canArchive={auth.hasPermission('documents_archive')}
              canDelete={auth.hasPermission('documents_delete')}
              canVerify={auth.hasPermission('documents_verify')}
            />
          </div>
        ) : null}

        {!isNew && effectiveSection === 'status' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Status Management</h4>
            {canChangeStatus ? (
              <div className="action-panel">
                <label className="role-status-label">
                  <span className="field-label">Status:</span>
                  <select
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value)}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>
                <button type="button" className="primary-button" onClick={() => void handleStatusChange()} disabled={isSaving}>
                  {isSaving ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            ) : (
              <p className="helper-text">You do not have permission to change status.</p>
            )}
            {driver ? (
              <div className="form-two-column">
                <div>
                  <p className="detail-label">Created</p>
                  <p className="detail-value">{new Date(driver.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="detail-label">Last Updated</p>
                  <p className="detail-value">{new Date(driver.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {!isNew && effectiveSection === 'account' && canManageDriverAccount ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Linked Login Account</h4>
            {linkedUser ? (
              <div>
                <div className="detail-grid">
                  <div>
                    <p className="detail-label">Account Status</p>
                    <StatusBadge status={linkedUser.status} />
                  </div>
                  <div>
                    <p className="detail-label">Username</p>
                    <p className="detail-value">{linkedUser.username ? `@${linkedUser.username}` : 'Not set'}</p>
                  </div>
                  <div>
                    <p className="detail-label">Email/Mobile</p>
                    <p className="detail-value">{linkedUser.email} {linkedUser.mobile ? `/ ${linkedUser.mobile}` : ''}</p>
                  </div>
                  <div>
                    <p className="detail-label">Role</p>
                    <p className="detail-value">{linkedUser.role.name}</p>
                  </div>
                  <div>
                    <p className="detail-label">Last Login</p>
                    <p className="detail-value">{linkedUser.lastLoginAt ? new Date(linkedUser.lastLoginAt).toLocaleString() : 'Never'}</p>
                  </div>
                </div>
                <div className="button-row" style={{ marginTop: 'var(--space-4)' }}>
                  <a href={`/users`} className="secondary-button">Manage Account</a>
                </div>
              </div>
            ) : (
              <div>
                <p className="helper-text">This driver does not have a linked login account.</p>
                <div className="button-row" style={{ marginTop: 'var(--space-4)' }}>
                  <a href={`/users`} className="primary-button">Create Driver Login Account</a>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {!isNew && effectiveSection === 'vehicle' && canManageDriverAccount ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Assigned Vehicle</h4>
            {assignmentData ? (
              <>
                {assignmentData.assignedVehicles && assignmentData.assignedVehicles.length > 0 ? (
                  <div>
                    <div className="detail-grid">
                      {assignmentData.assignedVehicles.map((v: any) => (
                        <div key={v.id}>
                          <p className="detail-label">Vehicle Number</p>
                          <p className="detail-value">{v.vehicleNumber}</p>
                          <p className="detail-label">Type</p>
                          <p className="detail-value">{v.vehicleType}</p>
                          <p className="detail-label">Status</p>
                          <p className="detail-value">{v.status}</p>
                          <p className="detail-label">Odometer</p>
                          <p className="detail-value">{v.currentOdometer?.toLocaleString()} km</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 'var(--space-3)' }}>
                      <button type="button" className="secondary-button" onClick={() => void handleUnassignVehicle()} disabled={isAssigning}>
                        {isAssigning ? 'Unassigning...' : 'Unassign Vehicle'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="helper-text" style={{ color: '#ff9800' }}>No vehicle assigned to this driver.</p>
                    {assignmentData.linkedUser && (
                      <p className="helper-text" style={{ marginTop: '8px' }}>Linked user: {assignmentData.linkedUser.username || assignmentData.linkedUser.name} ({assignmentData.linkedUser.status})</p>
                    )}
                    {!assignmentData.linkedUser && (
                      <p className="helper-text" style={{ color: '#f44336', marginTop: '8px' }}>Driver has no linked login account. Create one first before assigning a vehicle.</p>
                    )}
                  </div>
                )}
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <h4 className="role-edit-h4">Assign Vehicle</h4>
                  <div className="action-panel">
                    <select value={assignVehicleId} onChange={(e) => setAssignVehicleId(e.target.value)}>
                      <option value="">Select a vehicle...</option>
                      {vehicles.filter((v: any) => !v.currentDriverId).map((v: any) => (
                        <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleType})</option>
                      ))}
                    </select>
                    <button type="button" className="primary-button" onClick={() => void handleAssignVehicle()} disabled={isAssigning || !assignVehicleId}>
                      {isAssigning ? 'Assigning...' : 'Assign Vehicle'}
                    </button>
                  </div>
                </div>
                {assignmentData.activeTrip && (
                  <div style={{ marginTop: 'var(--space-3)', padding: '12px', background: 'var(--color-info-bg, #e3f2fd)', borderRadius: '6px' }}>
                    <p style={{ margin: 0, fontSize: '13px' }}><strong>Active Trip:</strong> {assignmentData.activeTrip.tripNumber} — {assignmentData.activeTrip.originName} → {assignmentData.activeTrip.destinationName}</p>
                  </div>
                )}
              </>
            ) : <p className="helper-text">Loading...</p>}
          </div>
        ) : null}

        {!isNew && effectiveSection === 'capabilities' && canManageDriverAccount ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Driver Capabilities</h4>
            {permissionsData ? (
              <div>
                <div className="detail-grid">
                  <div><p className="detail-label">Role Permissions</p><p className="detail-value">{permissionsData.rolePermissions?.length ?? 0}</p></div>
                  <div><p className="detail-label">Individual Allow Overrides</p><p className="detail-value">{permissionsData.userAllowedPermissions?.length ?? 0}</p></div>
                  <div><p className="detail-label">Individual Deny Overrides</p><p className="detail-value">{permissionsData.userDeniedPermissions?.length ?? 0}</p></div>
                  <div><p className="detail-label">Effective Permissions</p><p className="detail-value">{permissionsData.effectivePermissions?.length ?? 0}</p></div>
                </div>
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <h5 style={{ fontSize: '14px', marginBottom: '8px' }}>Effective Permissions:</h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(permissionsData.effectivePermissions ?? []).map((p: string) => (
                      <span key={p} style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', background: 'var(--color-success-bg, #e8f5e9)', color: 'var(--color-success-text, #2e7d32)', border: '1px solid var(--color-success-border, #a5d6a7)' }}>{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : <p className="helper-text">Loading...</p>}
          </div>
        ) : null}

        {!isNew && effectiveSection === 'activity' && canManageDriverAccount ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Driver Activity</h4>
            {activityData ? (
              <>
                {activityData.items && activityData.items.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr><th>Action</th><th>Entity</th><th>Entity ID</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {activityData.items.map((log: any) => (
                        <tr key={log.id}>
                          <td><code style={{ fontSize: '12px' }}>{log.action}</code></td>
                          <td>{log.entityType}</td>
                          <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{log.entityId ? log.entityId.substring(0, 12) + '...' : '—'}</td>
                          <td>{new Date(log.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="helper-text">No activity records found.</p>
                )}
              </>
            ) : <p className="helper-text">Loading...</p>}
          </div>
        ) : null}

        {isNew ? (
          <div className="action-panel">
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Driver'}
            </button>
            <button type="button" className="secondary-button" onClick={() => navigate('/drivers')}>
              Cancel
            </button>
          </div>
        ) : null}
      </form>
    </section>
  );
}
