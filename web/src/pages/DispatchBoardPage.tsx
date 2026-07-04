import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDispatchBoard, checkConflicts, assignTrip, getRouteEstimate } from '../services/dispatch';
import type { BoardData, DriverRecord, VehicleRecord, TripRecord, Conflict, RouteEstimate } from '../services/dispatch';

type DragItem = { type: 'driver' | 'vehicle'; id: string };

type BlockedVehicle = { item: VehicleRecord; reason: string };
type BlockedDriver = { item: DriverRecord; reason: string };

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
    return <div className="page-container"><div className="loading">Loading dispatch board...</div></div>;
  }

  if (!board) {
    return <div className="page-container"><div className="error-message">{error ?? 'No data'}</div></div>;
  }

  return (
    <div className="page-container dispatch-board">
      <div className="dispatch-hero">
        <div>
          <div className="dispatch-kicker">OPERATIONS COMMAND CENTER</div>
          <h1>Dispatch Board</h1>
          <p>Plan trips by matching available vehicles and drivers, checking route estimates, and blocking conflicts before assignment.</p>
        </div>
        <div className="dispatch-hero-actions">
          <div className="dispatch-health-pill">Live availability</div>
          <button type="button" className="btn-secondary" onClick={refresh}>Refresh Board</button>
        </div>
      </div>

      {error && <div className="error-message dispatch-alert">{error}</div>}

      <div className="dispatch-summary-cards">
        <div className="summary-card summary-card--available">
          <span className="summary-card-value">{board.summary.availableVehicles}</span>
          <span className="summary-card-label">Available Vehicles</span>
        </div>
        <div className="summary-card summary-card--available">
          <span className="summary-card-value">{board.summary.availableDrivers}</span>
          <span className="summary-card-label">Available Drivers</span>
        </div>
        <div className="summary-card summary-card--pending">
          <span className="summary-card-value">{board.summary.unassignedTrips}</span>
          <span className="summary-card-label">Unassigned Trips</span>
        </div>
        <div className="summary-card summary-card--blocked">
          <span className="summary-card-value">{blockedVehicles.length + blockedDrivers.length}</span>
          <span className="summary-card-label">Blocked Resources</span>
        </div>
      </div>

      <div className="dispatch-helper-strip">
        <span>1. Select a trip</span>
        <span>2. Drag/click a driver</span>
        <span>3. Drag/click a vehicle</span>
        <span>4. Confirm assignment</span>
      </div>

      <div className="dispatch-columns">
        <div className="dispatch-column dispatch-column--vehicles">
          <div className="dispatch-column-header">
            <h3>Vehicles</h3>
            <span>{board.availableVehicles.length} ready</span>
          </div>
          <div className="dispatch-list">
            {board.availableVehicles.map((v) => (
              <div key={v.id}
                className={`dispatch-card dispatch-card--vehicle ${selectedVehicle?.id === v.id ? 'dispatch-card--selected' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, 'vehicle', v.id)}
                onClick={() => setSelectedVehicle(v)}>
                <div className="dispatch-card-title">{v.vehicleNumber}</div>
                <div className="dispatch-card-subtitle">{v.vehicleType}{v.brand ? ` · ${v.brand}` : ''}</div>
                <span className="dispatch-card-badge dispatch-card-badge--available">AVAILABLE</span>
              </div>
            ))}
            {blockedVehicles.map(({ item: v, reason }) => (
              <div key={v.id} className="dispatch-card dispatch-card--unavailable disabled" title={reason}>
                <div className="dispatch-card-title">{v.vehicleNumber}</div>
                <div className="dispatch-card-subtitle">{v.vehicleType}{v.brand ? ` · ${v.brand}` : ''}</div>
                <span className="dispatch-card-badge dispatch-card-badge--blocked">{reason}</span>
              </div>
            ))}
            {board.availableVehicles.length === 0 && blockedVehicles.length === 0 && (
              <div className="dispatch-empty">No vehicles found</div>
            )}
          </div>
        </div>

        <div className="dispatch-column dispatch-column--drivers">
          <div className="dispatch-column-header">
            <h3>Drivers</h3>
            <span>{board.availableDrivers.length} ready</span>
          </div>
          <div className="dispatch-list">
            {board.availableDrivers.map((d) => (
              <div key={d.id}
                className={`dispatch-card dispatch-card--driver ${selectedDriver?.id === d.id ? 'dispatch-card--selected' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, 'driver', d.id)}
                onClick={() => setSelectedDriver(d)}>
                <div className="dispatch-card-title">{d.name}</div>
                <div className="dispatch-card-subtitle">{d.mobile}</div>
                <span className="dispatch-card-badge dispatch-card-badge--available">AVAILABLE</span>
              </div>
            ))}
            {blockedDrivers.map(({ item: d, reason }) => (
              <div key={d.id} className="dispatch-card dispatch-card--unavailable disabled" title={reason}>
                <div className="dispatch-card-title">{d.name}</div>
                <div className="dispatch-card-subtitle">{d.mobile}</div>
                <span className="dispatch-card-badge dispatch-card-badge--blocked">{reason}</span>
              </div>
            ))}
            {board.availableDrivers.length === 0 && blockedDrivers.length === 0 && (
              <div className="dispatch-empty">No drivers found</div>
            )}
          </div>
        </div>

        <div className="dispatch-column dispatch-column--trips">
          <div className="dispatch-column-header">
            <h3>Unassigned Trips</h3>
            <span>{board.unassignedTrips.length} waiting</span>
          </div>
          <div className="dispatch-list">
            {board.unassignedTrips.map((t) => (
              <div key={t.id}
                className={`dispatch-card dispatch-card--trip ${selectedTrip?.id === t.id ? 'dispatch-card--selected' : ''} ${dragOver === t.id ? 'dispatch-card--drag-over' : ''}`}
                onDragOver={(e) => handleTripDragOver(e, t.id)}
                onDragLeave={handleTripDragLeave}
                onDrop={(e) => handleDrop(e, t)}
                onClick={() => handleSelectTrip(t)}>
                <div className="dispatch-card-title">{t.tripNumber}</div>
                <div className="dispatch-card-subtitle">{t.originName} → {t.destinationName}</div>
                <div className="dispatch-card-meta">
                  {t.plannedStartAt ? new Date(t.plannedStartAt).toLocaleString() : 'No planned start'}
                </div>
                <span className="dispatch-drop-hint">Drop driver/vehicle here</span>
              </div>
            ))}
            {board.unassignedTrips.length === 0 && (
              <div className="dispatch-empty">No unassigned trips</div>
            )}
          </div>
        </div>

        <div className="dispatch-column dispatch-column--preview">
          <div className="dispatch-column-header">
            <h3>Assignment Preview</h3>
            <span>{checking ? 'checking...' : hardConflicts.length ? 'blocked' : 'ready'}</span>
          </div>
          {selectedTrip ? (
            <div className="dispatch-preview">
              <div className="dispatch-preview-section dispatch-preview-section--trip">
                <h4>Trip</h4>
                <p><strong>{selectedTrip.tripNumber}</strong></p>
                <p>{selectedTrip.originName} → {selectedTrip.destinationName}</p>
                {selectedTrip.plannedStartAt && <p>{new Date(selectedTrip.plannedStartAt).toLocaleString()}</p>}
              </div>

              {routeEstimate && (
                <div className="dispatch-preview-section">
                  <h4>Route Estimate</h4>
                  {routeEstimate.status === 'AVAILABLE' ? (
                    <p className="route-pill">{routeEstimate.distanceKm} km · ~{routeEstimate.estimatedDurationMin} min</p>
                  ) : (
                    <p className="text-muted">{routeEstimate.message ?? 'Route estimate unavailable'}</p>
                  )}
                </div>
              )}

              <div className="dispatch-preview-section">
                <h4>Driver</h4>
                {selectedDriver ? (
                  <p><strong>{selectedDriver.name}</strong> · {selectedDriver.mobile}</p>
                ) : (
                  <p className="text-muted">Drag or click a driver</p>
                )}
              </div>

              <div className="dispatch-preview-section">
                <h4>Vehicle</h4>
                {selectedVehicle ? (
                  <p><strong>{selectedVehicle.vehicleNumber}</strong> · {selectedVehicle.vehicleType}</p>
                ) : (
                  <p className="text-muted">Drag or click a vehicle</p>
                )}
              </div>

              {checking && <p className="text-muted">Checking conflicts...</p>}

              {conflicts.length > 0 && (
                <div className="dispatch-conflicts">
                  <h4 onClick={() => setShowConflicts(!showConflicts)}>
                    Conflicts ({conflicts.length}) {showConflicts ? '▲' : '▼'}
                  </h4>
                  {showConflicts && conflicts.map((c, i) => (
                    <div key={`${c.type}-${i}`} className={`dispatch-conflict dispatch-conflict--${c.severity.toLowerCase()}`}>
                      <strong>{c.severity === 'HARD' ? '⛔' : '⚠️'}</strong> {c.message}
                    </div>
                  ))}
                </div>
              )}

              {assigned && (
                <div className="dispatch-assigned-message">Trip assigned successfully!</div>
              )}

              <button type="button"
                className="btn-primary dispatch-confirm"
                disabled={!canAssign || assigning}
                onClick={handleAssign}>
                {assigning ? 'Assigning...' : hardConflicts.length ? 'Resolve Conflicts First' : 'Confirm Assignment'}
              </button>
            </div>
          ) : (
            <div className="dispatch-empty dispatch-empty--preview">Select an unassigned trip to start dispatching.</div>
          )}
        </div>
      </div>

      <style>{`
        .dispatch-board { max-width: 1480px; }
        .dispatch-hero {
          display: flex; justify-content: space-between; gap: 24px; align-items: center;
          padding: 24px; border: 1px solid rgba(148,163,184,.22); border-radius: 20px;
          background: radial-gradient(circle at top left, rgba(59,130,246,.22), transparent 32%), linear-gradient(135deg, rgba(15,23,42,.96), rgba(30,41,59,.88));
          color: #f8fafc; margin-bottom: 18px; box-shadow: 0 24px 60px rgba(0,0,0,.18);
        }
        .dispatch-kicker { font-size: 11px; letter-spacing: .16em; color: #93c5fd; font-weight: 700; margin-bottom: 6px; }
        .dispatch-hero h1 { margin: 0; font-size: 32px; }
        .dispatch-hero p { margin: 8px 0 0; max-width: 760px; color: #cbd5e1; }
        .dispatch-hero-actions { display: flex; flex-direction: column; gap: 12px; align-items: flex-end; }
        .dispatch-health-pill { padding: 8px 12px; border-radius: 999px; background: rgba(16,185,129,.16); color: #86efac; font-size: 12px; font-weight: 700; border: 1px solid rgba(134,239,172,.25); }
        .dispatch-alert { margin-bottom: 16px; }
        .dispatch-summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
        .summary-card { padding: 18px; border-radius: 18px; display: flex; flex-direction: column; gap: 6px; border: 1px solid rgba(148,163,184,.18); background: var(--color-surface, #fff); box-shadow: 0 12px 30px rgba(15,23,42,.08); }
        .summary-card--available { border-left: 4px solid #22c55e; }
        .summary-card--pending { border-left: 4px solid #f59e0b; }
        .summary-card--blocked { border-left: 4px solid #ef4444; }
        .summary-card-value { font-size: 32px; font-weight: 800; line-height: 1; }
        .summary-card-label { font-size: 13px; color: var(--color-text-secondary, #94a3b8); }
        .dispatch-helper-strip { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
        .dispatch-helper-strip span { padding: 8px 12px; border-radius: 999px; background: rgba(59,130,246,.1); color: #60a5fa; font-size: 12px; font-weight: 700; border: 1px solid rgba(59,130,246,.18); }
        .dispatch-columns { display: grid; grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr) minmax(280px, 1.15fr) minmax(300px, 1.15fr); gap: 16px; align-items: start; }
        .dispatch-column { background: var(--color-surface, #fff); border-radius: 18px; border: 1px solid var(--color-border, #e2e8f0); padding: 16px; min-height: 520px; box-shadow: 0 14px 35px rgba(15,23,42,.08); }
        .dispatch-column-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .dispatch-column-header h3 { margin: 0; font-size: 15px; font-weight: 800; }
        .dispatch-column-header span { font-size: 11px; color: var(--color-text-secondary, #94a3b8); text-transform: uppercase; letter-spacing: .08em; }
        .dispatch-list { display: flex; flex-direction: column; gap: 9px; max-height: 620px; overflow-y: auto; padding-right: 2px; }
        .dispatch-card { padding: 13px; border-radius: 14px; border: 1px solid var(--color-border, #e2e8f0); cursor: pointer; transition: all .15s ease; position: relative; background: rgba(255,255,255,.02); }
        .dispatch-card:hover { border-color: #60a5fa; transform: translateY(-1px); box-shadow: 0 10px 24px rgba(15,23,42,.12); }
        .dispatch-card--selected { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.18); }
        .dispatch-card--drag-over { border-color: #22c55e; background: rgba(34,197,94,.08); }
        .dispatch-card.disabled { opacity: .72; cursor: not-allowed; background: rgba(148,163,184,.08); }
        .dispatch-card.disabled:hover { transform: none; box-shadow: none; border-color: var(--color-border, #e2e8f0); }
        .dispatch-card-title { font-weight: 800; font-size: 14px; }
        .dispatch-card-subtitle { font-size: 12px; color: var(--color-text-secondary, #94a3b8); margin-top: 3px; }
        .dispatch-card-meta { font-size: 11px; color: var(--color-text-secondary, #94a3b8); margin-top: 6px; }
        .dispatch-card-badge { display: inline-block; font-size: 10px; padding: 3px 8px; border-radius: 999px; margin-top: 8px; font-weight: 800; }
        .dispatch-card-badge--available { background: rgba(34,197,94,.14); color: #22c55e; }
        .dispatch-card-badge--blocked { background: rgba(239,68,68,.12); color: #f87171; }
        .dispatch-drop-hint { display: inline-block; margin-top: 8px; font-size: 11px; color: #60a5fa; }
        .dispatch-empty { padding: 24px; text-align: center; color: var(--color-text-secondary, #94a3b8); font-size: 13px; border: 1px dashed var(--color-border, #e2e8f0); border-radius: 14px; }
        .dispatch-empty--preview { margin-top: 10px; }
        .dispatch-preview { display: flex; flex-direction: column; gap: 12px; }
        .dispatch-preview-section { border-bottom: 1px solid var(--color-border, #e2e8f0); padding-bottom: 10px; }
        .dispatch-preview-section h4 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--color-text-secondary, #94a3b8); margin: 0 0 6px; }
        .dispatch-preview-section p { margin: 0 0 3px; font-size: 14px; }
        .dispatch-preview-section--trip { background: rgba(59,130,246,.08); padding: 12px; border-radius: 14px; border: 1px solid rgba(59,130,246,.14); }
        .text-muted { color: var(--color-text-secondary, #94a3b8); font-size: 13px; }
        .route-pill { display: inline-block; padding: 8px 10px; border-radius: 999px; background: rgba(59,130,246,.1); color: #60a5fa; font-weight: 700; }
        .dispatch-conflicts { background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.24); border-radius: 14px; padding: 12px; }
        .dispatch-conflicts h4 { cursor: pointer; margin: 0 0 8px; }
        .dispatch-conflict { font-size: 13px; padding: 4px 0; }
        .dispatch-conflict--hard { color: #f87171; }
        .dispatch-conflict--soft { color: #fbbf24; }
        .dispatch-assigned-message { background: rgba(34,197,94,.12); color: #22c55e; padding: 12px; border-radius: 12px; text-align: center; font-weight: 800; border: 1px solid rgba(34,197,94,.2); }
        .dispatch-confirm { width: 100%; margin-top: 6px; min-height: 44px; font-weight: 800; }
        @media (max-width: 1320px) { .dispatch-columns { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 768px) {
          .dispatch-hero { flex-direction: column; align-items: flex-start; }
          .dispatch-hero-actions { align-items: flex-start; }
          .dispatch-summary-cards { grid-template-columns: 1fr 1fr; }
          .dispatch-columns { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
