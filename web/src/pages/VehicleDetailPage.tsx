import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createVehicle, getVehicle, updateVehicle, updateVehicleStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { VehicleRecord } from '../types/auth';
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

type SectionTab = 'overview' | 'registration' | 'expiry' | 'documents' | 'status';

const sectionTabs: { key: SectionTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'registration', label: 'Registration' },
  { key: 'expiry', label: 'Expiry Dates' },
  { key: 'documents', label: 'Documents' },
  { key: 'status', label: 'Status' },
];

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

  return (
    <section className="form-page-full">
      <div className="section-header">
        <div>
          <a href="/vehicles" className="eyebrow" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '0.25rem' }}>Back to Vehicles</a>
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
            <h4 style={{ margin: 0 }}>General Information</h4>
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
            <h4 style={{ margin: 0 }}>Registration & Identification</h4>
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
            <h4 style={{ margin: 0 }}>Expiry Dates</h4>
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

        {!isNew && activeSection === 'documents' ? (
          <div className="card form-section-grid">
            <h4 style={{ margin: 0 }}>Documents</h4>
            <div className="info-banner">
              Documents section placeholder. Add RC, insurance, and permit documents here.
            </div>
          </div>
        ) : null}

        {!isNew && activeSection === 'status' ? (
          <div className="card form-section-grid">
            <h4 style={{ margin: 0 }}>Status Management</h4>
            {canChangeStatus ? (
              <div className="action-panel">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <span className="field-label" style={{ whiteSpace: 'nowrap' }}>Status:</span>
                  <select
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value)}
                    style={{ width: 'auto', minWidth: '180px' }}
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
              <div className="form-two-column" style={{ marginTop: '0.5rem' }}>
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
          <div className="action-panel" style={{ marginTop: '0.5rem' }}>
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
