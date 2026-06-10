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

  useEffect(() => {
    if (isNew || !id) return;

    const load = async () => {
      if (!auth.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getVehicle(auth.accessToken, id);
        setVehicle(response.data);
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

  async function handleStatusChange(status: string) {
    if (!auth.accessToken || !id || isNew) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await updateVehicleStatus(auth.accessToken, id, status);
      setVehicle(response.data);
      setMessage(`Vehicle status updated to ${status.replace(/_/g, ' ')}.`);
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
    <section>
      <PageHeader
        title={isNew ? 'Add Vehicle' : vehicle ? vehicle.vehicleNumber : 'Vehicle'}
        description={isNew ? 'Register a new vehicle' : vehicle ? `Status: ${vehicle.status.replace(/_/g, ' ')}` : undefined}
        actions={!isNew && vehicle
          ? [<StatusBadge key="badge" status={vehicle.status} />]
          : undefined
        }
      />

      {error ? <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div> : null}
      {message ? <div className="success-banner" style={{ marginBottom: '1rem' }}>{message}</div> : null}

      <div className="page-grid">
        <form className="card stack-form" onSubmit={handleSubmit}>
          <h3>General Information</h3>

          <label>
            <span>Vehicle Number *</span>
            <input
              value={form.vehicleNumber}
              onChange={(e) => setForm((f) => ({ ...f, vehicleNumber: e.target.value.toUpperCase() }))}
              required
              disabled={!isNew && !canEdit}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <label>
              <span>Vehicle Type *</span>
              <input
                value={form.vehicleType}
                onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}
                required
                disabled={!isNew && !canEdit}
              />
            </label>
            <label>
              <span>Fuel Type *</span>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.9rem' }}>
            <label>
              <span>Brand</span>
              <input
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                disabled={!canEdit}
              />
            </label>
            <label>
              <span>Model</span>
              <input
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                disabled={!canEdit}
              />
            </label>
            <label>
              <span>Year</span>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                min={1900}
                max={2100}
                disabled={!canEdit}
              />
            </label>
          </div>

          <h3 style={{ marginTop: '1rem' }}>Registration & Identification</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <label>
              <span>Chassis Number</span>
              <input
                value={form.chassisNumber}
                onChange={(e) => setForm((f) => ({ ...f, chassisNumber: e.target.value }))}
                disabled={!canEdit}
              />
            </label>
            <label>
              <span>Engine Number</span>
              <input
                value={form.engineNumber}
                onChange={(e) => setForm((f) => ({ ...f, engineNumber: e.target.value }))}
                disabled={!canEdit}
              />
            </label>
          </div>

          <label>
            <span>RC Number</span>
            <input
              value={form.rcNumber}
              onChange={(e) => setForm((f) => ({ ...f, rcNumber: e.target.value }))}
              disabled={!canEdit}
            />
          </label>

          <h3 style={{ marginTop: '1rem' }}>Expiry Dates</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <label>
              <span>Insurance Expiry</span>
              <input
                type="date"
                value={form.insuranceExpiry ? form.insuranceExpiry.substring(0, 10) : ''}
                onChange={(e) => setForm((f) => ({ ...f, insuranceExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                disabled={!canEdit}
              />
            </label>
            <label>
              <span>Fitness Expiry</span>
              <input
                type="date"
                value={form.fitnessExpiry ? form.fitnessExpiry.substring(0, 10) : ''}
                onChange={(e) => setForm((f) => ({ ...f, fitnessExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                disabled={!canEdit}
              />
            </label>
            <label>
              <span>Pollution Expiry</span>
              <input
                type="date"
                value={form.pollutionExpiry ? form.pollutionExpiry.substring(0, 10) : ''}
                onChange={(e) => setForm((f) => ({ ...f, pollutionExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                disabled={!canEdit}
              />
            </label>
            <label>
              <span>Permit Expiry</span>
              <input
                type="date"
                value={form.permitExpiry ? form.permitExpiry.substring(0, 10) : ''}
                onChange={(e) => setForm((f) => ({ ...f, permitExpiry: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                disabled={!canEdit}
              />
            </label>
          </div>

          <h3 style={{ marginTop: '1rem' }}>Odometer</h3>

          <label>
            <span>Current Odometer (km)</span>
            <input
              type="number"
              min={0}
              value={form.currentOdometer}
              onChange={(e) => setForm((f) => ({ ...f, currentOdometer: e.target.value }))}
              disabled={!canEdit}
            />
          </label>

          {canEdit ? (
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : isNew ? 'Create Vehicle' : 'Update Vehicle'}
            </button>
          ) : null}
        </form>

        {!isNew && vehicle ? (
          <div className="card stack-form">
            <h3>Status Management</h3>
            {canChangeStatus ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button type="button" className="secondary-button" onClick={() => handleStatusChange('AVAILABLE')}>Available</button>
                <button type="button" className="secondary-button" onClick={() => handleStatusChange('UNDER_MAINTENANCE')}>Maintenance</button>
                <button type="button" className="secondary-button" onClick={() => handleStatusChange('UNDER_REPAIR')}>Repair</button>
                <button type="button" className="secondary-button" onClick={() => handleStatusChange('INACTIVE')}>Inactive</button>
              </div>
            ) : null}

            <h3 style={{ marginTop: '1rem' }}>Documents</h3>
            <p style={{ color: '#5a6474', fontSize: '0.9rem' }}>Documents section placeholder. Add RC, insurance, and permit documents here.</p>

            <h3 style={{ marginTop: '1rem' }}>Details</h3>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div><strong>Created:</strong> {new Date(vehicle.createdAt).toLocaleDateString()}</div>
              <div><strong>Last Updated:</strong> {new Date(vehicle.updatedAt).toLocaleDateString()}</div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
