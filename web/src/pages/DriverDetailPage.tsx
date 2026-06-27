import { FormEvent, useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createDriver, getDriver, getDriverLinkedAccount, updateDriver, updateDriverStatus, getDriverAssignment, assignVehicleToDriver, unassignVehicleFromDriver, getAssignableVehicles, getDriverActivity, getDriverMenuPreview, getUserEffectivePermissions, getUserPermissionOverrides, updateUserPermissionOverrides } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { DriverRecord } from '../types/auth';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { LinkedDocumentsPanel } from '../components/documents/LinkedDocumentsPanel';
import { DRIVER_CAPABILITY_GROUPS, getCapabilitiesByGroup } from '../config/driverCapabilities';

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
  name: '', mobile: '', alternateMobile: '', licenseNumber: '', licenseExpiry: '', address: '', emergencyContact: '', experienceYears: '',
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
  const [assignableVehicles, setAssignableVehicles] = useState<any[]>([]);
  const [assignVehicleId, setAssignVehicleId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [activityData, setActivityData] = useState<any>(null);
  const [activityPage, setActivityPage] = useState(1);
  const [activityFilter, setActivityFilter] = useState('');

  const [menuPreview, setMenuPreview] = useState<any>(null);
  const [capEffective, setCapEffective] = useState<any>(null);
  const [capAllowKeys, setCapAllowKeys] = useState<string[]>([]);
  const [capDenyKeys, setCapDenyKeys] = useState<string[]>([]);
  const [capReason, setCapReason] = useState('');
  const [isSavingCaps, setIsSavingCaps] = useState(false);

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
          name: response.data.name, mobile: response.data.mobile, alternateMobile: response.data.alternateMobile ?? '',
          licenseNumber: response.data.licenseNumber, licenseExpiry: response.data.licenseExpiry ?? '',
          address: response.data.address ?? '', emergencyContact: response.data.emergencyContact ?? '',
          experienceYears: response.data.experienceYears?.toString() ?? '',
        });
      } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load driver.'); }
      finally { setIsLoading(false); }
    };
    void load();
  }, [auth.accessToken, id, isNew]);

  useEffect(() => {
    if (isNew || !id || !auth.accessToken || activeSection !== 'account' || !canManageDriverAccount) return;
    const load = async () => {
      try {
        const res = await getDriverLinkedAccount(auth.accessToken!, id);
        setLinkedUser(res.data.linkedUser as LinkedUserSummary | null);
      } catch { setLinkedUser(null); }
    };
    void load();
  }, [auth.accessToken, id, isNew, activeSection, canManageDriverAccount]);

  const loadAssignment = useCallback(async () => {
    if (!id || !auth.accessToken) return;
    try {
      const [assignRes, vehiclesRes] = await Promise.all([
        getDriverAssignment(auth.accessToken, id),
        getAssignableVehicles(auth.accessToken),
      ]);
      setAssignmentData(assignRes.data);
      setAssignableVehicles(vehiclesRes.data?.items || []);
    } catch { setAssignmentData(null); }
  }, [auth.accessToken, id]);

  const loadActivity = useCallback(async () => {
    if (!id || !auth.accessToken) return;
    try {
      const res = await getDriverActivity(auth.accessToken, id, { page: activityPage, limit: 50 });
      setActivityData(res.data);
    } catch { setActivityData(null); }
  }, [auth.accessToken, id, activityPage]);

  const loadCapabilities = useCallback(async () => {
    if (!id || !auth.accessToken || !linkedUser) return;
    try {
      const [effRes, , previewRes] = await Promise.all([
        getUserEffectivePermissions(auth.accessToken, linkedUser.id),
        getUserPermissionOverrides(auth.accessToken, linkedUser.id),
        getDriverMenuPreview(auth.accessToken, id),
      ]);
      setCapEffective(effRes.data);
      setMenuPreview(previewRes.data);
      setCapAllowKeys(effRes.data.userAllowedPermissions ?? []);
      setCapDenyKeys(effRes.data.userDeniedPermissions ?? []);
    } catch { /* ignore */ }
  }, [auth.accessToken, id, linkedUser]);

  useEffect(() => {
    if (activeSection === 'vehicle') void loadAssignment();
    if (activeSection === 'activity') void loadActivity();
    if (activeSection === 'capabilities') void loadCapabilities();
  }, [activeSection, loadAssignment, loadActivity, loadCapabilities]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;
    setIsSaving(true); setError(null); setMessage(null);
    try {
      const payload: Record<string, unknown> = { name: form.name, mobile: form.mobile, licenseNumber: form.licenseNumber };
      if (form.alternateMobile) payload.alternateMobile = form.alternateMobile;
      if (form.licenseExpiry) payload.licenseExpiry = form.licenseExpiry;
      if (form.address) payload.address = form.address;
      if (form.emergencyContact) payload.emergencyContact = form.emergencyContact;
      if (form.experienceYears) payload.experienceYears = parseInt(form.experienceYears);
      if (isNew) { const r = await createDriver(auth.accessToken, payload as any); setMessage('Driver created.'); navigate(`/drivers/${r.data.id}`, { replace: true }); }
      else if (id) { const r = await updateDriver(auth.accessToken, id, payload as any); setDriver(r.data); setMessage('Driver updated.'); }
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to save.'); }
    finally { setIsSaving(false); }
  }

  async function handleStatusChange() {
    if (!auth.accessToken || !id || isNew) return;
    setIsSaving(true); setError(null);
    try { const r = await updateDriverStatus(auth.accessToken, id, statusValue); setDriver(r.data); setMessage(`Status updated to ${statusValue.replace(/_/g, ' ')}.`); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed.'); }
    finally { setIsSaving(false); }
  }

  async function handleAssignVehicle() {
    if (!auth.accessToken || !id || !assignVehicleId) return;
    setIsAssigning(true);
    try {
      await assignVehicleToDriver(auth.accessToken, id, assignVehicleId);
      setAssignVehicleId('');
      setMessage('Vehicle assigned.');
      void loadAssignment();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed.'); }
    finally { setIsAssigning(false); }
  }

  async function handleUnassignVehicle() {
    if (!auth.accessToken || !id) return;
    setIsAssigning(true);
    try {
      await unassignVehicleFromDriver(auth.accessToken, id);
      setMessage('Vehicle unassigned.');
      void loadAssignment();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed.'); }
    finally { setIsAssigning(false); }
  }

  async function handleSaveCapabilities() {
    if (!auth.accessToken || !linkedUser) return;
    setIsSavingCaps(true);
    try {
      await updateUserPermissionOverrides(auth.accessToken, linkedUser.id, {
        allow: capAllowKeys,
        deny: capDenyKeys,
        reason: capReason || undefined,
      });
      setMessage('Capabilities saved. Driver must refresh permissions or log in again.');
      void loadCapabilities();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to save.'); }
    finally { setIsSavingCaps(false); }
  }

  function toggleCapability(permissionKey: string, type: 'allow' | 'deny') {
    if (type === 'allow') {
      setCapAllowKeys((prev) => prev.includes(permissionKey) ? prev.filter((k) => k !== permissionKey) : [...prev, permissionKey]);
      setCapDenyKeys((prev) => prev.filter((k) => k !== permissionKey));
    } else {
      setCapDenyKeys((prev) => prev.includes(permissionKey) ? prev.filter((k) => k !== permissionKey) : [...prev, permissionKey]);
      setCapAllowKeys((prev) => prev.filter((k) => k !== permissionKey));
    }
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
  const availableSections = new Set(sectionTabs.map((t) => t.key));
  const effectiveSection = availableSections.has(activeSection) ? activeSection : 'personal';

  const activityItems = activityData?.items ?? [];
  const filteredActivity = activityFilter ? activityItems.filter((l: any) => l.action.includes(activityFilter)) : activityItems;
  const capGroups = getCapabilitiesByGroup();

  return (
    <section className="page-content">
      <div className="section-header">
        <div>
          <a href="/drivers" className="trip-back-link">Back to Drivers</a>
          <PageHeader title={isNew ? 'Add Driver' : driver ? driver.name : 'Driver'} description={isNew ? 'Register a new driver' : undefined} />
        </div>
        <div className="action-panel">
          {!isNew && driver ? <StatusBadge status={driver.status} /> : null}
          {canEdit && !isNew ? (
            <button type="submit" form="driver-form" className="primary-button" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
          ) : null}
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="success-banner">{message}</div> : null}

      {!isNew ? (
        <div className="detail-tabs">
          {sectionTabs.map((tab) => (
            <button key={tab.key} type="button" className={`detail-tab${effectiveSection === tab.key ? ' detail-tab-active' : ''}`} onClick={() => setActiveSection(tab.key)}>{tab.label}</button>
          ))}
        </div>
      ) : null}

      <form id="driver-form" className="form-main" onSubmit={handleSubmit}>
        {isNew || effectiveSection === 'personal' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Personal Information</h4>
            <label><span className="field-label">Name *</span><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required disabled={!isNew && !canEdit} /></label>
            <div className="form-two-column">
              <label><span className="field-label">Mobile *</span><input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} required disabled={!isNew && !canEdit} /></label>
              <label><span className="field-label">Alternate Mobile</span><input value={form.alternateMobile} onChange={(e) => setForm((f) => ({ ...f, alternateMobile: e.target.value }))} disabled={!canEdit} /></label>
            </div>
            <label><span className="field-label">Address</span><textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} disabled={!canEdit} /></label>
            <label><span className="field-label">Emergency Contact</span><input value={form.emergencyContact} onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))} disabled={!canEdit} /></label>
          </div>
        ) : null}
        {!isNew && effectiveSection === 'license' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">License Information</h4>
            <label><span className="field-label">License Number *</span><input value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} required disabled={!canEdit} /></label>
            <div className="form-two-column">
              <label><span className="field-label">License Expiry</span><input type="date" value={form.licenseExpiry ? form.licenseExpiry.substring(0, 10) : ''} onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))} disabled={!canEdit} /></label>
              <label><span className="field-label">Experience (Years)</span><input type="number" min={0} value={form.experienceYears} onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))} disabled={!canEdit} /></label>
            </div>
          </div>
        ) : null}
        {!isNew && effectiveSection === 'documents' && driver ? (
          <div className="card form-section-grid">
            <LinkedDocumentsPanel linkedEntityType="DRIVER" linkedEntityId={driver.id} driverId={driver.id} defaultDocumentCategory="DRIVER" allowedDocumentTypes={['DRIVER_LICENSE', 'DRIVER_ID_PROOF', 'GENERAL']} title={`Documents — ${driver.name}`} subtitle={`${driver.licenseNumber ? `License: ${driver.licenseNumber}` : 'Upload driver documents'}`} canUpload={auth.hasPermission('documents_upload')} canDownload={auth.hasPermission('documents_download')} canArchive={auth.hasPermission('documents_archive')} canDelete={auth.hasPermission('documents_delete')} canVerify={auth.hasPermission('documents_verify')} />
          </div>
        ) : null}
        {!isNew && effectiveSection === 'status' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Status Management</h4>
            {canChangeStatus ? (
              <div className="action-panel">
                <label className="role-status-label"><span className="field-label">Status:</span><select value={statusValue} onChange={(e) => setStatusValue(e.target.value)}><option value="AVAILABLE">Available</option><option value="ON_LEAVE">On Leave</option><option value="INACTIVE">Inactive</option></select></label>
                <button type="button" className="primary-button" onClick={() => void handleStatusChange()} disabled={isSaving}>{isSaving ? 'Updating...' : 'Update Status'}</button>
              </div>
            ) : <p className="helper-text">No permission to change status.</p>}
          </div>
        ) : null}
        {!isNew && effectiveSection === 'account' && canManageDriverAccount ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Linked Login Account</h4>
            {linkedUser ? (
              <div>
                <div className="detail-grid">
                  <div><p className="detail-label">Account Status</p><StatusBadge status={linkedUser.status} /></div>
                  <div><p className="detail-label">Username</p><p className="detail-value">{linkedUser.username ? `@${linkedUser.username}` : 'Not set'}</p></div>
                  <div><p className="detail-label">Email/Mobile</p><p className="detail-value">{linkedUser.email} {linkedUser.mobile ? `/ ${linkedUser.mobile}` : ''}</p></div>
                  <div><p className="detail-label">Role</p><p className="detail-value">{linkedUser.role.name}</p></div>
                  <div><p className="detail-label">Last Login</p><p className="detail-value">{linkedUser.lastLoginAt ? new Date(linkedUser.lastLoginAt).toLocaleString() : 'Never'}</p></div>
                </div>
              </div>
            ) : (
              <div><p className="helper-text">No linked login account. <a href="/users">Create one</a>.</p></div>
            )}
          </div>
        ) : null}
        {isNew ? (
          <div className="action-panel">
            <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Driver'}</button>
            <button type="button" className="secondary-button" onClick={() => navigate('/drivers')}>Cancel</button>
          </div>
        ) : null}
      </form>

      {!isNew && effectiveSection === 'vehicle' && canManageDriverAccount ? (
        <div className="card form-section-grid">
          <h4 className="role-edit-h4">Assigned Vehicle</h4>
          {!linkedUser && assignmentData && (
            <div className="warning-banner" style={{ marginBottom: 'var(--space-3)' }}>No linked login account. Create one before assigning a vehicle.</div>
          )}
          {assignmentData?.assignedVehicles?.length > 0 ? (
            <div>
              {assignmentData.assignedVehicles.map((v: any) => (
                <div key={v.id} className="detail-grid" style={{ marginBottom: 'var(--space-3)' }}>
                  <div><p className="detail-label">Vehicle</p><p className="detail-value">{v.vehicleNumber} ({v.vehicleType})</p></div>
                  <div><p className="detail-label">Status</p><p className="detail-value">{v.status}</p></div>
                  <div><p className="detail-label">Odometer</p><p className="detail-value">{v.currentOdometer?.toLocaleString()} km</p></div>
                </div>
              ))}
              <button type="button" className="secondary-button" onClick={() => void handleUnassignVehicle()} disabled={isAssigning}>{isAssigning ? 'Unassigning...' : 'Unassign Vehicle'}</button>
            </div>
          ) : <p className="helper-text" style={{ color: '#ff9800' }}>No vehicle assigned.</p>}
          {assignmentData?.activeTrip && (
            <div style={{ padding: '8px 12px', background: 'var(--color-info-bg, #e3f2fd)', borderRadius: '6px', fontSize: '13px', marginTop: 'var(--space-3)' }}>
              <strong>Active Trip:</strong> {assignmentData.activeTrip.tripNumber}
            </div>
          )}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <h4 className="role-edit-h4">Assign Vehicle</h4>
            <div className="action-panel">
              <select value={assignVehicleId} onChange={(e) => setAssignVehicleId(e.target.value)}>
                <option value="">Select vehicle...</option>
                {assignableVehicles.filter((v: any) => !v.currentDriverId).map((v: any) => (
                  <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleType})</option>
                ))}
              </select>
              <button type="button" className="primary-button" onClick={() => void handleAssignVehicle()} disabled={isAssigning || !assignVehicleId}>
                {isAssigning ? 'Assigning...' : 'Assign Vehicle'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!isNew && effectiveSection === 'capabilities' && canManageDriverAccount ? (
        <div className="card form-section-grid">
          <h4 className="role-edit-h4">Driver Capabilities</h4>
          {!linkedUser ? (
            <div className="warning-banner">Create/link login account before assigning capabilities.</div>
          ) : (
            <>
              {menuPreview && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <h5 style={{ fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>This driver will see these menu items:</h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {menuPreview.visibleMenus?.map((m: any) => (
                      <span key={m.path} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' }}>{m.label}</span>
                    ))}
                  </div>
                  {menuPreview.hiddenMenus?.length > 0 && (
                    <>
                      <h5 style={{ fontSize: '12px', marginBottom: '4px', color: 'var(--color-text-secondary)' }}>Hidden (missing permission):</h5>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {menuPreview.hiddenMenus.map((m: any) => (
                          <span key={m.path} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a' }} title={m.requiredPermission}>{m.label}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {Object.entries(capGroups).map(([groupKey, caps]) => (
                <div key={groupKey} style={{ marginBottom: 'var(--space-3)' }}>
                  <h5 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{DRIVER_CAPABILITY_GROUPS.find((g) => g.key === groupKey)?.label ?? groupKey}</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '6px' }}>
                    {caps.map((cap) => {
                      const inRole = capEffective?.rolePermissions?.includes(cap.permission);
                      const inAllow = capAllowKeys.includes(cap.permission);
                      const inDeny = capDenyKeys.includes(cap.permission);
                      const effective = capEffective?.effectivePermissions?.includes(cap.permission);
                      return (
                        <div key={cap.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${inDeny ? '#ef9a9a' : effective ? '#a5d6a7' : '#e0e0e0'}`, background: inDeny ? '#ffebee' : effective ? '#e8f5e9' : '#fafafa' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: effective ? '#4caf50' : inDeny ? '#f44336' : '#9e9e9e', flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', flex: 1, fontWeight: 500 }}>{cap.label}</span>
                          <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', minWidth: '80px' }}>{inRole ? 'role' : inAllow ? 'allow' : inDeny ? 'deny' : '—'}</span>
                          <button type="button" style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', border: '1px solid #ccc', background: inAllow ? '#e3f2fd' : '#fff', cursor: 'pointer' }} onClick={() => toggleCapability(cap.permission, 'allow')} title="Toggle Allow">A</button>
                          <button type="button" style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', border: '1px solid #ccc', background: inDeny ? '#ffebee' : '#fff', cursor: 'pointer' }} onClick={() => toggleCapability(cap.permission, 'deny')} title="Toggle Deny">D</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <label style={{ marginTop: 'var(--space-3)' }}>
                <span className="field-label">Reason (optional)</span>
                <input value={capReason} onChange={(e) => setCapReason(e.target.value)} placeholder="Reason for override" />
              </label>
              <div className="button-row" style={{ marginTop: 'var(--space-3)' }}>
                <button type="button" className="primary-button" onClick={() => void handleSaveCapabilities()} disabled={isSavingCaps}>
                  {isSavingCaps ? 'Saving...' : 'Save Capabilities'}
                </button>
                <button type="button" className="ghost-button" onClick={() => void loadCapabilities()}>Refresh Preview</button>
              </div>
              <p className="helper-text" style={{ marginTop: 'var(--space-2)' }}>After saving: Driver must refresh permissions or log in again. Open Account menu → Refresh permissions.</p>
            </>
          )}
        </div>
      ) : null}

      {!isNew && effectiveSection === 'activity' && canManageDriverAccount ? (
        <div className="card form-section-grid">
          <div className="section-header">
            <h4 className="role-edit-h4">Driver Activity</h4>
            <div className="action-panel">
              <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} style={{ fontSize: '12px' }}>
                <option value="">All actions</option>
                <option value="driver.trip">Trips</option>
                <option value="driver.fuel">Fuel</option>
                <option value="driver.expense">Expenses</option>
                <option value="driver.maintenance">Maintenance</option>
                <option value="driver.repair">Repairs</option>
                <option value="driver.vehicle">Vehicle</option>
                <option value="auth">Auth</option>
              </select>
            </div>
          </div>
          {filteredActivity.length > 0 ? (
            <table className="data-table">
              <thead><tr><th>Action</th><th>Entity</th><th>Date</th></tr></thead>
              <tbody>
                {filteredActivity.map((log: any) => (
                  <tr key={log.id}>
                    <td><code style={{ fontSize: '11px' }}>{log.action}</code></td>
                    <td style={{ fontSize: '12px' }}>{log.entityType}{log.entityId ? ` / ${log.entityId.substring(0, 8)}...` : ''}</td>
                    <td style={{ fontSize: '12px' }}>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="helper-text">No activity records found.</p>}
          {activityData?.pagination && activityData.pagination.totalPages > 1 && (
            <div className="action-panel" style={{ marginTop: 'var(--space-3)' }}>
              <button type="button" className="ghost-button" disabled={activityPage <= 1} onClick={() => setActivityPage((p) => p - 1)}>Previous</button>
              <span style={{ fontSize: '12px' }}>Page {activityPage} of {activityData.pagination.totalPages}</span>
              <button type="button" className="ghost-button" disabled={activityPage >= activityData.pagination.totalPages} onClick={() => setActivityPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
