import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createVehicle, getVehicle, updateVehicle, updateVehicleStatus, listInsurance, listPermits, listFitness, listPuc, listRoadTax, getFastag, getGpsDevice, listComplianceHistory, createInsurance, updateInsurance, createPermit, createFitness, createPuc, createRoadTax, upsertFastag, upsertGpsDevice } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { VehicleRecord, VehicleInsuranceDetail, VehiclePermitDetail, VehicleFitnessDetail, VehiclePucDetail, VehicleRoadTaxDetail, VehicleFastagDetail, VehicleGpsDeviceDetail, VehicleComplianceHistory } from '../types/auth';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { LinkedDocumentsPanel } from '../components/documents/LinkedDocumentsPanel';

type VehicleForm = {
  vehicleNumber: string;
  vehicleType: string;
  brand: string;
  model: string;
  year: string;
  fuelType: string;
  chassisNumber: string;
  engineNumber: string;
  rcNumber: string;
  insuranceExpiry: string;
  fitnessExpiry: string;
  pollutionExpiry: string;
  permitExpiry: string;
  currentOdometer: string;
};

const initialForm: VehicleForm = {
  vehicleNumber: '', vehicleType: '', brand: '', model: '', year: '', fuelType: 'DIESEL',
  chassisNumber: '', engineNumber: '', rcNumber: '', insuranceExpiry: '', fitnessExpiry: '',
  pollutionExpiry: '', permitExpiry: '', currentOdometer: '0',
};

type SectionTab = 'overview' | 'registration' | 'expiry' | 'compliance' | 'documents' | 'history' | 'status';
const sectionTabs: { key: SectionTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'registration', label: 'Registration' },
  { key: 'expiry', label: 'Expiry Dates' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'documents', label: 'Documents' },
  { key: 'history', label: 'History' },
  { key: 'status', label: 'Status' },
];

function getStatusDotClass(status: string): string {
  const map: Record<string, string> = { ACTIVE: 'status-dot-active', EXPIRED: 'status-dot-expired', PENDING: 'status-dot-pending', SUSPENDED: 'status-dot-suspended', REVOKED: 'status-dot-revoked', DRAFT: 'status-dot-draft', VERIFIED: 'status-dot-verified', REJECTED: 'status-dot-rejected' };
  return map[status] ?? 'status-dot-default';
}

type InsuranceForm = { policyNumber: string; insurerName: string; policyType: string; validFrom: string; validTo: string; premiumAmount: string };
const emptyInsurance: InsuranceForm = { policyNumber: '', insurerName: '', policyType: 'COMPREHENSIVE', validFrom: '', validTo: '', premiumAmount: '' };

type PermitForm = { permitNumber: string; permitType: string; validFrom: string; validTo: string; issuingAuthority: string; coveredStates: string };
const emptyPermit: PermitForm = { permitNumber: '', permitType: 'NATIONAL', validFrom: '', validTo: '', issuingAuthority: '', coveredStates: '' };

type FitnessForm = { certificateNumber: string; inspectionDate: string; validFrom: string; validTo: string; inspectionCenter: string };
const emptyFitness: FitnessForm = { certificateNumber: '', inspectionDate: '', validFrom: '', validTo: '', inspectionCenter: '' };

type PucForm = { certificateNumber: string; emissionNorm: string; validFrom: string; validTo: string; testingCenter: string };
const emptyPuc: PucForm = { certificateNumber: '', emissionNorm: 'BSVI', validFrom: '', validTo: '', testingCenter: '' };

type RoadTaxForm = { taxReceiptNumber: string; taxType: string; paidFrom: string; paidTo: string; amount: string; issuingState: string };
const emptyRoadTax: RoadTaxForm = { taxReceiptNumber: '', taxType: 'LIFETIME', paidFrom: '', paidTo: '', amount: '', issuingState: '' };

type FastagForm = { fastagId: string; issuerBank: string; status: string; lastKnownBalance: string };
const emptyFastag: FastagForm = { fastagId: '', issuerBank: '', status: 'ACTIVE', lastKnownBalance: '' };

type GpsForm = { deviceId: string; imei: string; vendorName: string; ais140Certified: boolean; status: string };
const emptyGps: GpsForm = { deviceId: '', imei: '', vendorName: '', ais140Certified: false, status: 'ACTIVE' };

