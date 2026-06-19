import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { createMaintenance, getMaintenance, getVehicles, maintenanceAction, updateMaintenance } from '../services/api';
import type { MaintenanceRecord, VehicleRecord } from '../types/auth';

const empty = { vehicleId: '', issueTitle: '', issueDescription: '', priority: 'MEDIUM', odometerReading: '', driverId: '' };
export function MaintenanceDetailPage() {
  const { id } = useParams(); const isNew = id === 'new'; const auth = useAuth(); const navigate = useNavigate();
  const [record, setRecord] = useState<MaintenanceRecord | null>(null); const [form, setForm] = useState(empty); const [vehicles, setVehicles] = useState<VehicleRecord[]>([]); const [loading, setLoading] = useState(!isNew); const [error, setError] = useState<string | null>(null);
  useEffect(() => { void (async () => { if (!auth.accessToken) return; const v = await getVehicles(auth.accessToken, { limit: 200 }); setVehicles(v.data.items); if (!isNew && id) { try { const r = await getMaintenance(auth.accessToken, id); const x = r.data; setRecord(x); setForm({ vehicleId: x.vehicleId, issueTitle: x.issueTitle, issueDescription: x.issueDescription ?? '', priority: x.priority, odometerReading: x.odometerReading ? String(x.odometerReading) : '', driverId: x.driverId ?? '' }); } catch { setError('Failed to load maintenance request.'); } finally { setLoading(false); } } })(); }, [auth.accessToken, id, isNew]);
  if (loading) return <LoadingState message="Loading maintenance request..." />; if (error && !record && !isNew) return <ErrorState message={error} />;
  const set = (key: keyof typeof empty, value: string) => setForm((f) => ({ ...f, [key]: value }));
  async function save(e: FormEvent) { e.preventDefault(); if (!auth.accessToken) return; setError(null); try { const payload: Record<string, unknown> = { vehicleId: form.vehicleId, issueTitle: form.issueTitle, issueDescription: form.issueDescription || undefined, priority: form.priority, odometerReading: form.odometerReading ? Number(form.odometerReading) : undefined, driverId: form.driverId || undefined }; const r = isNew ? await createMaintenance(auth.accessToken, payload) : await updateMaintenance(auth.accessToken, id!, payload); navigate(`/maintenance/${r.data.id}`); } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); } }
  async function action(name: string) { if (!auth.accessToken || !id) return; const r = await maintenanceAction(auth.accessToken, id, name); setRecord(r.data); }
  const editable = isNew || record?.status === 'DRAFT';
  return <section><PageHeader title={isNew ? 'Create Maintenance Request' : 'Maintenance Request Detail'} description={record ? `Status: ${record.status}` : 'Draft request'} actions={!isNew && record ? [
    record.status === 'DRAFT' && auth.hasPermission('maintenance_submit') ? <button key="submit" className="primary-button" onClick={() => action('submit')}>Submit</button> : null,
    record.status === 'DRAFT' && auth.hasPermission('maintenance_delete') ? <button key="cancel" className="danger-button" onClick={() => action('cancel')}>Cancel</button> : null,
    record.status === 'SUBMITTED' && auth.hasPermission('maintenance_approve') ? <button key="approve" className="primary-button" onClick={() => action('approve')}>Approve</button> : null,
    record.status === 'SUBMITTED' && auth.hasPermission('maintenance_approve') ? <button key="reject" className="danger-button" onClick={() => action('reject')}>Reject</button> : null,
    record.status === 'APPROVED' && auth.hasPermission('maintenance_assign') ? <button key="start" className="primary-button" onClick={() => action('start')}>Start</button> : null,
    record.status === 'IN_PROGRESS' && auth.hasPermission('maintenance_complete') ? <button key="complete" className="primary-button" onClick={() => action('complete')}>Complete</button> : null,
  ].filter(Boolean) as JSX.Element[] : undefined} />
    {error && <div className="error-banner">{error}</div>}<form className="card stack-form" onSubmit={save}><div className="form-two-column"><label><span className="field-label">Vehicle *</span><select required disabled={!editable} value={form.vehicleId} onChange={(e) => set('vehicleId', e.target.value)}><option value="">Select vehicle</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}</select></label><label><span className="field-label">Priority *</span><select required disabled={!editable} value={form.priority} onChange={(e) => set('priority', e.target.value)}><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option></select></label></div>
    <label><span className="field-label">Issue Title *</span><input required disabled={!editable} value={form.issueTitle} onChange={(e) => set('issueTitle', e.target.value)} /></label>
    <label><span className="field-label">Issue Description</span><textarea disabled={!editable} value={form.issueDescription} onChange={(e) => set('issueDescription', e.target.value)} /></label>
    <div className="form-two-column"><label><span className="field-label">Odometer Reading</span><input disabled={!editable} type="number" min="0" value={form.odometerReading} onChange={(e) => set('odometerReading', e.target.value)} /></label><label><span className="field-label">Driver ID</span><input disabled={!editable} value={form.driverId} onChange={(e) => set('driverId', e.target.value)} /></label></div>
    {editable && <div className="action-panel"><button className="primary-button" type="submit">Save</button><button className="secondary-button" type="button" onClick={() => navigate('/maintenance')}>Cancel</button></div>}</form></section>;
}
