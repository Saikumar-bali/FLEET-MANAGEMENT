import { API_BASE_URL } from '../config/api';
import type { ApiResponse } from '../types/api';
import { ApiError } from '../types/api';

type RequestOptions = RequestInit & { token?: string | null };

type PodViewResponse = {
  document: PodDocument & { fileUrl?: string | null };
  url: string | null;
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

export type PodDocument = {
  id: string;
  title: string;
  documentNumber?: string | null;
  originalFileName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  fileExtension?: string | null;
  documentStatus?: string | null;
  documentType?: string | null;
  documentCategory?: string | null;
  expiryDate?: string | null;
  fileUrl?: string | null;
  verificationStatus: string;
  reviewComments?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
  uploadedBy?: { id: string; name: string } | null;
  verifiedBy?: { id: string; name: string } | null;
  trip?: {
    id: string;
    tripNumber: string;
    originName: string;
    destinationName: string;
    distanceKm?: number | null;
    vehicle?: { id: string; vehicleNumber: string; vehicleType?: string | null } | null;
    driver?: { id: string; name: string; mobile?: string | null } | null;
    billing?: TripBillingChainRecord | null;
  } | null;
};

export type TripBillingChainRecord = {
  id: string;
  invoiceNumber?: string | null;
  invoiceDate: string;
  paymentStatus: string;
  freightAmount: string | number;
  loadingCharges: string | number;
  unloadingCharges: string | number;
  tollCharges: string | number;
  otherCharges: string | number;
  taxableAmount: string | number;
  totalAmount: string | number;
  netReceivable: string | number;
  balanceAmount: string | number;
  notes?: string | null;
  trip?: {
    id: string;
    tripNumber: string;
    originName: string;
    destinationName: string;
    distanceKm?: number | null;
    documents?: PodDocument[];
  } | null;
  customer?: { id: string; name: string } | null;
  vehicle?: { id: string; vehicleNumber: string; vehicleType?: string | null } | null;
  driver?: { id: string; name: string; mobile?: string | null } | null;
};

export type PodBillingChain = {
  pods: PodDocument[];
  pendingBillings: TripBillingChainRecord[];
};

export function getPodBillingChain(token: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request<PodBillingChain>(`/pod-billing/chain${query}`, { token });
}

export function viewPodDocument(token: string, documentId: string) {
  return request<PodViewResponse>(`/pod-billing/pods/${documentId}/view`, { token });
}

export function verifyPod(token: string, documentId: string, payload: Record<string, unknown>) {
  return request<{ pod: PodDocument; billing: TripBillingChainRecord; billingCreated: boolean }>(`/pod-billing/pods/${documentId}/verify`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function rejectPod(token: string, documentId: string, reason: string) {
  return request<PodDocument>(`/pod-billing/pods/${documentId}/reject`, {
    method: 'POST',
    token,
    body: JSON.stringify({ reason }),
  });
}

export function approveBilling(token: string, billingId: string, notes?: string) {
  return request<TripBillingChainRecord>(`/pod-billing/billings/${billingId}/approve`, {
    method: 'POST',
    token,
    body: JSON.stringify({ notes }),
  });
}

export function rejectBilling(token: string, billingId: string, reason: string) {
  return request<TripBillingChainRecord>(`/pod-billing/billings/${billingId}/reject`, {
    method: 'POST',
    token,
    body: JSON.stringify({ reason }),
  });
}

export function uploadTripPod(token: string, tripId: string, payload: { file: File; receiverName?: string; receiverMobile?: string; deliveryNotes?: string }) {
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.receiverName) formData.append('receiverName', payload.receiverName);
  if (payload.receiverMobile) formData.append('receiverMobile', payload.receiverMobile);
  if (payload.deliveryNotes) formData.append('deliveryNotes', payload.deliveryNotes);
  return request<PodDocument>(`/me/driver-trips/${tripId}/pod`, { method: 'POST', token, body: formData });
}
