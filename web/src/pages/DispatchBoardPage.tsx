import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDispatchBoard, checkConflicts, assignTrip, getRouteEstimate } from '../services/dispatch';
import type { BoardData, DriverRecord, VehicleRecord, TripRecord, Conflict, RouteEstimate } from '../services/dispatch';

type DragItem = { type: 'driver' | 'vehicle'; id: string };

type BlockedVehicle = { item: VehicleRecord; reason: string };
type BlockedDriver = { item: DriverRecord; reason: string };

type VehicleWithFallback = VehicleRecord & { type?: string | null };

function normalizeBlockedVehicles(board: BoardData | null): BlockedVehicle[] {
  return (board?.unavailableVehicles ?? [])
    .map((entry) => ({ item: entry.vehicle ?? entry.item, reason: entry.reason }))
    .filter((entry): entry is BlockedVehicle => Boolean(entry.item));
}

function normalizeBlockedDrivers(board: BoardData | null): BlockedDriver[] {
  return (board?.unavailableDrivers ?? [])
    .map((entry) => ({ item: entry.driver ?? entry.item, reason: entry.reason }))
    .filter((entry): entry is BlockedDriver => Boolean(entry.item));
}

function formatDate(value?: string | null) {
  if (!value) return 'No planned start';
  return new Date(value).toLocaleString();
}

function vehicleTypeLabel(vehicle: VehicleRecord | null | undefined) {
  if (!vehicle) return 'Vehicle';
  const withFallback = vehicle as VehicleWithFallback;
  return (withFallback.vehicleType ?? withFallback.type ?? 'Vehicle').toUpperCase();
}

function vehicleMakeLabel(vehicle: VehicleRecord) {
  return [vehicle.brand, vehicle.model].filter(Boolean).join(' · ') || 'No brand/model';
}

