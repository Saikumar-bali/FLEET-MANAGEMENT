import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  assignAsset,
  createAsset,
  getAsset,
  getAssetAssignments,
  getAssetCategories,
  getAssetHistory,
  getDrivers,
  getUsers,
  getVehicles,
  markAssetDamaged,
  markAssetLost,
  returnAsset,
  transferAsset,
  updateAsset,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import type {
  AssetAssignmentRecord,
  AssetCategoryRecord,
  AssetHistoryRecord,
  AssetHolderType,
  AssetRecord,
  DriverRecord,
  UserRecord,
  VehicleRecord,
} from '../types/auth';
import { ApiError } from '../types/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Modal } from '../components/Modal';
import { DataTable } from '../components/DataTable';
import { FormSection } from '../components/FormSection';
import { formatAssetHolderSummary, formatAssignmentHolder } from '../utils/assetHolders';

type AssetForm = {
  assetCode: string;
  name: string;
  assetCategoryId: string;
  serialNumber: string;
  purchaseDate: string;
  purchaseAmount: string;
  notes: string;
};

type ActionMode = 'assign' | 'return' | 'transfer' | 'damage' | 'lost' | null;

type AssetActionForm = {
  assignedToType: AssetHolderType;
  assignedToId: string;
  notes: string;
  proofUrl: string;
};

const initialForm: AssetForm = {
  assetCode: '',
  name: '',
  assetCategoryId: '',
  serialNumber: '',
  purchaseDate: '',
  purchaseAmount: '',
  notes: '',
};

const initialActionForm: AssetActionForm = {
  assignedToType: 'VEHICLE',
  assignedToId: '',
  notes: '',
  proofUrl: '',
};

type SectionTab = 'overview' | 'assignment' | 'history';

const sectionTabs: { key: SectionTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'assignment', label: 'Assignment' },
  { key: 'history', label: 'History' },
];

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
}

function historyActionLabel(action: AssetHistoryRecord['action']) {
  return action.replace(/_/g, ' ');
}