function toIsoDateTime(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function VehicleDetailPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const auth = useAuth();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<VehicleRecord | null>(null);
  const [form, setForm] = useState<VehicleForm>(initialForm);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionTab>('overview');
  const [statusValue, setStatusValue] = useState('');

  const [insurance, setInsurance] = useState<VehicleInsuranceDetail[]>([]);
  const [permits, setPermits] = useState<VehiclePermitDetail[]>([]);
  const [fitnessRecords, setFitnessRecords] = useState<VehicleFitnessDetail[]>([]);
  const [pucRecords, setPucRecords] = useState<VehiclePucDetail[]>([]);
  const [roadTaxRecords, setRoadTaxRecords] = useState<VehicleRoadTaxDetail[]>([]);
  const [fastag, setFastag] = useState<VehicleFastagDetail | null>(null);
  const [gpsDevice, setGpsDevice] = useState<VehicleGpsDeviceDetail | null>(null);
  const [history, setHistory] = useState<VehicleComplianceHistory[]>([]);
  const [complianceLoading, setComplianceLoading] = useState(false);

  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [editingInsuranceId, setEditingInsuranceId] = useState<string | null>(null);
  const [insuranceForm, setInsuranceForm] = useState<InsuranceForm>(emptyInsurance);
  const [showPermitForm, setShowPermitForm] = useState(false);
  const [editingPermitId, setEditingPermitId] = useState<string | null>(null);
  const [permitForm, setPermitForm] = useState<PermitForm>(emptyPermit);
  const [showFitnessForm, setShowFitnessForm] = useState(false);
  const [editingFitnessId, setEditingFitnessId] = useState<string | null>(null);
  const [fitnessForm, setFitnessForm] = useState<FitnessForm>(emptyFitness);
  const [showPucForm, setShowPucForm] = useState(false);
  const [editingPucId, setEditingPucId] = useState<string | null>(null);
  const [pucForm, setPucForm] = useState<PucForm>(emptyPuc);
  const [showRoadTaxForm, setShowRoadTaxForm] = useState(false);
  const [editingRoadTaxId, setEditingRoadTaxId] = useState<string | null>(null);
  const [roadTaxForm, setRoadTaxForm] = useState<RoadTaxForm>(emptyRoadTax);
  const [showFastagForm, setShowFastagForm] = useState(false);
  const [fastagForm, setFastagForm] = useState<FastagForm>(emptyFastag);
  const [showGpsForm, setShowGpsForm] = useState(false);
  const [gpsForm, setGpsForm] = useState<GpsForm>(emptyGps);

  useEffect(() => {
    if (isNew || !id) return;
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true); setError(null);
      try {
        const response = await getVehicle(auth.accessToken, id);
        setVehicle(response.data); setStatusValue(response.data.status);
        setForm({
          vehicleNumber: response.data.vehicleNumber, vehicleType: response.data.vehicleType,
          brand: response.data.brand ?? '', model: response.data.model ?? '',
          year: response.data.year?.toString() ?? '', fuelType: response.data.fuelType,
          chassisNumber: response.data.chassisNumber ?? '', engineNumber: response.data.engineNumber ?? '',
          rcNumber: response.data.rcNumber ?? '', insuranceExpiry: response.data.insuranceExpiry ?? '',
          fitnessExpiry: response.data.fitnessExpiry ?? '', pollutionExpiry: response.data.pollutionExpiry ?? '',
          permitExpiry: response.data.permitExpiry ?? '', currentOdometer: response.data.currentOdometer.toString(),
        });
      } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load vehicle.'); }
      finally { setIsLoading(false); }
    };
    void load();
  }, [auth.accessToken, id, isNew]);

  const loadCompliance = async () => {
    if (isNew || !id || !auth.accessToken) return;
    setComplianceLoading(true);
    try {
      if (activeSection === 'compliance') {
        const [ins, pmt, fit, puc, rt, ftg, gps] = await Promise.all([
          listInsurance(auth.accessToken, id), listPermits(auth.accessToken, id),
          listFitness(auth.accessToken, id), listPuc(auth.accessToken, id),
          listRoadTax(auth.accessToken, id), getFastag(auth.accessToken, id), getGpsDevice(auth.accessToken, id),
        ]);
        setInsurance(ins.data as VehicleInsuranceDetail[]); setPermits(pmt.data as VehiclePermitDetail[]);
        setFitnessRecords(fit.data as VehicleFitnessDetail[]); setPucRecords(puc.data as VehiclePucDetail[]);
        setRoadTaxRecords(rt.data as VehicleRoadTaxDetail[]); setFastag(ftg.data as VehicleFastagDetail | null);
        setGpsDevice(gps.data as VehicleGpsDeviceDetail | null);
      } else if (activeSection === 'history') {
        const hist = await listComplianceHistory(auth.accessToken, id, { limit: 50 });
        setHistory(hist.data.items as VehicleComplianceHistory[]);
      }
    } catch { /* silently fail */ } finally { setComplianceLoading(false); }
  };

  useEffect(() => { void loadCompliance(); }, [activeSection, auth.accessToken, id, isNew]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!auth.accessToken) return;
    setIsSaving(true); setError(null); setMessage(null);
    try {
      const payload: Record<string, unknown> = { vehicleNumber: form.vehicleNumber, vehicleType: form.vehicleType, fuelType: form.fuelType, currentOdometer: parseInt(form.currentOdometer) || 0 };
      if (form.brand) payload.brand = form.brand; if (form.model) payload.model = form.model;
      if (form.year) payload.year = parseInt(form.year); if (form.chassisNumber) payload.chassisNumber = form.chassisNumber;
      if (form.engineNumber) payload.engineNumber = form.engineNumber; if (form.rcNumber) payload.rcNumber = form.rcNumber;
      if (form.insuranceExpiry) payload.insuranceExpiry = form.insuranceExpiry;
      if (form.fitnessExpiry) payload.fitnessExpiry = form.fitnessExpiry;
      if (form.pollutionExpiry) payload.pollutionExpiry = form.pollutionExpiry;
      if (form.permitExpiry) payload.permitExpiry = form.permitExpiry;
      let response;
      if (isNew) { response = await createVehicle(auth.accessToken, payload as any); setMessage('Vehicle created successfully.'); navigate(`/vehicles/${response.data.id}`, { replace: true }); }
      else if (id) { response = await updateVehicle(auth.accessToken, id, payload as any); setVehicle(response.data); setMessage('Vehicle updated successfully.'); }
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to save vehicle.'); }
    finally { setIsSaving(false); }
  }

  async function handleStatusChange() {
    if (!auth.accessToken || !id || isNew) return;
    setIsSaving(true); setError(null);
    try { const r = await updateVehicleStatus(auth.accessToken, id, statusValue); setVehicle(r.data); setMessage(`Vehicle status updated to ${statusValue.replace(/_/g, ' ')}.`); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to update status.'); }
    finally { setIsSaving(false); }
  }

  if (isLoading) return <LoadingState message="Loading vehicle..." />;
  if (error && !vehicle && !isNew) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  const canEdit = auth.hasPermission('vehicle_update');
  const canChangeStatus = auth.hasAnyPermission(['vehicle_update', 'vehicle_delete']);
  const canViewCompliance = auth.hasPermission('vehicle_compliance_view');
  const canCreateCompliance = auth.hasPermission('vehicle_compliance_create');
  const canUpdateCompliance = auth.hasPermission('vehicle_compliance_update');

  async function handleCreateInsurance(e: FormEvent) {
    e.preventDefault(); if (!auth.accessToken || !id) return;
    try {
      await createInsurance(auth.accessToken, id, {
        ...insuranceForm,
        validFrom: toIsoDateTime(insuranceForm.validFrom)!,
        validTo: toIsoDateTime(insuranceForm.validTo)!,
        premiumAmount: insuranceForm.premiumAmount ? parseFloat(insuranceForm.premiumAmount) : undefined,
      });
      setShowInsuranceForm(false); setInsuranceForm(emptyInsurance); void loadCompliance();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to create insurance.'); }
  }
  async function handleUpdateInsurance(e: FormEvent) {
    e.preventDefault(); if (!auth.accessToken || !id || !editingInsuranceId) return;
    try {
      await updateInsurance(auth.accessToken, id, editingInsuranceId, {
        ...insuranceForm,
        validFrom: toIsoDateTime(insuranceForm.validFrom)!,
        validTo: toIsoDateTime(insuranceForm.validTo)!,
        premiumAmount: insuranceForm.premiumAmount ? parseFloat(insuranceForm.premiumAmount) : undefined,
      });
      setShowInsuranceForm(false); setEditingInsuranceId(null); setInsuranceForm(emptyInsurance); void loadCompliance();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to update insurance.'); }
  }
  async function handleCreatePermit(e: FormEvent) {
    e.preventDefault(); if (!auth.accessToken || !id) return;
    try {
      await createPermit(auth.accessToken, id, {
        ...permitForm,
        validFrom: toIsoDateTime(permitForm.validFrom)!,
        validTo: toIsoDateTime(permitForm.validTo)!,
      });
      setShowPermitForm(false); setPermitForm(emptyPermit); void loadCompliance();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to create permit.'); }
  }
  async function handleCreateFitness(e: FormEvent) {
    e.preventDefault(); if (!auth.accessToken || !id) return;
    try {
      await createFitness(auth.accessToken, id, {
        ...fitnessForm,
        inspectionDate: toIsoDateTime(fitnessForm.inspectionDate)!,
        validFrom: toIsoDateTime(fitnessForm.validFrom)!,
        validTo: toIsoDateTime(fitnessForm.validTo)!,
      });
      setShowFitnessForm(false); setFitnessForm(emptyFitness); void loadCompliance();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to create fitness record.'); }
  }
  async function handleCreatePuc(e: FormEvent) {
    e.preventDefault(); if (!auth.accessToken || !id) return;
    try {
      await createPuc(auth.accessToken, id, {
        ...pucForm,
        validFrom: toIsoDateTime(pucForm.validFrom)!,
        validTo: toIsoDateTime(pucForm.validTo)!,
      });
      setShowPucForm(false); setPucForm(emptyPuc); void loadCompliance();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to create PUC record.'); }
  }
  async function handleCreateRoadTax(e: FormEvent) {
    e.preventDefault(); if (!auth.accessToken || !id) return;
    try {
      await createRoadTax(auth.accessToken, id, {
        ...roadTaxForm,
        paidFrom: toIsoDateTime(roadTaxForm.paidFrom)!,
        paidTo: toIsoDateTime(roadTaxForm.paidTo)!,
        amount: roadTaxForm.amount ? parseFloat(roadTaxForm.amount) : undefined,
      });
      setShowRoadTaxForm(false); setRoadTaxForm(emptyRoadTax); void loadCompliance();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to create road tax record.'); }
  }
  async function handleUpsertFastag(e: FormEvent) {
    e.preventDefault(); if (!auth.accessToken || !id) return;
    const payload = { ...fastagForm, lastKnownBalance: fastagForm.lastKnownBalance ? parseFloat(fastagForm.lastKnownBalance) : undefined };
    try { await upsertFastag(auth.accessToken, id, payload); setShowFastagForm(false); setFastagForm(emptyFastag); void loadCompliance(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to save FASTag.'); }
  }
  async function handleUpsertGps(e: FormEvent) {
    e.preventDefault(); if (!auth.accessToken || !id) return;
    try { await upsertGpsDevice(auth.accessToken, id, gpsForm); setShowGpsForm(false); setGpsForm(emptyGps); void loadCompliance(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to save GPS device.'); }
  }


  return (
    <section className="page-content">
      <div className="section-header">
        <div>
          <a href="/vehicles" className="trip-back-link">Back to Vehicles</a>
          <PageHeader title={isNew ? 'Add Vehicle' : vehicle ? vehicle.vehicleNumber : 'Vehicle'} description={isNew ? 'Register a new vehicle' : undefined} />
        </div>
        <div className="action-panel">
          {!isNew && vehicle ? <StatusBadge status={vehicle.status} /> : null}
          {canEdit && !isNew ? <button type="submit" form="vehicle-form" className="primary-button" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button> : null}
        </div>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="success-banner">{message}</div> : null}
      {!isNew ? (
        <div className="detail-tabs">
          {sectionTabs.map((tab) => (
            <button key={tab.key} type="button" className={`detail-tab${activeSection === tab.key ? ' detail-tab-active' : ''}`} onClick={() => setActiveSection(tab.key)}>{tab.label}</button>
          ))}
        </div>
      ) : null}
      <form id="vehicle-form" className="form-main" onSubmit={handleSubmit}>
        {isNew || activeSection === 'overview' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">General Information</h4>
            <div className="form-two-column">
              <label><span className="field-label">Vehicle Number *</span><input value={form.vehicleNumber} onChange={(e) => setForm((f) => ({ ...f, vehicleNumber: e.target.value.toUpperCase() }))} required disabled={!isNew && !canEdit} /></label>
              <label><span className="field-label">Vehicle Type *</span><input value={form.vehicleType} onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))} required disabled={!isNew && !canEdit} /></label>
            </div>
            <div className="form-two-column">
              <label><span className="field-label">Brand</span><input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} disabled={!canEdit} /></label>
              <label><span className="field-label">Model</span><input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} disabled={!canEdit} /></label>
            </div>
            <div className="form-two-column">
              <label><span className="field-label">Year</span><input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} min={1900} max={2100} disabled={!canEdit} /></label>
              <label><span className="field-label">Fuel Type *</span><select value={form.fuelType} onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value }))} disabled={!isNew && !canEdit}><option value="DIESEL">Diesel</option><option value="PETROL">Petrol</option><option value="CNG">CNG</option><option value="LPG">LPG</option><option value="ELECTRIC">Electric</option><option value="HYBRID">Hybrid</option></select></label>
            </div>
            <label><span className="field-label">Current Odometer (km)</span><input type="number" min={0} value={form.currentOdometer} onChange={(e) => setForm((f) => ({ ...f, currentOdometer: e.target.value }))} disabled={!canEdit} /></label>
          </div>
        ) : null}
        {!isNew && activeSection === 'registration' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Registration & Identification</h4>
            <div className="form-two-column">
              <label><span className="field-label">Chassis Number</span><input value={form.chassisNumber} onChange={(e) => setForm((f) => ({ ...f, chassisNumber: e.target.value }))} disabled={!canEdit} /></label>
              <label><span className="field-label">Engine Number</span><input value={form.engineNumber} onChange={(e) => setForm((f) => ({ ...f, engineNumber: e.target.value }))} disabled={!canEdit} /></label>
            </div>
            <label><span className="field-label">RC Number</span><input value={form.rcNumber} onChange={(e) => setForm((f) => ({ ...f, rcNumber: e.target.value }))} disabled={!canEdit} /></label>
          </div>
        ) : null}
        {!isNew && activeSection === 'expiry' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Expiry Dates</h4>
            <div className="form-two-column">
              <label><span className="field-label">Insurance Expiry</span><input type="date" value={form.insuranceExpiry ? form.insuranceExpiry.substring(0, 10) : ''} onChange={(e) => setForm((f) => ({ ...f, insuranceExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))} disabled={!canEdit} /></label>
              <label><span className="field-label">Fitness Expiry</span><input type="date" value={form.fitnessExpiry ? form.fitnessExpiry.substring(0, 10) : ''} onChange={(e) => setForm((f) => ({ ...f, fitnessExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))} disabled={!canEdit} /></label>
              <label><span className="field-label">Pollution Expiry</span><input type="date" value={form.pollutionExpiry ? form.pollutionExpiry.substring(0, 10) : ''} onChange={(e) => setForm((f) => ({ ...f, pollutionExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))} disabled={!canEdit} /></label>
              <label><span className="field-label">Permit Expiry</span><input type="date" value={form.permitExpiry ? form.permitExpiry.substring(0, 10) : ''} onChange={(e) => setForm((f) => ({ ...f, permitExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))} disabled={!canEdit} /></label>
            </div>
          </div>
        ) : null}
        {isNew ? (
          <div className="action-panel">
            <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Vehicle'}</button>
            <button type="button" className="secondary-button" onClick={() => navigate('/vehicles')}>Cancel</button>
          </div>
        ) : null}
      </form>
      {!isNew && activeSection === 'compliance' ? (
          <div className="card form-section-grid compliance-card">
            <h4 className="role-edit-h4">Vehicle Compliance</h4>
            {complianceLoading ? <p className="compliance-empty">Loading compliance data...</p> : !canViewCompliance ? <p className="compliance-empty">You do not have permission to view compliance data.</p> : (
              <>
                {/* Insurance */}
                <div className="compliance-actions">
                  <h5 className="compliance-section-title compliance-section-header">Insurance</h5>
                  {canCreateCompliance && <button type="button" className="secondary-button" onClick={() => { setShowInsuranceForm(!showInsuranceForm); setEditingInsuranceId(null); setInsuranceForm(emptyInsurance); }}>+ Add</button>}
                </div>
                {showInsuranceForm && !editingInsuranceId ? (
                  <form onSubmit={handleCreateInsurance} className="compliance-form-card">
                    <div className="compliance-form-row">
                      <label><span className="field-label">Policy # *</span><input value={insuranceForm.policyNumber} onChange={(e) => setInsuranceForm((f) => ({ ...f, policyNumber: e.target.value }))} required /></label>
                      <label><span className="field-label">Insurer *</span><input value={insuranceForm.insurerName} onChange={(e) => setInsuranceForm((f) => ({ ...f, insurerName: e.target.value }))} required /></label>
                      <label><span className="field-label">Type *</span><select value={insuranceForm.policyType} onChange={(e) => setInsuranceForm((f) => ({ ...f, policyType: e.target.value }))}><option value="COMPREHENSIVE">Comprehensive</option><option value="THIRD_PARTY">Third Party</option><option value="OWN_DAMAGE">Own Damage</option></select></label>
                    </div>
                    <div className="compliance-form-row">
                      <label><span className="field-label">Valid From *</span><input type="datetime-local" value={insuranceForm.validFrom} onChange={(e) => setInsuranceForm((f) => ({ ...f, validFrom: e.target.value }))} required /></label>
                      <label><span className="field-label">Valid To *</span><input type="datetime-local" value={insuranceForm.validTo} onChange={(e) => setInsuranceForm((f) => ({ ...f, validTo: e.target.value }))} required /></label>
                      <label><span className="field-label">Premium</span><input type="number" min={0} value={insuranceForm.premiumAmount} onChange={(e) => setInsuranceForm((f) => ({ ...f, premiumAmount: e.target.value }))} /></label>
                    </div>
                    <div className="compliance-actions"><button type="submit" className="primary-button">Create</button><button type="button" className="secondary-button" onClick={() => setShowInsuranceForm(false)}>Cancel</button></div>
                  </form>
                ) : null}
                {insurance.length === 0 ? <p className="compliance-empty">No insurance records found.</p> : (
                  <table className="data-table compliance-table"><thead><tr><th>Policy #</th><th>Insurer</th><th>Type</th><th>Valid From</th><th>Valid To</th><th>Status</th>{canUpdateCompliance && <th>Actions</th>}</tr></thead>
                    <tbody>{insurance.map((ins) => (<tr key={ins.id}><td>{ins.policyNumber}</td><td>{ins.insurerName}</td><td>{ins.policyType.replace(/_/g, ' ')}</td><td>{new Date(ins.validFrom).toLocaleDateString()}</td><td>{new Date(ins.validTo).toLocaleDateString()}</td><td><span className={`status-dot ${getStatusDotClass(ins.status)}`} />{ins.status}</td>
                      {canUpdateCompliance && <td><button type="button" className="link-button" onClick={() => { setEditingInsuranceId(ins.id); setShowInsuranceForm(true); setInsuranceForm({ policyNumber: ins.policyNumber, insurerName: ins.insurerName, policyType: ins.policyType, validFrom: ins.validFrom.substring(0, 16), validTo: ins.validTo.substring(0, 16), premiumAmount: ins.premiumAmount?.toString() ?? '' }); }}>Edit</button></td>}
                    </tr>))}</tbody></table>
                )}
                {editingInsuranceId && showInsuranceForm ? (
                  <form onSubmit={handleUpdateInsurance} className="compliance-form-card">
                    <h5 className="compliance-section-title">Edit Insurance</h5>
                    <div className="compliance-form-row">
                      <label><span className="field-label">Policy #</span><input value={insuranceForm.policyNumber} onChange={(e) => setInsuranceForm((f) => ({ ...f, policyNumber: e.target.value }))} /></label>
                      <label><span className="field-label">Insurer</span><input value={insuranceForm.insurerName} onChange={(e) => setInsuranceForm((f) => ({ ...f, insurerName: e.target.value }))} /></label>
                      <label><span className="field-label">Premium</span><input type="number" min={0} value={insuranceForm.premiumAmount} onChange={(e) => setInsuranceForm((f) => ({ ...f, premiumAmount: e.target.value }))} /></label>
                    </div>
                    <div className="compliance-actions"><button type="submit" className="primary-button">Update</button><button type="button" className="secondary-button" onClick={() => { setShowInsuranceForm(false); setEditingInsuranceId(null); }}>Cancel</button></div>
                  </form>
                ) : null}

                {/* Permits */}
                <div className="compliance-actions">
                  <h5 className="compliance-section-title compliance-section-header">Permits</h5>
                  {canCreateCompliance && <button type="button" className="secondary-button" onClick={() => { setShowPermitForm(!showPermitForm); setEditingPermitId(null); setPermitForm(emptyPermit); }}>+ Add</button>}
                </div>
                {showPermitForm && !editingPermitId ? (
                  <form onSubmit={handleCreatePermit} className="compliance-form-card">
                    <div className="compliance-form-row">
                      <label><span className="field-label">Permit # *</span><input value={permitForm.permitNumber} onChange={(e) => setPermitForm((f) => ({ ...f, permitNumber: e.target.value }))} required /></label>
                      <label><span className="field-label">Type *</span><select value={permitForm.permitType} onChange={(e) => setPermitForm((f) => ({ ...f, permitType: e.target.value }))}><option value="NATIONAL">National</option><option value="STATE">State</option><option value="GOODS_CARRIAGE">Goods Carriage</option></select></label>
                      <label><span className="field-label">Authority</span><input value={permitForm.issuingAuthority} onChange={(e) => setPermitForm((f) => ({ ...f, issuingAuthority: e.target.value }))} /></label>
                    </div>
                    <div className="compliance-form-row">
                      <label><span className="field-label">Valid From *</span><input type="datetime-local" value={permitForm.validFrom} onChange={(e) => setPermitForm((f) => ({ ...f, validFrom: e.target.value }))} required /></label>
                      <label><span className="field-label">Valid To *</span><input type="datetime-local" value={permitForm.validTo} onChange={(e) => setPermitForm((f) => ({ ...f, validTo: e.target.value }))} required /></label>
                      <label><span className="field-label">States</span><input value={permitForm.coveredStates} onChange={(e) => setPermitForm((f) => ({ ...f, coveredStates: e.target.value }))} /></label>
                    </div>
                    <div className="compliance-actions"><button type="submit" className="primary-button">Create</button><button type="button" className="secondary-button" onClick={() => setShowPermitForm(false)}>Cancel</button></div>
                  </form>
                ) : null}
                {permits.length === 0 ? <p className="compliance-empty">No permit records found.</p> : (
                  <table className="data-table compliance-table"><thead><tr><th>Permit #</th><th>Type</th><th>Authority</th><th>Valid From</th><th>Valid To</th><th>Status</th></tr></thead>
                    <tbody>{permits.map((p) => (<tr key={p.id}><td>{p.permitNumber}</td><td>{p.permitType.replace(/_/g, ' ')}</td><td>{p.issuingAuthority ?? '--'}</td><td>{new Date(p.validFrom).toLocaleDateString()}</td><td>{new Date(p.validTo).toLocaleDateString()}</td><td><span className={`status-dot ${getStatusDotClass(p.status)}`} />{p.status}</td></tr>))}</tbody></table>
                )}

                {/* Fitness */}
                <div className="compliance-actions">
                  <h5 className="compliance-section-title compliance-section-header">Fitness Certificates</h5>
                  {canCreateCompliance && <button type="button" className="secondary-button" onClick={() => { setShowFitnessForm(!showFitnessForm); setEditingFitnessId(null); setFitnessForm(emptyFitness); }}>+ Add</button>}
                </div>
                {showFitnessForm && !editingFitnessId ? (
                  <form onSubmit={handleCreateFitness} className="compliance-form-card">
                    <div className="compliance-form-row">
                      <label><span className="field-label">Certificate # *</span><input value={fitnessForm.certificateNumber} onChange={(e) => setFitnessForm((f) => ({ ...f, certificateNumber: e.target.value }))} required /></label>
                      <label><span className="field-label">Inspection Date *</span><input type="datetime-local" value={fitnessForm.inspectionDate} onChange={(e) => setFitnessForm((f) => ({ ...f, inspectionDate: e.target.value }))} required /></label>
                      <label><span className="field-label">Center</span><input value={fitnessForm.inspectionCenter} onChange={(e) => setFitnessForm((f) => ({ ...f, inspectionCenter: e.target.value }))} /></label>
                    </div>
                    <div className="compliance-form-row">
                      <label><span className="field-label">Valid From *</span><input type="datetime-local" value={fitnessForm.validFrom} onChange={(e) => setFitnessForm((f) => ({ ...f, validFrom: e.target.value }))} required /></label>
                      <label><span className="field-label">Valid To *</span><input type="datetime-local" value={fitnessForm.validTo} onChange={(e) => setFitnessForm((f) => ({ ...f, validTo: e.target.value }))} required /></label>
                    </div>
                    <div className="compliance-actions"><button type="submit" className="primary-button">Create</button><button type="button" className="secondary-button" onClick={() => setShowFitnessForm(false)}>Cancel</button></div>
                  </form>
                ) : null}
                {fitnessRecords.length === 0 ? <p className="compliance-empty">No fitness records found.</p> : (
                  <table className="data-table compliance-table"><thead><tr><th>Certificate #</th><th>Inspection Date</th><th>Valid From</th><th>Valid To</th><th>Center</th><th>Status</th></tr></thead>
                    <tbody>{fitnessRecords.map((f) => (<tr key={f.id}><td>{f.certificateNumber}</td><td>{new Date(f.inspectionDate).toLocaleDateString()}</td><td>{new Date(f.validFrom).toLocaleDateString()}</td><td>{new Date(f.validTo).toLocaleDateString()}</td><td>{f.inspectionCenter ?? '--'}</td><td><span className={`status-dot ${getStatusDotClass(f.status)}`} />{f.status}</td></tr>))}</tbody></table>
                )}

                {/* PUC */}
                <div className="compliance-actions">
                  <h5 className="compliance-section-title compliance-section-header">PUC Certificates</h5>
                  {canCreateCompliance && <button type="button" className="secondary-button" onClick={() => { setShowPucForm(!showPucForm); setEditingPucId(null); setPucForm(emptyPuc); }}>+ Add</button>}
                </div>
                {showPucForm && !editingPucId ? (
                  <form onSubmit={handleCreatePuc} className="compliance-form-card">
                    <div className="compliance-form-row">
                      <label><span className="field-label">Certificate # *</span><input value={pucForm.certificateNumber} onChange={(e) => setPucForm((f) => ({ ...f, certificateNumber: e.target.value }))} required /></label>
                      <label><span className="field-label">Norm *</span><select value={pucForm.emissionNorm} onChange={(e) => setPucForm((f) => ({ ...f, emissionNorm: e.target.value }))}><option value="BSVI">BS-VI</option><option value="BSIV">BS-IV</option><option value="BSIII">BS-III</option></select></label>
                      <label><span className="field-label">Center</span><input value={pucForm.testingCenter} onChange={(e) => setPucForm((f) => ({ ...f, testingCenter: e.target.value }))} /></label>
                    </div>
                    <div className="compliance-form-row">
                      <label><span className="field-label">Valid From *</span><input type="datetime-local" value={pucForm.validFrom} onChange={(e) => setPucForm((f) => ({ ...f, validFrom: e.target.value }))} required /></label>
                      <label><span className="field-label">Valid To *</span><input type="datetime-local" value={pucForm.validTo} onChange={(e) => setPucForm((f) => ({ ...f, validTo: e.target.value }))} required /></label>
                    </div>
                    <div className="compliance-actions"><button type="submit" className="primary-button">Create</button><button type="button" className="secondary-button" onClick={() => setShowPucForm(false)}>Cancel</button></div>
                  </form>
                ) : null}
                {pucRecords.length === 0 ? <p className="compliance-empty">No PUC records found.</p> : (
                  <table className="data-table compliance-table"><thead><tr><th>Certificate #</th><th>Norm</th><th>Valid From</th><th>Valid To</th><th>Center</th><th>Status</th></tr></thead>
                    <tbody>{pucRecords.map((p) => (<tr key={p.id}><td>{p.certificateNumber}</td><td>{p.emissionNorm}</td><td>{new Date(p.validFrom).toLocaleDateString()}</td><td>{new Date(p.validTo).toLocaleDateString()}</td><td>{p.testingCenter ?? '--'}</td><td><span className={`status-dot ${getStatusDotClass(p.status)}`} />{p.status}</td></tr>))}</tbody></table>
                )}

                {/* Road Tax */}
                <div className="compliance-actions">
                  <h5 className="compliance-section-title compliance-section-header">Road Tax</h5>
                  {canCreateCompliance && <button type="button" className="secondary-button" onClick={() => { setShowRoadTaxForm(!showRoadTaxForm); setEditingRoadTaxId(null); setRoadTaxForm(emptyRoadTax); }}>+ Add</button>}
                </div>
                {showRoadTaxForm && !editingRoadTaxId ? (
                  <form onSubmit={handleCreateRoadTax} className="compliance-form-card">
                    <div className="compliance-form-row">
                      <label><span className="field-label">Receipt # *</span><input value={roadTaxForm.taxReceiptNumber} onChange={(e) => setRoadTaxForm((f) => ({ ...f, taxReceiptNumber: e.target.value }))} required /></label>
                      <label><span className="field-label">Type *</span><select value={roadTaxForm.taxType} onChange={(e) => setRoadTaxForm((f) => ({ ...f, taxType: e.target.value }))}><option value="LIFETIME">Lifetime</option><option value="ANNUAL">Annual</option><option value="QUARTERLY">Quarterly</option></select></label>
                      <label><span className="field-label">Amount</span><input type="number" min={0} value={roadTaxForm.amount} onChange={(e) => setRoadTaxForm((f) => ({ ...f, amount: e.target.value }))} /></label>
                    </div>
                    <div className="compliance-form-row">
                      <label><span className="field-label">Paid From *</span><input type="datetime-local" value={roadTaxForm.paidFrom} onChange={(e) => setRoadTaxForm((f) => ({ ...f, paidFrom: e.target.value }))} required /></label>
                      <label><span className="field-label">Paid To *</span><input type="datetime-local" value={roadTaxForm.paidTo} onChange={(e) => setRoadTaxForm((f) => ({ ...f, paidTo: e.target.value }))} required /></label>
                      <label><span className="field-label">State</span><input value={roadTaxForm.issuingState} onChange={(e) => setRoadTaxForm((f) => ({ ...f, issuingState: e.target.value }))} /></label>
                    </div>
                    <div className="compliance-actions"><button type="submit" className="primary-button">Create</button><button type="button" className="secondary-button" onClick={() => setShowRoadTaxForm(false)}>Cancel</button></div>
                  </form>
                ) : null}
                {roadTaxRecords.length === 0 ? <p className="compliance-empty">No road tax records found.</p> : (
                  <table className="data-table compliance-table"><thead><tr><th>Receipt #</th><th>Type</th><th>Amount</th><th>Paid From</th><th>Paid To</th><th>Status</th></tr></thead>
                    <tbody>{roadTaxRecords.map((rt) => (<tr key={rt.id}><td>{rt.taxReceiptNumber}</td><td>{rt.taxType}</td><td>{rt.amount != null ? `₹${rt.amount.toLocaleString()}` : '--'}</td><td>{new Date(rt.paidFrom).toLocaleDateString()}</td><td>{new Date(rt.paidTo).toLocaleDateString()}</td><td><span className={`status-dot ${getStatusDotClass(rt.status)}`} />{rt.status}</td></tr>))}</tbody></table>
                )}

                {/* FASTag */}
                <div className="compliance-actions">
                  <h5 className="compliance-section-title compliance-section-header">FASTag</h5>
                  {canUpdateCompliance && <button type="button" className="secondary-button" onClick={() => { setShowFastagForm(!showFastagForm); setFastagForm(fastag ? { fastagId: fastag.fastagId, issuerBank: fastag.issuerBank ?? '', status: fastag.status, lastKnownBalance: fastag.lastKnownBalance?.toString() ?? '' } : emptyFastag); }}>{fastag ? 'Edit' : '+ Add'}</button>}
                </div>
                {showFastagForm ? (
                  <form onSubmit={handleUpsertFastag} className="compliance-form-card">
                    <div className="compliance-form-row">
                      <label><span className="field-label">FASTag ID *</span><input value={fastagForm.fastagId} onChange={(e) => setFastagForm((f) => ({ ...f, fastagId: e.target.value }))} required /></label>
                      <label><span className="field-label">Issuer Bank</span><input value={fastagForm.issuerBank} onChange={(e) => setFastagForm((f) => ({ ...f, issuerBank: e.target.value }))} /></label>
                      <label><span className="field-label">Status</span><select value={fastagForm.status} onChange={(e) => setFastagForm((f) => ({ ...f, status: e.target.value }))}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="BLACKLISTED">Blacklisted</option></select></label>
                      <label><span className="field-label">Balance</span><input type="number" min={0} value={fastagForm.lastKnownBalance} onChange={(e) => setFastagForm((f) => ({ ...f, lastKnownBalance: e.target.value }))} /></label>
                    </div>
                    <div className="compliance-actions"><button type="submit" className="primary-button">Save</button><button type="button" className="secondary-button" onClick={() => setShowFastagForm(false)}>Cancel</button></div>
                  </form>
                ) : null}
                {fastag ? (
                  <div className="compliance-grid">
                    <div className="compliance-grid-item"><p className="detail-label">FASTag ID</p><p className="detail-value">{fastag.fastagId}</p></div>
                    <div className="compliance-grid-item"><p className="detail-label">Issuer Bank</p><p className="detail-value">{fastag.issuerBank ?? '--'}</p></div>
                    <div className="compliance-grid-item"><p className="detail-label">Status</p><p className="detail-value"><span className={`status-dot ${getStatusDotClass(fastag.status)}`} />{fastag.status}</p></div>
                    <div className="compliance-grid-item"><p className="detail-label">Balance</p><p className="detail-value">{fastag.lastKnownBalance != null ? `₹${fastag.lastKnownBalance.toLocaleString()}` : '--'}</p></div>
                  </div>
                ) : <p className="compliance-empty">No FASTag details found.</p>}

                {/* GPS Device */}
                <div className="compliance-actions">
                  <h5 className="compliance-section-title compliance-section-header">GPS Device (AIS-140)</h5>
                  {canUpdateCompliance && <button type="button" className="secondary-button" onClick={() => { setShowGpsForm(!showGpsForm); setGpsForm(gpsDevice ? { deviceId: gpsDevice.deviceId, imei: gpsDevice.imei ?? '', vendorName: gpsDevice.vendorName ?? '', ais140Certified: gpsDevice.ais140Certified, status: gpsDevice.status } : emptyGps); }}>{gpsDevice ? 'Edit' : '+ Add'}</button>}
                </div>
                {showGpsForm ? (
                  <form onSubmit={handleUpsertGps} className="compliance-form-card">
                    <div className="compliance-form-row">
                      <label><span className="field-label">Device ID *</span><input value={gpsForm.deviceId} onChange={(e) => setGpsForm((f) => ({ ...f, deviceId: e.target.value }))} required /></label>
                      <label><span className="field-label">IMEI</span><input value={gpsForm.imei} onChange={(e) => setGpsForm((f) => ({ ...f, imei: e.target.value }))} /></label>
                      <label><span className="field-label">Vendor</span><input value={gpsForm.vendorName} onChange={(e) => setGpsForm((f) => ({ ...f, vendorName: e.target.value }))} /></label>
                      <label><span className="field-label">AIS-140</span><select value={gpsForm.ais140Certified ? 'true' : 'false'} onChange={(e) => setGpsForm((f) => ({ ...f, ais140Certified: e.target.value === 'true' }))}><option value="true">Certified</option><option value="false">Not Certified</option></select></label>
                      <label><span className="field-label">Status</span><select value={gpsForm.status} onChange={(e) => setGpsForm((f) => ({ ...f, status: e.target.value }))}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="FAULTY">Faulty</option></select></label>
                    </div>
                    <div className="compliance-actions"><button type="submit" className="primary-button">Save</button><button type="button" className="secondary-button" onClick={() => setShowGpsForm(false)}>Cancel</button></div>
                  </form>
                ) : null}
                {gpsDevice ? (
                  <div className="compliance-grid">
                    <div className="compliance-grid-item"><p className="detail-label">Device ID</p><p className="detail-value">{gpsDevice.deviceId}</p></div>
                    <div className="compliance-grid-item"><p className="detail-label">IMEI</p><p className="detail-value">{gpsDevice.imei ?? '--'}</p></div>
                    <div className="compliance-grid-item"><p className="detail-label">Vendor</p><p className="detail-value">{gpsDevice.vendorName ?? '--'}</p></div>
                    <div className="compliance-grid-item"><p className="detail-label">AIS-140</p><p className="detail-value">{gpsDevice.ais140Certified ? 'Certified' : 'Not Certified'}</p></div>
                    <div className="compliance-grid-item"><p className="detail-label">Status</p><p className="detail-value"><span className={`status-dot ${getStatusDotClass(gpsDevice.status)}`} />{gpsDevice.status}</p></div>
                  </div>
                ) : <p className="compliance-empty">No GPS device details found.</p>}
              </>
            )}
          </div>
        ) : null}
      {!isNew && activeSection === 'documents' && vehicle ? (
          <div className="card form-section-grid">
            <LinkedDocumentsPanel
              linkedEntityType="VEHICLE"
              linkedEntityId={vehicle.id}
              vehicleId={vehicle.id}
              defaultDocumentCategory="VEHICLE"
              allowedDocumentTypes={['VEHICLE_RC', 'VEHICLE_INSURANCE', 'VEHICLE_PERMIT', 'VEHICLE_FITNESS', 'VEHICLE_PUC', 'ROAD_TAX', 'FASTAG', 'AIS140_GPS', 'GENERAL']}
              title={`Documents — ${vehicle.vehicleNumber}`}
              subtitle="Upload and manage vehicle documents, insurance, permits, and compliance files"
              canUpload={auth.hasPermission('documents_upload')}
              canDownload={auth.hasPermission('documents_download')}
              canArchive={auth.hasPermission('documents_archive')}
              canDelete={auth.hasPermission('documents_delete')}
              canVerify={auth.hasPermission('documents_verify')}
            />
          </div>
        ) : null}
      {!isNew && activeSection === 'history' ? (
          <div className="card form-section-grid compliance-card">
            <h4 className="role-edit-h4">Compliance History</h4>
            {complianceLoading ? <p className="compliance-empty">Loading history...</p> : history.length === 0 ? <div className="info-banner">No compliance history found for this vehicle.</div> : (
              <table className="data-table"><thead><tr><th>Date</th><th>Type</th><th>Action</th><th>From</th><th>To</th><th>By</th><th>Remarks</th></tr></thead>
                <tbody>{history.map((h) => (<tr key={h.id}><td>{new Date(h.createdAt).toLocaleDateString()}</td><td>{h.complianceType.replace(/_/g, ' ')}</td><td>{h.action.replace(/_/g, ' ')}</td><td>{h.fromStatus ?? '--'}</td><td>{h.toStatus ?? '--'}</td><td>{h.createdBy?.name ?? '--'}</td><td>{h.remarks ?? '--'}</td></tr>))}</tbody></table>
            )}
          </div>
        ) : null}
      {!isNew && activeSection === 'status' ? (
          <div className="card form-section-grid compliance-card">
            <h4 className="role-edit-h4">Status Management</h4>
            {canChangeStatus ? (
              <div className="action-panel">
                <label className="role-status-label"><span className="field-label">Status:</span><select value={statusValue} onChange={(e) => setStatusValue(e.target.value)}><option value="AVAILABLE">Available</option><option value="UNDER_MAINTENANCE">Under Maintenance</option><option value="UNDER_REPAIR">Under Repair</option><option value="INACTIVE">Inactive</option></select></label>
                <button type="button" className="primary-button" onClick={() => void handleStatusChange()} disabled={isSaving}>{isSaving ? 'Updating...' : 'Update Status'}</button>
              </div>
            ) : <p className="compliance-empty">You do not have permission to change status.</p>}
            {vehicle ? (
              <div className="form-two-column">
                <div><p className="detail-label">Created</p><p className="detail-value">{new Date(vehicle.createdAt).toLocaleDateString()}</p></div>
                <div><p className="detail-label">Last Updated</p><p className="detail-value">{new Date(vehicle.updatedAt).toLocaleDateString()}</p></div>
              </div>
            ) : null}
          </div>
        ) : null}
    </section>
  );
}