export default function DispatchBoardPage() {
  const auth = useAuth();
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<TripRecord | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverRecord | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [checking, setChecking] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assigned, setAssigned] = useState(false);
  const [routeEstimate, setRouteEstimate] = useState<RouteEstimate | null>(null);
  const [showConflicts, setShowConflicts] = useState(true);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const token = auth.accessToken ?? '';

  const blockedVehicles = useMemo(() => normalizeBlockedVehicles(board), [board]);
  const blockedDrivers = useMemo(() => normalizeBlockedDrivers(board), [board]);
  const hardConflicts = conflicts.filter((c) => c.severity === 'HARD');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDispatchBoard(token);
      setBoard(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load dispatch board');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleSelectTrip = (trip: TripRecord) => {
    setSelectedTrip(trip);
    setSelectedDriver(null);
    setSelectedVehicle(null);
    setConflicts([]);
    setAssigned(false);
    setRouteEstimate(null);
    setShowConflicts(true);
    if (trip.originName && trip.destinationName) {
      void getRouteEstimate(token, trip.originName, trip.destinationName).then((r: { data: RouteEstimate }) => setRouteEstimate(r.data));
    }
  };

  const handleDragStart = (e: React.DragEvent, type: 'driver' | 'vehicle', id: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTripDragOver = (e: React.DragEvent, tripId: string) => {
    e.preventDefault();
    setDragOver(tripId);
  };

  const handleTripDragLeave = () => setDragOver(null);

  const handleDrop = (e: React.DragEvent, trip: TripRecord) => {
    e.preventDefault();
    setDragOver(null);
    handleSelectTrip(trip);
    try {
      const data: DragItem = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'driver') {
        const driver = board?.availableDrivers.find((d) => d.id === data.id);
        if (driver) setSelectedDriver(driver);
      } else if (data.type === 'vehicle') {
        const vehicle = board?.availableVehicles.find((v) => v.id === data.id);
        if (vehicle) setSelectedVehicle(vehicle);
      }
    } catch {
      // Ignore invalid drag payloads.
    }
  };

  useEffect(() => {
    if (!selectedTrip || (!selectedDriver && !selectedVehicle)) {
      setConflicts([]);
      return;
    }
    setChecking(true);
    checkConflicts(token, {
      tripId: selectedTrip.id,
      driverId: selectedDriver?.id ?? null,
      vehicleId: selectedVehicle?.id ?? null,
      plannedStartAt: selectedTrip.plannedStartAt ?? null,
      plannedEndAt: selectedTrip.plannedEndAt ?? null,
    }).then((r: { data: { conflicts: Conflict[]; hasConflict: boolean } }) => {
      setConflicts(r.data.conflicts);
      setShowConflicts(r.data.hasConflict);
    }).catch(() => {
      // Keep UX usable; backend will still block on confirm.
    }).finally(() => setChecking(false));
  }, [selectedDriver, selectedVehicle, selectedTrip, token]);

  const handleAssign = async () => {
    if (!selectedTrip || !selectedDriver || !selectedVehicle) return;
    setAssigning(true);
    setError(null);
    try {
      await assignTrip(token, { tripId: selectedTrip.id, driverId: selectedDriver.id, vehicleId: selectedVehicle.id });
      setAssigned(true);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Assignment failed');
    }
    setAssigning(false);
  };

  const canAssign = Boolean(selectedTrip && selectedDriver && selectedVehicle && hardConflicts.length === 0 && !assigned);

  if (loading && !board) {
    return <div className="page-content"><div className="state-panel"><h3>Loading dispatch board...</h3></div></div>;
  }

  if (!board) {
    return <div className="page-content"><div className="state-panel"><div className="error-banner">{error ?? 'No data'}</div></div></div>;
  }

  return (
    <div className="page-content dispatch-board">
      <div className="dispatch-topbar-row">
        <div className="dispatch-metrics-bar">
          <div className="metric-card dispatch-metric">
            <span className="metric-label">Trips waiting</span>
            <strong className="metric-value">{board.summary.unassignedTrips}</strong>
          </div>
          <div className="metric-card dispatch-metric">
            <span className="metric-label">Drivers ready</span>
            <strong className="metric-value">{board.summary.availableDrivers}</strong>
          </div>
          <div className="metric-card dispatch-metric">
            <span className="metric-label">Vehicles ready</span>
            <strong className="metric-value">{board.summary.availableVehicles}</strong>
          </div>
          <div className="metric-card dispatch-metric">
            <span className="metric-label">Blocked</span>
            <strong className="metric-value">{blockedVehicles.length + blockedDrivers.length}</strong>
          </div>
        </div>
        <button type="button" className="secondary-button dispatch-refresh-btn" onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="dispatch-layout">
        <section className="dispatch-panel dispatch-panel--trips">
          <header>
            <div>
              <h2>Trips</h2>
              <p>Choose the trip to dispatch</p>
            </div>
            <span className="count-badge">{board.unassignedTrips.length}</span>
          </header>
          <div className="dispatch-list dispatch-list--trips">
            {board.unassignedTrips.map((t) => (
              <article key={t.id}
                className={`dispatch-item dispatch-trip ${selectedTrip?.id === t.id ? 'selected' : ''} ${dragOver === t.id ? 'drop-ready' : ''}`}
                onDragOver={(e) => handleTripDragOver(e, t.id)}
                onDragLeave={handleTripDragLeave}
                onDrop={(e) => handleDrop(e, t)}
                onClick={() => handleSelectTrip(t)}>
                <div className="dispatch-item-main">
                  <strong>{t.tripNumber}</strong>
                  <span>{t.originName} → {t.destinationName}</span>
                </div>
                <div className="dispatch-item-meta">{formatDate(t.plannedStartAt)}</div>
              </article>
            ))}
            {board.unassignedTrips.length === 0 && (
              <div className="dispatch-empty">No draft trips waiting for dispatch.</div>
            )}
          </div>
        </section>

        <section className="dispatch-panel dispatch-panel--drivers">
          <header>
            <div>
              <h2>Drivers</h2>
              <p>Click or drag a driver</p>
            </div>
            <span className="count-badge">{board.availableDrivers.length} ready</span>
          </header>
          <div className="dispatch-list dispatch-list--short">
            {board.availableDrivers.map((d) => (
              <article key={d.id}
                className={`dispatch-item compact ${selectedDriver?.id === d.id ? 'selected' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, 'driver', d.id)}
                onClick={() => setSelectedDriver(d)}>
                <div className="dispatch-item-row">
                  <div className="dispatch-item-main">
                    <strong>{d.name}</strong>
                    <span>{d.mobile}</span>
                  </div>
                  <span className="status-dot" title="Ready" />
                </div>
              </article>
            ))}
            {blockedDrivers.slice(0, 4).map(({ item: d, reason }) => (
              <article key={d.id} className="dispatch-item compact blocked" title={reason}>
                <div className="dispatch-item-row">
                  <div className="dispatch-item-main">
                    <strong>{d.name}</strong>
                    <span>{d.mobile}</span>
                  </div>
                  <span className="status-pill blocked">{reason}</span>
                </div>
              </article>
            ))}
            {board.availableDrivers.length === 0 && blockedDrivers.length === 0 && (
              <div className="dispatch-empty">No drivers found.</div>
            )}
          </div>
        </section>

        <section className="dispatch-panel dispatch-panel--vehicles">
          <header>
            <div>
              <h2>Vehicles</h2>
              <p>Click or drag a vehicle</p>
            </div>
            <span className="count-badge">{board.availableVehicles.length} ready</span>
          </header>
          <div className="dispatch-list dispatch-list--short">
            {board.availableVehicles.map((v) => (
              <article key={v.id}
                className={`dispatch-item compact vehicle-item ${selectedVehicle?.id === v.id ? 'selected' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, 'vehicle', v.id)}
                onClick={() => setSelectedVehicle(v)}>
                <div className="dispatch-item-row">
                  <div className="dispatch-item-main">
                    <strong>{v.vehicleNumber}</strong>
                    <span>{vehicleMakeLabel(v)}</span>
                  </div>
                  <div className="dispatch-item-tags">
                    <span className="vehicle-type-pill">{vehicleTypeLabel(v)}</span>
                    <span className="status-dot" title="Ready" />
                  </div>
                </div>
              </article>
            ))}
            {blockedVehicles.slice(0, 4).map(({ item: v, reason }) => (
              <article key={v.id} className="dispatch-item compact vehicle-item blocked" title={reason}>
                <div className="dispatch-item-row">
                  <div className="dispatch-item-main">
                    <strong>{v.vehicleNumber}</strong>
                    <span>{vehicleMakeLabel(v)}</span>
                  </div>
                  <div className="dispatch-item-tags">
                    <span className="vehicle-type-pill muted-type">{vehicleTypeLabel(v)}</span>
                    <span className="status-pill blocked">{reason}</span>
                  </div>
                </div>
              </article>
            ))}
            {board.availableVehicles.length === 0 && blockedVehicles.length === 0 && (
              <div className="dispatch-empty">No vehicles found.</div>
            )}
          </div>
        </section>

        <aside className="dispatch-panel dispatch-preview-panel">
          <header>
            <div>
              <h2>Assignment</h2>
              {selectedTrip && (
                <p>
                  {checking ? 'Checking conflicts...' : hardConflicts.length ? 'Resolve conflicts to proceed' : 'All clear — confirm assignment'}
                </p>
              )}
            </div>
            {selectedTrip && (
              <span className={`status-indicator ${hardConflicts.length ? 'conflict' : assigned ? 'assigned' : 'ready'}`} />
            )}
          </header>

          {selectedTrip ? (
            <div className="dispatch-preview">
              <div className="preview-card">
                <span className="preview-card-label">Trip</span>
                <strong className="preview-card-value">{selectedTrip.tripNumber}</strong>
                <span className="preview-card-route">{selectedTrip.originName} → {selectedTrip.destinationName}</span>
                <span className="preview-card-meta">{formatDate(selectedTrip.plannedStartAt)}</span>
              </div>

              <div className="preview-card">
                <span className="preview-card-label">Driver</span>
                {selectedDriver ? (
                  <>
                    <strong className="preview-card-value">{selectedDriver.name}</strong>
                    <span className="preview-card-meta">{selectedDriver.mobile}</span>
                  </>
                ) : (
                  <span className="preview-card-placeholder">Not selected — click a driver</span>
                )}
              </div>

              <div className="preview-card">
                <span className="preview-card-label">Vehicle</span>
                {selectedVehicle ? (
                  <>
                    <div className="preview-vehicle-title">
                      <strong className="preview-card-value">{selectedVehicle.vehicleNumber}</strong>
                      <span className="vehicle-type-pill">{vehicleTypeLabel(selectedVehicle)}</span>
                    </div>
                    <span className="preview-card-meta">{vehicleMakeLabel(selectedVehicle)}</span>
                  </>
                ) : (
                  <span className="preview-card-placeholder">Not selected — click a vehicle</span>
                )}
              </div>

              {routeEstimate && (
                <div className="preview-card">
                  <span className="preview-card-label">Route estimate</span>
                  {routeEstimate.status === 'AVAILABLE' ? (
                    <strong className="preview-card-value">{routeEstimate.distanceKm} km · {routeEstimate.estimatedDurationMin} min</strong>
                  ) : (
                    <span className="preview-card-meta">{routeEstimate.message ?? 'Route estimate unavailable'}</span>
                  )}
                </div>
              )}

              {conflicts.length > 0 && (
                <div className="conflict-box">
                  <button type="button" className="conflict-toggle" onClick={() => setShowConflicts(!showConflicts)}>
                    <span className={`conflict-icon ${hardConflicts.length ? 'hard' : 'warning'}`}>
                      {hardConflicts.length ? '⛔' : '⚠️'}
                    </span>
                    {hardConflicts.length ? 'Conflicts found' : 'Warnings'} ({conflicts.length})
                    <span className={`conflict-chevron ${showConflicts ? 'open' : ''}`}>▼</span>
                  </button>
                  {showConflicts && conflicts.map((c, i) => (
                    <div key={`${c.type}-${i}`} className={`conflict-row ${c.severity.toLowerCase()}`}>
                      {c.message}
                    </div>
                  ))}
                </div>
              )}

              {assigned && <div className="success-banner">Trip assigned successfully.</div>}

              <button type="button" className="primary-button dispatch-confirm" disabled={!canAssign || assigning} onClick={handleAssign}>
                {assigning ? 'Assigning...' : hardConflicts.length ? 'Resolve conflicts first' : 'Confirm assignment'}
              </button>
            </div>
          ) : (
            <div className="dispatch-empty preview-empty">Select a trip to begin.</div>
          )}
        </aside>
      </div>

      <style>{`
        .dispatch-board {
          --dispatch-bg-card: var(--color-bg-surface);
          --dispatch-bg-card-hover: var(--color-bg-surface-hover);
          --dispatch-bg-selected: var(--color-accent-soft);
          --dispatch-border-card: var(--color-border-light);
          --dispatch-text-muted: var(--color-text-secondary);
          --dispatch-text: var(--color-text-primary);
          height: calc(100vh - var(--topbar-height, 48px));
          display: flex;
          flex-direction: column;
          overflow: hidden;
          gap: var(--space-3);
        }

        .dispatch-topbar-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          flex-shrink: 0;
        }

        .dispatch-metrics-bar {
          display: flex;
          gap: var(--space-3);
          flex: 1;
        }

        .dispatch-metric {
          flex: 1;
          padding: var(--space-3);
          border: 1px solid var(--dispatch-border-card);
          border-radius: var(--radius-lg);
          background: var(--dispatch-bg-card);
          gap: var(--space-1);
        }

        .dispatch-refresh-btn {
          flex-shrink: 0;
          min-height: 36px;
        }

        .dispatch-layout {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-4);
          align-items: stretch;
          flex: 1;
          min-height: 0;
        }

        .dispatch-panel {
          min-height: 0;
          padding: var(--space-3);
          border-radius: var(--radius-xl);
          border: 1px solid var(--dispatch-border-card);
          background: var(--dispatch-bg-card);
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .dispatch-panel header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-3);
          margin-bottom: var(--space-3);
          padding-bottom: var(--space-3);
          border-bottom: 1px solid var(--color-border-light);
        }

        .dispatch-panel h2 {
          margin: 0;
          font-size: var(--font-size-md);
          font-weight: var(--font-weight-semibold);
          color: var(--dispatch-text);
        }

        .dispatch-panel header p {
          margin: var(--space-1) 0 0;
          color: var(--dispatch-text-muted);
          font-size: var(--font-size-sm);
        }

        .count-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 var(--space-1);
          border-radius: var(--radius-full);
          background: var(--color-bg-surface-subtle);
          color: var(--dispatch-text-muted);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-semibold);
          flex-shrink: 0;
        }

        .dispatch-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          overflow-y: auto;
          flex: 1;
          min-height: 0;
        }

        .dispatch-list--trips { }
        .dispatch-list--short { }

        .dispatch-list::-webkit-scrollbar { width: 4px; }
        .dispatch-list::-webkit-scrollbar-track { background: transparent; }
        .dispatch-list::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: var(--radius-full); }

        .dispatch-item {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: var(--space-1);
          min-height: 60px;
          padding: var(--space-3);
          border-radius: var(--radius-lg);
          border: 1px solid var(--dispatch-border-card);
          background: var(--color-bg-surface-subtle);
          cursor: pointer;
          transition: border-color var(--transition-fast), background var(--transition-fast);
        }

        .dispatch-item:hover {
          border-color: var(--color-accent);
          background: var(--dispatch-bg-card-hover);
        }

        .dispatch-item.compact {
          padding: var(--space-2) var(--space-3);
          gap: var(--space-1);
        }

        .dispatch-item.selected {
          border-color: var(--color-accent);
          background: var(--dispatch-bg-selected);
          border-width: 2px;
        }

        .dispatch-trip.selected {
          padding: calc(var(--space-2) - 1px) calc(var(--space-3) - 1px);
        }

        .dispatch-item.compact.selected {
          padding: calc(var(--space-2) - 1px) calc(var(--space-3) - 1px);
        }

        .dispatch-item.drop-ready {
          border-color: var(--color-success);
          background: var(--color-success-soft);
          border-width: 2px;
        }

        .dispatch-trip.drop-ready {
          padding: calc(var(--space-2) - 1px) calc(var(--space-3) - 1px);
        }

        .dispatch-item.compact.drop-ready {
          padding: calc(var(--space-2) - 1px) calc(var(--space-3) - 1px);
        }

        .dispatch-item.blocked {
          cursor: not-allowed;
          opacity: 0.55;
          background: var(--color-bg-surface-subtle);
        }

        .dispatch-item.blocked:hover {
          border-color: var(--color-danger-soft);
        }

        .dispatch-trip {
          padding: var(--space-2) var(--space-3);
        }

        .dispatch-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
        }

        .dispatch-item-main {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }

        .dispatch-item-main strong {
          color: var(--dispatch-text);
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-medium);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dispatch-item.compact .dispatch-item-main strong {
          font-size: var(--font-size-sm);
        }

        .dispatch-item-main span,
        .dispatch-item-meta {
          color: var(--dispatch-text-muted);
          font-size: var(--font-size-sm);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dispatch-item-tags {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex-shrink: 0;
        }

        .status-pill,
        .vehicle-type-pill {
          display: inline-flex;
          align-items: center;
          min-height: 20px;
          padding: 0 var(--space-2);
          border-radius: var(--radius-full);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-semibold);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .status-pill.success {
          background: var(--color-success-soft);
          color: var(--color-success);
        }

        .status-pill.blocked {
          background: var(--color-danger-soft);
          color: var(--color-danger);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-success);
          flex-shrink: 0;
        }

        .vehicle-type-pill {
          background: var(--color-accent-soft);
          color: var(--color-accent-text);
          border: 1px solid var(--color-accent-soft);
        }

        .vehicle-type-pill.muted-type {
          background: var(--color-bg-surface-subtle);
          color: var(--dispatch-text-muted);
          border-color: var(--color-border-light);
        }

        .dispatch-preview-panel {
          position: sticky;
          top: var(--space-4);
        }

        .status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: var(--space-1);
        }

        .status-indicator.ready {
          background: var(--color-success);
          box-shadow: 0 0 0 3px var(--color-success-soft);
        }

        .status-indicator.conflict {
          background: var(--color-danger);
          box-shadow: 0 0 0 3px var(--color-danger-soft);
        }

        .status-indicator.assigned {
          background: var(--color-accent);
          box-shadow: 0 0 0 3px var(--color-accent-soft);
        }

        .dispatch-preview {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .preview-card {
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-lg);
          border: 1px solid var(--dispatch-border-card);
          background: var(--color-bg-surface-subtle);
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .preview-card-label {
          color: var(--dispatch-text-muted);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-semibold);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .preview-card-value {
          color: var(--dispatch-text);
          font-size: var(--font-size-md);
          font-weight: var(--font-weight-semibold);
        }

        .preview-card-route {
          color: var(--dispatch-text);
          font-size: var(--font-size-sm);
        }

        .preview-card-meta {
          color: var(--dispatch-text-muted);
          font-size: var(--font-size-sm);
        }

        .preview-card-placeholder {
          color: var(--dispatch-text-muted);
          font-size: var(--font-size-sm);
          font-style: italic;
        }

        .preview-vehicle-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
        }

        .conflict-box {
          padding: var(--space-3);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-warning-soft);
          background: var(--color-warning-soft);
        }

        .conflict-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--color-warning);
          font-weight: var(--font-weight-semibold);
          font-size: var(--font-size-sm);
          cursor: pointer;
          text-align: left;
        }

        .conflict-icon {
          font-size: var(--font-size-base);
        }

        .conflict-chevron {
          margin-left: auto;
          font-size: 10px;
          transition: transform var(--transition-fast);
        }

        .conflict-chevron.open {
          transform: rotate(180deg);
        }

        .conflict-row {
          margin-top: var(--space-2);
          padding-top: var(--space-2);
          border-top: 1px solid var(--color-warning-soft);
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
          line-height: var(--line-height-normal);
        }

        .conflict-row.hard {
          color: var(--color-danger);
        }

        .dispatch-confirm {
          width: 100%;
          min-height: 40px;
          margin-top: var(--space-1);
        }

        .dispatch-empty {
          padding: var(--space-6) var(--space-4);
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-lg);
          color: var(--dispatch-text-muted);
          font-size: var(--font-size-sm);
          text-align: center;
          background: var(--color-bg-surface-subtle);
        }

        .preview-empty {
          margin-top: var(--space-3);
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 1320px) {
          .dispatch-layout { grid-template-columns: 1fr 1fr; }
          .dispatch-metrics-bar { flex-wrap: wrap; }
          .dispatch-metric { min-width: calc(50% - var(--space-3)); }
        }

        @media (max-width: 820px) {
          .dispatch-layout { grid-template-columns: 1fr; }
          .dispatch-topbar-row { flex-direction: column; align-items: stretch; }
          .dispatch-board { height: auto; overflow: auto; }
        }
      `}</style>
    </div>
  );
}
