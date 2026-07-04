import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDispatchBoard, checkConflicts, assignTrip, getRouteEstimate } from '../services/dispatch';
import type { BoardData, DriverRecord, VehicleRecord, TripRecord, Conflict, RouteEstimate } from '../services/dispatch';

type DragItem = { type: 'driver' | 'vehicle'; id: string };

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
  const [showConflicts, setShowConflicts] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const token = auth.accessToken ?? '';

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
    setShowConflicts(false);
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
    } catch {}
  };

  useEffect(() => {
    if (!selectedTrip || !selectedDriver && !selectedVehicle) {
      setConflicts([]);
      return;
    }
    setChecking(true);
    checkConflicts(token, {
      tripId: selectedTrip?.id ?? null,
      driverId: selectedDriver?.id ?? null,
      vehicleId: selectedVehicle?.id ?? null,
      plannedStartAt: selectedTrip?.plannedStartAt ?? null,
      plannedEndAt: selectedTrip?.plannedEndAt ?? null,
    }).then((r: { data: { conflicts: Conflict[]; hasConflict: boolean } }) => {
      setConflicts(r.data.conflicts);
      if (r.data.hasConflict) setShowConflicts(true);
    }).catch(() => { /* ignore conflict check errors */ }).finally(() => setChecking(false));
  }, [selectedDriver, selectedVehicle, selectedTrip, token]);

  const handleAssign = async () => {
    if (!selectedTrip || !selectedDriver || !selectedVehicle) return;
    setAssigning(true);
    try {
      await assignTrip(token, { tripId: selectedTrip.id, driverId: selectedDriver.id, vehicleId: selectedVehicle.id });
      setAssigned(true);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Assignment failed');
    }
    setAssigning(false);
  };

  const canAssign = selectedTrip && selectedDriver && selectedVehicle && !conflicts.some((c) => c.severity === 'HARD') && !assigned;

  if (loading && !board) {
    return <div className="page-container"><div className="loading">Loading dispatch board...</div></div>;
  }

  if (!board) {
    return <div className="page-container"><div className="error-message">{error ?? 'No data'}</div></div>;
  }

  return (
    <div className="page-container dispatch-board">
      <div className="page-header">
        <div>
          <h1>Dispatch Board</h1>
          <p className="page-description">Drag and drop drivers and vehicles onto trips to dispatch</p>
        </div>
        <button type="button" className="btn-secondary" onClick={refresh}>Refresh</button>
      </div>

      {error && <div className="error-message" style={{ marginBottom: 16 }}>{error}</div>}

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
        <div className="summary-card summary-card--info">
          <span className="summary-card-value">{board.summary.scheduledToday}</span>
          <span className="summary-card-label">Scheduled Today</span>
        </div>
      </div>

      <div className="dispatch-columns">
        <div className="dispatch-column dispatch-column--vehicles">
          <h3>Vehicles</h3>
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
            {board.unavailableVehicles.map(({ item: v, reason }) => (
              <div key={v.id} className="dispatch-card dispatch-card--unavailable disabled">
                <div className="dispatch-card-title">{v.vehicleNumber}</div>
                <div className="dispatch-card-subtitle">{v.vehicleType}</div>
                <span className="dispatch-card-badge dispatch-card-badge--blocked">{reason}</span>
              </div>
            ))}
            {board.availableVehicles.length === 0 && board.unavailableVehicles.length === 0 && (
              <div className="dispatch-empty">No vehicles found</div>
            )}
          </div>
        </div>

        <div className="dispatch-column dispatch-column--drivers">
          <h3>Drivers</h3>
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
            {board.unavailableDrivers.map(({ item: d, reason }) => (
              <div key={d.id} className="dispatch-card dispatch-card--unavailable disabled">
                <div className="dispatch-card-title">{d.name}</div>
                <div className="dispatch-card-subtitle">{d.mobile}</div>
                <span className="dispatch-card-badge dispatch-card-badge--blocked">{reason}</span>
              </div>
            ))}
            {board.availableDrivers.length === 0 && board.unavailableDrivers.length === 0 && (
              <div className="dispatch-empty">No drivers found</div>
            )}
          </div>
        </div>

        <div className="dispatch-column dispatch-column--trips">
          <h3>Unassigned Trips</h3>
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
                  {t.plannedStartAt ? new Date(t.plannedStartAt).toLocaleDateString() : 'No date'}
                </div>
              </div>
            ))}
            {board.unassignedTrips.length === 0 && (
              <div className="dispatch-empty">No unassigned trips</div>
            )}
          </div>
        </div>

        <div className="dispatch-column dispatch-column--preview">
          <h3>Assignment Preview</h3>
          {selectedTrip ? (
            <div className="dispatch-preview">
              <div className="dispatch-preview-section">
                <h4>Trip</h4>
                <p><strong>{selectedTrip.tripNumber}</strong></p>
                <p>{selectedTrip.originName} → {selectedTrip.destinationName}</p>
                {selectedTrip.plannedStartAt && <p>{new Date(selectedTrip.plannedStartAt).toLocaleString()}</p>}
              </div>

              {routeEstimate && (
                <div className="dispatch-preview-section">
                  <h4>Route Estimate</h4>
                  {routeEstimate.status === 'AVAILABLE' ? (
                    <p>{routeEstimate.distanceKm} km · ~{routeEstimate.estimatedDurationMin} min</p>
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
                  <h4 onClick={() => setShowConflicts(!showConflicts)} style={{ cursor: 'pointer' }}>
                    Conflicts ({conflicts.length}) {showConflicts ? '▲' : '▼'}
                  </h4>
                  {showConflicts && conflicts.map((c, i) => (
                    <div key={i} className={`dispatch-conflict dispatch-conflict--${c.severity.toLowerCase()}`}>
                      <strong>{c.severity === 'HARD' ? '⛔' : '⚠️'}</strong> {c.message}
                    </div>
                  ))}
                </div>
              )}

              {assigned && (
                <div className="dispatch-assigned-message">Trip assigned successfully!</div>
              )}

              <button type="button"
                className="btn-primary"
                disabled={!canAssign || assigning}
                onClick={handleAssign}
                style={{ width: '100%', marginTop: 12 }}>
                {assigning ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          ) : (
            <div className="dispatch-empty">Select a trip to start assigning</div>
          )}
        </div>
      </div>

      <style>{`
        .dispatch-board .dispatch-summary-cards {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;
        }
        .dispatch-board .summary-card {
          padding: 20px; border-radius: 12px; display: flex; flex-direction: column; gap: 4px;
        }
        .dispatch-board .summary-card--available { background: var(--color-success-bg, #e8f5e9); }
        .dispatch-board .summary-card--pending { background: var(--color-warning-bg, #fff8e1); }
        .dispatch-board .summary-card--info { background: var(--color-info-bg, #e3f2fd); }
        .dispatch-board .summary-card-value { font-size: 32px; font-weight: 700; line-height: 1; }
        .dispatch-board .summary-card-label { font-size: 13px; color: var(--color-text-secondary, #666); }
        .dispatch-board .dispatch-columns { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; align-items: start; }
        .dispatch-board .dispatch-column { background: var(--color-surface, #fff); border-radius: 12px; border: 1px solid var(--color-border, #e0e0e0); padding: 16px; }
        .dispatch-board .dispatch-column h3 { margin: 0 0 12px; font-size: 15px; font-weight: 600; }
        .dispatch-board .dispatch-list { display: flex; flex-direction: column; gap: 8px; max-height: 600px; overflow-y: auto; }
        .dispatch-board .dispatch-card { padding: 12px; border-radius: 8px; border: 1px solid var(--color-border, #e0e0e0); cursor: pointer; transition: all .15s; position: relative; }
        .dispatch-board .dispatch-card:hover { border-color: var(--color-primary, #1976d2); }
        .dispatch-board .dispatch-card--selected { border-color: var(--color-primary, #1976d2); box-shadow: 0 0 0 2px rgba(25,118,210,.2); }
        .dispatch-board .dispatch-card--drag-over { border-color: var(--color-primary, #1976d2); background: rgba(25,118,210,.05); }
        .dispatch-board .dispatch-card.disabled { opacity: .5; cursor: not-allowed; }
        .dispatch-board .dispatch-card-title { font-weight: 600; font-size: 14px; }
        .dispatch-board .dispatch-card-subtitle { font-size: 12px; color: var(--color-text-secondary, #666); }
        .dispatch-board .dispatch-card-meta { font-size: 11px; color: var(--color-text-secondary, #666); margin-top: 4px; }
        .dispatch-board .dispatch-card-badge { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 10px; margin-top: 6px; font-weight: 600; }
        .dispatch-board .dispatch-card-badge--available { background: var(--color-success-bg, #e8f5e9); color: #2e7d32; }
        .dispatch-board .dispatch-card-badge--blocked { background: var(--color-error-bg, #fbe9e7); color: #c62828; }
        .dispatch-board .dispatch-empty { padding: 24px; text-align: center; color: var(--color-text-secondary, #999); font-size: 13px; }
        .dispatch-board .dispatch-preview { display: flex; flex-direction: column; gap: 12px; }
        .dispatch-board .dispatch-preview-section { border-bottom: 1px solid var(--color-border, #eee); padding-bottom: 8px; }
        .dispatch-board .dispatch-preview-section h4 { font-size: 12px; text-transform: uppercase; color: var(--color-text-secondary, #888); margin: 0 0 4px; }
        .dispatch-board .dispatch-preview-section p { margin: 0; font-size: 14px; }
        .dispatch-board .text-muted { color: var(--color-text-secondary, #999); font-size: 13px; }
        .dispatch-board .dispatch-conflicts { background: #fff3e0; border-radius: 8px; padding: 12px; }
        .dispatch-board .dispatch-conflict { font-size: 13px; padding: 4px 0; }
        .dispatch-board .dispatch-conflict--hard { color: #c62828; }
        .dispatch-board .dispatch-conflict--soft { color: #f57f17; }
        .dispatch-board .dispatch-assigned-message { background: var(--color-success-bg, #e8f5e9); color: #2e7d32; padding: 12px; border-radius: 8px; text-align: center; font-weight: 600; }
        @media (max-width: 1200px) {
          .dispatch-board .dispatch-columns { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 768px) {
          .dispatch-board .dispatch-summary-cards { grid-template-columns: 1fr 1fr; }
          .dispatch-board .dispatch-columns { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
