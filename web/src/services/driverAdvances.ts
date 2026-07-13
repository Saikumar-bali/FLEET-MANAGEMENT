import { API_BASE_URL } from '../config/api';
import { ApiError, type ApiResponse } from '../types/api';
import type { DriverAdvance, DriverAdvanceList, DriverAdvanceReport, DriverSettlement, DriverSettlementList } from '../types/driver-advances';

type RequestOptions = RequestInit & { token?: string | null };

type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  driverId?: string;
  vehicleId?: string;
  tripId?: string;
  dateFrom?: string;
  dateTo?: string;
  overdueOnly?: boolean;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers, credentials: 'include' });
  const responseText = await response.text();
  let data: ApiResponse<T> | null = null;
  if (responseText) {
    try { data = JSON.parse(responseText) as ApiResponse<T>; } catch { data = null; }
  }

  if (!response.ok) {
    throw new ApiError(data?.message || response.statusText || 'Request failed', response.status, data?.errors, responseText || undefined);
  }

  return data || { success: true, message: 'Operation successful', data: undefined as T };
}

function qs(params?: ListParams) {
  const query = new URLSearchParams();
  if (!params) return '';
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : '';
}

export function listDriverAdvances(token: string, params?: ListParams) {
  return request<DriverAdvanceList>(`/driver-advances${qs(params)}`, { token });
}

export function getDriverAdvance(token: string, id: string) {
  return request<DriverAdvance>(`/driver-advances/${id}`, { token });
}

export function getDriverAdvanceReport(token: string, params?: ListParams) {
  return request<DriverAdvanceReport>(`/driver-advances/reports/summary${qs(params)}`, { token });
}

export function createDriverAdvance(token: string, payload: Record<string, unknown>) {
  return request<DriverAdvance>('/driver-advances', { method: 'POST', token, body: JSON.stringify(payload) });
}

export function updateDriverAdvance(token: string, id: string, payload: Record<string, unknown>) {
  return request<DriverAdvance>(`/driver-advances/${id}`, { method: 'PATCH', token, body: JSON.stringify(payload) });
}

export function submitDriverAdvance(token: string, id: string, reason?: string) {
  return request<DriverAdvance>(`/driver-advances/${id}/submit`, { method: 'PATCH', token, body: JSON.stringify({ reason }) });
}

export function approveDriverAdvance(token: string, id: string, reason?: string) {
  return request<DriverAdvance>(`/driver-advances/${id}/approve`, { method: 'PATCH', token, body: JSON.stringify({ reason }) });
}

export function rejectDriverAdvance(token: string, id: string, reason?: string) {
  return request<DriverAdvance>(`/driver-advances/${id}/reject`, { method: 'PATCH', token, body: JSON.stringify({ reason }) });
}

export function requestChangesDriverAdvance(token: string, id: string, reason?: string) {
  return request<DriverAdvance>(`/driver-advances/${id}/request-changes`, { method: 'PATCH', token, body: JSON.stringify({ reason }) });
}

export function issueDriverAdvance(token: string, id: string, payload: Record<string, unknown>) {
  return request<DriverAdvance>(`/driver-advances/${id}/issue`, { method: 'PATCH', token, body: JSON.stringify(payload) });
}

export function cancelDriverAdvance(token: string, id: string, reason: string) {
  return request<DriverAdvance>(`/driver-advances/${id}/cancel`, { method: 'PATCH', token, body: JSON.stringify({ reason }) });
}

export function listDriverSettlements(token: string, params?: ListParams & { advanceId?: string }) {
  return request<DriverSettlementList>(`/driver-settlements${qs(params)}`, { token });
}

export function getDriverSettlement(token: string, id: string) {
  return request<DriverSettlement>(`/driver-settlements/${id}`, { token });
}

export function createSettlementForAdvance(token: string, advanceId: string, payload: Record<string, unknown>) {
  return request<DriverSettlement>(`/driver-advances/${advanceId}/settlements`, { method: 'POST', token, body: JSON.stringify(payload) });
}

export function submitDriverSettlement(token: string, id: string, reason?: string) {
  return request<DriverSettlement>(`/driver-settlements/${id}/submit`, { method: 'PATCH', token, body: JSON.stringify({ reason }) });
}

export function reviewDriverSettlement(token: string, id: string, reason?: string) {
  return request<DriverSettlement>(`/driver-settlements/${id}/review`, { method: 'PATCH', token, body: JSON.stringify({ reason }) });
}

export function approveDriverSettlement(token: string, id: string, reason?: string) {
  return request<DriverSettlement>(`/driver-settlements/${id}/approve`, { method: 'PATCH', token, body: JSON.stringify({ reason }) });
}

export function rejectDriverSettlement(token: string, id: string, reason?: string) {
  return request<DriverSettlement>(`/driver-settlements/${id}/reject`, { method: 'PATCH', token, body: JSON.stringify({ reason }) });
}

export function requestChangesDriverSettlement(token: string, id: string, reason?: string) {
  return request<DriverSettlement>(`/driver-settlements/${id}/request-changes`, { method: 'PATCH', token, body: JSON.stringify({ reason }) });
}

export function settleDriverSettlement(token: string, id: string, payload: Record<string, unknown>) {
  return request<DriverSettlement>(`/driver-settlements/${id}/settle`, { method: 'PATCH', token, body: JSON.stringify(payload) });
}

export function cancelDriverSettlement(token: string, id: string, reason?: string) {
  return request<DriverSettlement>(`/driver-settlements/${id}/cancel`, { method: 'PATCH', token, body: JSON.stringify({ reason }) });
}

export function listMyDriverAdvances(token: string, params?: ListParams) {
  return request<DriverAdvanceList>(`/me/driver-advances${qs(params)}`, { token });
}

export function getMyDriverAdvance(token: string, id: string) {
  return request<DriverAdvance>(`/me/driver-advances/${id}`, { token });
}

export function listMyDriverSettlements(token: string, params?: ListParams) {
  return request<DriverSettlementList>(`/me/driver-settlements${qs(params)}`, { token });
}

export function getMyDriverSettlement(token: string, id: string) {
  return request<DriverSettlement>(`/me/driver-settlements/${id}`, { token });
}

export function createMySettlementForAdvance(token: string, advanceId: string, payload: Record<string, unknown>) {
  return request<DriverSettlement>(`/me/driver-advances/${advanceId}/settlements`, { method: 'POST', token, body: JSON.stringify(payload) });
}

export function submitMyDriverSettlement(token: string, id: string, reason?: string) {
  return request<DriverSettlement>(`/me/driver-settlements/${id}/submit`, { method: 'PATCH', token, body: JSON.stringify({ reason }) });
}

export function addMyCashReturn(token: string, id: string, payload: Record<string, unknown>) {
  return request<DriverSettlement>(`/me/driver-settlements/${id}/cash-return`, { method: 'POST', token, body: JSON.stringify(payload) });
}
