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
    return <div className="page-container"><div className="loading">Loading dispatch board...</div></div>;
  }

  if (!board) {
    return <div className="page-container"><div className="error-message">{error ?? 'No data'}</div></div>;
  }

  return (
    <div className="page-container dispatch-board">
      <div className="dispatch-topbar">
        <div>
          <div className="dispatch-kicker">OPERATIONS</div>
          <h1>Dispatch Board</h1>
          <p>Select a trip, choose one available driver and one available vehicle, then confirm.</p>
        </div>
        <button type="button" className="dispatch-refresh-button" onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="error-message dispatch-alert">{error}</div>}

      <div className="dispatch-metrics-bar">
        <span><strong>{board.summary.unassignedTrips}</strong> trips waiting</span>
        <span><strong>{board.summary.availableDrivers}</strong> drivers ready</span>
        <span><strong>{board.summary.availableVehicles}</strong> vehicles ready</span>
        <span><strong>{blockedVehicles.length + blockedDrivers.length}</strong> blocked</span>
      </div>

      <div className="dispatch-layout">
        <section className="dispatch-panel dispatch-panel--trips">
          <header>
            <div>
              <h2>Trips</h2>
              <p>Choose the trip to dispatch</p>
            </div>
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

        <section className="dispatch-panel dispatch-panel--resources">
          <header>
            <div>
              <h2>Resources</h2>
              <p>Click or drag a ready driver and vehicle</p>
            </div>
          </header>

          <div className="resource-section">
            <div className="resource-section-title">
              <span>Drivers</span>
              <small>{board.availableDrivers.length} ready</small>
            </div>
            <div className="dispatch-list dispatch-list--short">
              {board.availableDrivers.map((d) => (
                <article key={d.id}
                  className={`dispatch-item compact ${selectedDriver?.id === d.id ? 'selected' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'driver', d.id)}
                  onClick={() => setSelectedDriver(d)}>
                  <div className="dispatch-item-main">
                    <strong>{d.name}</strong>
                    <span>{d.mobile}</span>
                  </div>
                  <span className="status-pill success">Ready</span>
                </article>
              ))}
              {blockedDrivers.slice(0, 4).map(({ item: d, reason }) => (
                <article key={d.id} className="dispatch-item compact blocked" title={reason}>
                  <div className="dispatch-item-main">
                    <strong>{d.name}</strong>
                    <span>{d.mobile}</span>
                  </div>
                  <span className="status-pill blocked">{reason}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="resource-section">
            <div className="resource-section-title">
              <span>Vehicles</span>
              <small>{board.availableVehicles.length} ready</small>
            </div>
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
                    <span className="vehicle-type-pill">{vehicleTypeLabel(v)}</span>
                  </div>
                  <span className="status-pill success">Ready</span>
                </article>
              ))}
              {blockedVehicles.slice(0, 4).map(({ item: v, reason }) => (
                <article key={v.id} className="dispatch-item compact vehicle-item blocked" title={reason}>
                  <div className="dispatch-item-row">
                    <div className="dispatch-item-main">
                      <strong>{v.vehicleNumber}</strong>
                      <span>{vehicleMakeLabel(v)}</span>
                    </div>
                    <span className="vehicle-type-pill muted-type">{vehicleTypeLabel(v)}</span>
                  </div>
                  <span className="status-pill blocked">{reason}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className="dispatch-panel dispatch-preview-panel">
          <header>
            <div>
              <h2>Assignment</h2>
              <p>{checking ? 'Checking conflicts...' : hardConflicts.length ? 'Blocked' : 'Ready'}</p>
            </div>
          </header>

          {selectedTrip ? (
            <div className="dispatch-preview">
              <div className="preview-card route-card">
                <label>Trip</label>
                <strong>{selectedTrip.tripNumber}</strong>
                <span>{selectedTrip.originName} → {selectedTrip.destinationName}</span>
                <small>{formatDate(selectedTrip.plannedStartAt)}</small>
              </div>

              <div className="preview-card">
                <label>Driver</label>
                {selectedDriver ? <strong>{selectedDriver.name}</strong> : <span className="muted">Not selected</span>}
                {selectedDriver && <small>{selectedDriver.mobile}</small>}
              </div>

              <div className="preview-card">
                <label>Vehicle</label>
                {selectedVehicle ? (
                  <>
                    <div className="preview-vehicle-title">
                      <strong>{selectedVehicle.vehicleNumber}</strong>
                      <span className="vehicle-type-pill">{vehicleTypeLabel(selectedVehicle)}</span>
                    </div>
                    <small>{vehicleMakeLabel(selectedVehicle)}</small>
                  </>
                ) : (
                  <span className="muted">Not selected</span>
                )}
              </div>

              {routeEstimate && (
                <div className="preview-card">
                  <label>Route estimate</label>
                  {routeEstimate.status === 'AVAILABLE' ? (
                    <strong>{routeEstimate.distanceKm} km · {routeEstimate.estimatedDurationMin} min</strong>
                  ) : (
                    <span className="muted">{routeEstimate.message ?? 'Route estimate unavailable'}</span>
                  )}
                </div>
              )}

              {conflicts.length > 0 && (
                <div className="conflict-box">
                  <button type="button" onClick={() => setShowConflicts(!showConflicts)}>
                    {hardConflicts.length ? 'Conflicts found' : 'Warnings'} ({conflicts.length}) {showConflicts ? '▲' : '▼'}
                  </button>
                  {showConflicts && conflicts.map((c, i) => (
                    <div key={`${c.type}-${i}`} className={`conflict-row ${c.severity.toLowerCase()}`}>
                      {c.severity === 'HARD' ? '⛔' : '⚠️'} {c.message}
                    </div>
                  ))}
                </div>
              )}

              {assigned && <div className="dispatch-success">Trip assigned successfully.</div>}

              <button type="button" className="dispatch-confirm" disabled={!canAssign || assigning} onClick={handleAssign}>
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
          max-width: 1320px;
          color: #e5e7eb;
          --dispatch-card: #10151d;
          --dispatch-card-soft: #0c1119;
          --dispatch-border: rgba(148, 163, 184, 0.16);
          --dispatch-muted: #93a4b8;
          --dispatch-text: #f8fafc;
          --dispatch-blue: #60a5fa;
          --dispatch-green: #22c55e;
          --dispatch-yellow: #f59e0b;
          --dispatch-red: #ef4444;
        }

        .dispatch-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 16px;
          margin-bottom: 10px;
          border: 1px solid var(--dispatch-border);
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(17, 24, 39, 0.9));
        }

        .dispatch-kicker {
          color: var(--dispatch-blue);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .14em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .dispatch-topbar h1 {
          margin: 0;
          color: var(--dispatch-text);
          font-size: 22px;
          line-height: 1.15;
        }

        .dispatch-topbar p {
          margin: 5px 0 0;
          color: var(--dispatch-muted);
          font-size: 13px;
        }

        .dispatch-refresh-button {
          border: 1px solid rgba(96, 165, 250, .32);
          background: rgba(37, 99, 235, .14);
          color: #bfdbfe;
          padding: 8px 12px;
          border-radius: 10px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .dispatch-refresh-button:hover:not(:disabled) {
          background: rgba(37, 99, 235, .24);
        }

        .dispatch-refresh-button:disabled {
          opacity: .55;
          cursor: wait;
        }

        .dispatch-alert { margin-bottom: 10px; }

        .dispatch-metrics-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .dispatch-metrics-bar span {
          padding: 8px 10px;
          border: 1px solid var(--dispatch-border);
          border-radius: 999px;
          background: rgba(15, 23, 42, .62);
          color: var(--dispatch-muted);
          font-size: 12px;
        }

        .dispatch-metrics-bar strong {
          color: var(--dispatch-text);
          margin-right: 4px;
        }

        .dispatch-layout {
          display: grid;
          grid-template-columns: minmax(320px, 1fr) minmax(360px, 1.1fr) minmax(320px, .95fr);
          gap: 12px;
          align-items: start;
        }

        .dispatch-panel {
          min-height: 460px;
          padding: 12px;
          border-radius: 16px;
          border: 1px solid var(--dispatch-border);
          background: rgba(17, 24, 39, .78);
          box-shadow: 0 10px 28px rgba(0, 0, 0, .14);
        }

        .dispatch-panel header {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
          padding-bottom: 9px;
          border-bottom: 1px solid rgba(148, 163, 184, .12);
        }

        .dispatch-panel h2 {
          margin: 0;
          color: var(--dispatch-text);
          font-size: 14px;
        }

        .dispatch-panel header p,
        .resource-section-title small {
          margin: 3px 0 0;
          color: var(--dispatch-muted);
          font-size: 11px;
        }

        .resource-section + .resource-section {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid rgba(148, 163, 184, .12);
        }

        .resource-section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .resource-section-title span {
          color: var(--dispatch-text);
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .dispatch-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          padding-right: 3px;
        }

        .dispatch-list--trips { max-height: 540px; }
        .dispatch-list--short { max-height: 230px; }

        .dispatch-list::-webkit-scrollbar { width: 7px; }
        .dispatch-list::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, .34); border-radius: 999px; }

        .dispatch-item {
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding: 10px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, .15);
          background: rgba(15, 23, 42, .54);
          cursor: pointer;
          transition: border-color .15s ease, background .15s ease, transform .15s ease;
        }

        .dispatch-item:hover {
          border-color: rgba(96, 165, 250, .5);
          background: rgba(30, 41, 59, .75);
          transform: translateY(-1px);
        }

        .dispatch-item.selected {
          border-color: rgba(96, 165, 250, .85);
          background: rgba(37, 99, 235, .16);
          box-shadow: 0 0 0 2px rgba(37, 99, 235, .16);
        }

        .dispatch-item.drop-ready {
          border-color: rgba(34, 197, 94, .78);
          background: rgba(34, 197, 94, .1);
        }

        .dispatch-item.blocked {
          cursor: not-allowed;
          opacity: .65;
          background: rgba(127, 29, 29, .1);
        }

        .dispatch-item.blocked:hover {
          border-color: rgba(239, 68, 68, .32);
          transform: none;
        }

        .dispatch-item-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .dispatch-item-main {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .dispatch-item-main strong {
          color: var(--dispatch-text);
          font-size: 13px;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dispatch-item-main span,
        .dispatch-item-meta {
          color: var(--dispatch-muted);
          font-size: 11px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .status-pill,
        .vehicle-type-pill {
          align-self: flex-start;
          padding: 4px 7px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .04em;
          white-space: nowrap;
        }

        .status-pill.success {
          background: rgba(34, 197, 94, .13);
          color: #86efac;
        }

        .status-pill.blocked {
          background: rgba(239, 68, 68, .14);
          color: #fca5a5;
        }

        .vehicle-type-pill {
          background: rgba(96, 165, 250, .14);
          color: #bfdbfe;
          border: 1px solid rgba(96, 165, 250, .22);
        }

        .vehicle-type-pill.muted-type {
          background: rgba(148, 163, 184, .1);
          color: #cbd5e1;
          border-color: rgba(148, 163, 184, .18);
        }

        .dispatch-preview {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .preview-card {
          padding: 11px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, .14);
          background: rgba(15, 23, 42, .62);
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .route-card {
          border-color: rgba(96, 165, 250, .28);
          background: rgba(37, 99, 235, .1);
        }

        .preview-card label {
          color: var(--dispatch-muted);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .preview-card strong {
          color: var(--dispatch-text);
          font-size: 13px;
        }

        .preview-card span,
        .preview-card small,
        .muted {
          color: var(--dispatch-muted);
          font-size: 12px;
        }

        .preview-vehicle-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .conflict-box {
          padding: 10px;
          border-radius: 12px;
          border: 1px solid rgba(245, 158, 11, .28);
          background: rgba(120, 53, 15, .18);
        }

        .conflict-box button {
          width: 100%;
          padding: 0;
          border: 0;
          background: transparent;
          color: #fbbf24;
          font-weight: 900;
          text-align: left;
          cursor: pointer;
        }

        .conflict-row {
          margin-top: 8px;
          color: #fde68a;
          font-size: 12px;
          line-height: 1.45;
        }

        .conflict-row.hard { color: #fca5a5; }

        .dispatch-success {
          padding: 10px;
          border-radius: 12px;
          background: rgba(34, 197, 94, .12);
          border: 1px solid rgba(34, 197, 94, .28);
          color: #86efac;
          font-weight: 800;
          text-align: center;
        }

        .dispatch-confirm {
          width: 100%;
          min-height: 42px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .dispatch-confirm:hover:not(:disabled) {
          filter: brightness(1.08);
        }

        .dispatch-confirm:disabled {
          background: rgba(51, 65, 85, .9) !important;
          color: #94a3b8 !important;
          cursor: not-allowed;
          opacity: .85;
        }

        .dispatch-empty {
          padding: 22px 14px;
          border: 1px dashed rgba(148, 163, 184, .25);
          border-radius: 12px;
          color: var(--dispatch-muted);
          font-size: 13px;
          text-align: center;
          background: rgba(15, 23, 42, .38);
        }

        .preview-empty { margin-top: 8px; }

        @media (max-width: 1320px) {
          .dispatch-layout { grid-template-columns: 1fr 1fr; }
          .dispatch-preview-panel { grid-column: span 2; }
        }

        @media (max-width: 820px) {
          .dispatch-topbar { flex-direction: column; align-items: stretch; }
          .dispatch-layout { grid-template-columns: 1fr; }
          .dispatch-preview-panel { grid-column: auto; }
        }
      `}</style>
    </div>
  );
}