export function AssetDetailPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const auth = useAuth();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<AssetRecord | null>(null);
  const [categories, setCategories] = useState<AssetCategoryRecord[]>([]);
  const [assignments, setAssignments] = useState<AssetAssignmentRecord[]>([]);
  const [history, setHistory] = useState<AssetHistoryRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [form, setForm] = useState<AssetForm>(initialForm);
  const [actionForm, setActionForm] = useState<AssetActionForm>(initialActionForm);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionTab>('overview');

  const currentAssignment = asset?.currentAssignment ?? assignments.find((entry) => entry.status === 'ACTIVE') ?? null;
  const canEdit = auth.hasPermission('asset_update');
  const canAssign = auth.hasPermission('asset_assign');
  const canReturn = auth.hasPermission('asset_return');
  const canTransfer = auth.hasPermission('asset_transfer');
  const canMarkDamaged = auth.hasPermission('asset_mark_damaged');
  const canMarkLost = auth.hasPermission('asset_mark_lost');

  const holderOptions = useMemo(() => {
    if (actionForm.assignedToType === 'VEHICLE') {
      return vehicles.map((vehicle) => ({
        id: vehicle.id,
        label: vehicle.vehicleNumber,
        secondary: [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || null,
      }));
    }

    if (actionForm.assignedToType === 'DRIVER') {
      return drivers.map((driver) => ({
        id: driver.id,
        label: driver.name,
        secondary: driver.mobile,
      }));
    }

    return users.map((user) => ({
      id: user.id,
      label: user.name,
      secondary: user.email,
    }));
  }, [actionForm.assignedToType, drivers, users, vehicles]);

  useEffect(() => {
    const loadCategories = async () => {
      if (!auth.accessToken) return;
      try {
        const response = await getAssetCategories(auth.accessToken);
        setCategories(response.data);
        setForm((current) => (
          current.assetCategoryId || response.data.length === 0
            ? current
            : { ...current, assetCategoryId: response.data[0].id }
        ));
      } catch {
        // Intentionally ignore category preload failures here. Asset fetch will show a proper error.
      }
    };

    void loadCategories();
  }, [auth.accessToken]);

  useEffect(() => {
    const loadHolderSources = async () => {
      if (!auth.accessToken || isNew) return;

      try {
        const [vehicleResponse, driverResponse, userResponse] = await Promise.all([
          getVehicles(auth.accessToken, { limit: 100 }),
          getDrivers(auth.accessToken, { limit: 100 }),
          auth.hasPermission('user_view') ? getUsers(auth.accessToken) : Promise.resolve(null),
        ]);

        setVehicles(vehicleResponse.data.items);
        setDrivers(driverResponse.data.items);
        setUsers(userResponse?.data ?? []);
      } catch {
        // Keep the page usable even when some lookup sources are not available.
      }
    };

    void loadHolderSources();
  }, [auth, isNew]);

  useEffect(() => {
    if (isNew || !id || !auth.accessToken) return;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [assetResponse, assignmentsResponse, historyResponse] = await Promise.all([
          getAsset(auth.accessToken!, id),
          getAssetAssignments(auth.accessToken!, id),
          getAssetHistory(auth.accessToken!, id),
        ]);

        setAsset(assetResponse.data);
        setAssignments(assignmentsResponse.data);
        setHistory(historyResponse.data);
        setForm({
          assetCode: assetResponse.data.assetCode,
          name: assetResponse.data.name,
          assetCategoryId: assetResponse.data.assetCategoryId,
          serialNumber: assetResponse.data.serialNumber ?? '',
          purchaseDate: assetResponse.data.purchaseDate ?? '',
          purchaseAmount: assetResponse.data.purchaseAmount?.toString() ?? '',
          notes: assetResponse.data.notes ?? '',
        });
      } catch (caughtError) {
        if (caughtError instanceof ApiError) setError(caughtError.message);
        else setError('Failed to load asset.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [auth.accessToken, id, isNew]);

  function resetActionForm(nextType: AssetHolderType = 'VEHICLE') {
    setActionForm({
      assignedToType: nextType,
      assignedToId: '',
      notes: '',
      proofUrl: '',
    });
  }

  function openActionModal(mode: Exclude<ActionMode, null>) {
    resetActionForm(mode === 'assign' || mode === 'transfer' ? 'VEHICLE' : actionForm.assignedToType);
    setActionMode(mode);
  }

  async function refreshAssetState(assetId: string) {
    if (!auth.accessToken) return;

    const [assetResponse, assignmentsResponse, historyResponse] = await Promise.all([
      getAsset(auth.accessToken, assetId),
      getAssetAssignments(auth.accessToken, assetId),
      getAssetHistory(auth.accessToken, assetId),
    ]);

    setAsset(assetResponse.data);
    setAssignments(assignmentsResponse.data);
    setHistory(historyResponse.data);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload: Record<string, unknown> = {
        assetCode: form.assetCode,
        name: form.name,
        assetCategoryId: form.assetCategoryId,
      };

      if (form.serialNumber) payload.serialNumber = form.serialNumber;
      if (form.purchaseDate) payload.purchaseDate = form.purchaseDate;
      if (form.purchaseAmount) payload.purchaseAmount = parseFloat(form.purchaseAmount);
      if (form.notes) payload.notes = form.notes;

      if (isNew) {
        const response = await createAsset(auth.accessToken, payload as {
          assetCode: string;
          name: string;
          assetCategoryId: string;
          serialNumber?: string;
          purchaseDate?: string;
          purchaseAmount?: number;
          notes?: string;
        });
        setMessage('Asset created successfully.');
        navigate(`/assets/${response.data.id}`, { replace: true });
        return;
      }

      if (id) {
        const response = await updateAsset(auth.accessToken, id, payload);
        setAsset(response.data);
        setMessage('Asset updated successfully.');
        await refreshAssetState(id);
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to save asset.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleActionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken || !id || !actionMode) return;

    setIsActionSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (actionMode === 'assign') {
        await assignAsset(auth.accessToken, id, {
          assignedToType: actionForm.assignedToType,
          assignedToId: actionForm.assignedToId,
          notes: actionForm.notes || undefined,
        });
        setMessage('Asset assigned successfully.');
      } else if (actionMode === 'return') {
        await returnAsset(auth.accessToken, id, {
          notes: actionForm.notes || undefined,
          proofUrl: actionForm.proofUrl || undefined,
        });
        setMessage('Asset returned successfully.');
      } else if (actionMode === 'transfer') {
        await transferAsset(auth.accessToken, id, {
          assignedToType: actionForm.assignedToType,
          assignedToId: actionForm.assignedToId,
          notes: actionForm.notes || undefined,
          proofUrl: actionForm.proofUrl || undefined,
        });
        setMessage('Asset transferred successfully.');
      } else if (actionMode === 'damage') {
        await markAssetDamaged(auth.accessToken, id, {
          notes: actionForm.notes || undefined,
          proofUrl: actionForm.proofUrl || undefined,
        });
        setMessage('Asset marked as damaged.');
      } else if (actionMode === 'lost') {
        await markAssetLost(auth.accessToken, id, {
          notes: actionForm.notes || undefined,
          proofUrl: actionForm.proofUrl || undefined,
        });
        setMessage('Asset marked as lost.');
      }

      await refreshAssetState(id);
      setActionMode(null);
      resetActionForm();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) setError(caughtError.message);
      else setError('Failed to complete asset action.');
    } finally {
      setIsActionSubmitting(false);
    }
  }

  if (isLoading) return <LoadingState message="Loading asset..." />;
  if (error && !asset && !isNew) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const historyColumns = [
    {
      key: 'action',
      header: 'Action',
      render: (entry: AssetHistoryRecord) => (
        <div className="stack-cell">
          <strong>{historyActionLabel(entry.action)}</strong>
          <span className="table-secondary">{formatDate(entry.createdAt)}</span>
        </div>
      ),
    },
    {
      key: 'fromHolder',
      header: 'From',
      render: (entry: AssetHistoryRecord) => (
        <span>{entry.fromHolder ? formatAssetHolderSummary(entry.fromHolder) : '-'}</span>
      ),
    },
    {
      key: 'toHolder',
      header: 'To',
      render: (entry: AssetHistoryRecord) => (
        <span>{entry.toHolder ? formatAssetHolderSummary(entry.toHolder) : '-'}</span>
      ),
    },
    {
      key: 'by',
      header: 'Created By',
      render: (entry: AssetHistoryRecord) => (
        <span>{entry.createdBy ? `${entry.createdBy.name} (${entry.createdBy.email})` : '-'}</span>
      ),
    },
    {
      key: 'remarks',
      header: 'Remarks',
      render: (entry: AssetHistoryRecord) => (
        <div className="stack-cell">
          <span>{entry.remarks || '-'}</span>
          {entry.proofUrl ? (
            <a href={entry.proofUrl} target="_blank" rel="noreferrer">
              View proof
            </a>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section className="form-page-full">
      <div className="section-header">
        <div>
          <a href="/assets" className="eyebrow" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '0.25rem' }}>Back to Assets</a>
          <PageHeader
            title={isNew ? 'Add Asset' : asset ? `${asset.assetCode} - ${asset.name}` : 'Asset'}
            description={isNew ? 'Register a new asset' : undefined}
          />
        </div>
        <div className="action-panel">
          {!isNew && asset ? (<><StatusBadge status={asset.currentStatus} />
            {!currentAssignment && canAssign && asset.currentStatus !== 'LOST' && asset.currentStatus !== 'RETIRED' ? (
              <button type="button" className="primary-button" onClick={() => openActionModal('assign')}>
                Assign
              </button>
            ) : null}
            {currentAssignment && canReturn ? (
              <button type="button" className="secondary-button" onClick={() => openActionModal('return')}>
                Return
              </button>
            ) : null}
            {currentAssignment && canTransfer ? (
              <button type="button" className="secondary-button" onClick={() => openActionModal('transfer')}>
                Transfer
              </button>
            ) : null}
            {canMarkDamaged && asset.currentStatus !== 'DAMAGED' ? (
              <button type="button" className="secondary-button" onClick={() => openActionModal('damage')}>
                Damage
              </button>
            ) : null}
            {canMarkLost && asset.currentStatus !== 'LOST' ? (
              <button type="button" className="danger-button" onClick={() => openActionModal('lost')}>
                Lost
              </button>
            ) : null}
            {canEdit ? (
              <button type="submit" form="asset-form" className="primary-button" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            ) : null}</>
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

      <form id="asset-form" className="form-main" onSubmit={handleSubmit}>
        {isNew || activeSection === 'overview' ? (
          <div className="card form-section-grid">
            <h4 style={{ margin: 0 }}>{isNew ? 'Asset Information' : 'Overview'}</h4>

            <div className="form-two-column">
              <label>
                <span className="field-label">Asset Code *</span>
                <input
                  value={form.assetCode}
                  onChange={(event) => setForm((current) => ({ ...current, assetCode: event.target.value }))}
                  required
                  disabled={!isNew && !canEdit}
                />
              </label>
              <label>
                <span className="field-label">Name *</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                  disabled={!canEdit}
                />
              </label>
            </div>

            <label>
              <span className="field-label">Category *</span>
              <select
                value={form.assetCategoryId}
                onChange={(event) => setForm((current) => ({ ...current, assetCategoryId: event.target.value }))}
                disabled={!canEdit}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>

            <div className="form-two-column">
              <label>
                <span className="field-label">Serial Number</span>
                <input
                  value={form.serialNumber}
                  onChange={(event) => setForm((current) => ({ ...current, serialNumber: event.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label>
                <span className="field-label">Purchase Amount</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.purchaseAmount}
                  onChange={(event) => setForm((current) => ({ ...current, purchaseAmount: event.target.value }))}
                  disabled={!canEdit}
                />
              </label>
            </div>

            <label>
              <span className="field-label">Purchase Date</span>
              <input
                type="date"
                value={form.purchaseDate ? form.purchaseDate.substring(0, 10) : ''}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  purchaseDate: event.target.value ? new Date(event.target.value).toISOString() : '',
                }))}
                disabled={!canEdit}
              />
            </label>

            <label>
              <span className="field-label">Notes</span>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                disabled={!canEdit}
              />
            </label>
          </div>
        ) : null}

        {!isNew && activeSection === 'assignment' && asset ? (
          <>
            <div className="card form-section-grid">
              <h4 style={{ margin: 0 }}>Current Assignment</h4>
              {currentAssignment ? (
                <div className="form-two-column">
                  <div>
                    <p className="detail-label">Assigned To</p>
                    <p className="detail-value">{formatAssignmentHolder(currentAssignment)}</p>
                  </div>
                  <div>
                    <p className="detail-label">Holder Type</p>
                    <p className="detail-value">{currentAssignment.assignedToType}</p>
                  </div>
                  <div>
                    <p className="detail-label">Assigned At</p>
                    <p className="detail-value">{formatDate(currentAssignment.assignedAt)}</p>
                  </div>
                  <div>
                    <p className="detail-label">Assigned By</p>
                    <p className="detail-value">{currentAssignment.assignedBy ? `${currentAssignment.assignedBy.name} (${currentAssignment.assignedBy.email})` : '-'}</p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p className="detail-label">Notes</p>
                    <p className="detail-value">{currentAssignment.notes || '-'}</p>
                  </div>
                </div>
              ) : (
                <div className="info-banner">This asset is currently available and not assigned to any holder.</div>
              )}
            </div>

            <div className="card form-section-grid">
              <h4 style={{ margin: 0 }}>Snapshot</h4>
              <div className="form-two-column">
                <div>
                  <p className="detail-label">Status</p>
                  <p className="detail-value">{asset.currentStatus.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="detail-label">Category</p>
                  <p className="detail-value">{asset.assetCategory.name}</p>
                </div>
                <div>
                  <p className="detail-label">Created</p>
                  <p className="detail-value">{formatDate(asset.createdAt)}</p>
                </div>
                <div>
                  <p className="detail-label">Last Updated</p>
                  <p className="detail-value">{formatDate(asset.updatedAt)}</p>
                </div>
              </div>
            </div>

            <div className="card form-section-grid">
              <h4 style={{ margin: 0 }}>Assignment Records</h4>
              {assignments.length === 0 ? (
                <p className="muted-copy">No assignment history yet.</p>
              ) : (
                <div className="assignment-list">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="assignment-item">
                      <div className="section-header">
                        <strong>{formatAssignmentHolder(assignment)}</strong>
                        <StatusBadge status={assignment.status} />
                      </div>
                      <p className="muted-copy">
                        {assignment.assignedToType} • {formatDate(assignment.assignedAt)}
                        {assignment.returnedAt ? ` • closed ${formatDate(assignment.returnedAt)}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}

        {!isNew && activeSection === 'history' ? (
          <div className="card table-card">
            <div>
              <h3 className="table-toolbar-title">Assignment History</h3>
              <p className="table-toolbar-copy">Every assign, return, transfer, damaged, and lost action is recorded here.</p>
            </div>
            <DataTable
              columns={historyColumns}
              data={history}
              keyExtractor={(entry) => entry.id}
            />
          </div>
        ) : null}

        {isNew ? (
          <div className="action-panel" style={{ marginTop: '0.5rem' }}>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Asset'}
            </button>
            <button type="button" className="secondary-button" onClick={() => navigate('/assets')}>
              Cancel
            </button>
          </div>
        ) : null}
      </form>

      <Modal
        isOpen={actionMode !== null}
        title={
          actionMode === 'assign'
            ? 'Assign Asset'
            : actionMode === 'return'
              ? 'Return Asset'
              : actionMode === 'transfer'
                ? 'Transfer Asset'
                : actionMode === 'damage'
                  ? 'Mark Asset Damaged'
                  : 'Mark Asset Lost'
        }
        description={
          actionMode === 'assign'
            ? 'Choose the next holder and record any supporting notes.'
            : actionMode === 'return'
              ? 'Confirm the return and optionally attach a proof link.'
              : actionMode === 'transfer'
                ? 'Close the current assignment and move the asset to a new holder.'
                : 'Record the status change and any proof URL for the audit trail.'
        }
        onClose={() => {
          if (isActionSubmitting) return;
          setActionMode(null);
          resetActionForm();
        }}
        footer={(
          <div className="button-row">
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setActionMode(null);
                resetActionForm();
              }}
              disabled={isActionSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="asset-action-form"
              className={actionMode === 'lost' ? 'danger-button' : 'primary-button'}
              disabled={isActionSubmitting || ((actionMode === 'assign' || actionMode === 'transfer') && !actionForm.assignedToId)}
            >
              {isActionSubmitting ? 'Working...' : actionMode === 'return' ? 'Confirm Return' : actionMode === 'transfer' ? 'Confirm Transfer' : actionMode === 'damage' ? 'Mark Damaged' : actionMode === 'lost' ? 'Mark Lost' : 'Assign Asset'}
            </button>
          </div>
        )}
      >
        <form id="asset-action-form" className="stack-form" onSubmit={handleActionSubmit}>
          {actionMode === 'assign' || actionMode === 'transfer' ? (
            <FormSection title="Holder" description="Assignments can target a vehicle, driver, or user.">
              <div className="form-grid">
                <label>
                  <span>Assigned To Type *</span>
                  <select
                    value={actionForm.assignedToType}
                    onChange={(event) => {
                      const nextType = event.target.value as AssetHolderType;
                      setActionForm((current) => ({
                        ...current,
                        assignedToType: nextType,
                        assignedToId: '',
                      }));
                    }}
                  >
                    <option value="VEHICLE">Vehicle</option>
                    <option value="DRIVER">Driver</option>
                    <option value="USER">User</option>
                  </select>
                </label>

                <label>
                  <span>Assigned To *</span>
                  <select
                    value={actionForm.assignedToId}
                    onChange={(event) => setActionForm((current) => ({ ...current, assignedToId: event.target.value }))}
                    required
                  >
                    <option value="">Select a holder</option>
                    {holderOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.secondary ? `${option.label} (${option.secondary})` : option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {actionForm.assignedToType === 'USER' && !auth.hasPermission('user_view') ? (
                <p className="helper-text">User assignment browsing follows `user_view`. A manager or admin can assign to users from this UI.</p>
              ) : null}
            </FormSection>
          ) : null}

          <FormSection
            title="Notes"
            description="Keep remarks short and operational so the history stays readable."
          >
            <label>
              <span>Notes</span>
              <textarea
                rows={4}
                value={actionForm.notes}
                onChange={(event) => setActionForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
            {actionMode !== 'assign' ? (
              <label>
                <span>Proof URL</span>
                <input
                  type="url"
                  placeholder="https://..."
                  value={actionForm.proofUrl}
                  onChange={(event) => setActionForm((current) => ({ ...current, proofUrl: event.target.value }))}
                />
              </label>
            ) : null}
          </FormSection>
        </form>
      </Modal>
    </section>
  );
}
