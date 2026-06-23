import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createVehicle, getVehicle, updateVehicle, updateVehicleStatus, listInsurance, listPermits, listFitness, listPuc, listRoadTax, getFastag, getGpsDevice, listComplianceDocuments, listComplianceHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { VehicleRecord, VehicleInsuranceDetail, VehiclePermitDetail, VehicleFitnessDetail, VehiclePucDetail, VehicleRoadTaxDetail, VehicleFastagDetail, VehicleGpsDeviceDetail, VehicleComplianceDocument, VehicleComplianceHistory } from '../types/auth';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

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
  vehicleNumber: '',
  vehicleType: '',
  brand: '',
  model: '',
  year: '',
  fuelType: 'DIESEL',
  chassisNumber: '',
  engineNumber: '',
  rcNumber: '',
  insuranceExpiry: '',
  fitnessExpiry: '',
  pollutionExpiry: '',
  permitExpiry: '',
  currentOdometer: '0',
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

function DaysUntil({ date }: { date: string | null }) {
  if (!date) return <span className="helper-text">--</span>;
  const d = new Date(date);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return <span style={{ color: '#dc3545', fontWeight: 600 }}>Expired {Math.abs(diff)}d ago</span>;
  if (diff <= 30) return <span style={{ color: '#fd7e14', fontWeight: 600 }}>{diff}d left</span>;
  return <span style={{ color: '#28a745' }}>{diff}d left</span>;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = { ACTIVE: '#28a745', EXPIRED: '#dc3545', PENDING: '#fd7e14', SUSPENDED: '#dc3545', REVOKED: '#dc3545', DRAFT: '#6c757d', VERIFIED: '#28a745', REJECTED: '#dc3545' };
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: colors[status] ?? '#6c757d', marginRight: 6 }} />;
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

  // Compliance data
  const [insurance, setInsurance] = useState<VehicleInsuranceDetail[]>([]);
  const [permits, setPermits] = useState<VehiclePermitDetail[]>([]);
  const [fitnessRecords, setFitnessRecords] = useState<VehicleFitnessDetail[]>([]);
  const [pucRecords, setPucRecords] = useState<VehiclePucDetail[]>([]);
  const [roadTaxRecords, setRoadTaxRecords] = useState<VehicleRoadTaxDetail[]>([]);
  const [fastag, setFastag] = useState<VehicleFastagDetail | null>(null);
  const [gpsDevice, setGpsDevice] = useState<VehicleGpsDeviceDetail | null>(null);
  const [documents, setDocuments] = useState<VehicleComplianceDocument[]>([]);
  const [history, setHistory] = useState<VehicleComplianceHistory[]>([]);
  const [complianceLoading, setComplianceLoading] = useState(false);

  useEffect(() => {
    if (isNew || !id) return;
    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getVehicle(auth.accessToken, id);
        setVehicle(response.data);
        setStatusValue(response.data.status);
        setForm({
          vehicleNumber: response.data.vehicleNumber,
          vehicleType: response.data.vehicleType,
          brand: response.data.brand ?? '',
          model: response.data.model ?? '',
          year: response.data.year?.toString() ?? '',
          fuelType: response.data.fuelType,
          chassisNumber: response.data.chassisNumber ?? '',
          engineNumber: response.data.engineNumber ?? '',
          rcNumber: response.data.rcNumber ?? '',
          insuranceExpiry: response.data.insuranceExpiry ?? '',
          fitnessExpiry: response.data.fitnessExpiry ?? '',
          pollutionExpiry: response.data.pollutionExpiry ?? '',
          permitExpiry: response.data.permitExpiry ?? '',
          currentOdometer: response.data.currentOdometer.toString(),
        });
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setError(caughtError.message);
        else setError('Failed to load vehicle.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [auth.accessToken, id, isNew]);

  useEffect(() => {
    if (isNew || !id || !auth.accessToken) return;
    if (activeSection !== 'compliance' && activeSection !== 'documents' && activeSection !== 'history') return;
    const loadCompliance = async () => {
      setComplianceLoading(true);
      try {
        if (activeSection === 'compliance') {
          const [ins, pmt, fit, puc, rt, ftg, gps] = await Promise.all([
            listInsurance(auth.accessToken!, id),
            listPermits(auth.accessToken!, id),
            listFitness(auth.accessToken!, id),
            listPuc(auth.accessToken!, id),
            listRoadTax(auth.accessToken!, id),
            getFastag(auth.accessToken!, id),
            getGpsDevice(auth.accessToken!, id),
          ]);
          setInsurance(ins.data as VehicleInsuranceDetail[]);
          setPermits(pmt.data as VehiclePermitDetail[]);
          setFitnessRecords(fit.data as VehicleFitnessDetail[]);
          setPucRecords(puc.data as VehiclePucDetail[]);
          setRoadTaxRecords(rt.data as VehicleRoadTaxDetail[]);
          setFastag(ftg.data as VehicleFastagDetail | null);
          setGpsDevice(gps.data as VehicleGpsDeviceDetail | null);
        } else if (activeSection === 'documents') {
          const docs = await listComplianceDocuments(auth.accessToken!, { vehicleId: id, limit: 50 });
          setDocuments(docs.data.items as VehicleComplianceDocument[]);
        } else if (activeSection === 'history') {
          const hist = await listComplianceHistory(auth.accessToken!, id, { limit: 50 });
          setHistory(hist.data.items as VehicleComplianceHistory[]);
        }
      } catch {
        // silently fail on compliance load
      } finally {
        setComplianceLoading(false);
      }
    };
    void loadCompliance();
  }, [activeSection, auth.accessToken, id, isNew]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        vehicleNumber: form.vehicleNumber,
        vehicleType: form.vehicleType,
        fuelType: form.fuelType,
        currentOdometer: parseInt(form.currentOdometer) || 0,
      };
      if (form.brand) payload.brand = form.brand;
      if (form.model) payload.model = form.model;
      if (form.year) payload.year = parseInt(form.year);
      if (form.chassisNumber) payload.chassisNumber = form.chassisNumber;
      if (form.engineNumber) payload.engineNumber = form.engineNumber;
      if (form.rcNumber) payload.rcNumber = form.rcNumber;
      if (form.insuranceExpiry) payload.insuranceExpiry = form.insuranceExpiry;
      if (form.fitnessExpiry) payload.fitnessExpiry = form.fitnessExpiry;
      if (form.pollutionExpiry) payload.pollutionExpiry = form.pollutionExpiry;
      if (form.permitExpiry) payload.permitExpiry = form.permitExpiry;
      let response;
      if (isNew) {
        response = await createVehicle(auth.accessToken, payload as any);
        setMessage('Vehicle created successfully.');
        navigate(`/vehicles/${response.data.id}`, { replace: true });
      } else if (id) {
        response = await updateVehicle(auth.accessToken, id, payload as any);
        setVehicle(response.data);
        setMessage('Vehicle updated successfully.');
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to save vehicle.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange() {
    if (!auth.accessToken || !id || isNew) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await updateVehicleStatus(auth.accessToken, id, statusValue);
      setVehicle(response.data);
      setMessage(`Vehicle status updated to ${statusValue.replace(/_/g, ' ')}.`);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to update status.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingState message="Loading vehicle..." />;
  if (error && !vehicle && !isNew) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const canEdit = auth.hasPermission('vehicle_update');
  const canChangeStatus = auth.hasAnyPermission(['vehicle_update', 'vehicle_delete']);
  const canViewCompliance = auth.hasPermission('vehicle_compliance_view');

  return (
    <section className="page-content">
      <div className="section-header">
        <div>
          <a href="/vehicles" className="trip-back-link">Back to Vehicles</a>
          <PageHeader
            title={isNew ? 'Add Vehicle' : vehicle ? vehicle.vehicleNumber : 'Vehicle'}
            description={isNew ? 'Register a new vehicle' : undefined}
          />
        </div>
        <div className="action-panel">
          {!isNew && vehicle ? <StatusBadge status={vehicle.status} /> : null}
          {canEdit && !isNew ? (
            <button type="submit" form="vehicle-form" className="primary-button" disabled={isSaving}>
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
              className={`detail-tab${activeSection === tab.key ? ' detail-tab-active' : ''}`}
              onClick={() => setActiveSection(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      <form id="vehicle-form" className="form-main" onSubmit={handleSubmit}>
        {isNew || activeSection === 'overview' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">General Information</h4>
            <div className="form-two-column">
              <label>
                <span className="field-label">Vehicle Number *</span>
                <input
                  value={form.vehicleNumber}
                  onChange={(e) => setForm((f) => ({ ...f, vehicleNumber: e.target.value.toUpperCase() }))}
                  required
                  disabled={!isNew && !canEdit}
                />
              </label>
              <label>
                <span className="field-label">Vehicle Type *</span>
                <input
                  value={form.vehicleType}
                  onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}
                  required
                  disabled={!isNew && !canEdit}
                />
              </label>
            </div>
            <div className="form-two-column">
              <label>
                <span className="field-label">Brand</span>
                <input
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label>
                <span className="field-label">Model</span>
                <input
                  value={form.model}
                  onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
            </div>
            <div className="form-two-column">
              <label>
                <span className="field-label">Year</span>
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                  min={1900}
                  max={2100}
                  disabled={!canEdit}
                />
              </label>
              <label>
                <span className="field-label">Fuel Type *</span>
                <select
                  value={form.fuelType}
                  onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value }))}
                  disabled={!isNew && !canEdit}
                >
                  <option value="DIESEL">Diesel</option>
                  <option value="PETROL">Petrol</option>
                  <option value="CNG">CNG</option>
                  <option value="LPG">LPG</option>
                  <option value="ELECTRIC">Electric</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </label>
            </div>
            <label>
              <span className="field-label">Current Odometer (km)</span>
              <input
                type="number"
                min={0}
                value={form.currentOdometer}
                onChange={(e) => setForm((f) => ({ ...f, currentOdometer: e.target.value }))}
                disabled={!canEdit}
              />
            </label>
          </div>
        ) : null}

        {!isNew && activeSection === 'registration' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Registration & Identification</h4>
            <div className="form-two-column">
              <label>
                <span className="field-label">Chassis Number</span>
                <input
                  value={form.chassisNumber}
                  onChange={(e) => setForm((f) => ({ ...f, chassisNumber: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label>
                <span className="field-label">Engine Number</span>
                <input
                  value={form.engineNumber}
                  onChange={(e) => setForm((f) => ({ ...f, engineNumber: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
            </div>
            <label>
              <span className="field-label">RC Number</span>
              <input
                value={form.rcNumber}
                onChange={(e) => setForm((f) => ({ ...f, rcNumber: e.target.value }))}
                disabled={!canEdit}
              />
            </label>
          </div>
        ) : null}

        {!isNew && activeSection === 'expiry' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Expiry Dates</h4>
            <div className="form-two-column">
              <label>
                <span className="field-label">Insurance Expiry</span>
                <input
                  type="date"
                  value={form.insuranceExpiry ? form.insuranceExpiry.substring(0, 10) : ''}
                  onChange={(e) => setForm((f) => ({ ...f, insuranceExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                  disabled={!canEdit}
                />
              </label>
              <label>
                <span className="field-label">Fitness Expiry</span>
                <input
                  type="date"
                  value={form.fitnessExpiry ? form.fitnessExpiry.substring(0, 10) : ''}
                  onChange={(e) => setForm((f) => ({ ...f, fitnessExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                  disabled={!canEdit}
                />
              </label>
              <label>
                <span className="field-label">Pollution Expiry</span>
                <input
                  type="date"
                  value={form.pollutionExpiry ? form.pollutionExpiry.substring(0, 10) : ''}
                  onChange={(e) => setForm((f) => ({ ...f, pollutionExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                  disabled={!canEdit}
                />
              </label>
              <label>
                <span className="field-label">Permit Expiry</span>
                <input
                  type="date"
                  value={form.permitExpiry ? form.permitExpiry.substring(0, 10) : ''}
                  onChange={(e) => setForm((f) => ({ ...f, permitExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                  disabled={!canEdit}
                />
              </label>
            </div>
          </div>
        ) : null}

        {!isNew && activeSection === 'compliance' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Vehicle Compliance</h4>
            {complianceLoading ? (
              <p className="helper-text">Loading compliance data...</p>
            ) : !canViewCompliance ? (
              <p className="helper-text">You do not have permission to view compliance data.</p>
            ) : (
              <>
                {/* Insurance */}
                <h5 style={{ marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Insurance</h5>
                {insurance.length === 0 ? (
                  <p className="helper-text">No insurance records found.</p>
                ) : (
                  <table className="data-table" style={{ marginBottom: 16 }}>
                    <thead>
                      <tr>
                        <th>Policy #</th>
                        <th>Insurer</th>
                        <th>Type</th>
                        <th>Valid From</th>
                        <th>Valid To</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insurance.map((ins) => (
                        <tr key={ins.id}>
                          <td>{ins.policyNumber}</td>
                          <td>{ins.insurerName}</td>
                          <td>{ins.policyType.replace(/_/g, ' ')}</td>
                          <td>{new Date(ins.validFrom).toLocaleDateString()}</td>
                          <td>{new Date(ins.validTo).toLocaleDateString()}</td>
                          <td><StatusDot status={ins.status} />{ins.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Permits */}
                <h5 style={{ marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Permits</h5>
                {permits.length === 0 ? (
                  <p className="helper-text">No permit records found.</p>
                ) : (
                  <table className="data-table" style={{ marginBottom: 16 }}>
                    <thead>
                      <tr>
                        <th>Permit #</th>
                        <th>Type</th>
                        <th>Authority</th>
                        <th>Valid From</th>
                        <th>Valid To</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permits.map((p) => (
                        <tr key={p.id}>
                          <td>{p.permitNumber}</td>
                          <td>{p.permitType.replace(/_/g, ' ')}</td>
                          <td>{p.issuingAuthority ?? '--'}</td>
                          <td>{new Date(p.validFrom).toLocaleDateString()}</td>
                          <td>{new Date(p.validTo).toLocaleDateString()}</td>
                          <td><StatusDot status={p.status} />{p.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Fitness */}
                <h5 style={{ marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fitness Certificates</h5>
                {fitnessRecords.length === 0 ? (
                  <p className="helper-text">No fitness records found.</p>
                ) : (
                  <table className="data-table" style={{ marginBottom: 16 }}>
                    <thead>
                      <tr>
                        <th>Certificate #</th>
                        <th>Inspection Date</th>
                        <th>Valid From</th>
                        <th>Valid To</th>
                        <th>Center</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fitnessRecords.map((f) => (
                        <tr key={f.id}>
                          <td>{f.certificateNumber}</td>
                          <td>{new Date(f.inspectionDate).toLocaleDateString()}</td>
                          <td>{new Date(f.validFrom).toLocaleDateString()}</td>
                          <td>{new Date(f.validTo).toLocaleDateString()}</td>
                          <td>{f.inspectionCenter ?? '--'}</td>
                          <td><StatusDot status={f.status} />{f.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* PUC */}
                <h5 style={{ marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PUC Certificates</h5>
                {pucRecords.length === 0 ? (
                  <p className="helper-text">No PUC records found.</p>
                ) : (
                  <table className="data-table" style={{ marginBottom: 16 }}>
                    <thead>
                      <tr>
                        <th>Certificate #</th>
                        <th>Norm</th>
                        <th>Valid From</th>
                        <th>Valid To</th>
                        <th>Testing Center</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pucRecords.map((p) => (
                        <tr key={p.id}>
                          <td>{p.certificateNumber}</td>
                          <td>{p.emissionNorm}</td>
                          <td>{new Date(p.validFrom).toLocaleDateString()}</td>
                          <td>{new Date(p.validTo).toLocaleDateString()}</td>
                          <td>{p.testingCenter ?? '--'}</td>
                          <td><StatusDot status={p.status} />{p.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Road Tax */}
                <h5 style={{ marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Road Tax</h5>
                {roadTaxRecords.length === 0 ? (
                  <p className="helper-text">No road tax records found.</p>
                ) : (
                  <table className="data-table" style={{ marginBottom: 16 }}>
                    <thead>
                      <tr>
                        <th>Receipt #</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Paid From</th>
                        <th>Paid To</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roadTaxRecords.map((rt) => (
                        <tr key={rt.id}>
                          <td>{rt.taxReceiptNumber}</td>
                          <td>{rt.taxType}</td>
                          <td>{rt.amount != null ? `₹${rt.amount.toLocaleString()}` : '--'}</td>
                          <td>{new Date(rt.paidFrom).toLocaleDateString()}</td>
                          <td>{new Date(rt.paidTo).toLocaleDateString()}</td>
                          <td><StatusDot status={rt.status} />{rt.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* FASTag */}
                <h5 style={{ marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>FASTag</h5>
                {fastag ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                    <div><p className="detail-label">FASTag ID</p><p className="detail-value">{fastag.fastagId}</p></div>
                    <div><p className="detail-label">Issuer Bank</p><p className="detail-value">{fastag.issuerBank ?? '--'}</p></div>
                    <div><p className="detail-label">Mobile</p><p className="detail-value">{fastag.linkedMobileMasked ?? '--'}</p></div>
                    <div><p className="detail-label">Status</p><p className="detail-value"><StatusDot status={fastag.status} />{fastag.status}</p></div>
                    <div><p className="detail-label">Balance</p><p className="detail-value">{fastag.lastKnownBalance != null ? `₹${fastag.lastKnownBalance.toLocaleString()}` : '--'}</p></div>
                    <div><p className="detail-label">Last Recharge</p><p className="detail-value">{fastag.lastRechargeDate ? new Date(fastag.lastRechargeDate).toLocaleDateString() : '--'}</p></div>
                  </div>
                ) : (
                  <p className="helper-text">No FASTag details found.</p>
                )}

                {/* GPS Device */}
                <h5 style={{ marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>GPS Device (AIS-140)</h5>
                {gpsDevice ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                    <div><p className="detail-label">Device ID</p><p className="detail-value">{gpsDevice.deviceId}</p></div>
                    <div><p className="detail-label">IMEI</p><p className="detail-value">{gpsDevice.imei ?? '--'}</p></div>
                    <div><p className="detail-label">Vendor</p><p className="detail-value">{gpsDevice.vendorName ?? '--'}</p></div>
                    <div><p className="detail-label">AIS-140</p><p className="detail-value">{gpsDevice.ais140Certified ? 'Certified' : 'Not Certified'}</p></div>
                    <div><p className="detail-label">Status</p><p className="detail-value"><StatusDot status={gpsDevice.status} />{gpsDevice.status}</p></div>
                    <div><p className="detail-label">Installed</p><p className="detail-value">{gpsDevice.installedAt ? new Date(gpsDevice.installedAt).toLocaleDateString() : '--'}</p></div>
                  </div>
                ) : (
                  <p className="helper-text">No GPS device details found.</p>
                )}
              </>
            )}
          </div>
        ) : null}

        {!isNew && activeSection === 'documents' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Compliance Documents</h4>
            {complianceLoading ? (
              <p className="helper-text">Loading documents...</p>
            ) : documents.length === 0 ? (
              <div className="info-banner">No compliance documents found for this vehicle.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Document #</th>
                    <th>Authority</th>
                    <th>Valid From</th>
                    <th>Valid To</th>
                    <th>Status</th>
                    <th>Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.complianceType.replace(/_/g, ' ')}</td>
                      <td>{doc.documentNumber ?? '--'}</td>
                      <td>{doc.issuingAuthority ?? '--'}</td>
                      <td>{doc.validFrom ? new Date(doc.validFrom).toLocaleDateString() : '--'}</td>
                      <td>{doc.validTo ? <><span>{new Date(doc.validTo).toLocaleDateString()}</span> <DaysUntil date={doc.validTo} /></> : '--'}</td>
                      <td><StatusDot status={doc.status} />{doc.status}</td>
                      <td>{doc.verifiedBy ? `✓ ${doc.verifiedBy.name}` : doc.status === 'VERIFIED' ? '✓' : 'Pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}

        {!isNew && activeSection === 'history' ? (
          <div className="card form-section-grid">
            <h4 className="role-edit-h4">Compliance History</h4>
            {complianceLoading ? (
              <p className="helper-text">Loading history...</p>
            ) : history.length === 0 ? (
              <div className="info-banner">No compliance history found for this vehicle.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Action</th>
                    <th>From</th>
                    <th>To</th>
                    <th>By</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td>{new Date(h.createdAt).toLocaleDateString()}</td>
                      <td>{h.complianceType.replace(/_/g, ' ')}</td>
                      <td>{h.action.replace(/_/g, ' ')}</td>
                      <td>{h.fromStatus ?? '--'}</td>
                      <td>{h.toStatus ?? '--'}</td>
                      <td>{h.createdBy?.name ?? '--'}</td>
                      <td>{h.remarks ?? '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}

        {!isNew && activeSection === 'status' ? (
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
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                    <option value="UNDER_REPAIR">Under Repair</option>
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
            {vehicle ? (
              <div className="form-two-column">
                <div>
                  <p className="detail-label">Created</p>
                  <p className="detail-value">{new Date(vehicle.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="detail-label">Last Updated</p>
                  <p className="detail-value">{new Date(vehicle.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {isNew ? (
          <div className="action-panel">
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Vehicle'}
            </button>
            <button type="button" className="secondary-button" onClick={() => navigate('/vehicles')}>
              Cancel
            </button>
          </div>
        ) : null}
      </form>
    </section>
  );
}
