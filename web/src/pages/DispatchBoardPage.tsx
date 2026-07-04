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

function formatDate(value?: string | null) {
  if (!value) return 'No planned start';
  return new Date(value).toLocaleString();
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
          <p>Assign a trip only after driver, vehicle, route and conflict checks are clear.</p>
        </div>
        <button type="button" className="dispatch-refresh-button" onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh board'}
        </button>
      </div>

      {error && <div className="error-message dispatch-alert">{error}</div>}

      <div className="dispatch-summary-cards">
        <div className="summary-card summary-card--success">
          <span>{board.summary.availableVehicles}</span>
          <p>Available vehicles</p>
        </div>
        <div className="summary-card summary-card--success">
          <span>{board.summary.availableDrivers}</span>
          <p>Available drivers</p>
        </div>
        <div className="summary-card summary-card--warning">
          <span>{board.summary.unassignedTrips}</span>
          <p>Unassigned trips</p>
        </div>
        <div className="summary-card summary-card--danger">
          <span>{blockedVehicles.length + blockedDrivers.length}</span>
          <p>Blocked resources</p>
        </div>
      </div>

      <div className="dispatch-workflow-strip">
        <span className={selectedTrip ? 'done' : 'active'}>1. Choose trip</span>
        <span className={selectedDriver ? 'done' : selectedTrip ? 'active' : ''}>2. Choose driver</span>
        <span className={selectedVehicle ? 'done' : selectedDriver ? 'active' : ''}>3. Choose vehicle</span>
        <span className={canAssign ? 'active' : ''}>4. Confirm</span>
      </div>

      <div className="dispatch-layout">
        <section className="dispatch-panel dispatch-panel--trips">
          <header>
            <div>
              <h2>Trips waiting for dispatch</h2>
              <p>{board.unassignedTrips.length} draft trips</p>
            </div>
          </header>
          <div className="dispatch-list">
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
                <div className="dispatch-drop-hint">Drop driver or vehicle here</div>
              </article>
            ))}
            {board.unassignedTrips.length === 0 && (
              <div className="dispatch-empty">No unassigned trips. New draft trips will appear here.</div>
            )}
          </div>
        </section>

        <section className="dispatch-panel">
          <header>
            <div>
              <h2>Drivers</h2>
              <p>{board.availableDrivers.length} ready · {blockedDrivers.length} blocked</p>
            </div>
          </header>
          <div className="dispatch-list">
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
                <span className="status-pill success">Available</span>
              </article>
            ))}
            {blockedDrivers.map(({ item: d, reason }) => (
              <article key={d.id} className="dispatch-item compact blocked" title={reason}>
                <div className="dispatch-item-main">
                  <strong>{d.name}</strong>
                  <span>{d.mobile}</span>
                </div>
                <span className="status-pill blocked">{reason}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="dispatch-panel">
          <header>
            <div>
              <h2>Vehicles</h2>
              <p>{board.availableVehicles.length} ready · {blockedVehicles.length} blocked</p>
            </div>
          </header>
          <div className="dispatch-list">
            {board.availableVehicles.map((v) => (
              <article key={v.id}
                className={`dispatch-item compact ${selectedVehicle?.id === v.id ? 'selected' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, 'vehicle', v.id)}
                onClick={() => setSelectedVehicle(v)}>
                <div className="dispatch-item-main">
                  <strong>{v.vehicleNumber}</strong>
                  <span>{v.vehicleType}{v.brand ? ` · ${v.brand}` : ''}</span>
                </div>
                <span className="status-pill success">Available</span>
              </article>
            ))}
            {blockedVehicles.map(({ item: v, reason }) => (
              <article key={v.id} className="dispatch-item compact blocked" title={reason}>
                <div className="dispatch-item-main">
                  <strong>{v.vehicleNumber}</strong>
                  <span>{v.vehicleType}{v.brand ? ` · ${v.brand}` : ''}</span>
                </div>
                <span className="status-pill blocked">{reason}</span>
              </article>
            ))}
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

              <div className="preview-grid">
                <div className="preview-card">
                  <label>Driver</label>
                  {selectedDriver ? <strong>{selectedDriver.name}</strong> : <span className="muted">Not selected</span>}
                  {selectedDriver && <small>{selectedDriver.mobile}</small>}
                </div>
                <div className="preview-card">
                  <label>Vehicle</label>
                  {selectedVehicle ? <strong>{selectedVehicle.vehicleNumber}</strong> : <span className="muted">Not selected</span>}
                  {selectedVehicle && <small>{selectedVehicle.vehicleType}</small>}
                </div>
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
            <div className="dispatch-empty preview-empty">Select a trip to begin dispatching.</div>
          )}
        </aside>
      </div>

      <style>{`
        .dispatch-board {
          max-width: 1500px;
          color: #e5e7eb;
          --dispatch-bg: #0b0f16;
          --dispatch-card: #121821;
          --dispatch-card-soft: #0f172a;
          --dispatch-border: rgba(148, 163, 184, 0.18);
          --dispatch-muted: #94a3b8;
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
          gap: 16px;
          padding: 18px 20px;
          margin-bottom: 16px;
          border: 1px solid var(--dispatch-border);
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(17, 24, 39, 0.92));
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.2);
        }

        .dispatch-kicker {
          color: var(--dispatch-blue);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .dispatch-topbar h1 {
          margin: 0;
          color: var(--dispatch-text);
          font-size: 26px;
          line-height: 1.15;
        }

        .dispatch-topbar p {
          margin: 6px 0 0;
          color: var(--dispatch-muted);
          font-size: 14px;
        }

        .dispatch-refresh-button {
          border: 1px solid rgba(96, 165, 250, .35);
          background: rgba(37, 99, 235, .16);
          color: #bfdbfe;
          padding: 10px 14px;
          border-radius: 12px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .dispatch-refresh-button:hover:not(:disabled) {
          background: rgba(37, 99, 235, .26);
          border-color: rgba(96, 165, 250, .55);
        }

        .dispatch-refresh-button:disabled {
          opacity: .55;
          cursor: wait;
        }

        .dispatch-alert { margin-bottom: 14px; }

        .dispatch-summary-cards {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 12px;
        }

        .summary-card {
          padding: 14px 16px;
          border-radius: 16px;
          background: var(--dispatch-card);
          border: 1px solid var(--dispatch-border);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .03);
        }

        .summary-card span {
          display: block;
          color: var(--dispatch-text);
          font-size: 28px;
          font-weight: 900;
          line-height: 1;
        }

        .summary-card p {
          margin: 7px 0 0;
          color: var(--dispatch-muted);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .summary-card--success { border-left: 3px solid var(--dispatch-green); }
        .summary-card--warning { border-left: 3px solid var(--dispatch-yellow); }
        .summary-card--danger { border-left: 3px solid var(--dispatch-red); }

        .dispatch-workflow-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 14px;
        }

        .dispatch-workflow-strip span {
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid var(--dispatch-border);
          background: rgba(15, 23, 42, .72);
          color: var(--dispatch-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .dispatch-workflow-strip span.active {
          border-color: rgba(96, 165, 250, .45);
          background: rgba(37, 99, 235, .16);
          color: #bfdbfe;
        }

        .dispatch-workflow-strip span.done {
          border-color: rgba(34, 197, 94, .45);
          background: rgba(34, 197, 94, .12);
          color: #86efac;
        }

        .dispatch-layout {
          display: grid;
          grid-template-columns: minmax(300px, 1.15fr) minmax(230px, .85fr) minmax(230px, .85fr) minmax(310px, 1fr);
          gap: 14px;
          align-items: start;
        }

        .dispatch-panel {
          min-height: 520px;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid var(--dispatch-border);
          background: rgba(17, 24, 39, .82);
          box-shadow: 0 14px 34px rgba(0, 0, 0, .18);
        }

        .dispatch-panel header {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(148, 163, 184, .12);
        }

        .dispatch-panel h2 {
          margin: 0;
          color: var(--dispatch-text);
          font-size: 15px;
        }

        .dispatch-panel header p {
          margin: 4px 0 0;
          color: var(--dispatch-muted);
          font-size: 12px;
        }

        .dispatch-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
          max-height: 620px;
          overflow-y: auto;
          padding-right: 3px;
        }

        .dispatch-list::-webkit-scrollbar { width: 8px; }
        .dispatch-list::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, .35); border-radius: 999px; }

        .dispatch-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, .16);
          background: rgba(15, 23, 42, .62);
          cursor: pointer;
          transition: border-color .15s ease, background .15s ease, transform .15s ease;
        }

        .dispatch-item:hover {
          border-color: rgba(96, 165, 250, .55);
          background: rgba(30, 41, 59, .86);
          transform: translateY(-1px);
        }

        .dispatch-item.selected {
          border-color: rgba(96, 165, 250, .9);
          background: rgba(37, 99, 235, .16);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, .16);
        }

        .dispatch-item.drop-ready {
          border-color: rgba(34, 197, 94, .8);
          background: rgba(34, 197, 94, .1);
        }

        .dispatch-item.compact {
          min-height: 74px;
        }

        .dispatch-item.blocked {
          cursor: not-allowed;
          opacity: .65;
          background: rgba(127, 29, 29, .12);
        }

        .dispatch-item.blocked:hover {
          border-color: rgba(239, 68, 68, .35);
          transform: none;
        }

        .dispatch-item-main {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .dispatch-item-main strong {
          color: var(--dispatch-text);
          font-size: 14px;
          line-height: 1.2;
        }

        .dispatch-item-main span,
        .dispatch-item-meta {
          color: var(--dispatch-muted);
          font-size: 12px;
        }

        .dispatch-drop-hint {
          color: #93c5fd;
          font-size: 11px;
          font-weight: 700;
        }

        .status-pill {
          align-self: flex-start;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .status-pill.success {
          background: rgba(34, 197, 94, .14);
          color: #86efac;
        }

        .status-pill.blocked {
          background: rgba(239, 68, 68, .14);
          color: #fca5a5;
        }

        .dispatch-preview {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .preview-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .preview-card {
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, .14);
          background: rgba(15, 23, 42, .66);
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
          font-size: 14px;
        }

        .preview-card span,
        .preview-card small,
        .muted {
          color: var(--dispatch-muted);
          font-size: 12px;
        }

        .conflict-box {
          padding: 10px;
          border-radius: 14px;
          border: 1px solid rgba(245, 158, 11, .3);
          background: rgba(120, 53, 15, .2);
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
          min-height: 44px;
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
          padding: 24px 16px;
          border: 1px dashed rgba(148, 163, 184, .28);
          border-radius: 14px;
          color: var(--dispatch-muted);
          font-size: 13px;
          text-align: center;
          background: rgba(15, 23, 42, .42);
        }

        .preview-empty { margin-top: 8px; }

        @media (max-width: 1320px) {
          .dispatch-layout { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 820px) {
          .dispatch-topbar { flex-direction: column; align-items: stretch; }
          .dispatch-summary-cards { grid-template-columns: 1fr 1fr; }
          .dispatch-layout { grid-template-columns: 1fr; }
          .preview-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
