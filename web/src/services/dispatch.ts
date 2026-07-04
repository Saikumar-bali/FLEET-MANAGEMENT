import { API_BASE_URL } from '../config/api';

export type DriverRecord = {
  id: string;
  name: string;
  mobile: string;
  licenseNumber: string;
  status: string;
};

export type VehicleRecord = {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  status: string;
  brand?: string | null;
  model?: string | null;
  currentDriverId?: string | null;
};

export type UnavailableVehicleItem = {
  vehicle?: VehicleRecord;
  item?: VehicleRecord;
  reason: string;
};

export type UnavailableDriverItem = {
  driver?: DriverRecord;
  item?: DriverRecord;
  reason: string;
};

export type TripRecord = {
  id: string;
  tripNumber: string;
  status: string;
  originName: string;
  destinationName: string;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  vehicleId: string;
  driverId?: string | null;
  vehicle?: { id: string; vehicleNumber: string };
  driver?: { id: string; name: string } | null;
};

export type BoardSummary = {
  availableVehicles: number;
  availableDrivers: number;
  unassignedTrips: number;
  scheduledToday: number;
};

export type BoardData = {
  availableVehicles: VehicleRecord[];
  unavailableVehicles: UnavailableVehicleItem[];
  availableDrivers: DriverRecord[];
  unavailableDrivers: UnavailableDriverItem[];
  unassignedTrips: TripRecord[];
  summary: BoardSummary;
};

export type Conflict = {
  type: 'DRIVER_TIME' | 'DRIVER_UNAVAILABLE' | 'VEHICLE_TIME' | 'VEHICLE_UNAVAILABLE';
  message: string;
  severity: 'HARD' | 'SOFT';
};

export type RouteEstimate = {
  origin: string;
  destination: string;
  distanceKm: number | null;
  estimatedDurationMin: number | null;
  status: 'AVAILABLE' | 'UNAVAILABLE';
  message?: string;
};

type ApiResponse<T> = { success: boolean; message?: string; data: T };

async function api<T>(endpoint: string, token: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...options?.headers, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? 'Request failed');
  return data;
}

export function getDispatchBoard(token: string) {
  return api<BoardData>('/dispatch/board', token);
}

export function checkConflicts(token: string, payload: Record<string, unknown>) {
  return api<{ hasConflict: boolean; conflicts: Conflict[] }>('/dispatch/check-conflicts', token, { method: 'POST', body: JSON.stringify(payload) });
}

export function assignTrip(token: string, payload: { tripId: string; driverId: string; vehicleId: string }) {
  return api<TripRecord>('/dispatch/assign', token, { method: 'POST', body: JSON.stringify(payload) });
}

export function getRouteEstimate(token: string, origin: string, destination: string) {
  return api<RouteEstimate>(`/dispatch/route-estimate?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`, token);
}
