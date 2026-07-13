import { API_BASE_URL } from '../config/api';
import type { ApiResponse } from '../types/api';
import type { DriverPortalTrip } from '../types/auth';

async function request(endpoint: string, _token: string, method = 'POST', payload: Record<string, unknown> = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null) as ApiResponse<DriverPortalTrip> | null;
  if (!response.ok) throw new Error(data?.message || 'Driver assignment request failed');
  return data as ApiResponse<DriverPortalTrip>;
}

export function confirmDriverTripAssignment(token: string, tripId: string) {
  return request(`/me/driver-trip-assignments/${tripId}/confirm`, token);
}

export function declineDriverTripAssignment(token: string, tripId: string) {
  return request(`/me/driver-trip-assignments/${tripId}/decline`, token);
}

export function startAssignedDriverTrip(token: string, tripId: string) {
  return request(`/me/driver-trip-assignments/${tripId}/start`, token);
}

export function endAssignedDriverTrip(token: string, tripId: string) {
  return request(`/me/driver-trip-assignments/${tripId}/end`, token);
}
