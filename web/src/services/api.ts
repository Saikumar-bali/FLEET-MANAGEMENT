import { API_BASE_URL } from '../config/api';
import type { ApiResponse } from '../types/api';
import { ApiError } from '../types/api';
import type {
  AssetAssignmentRecord,
  AssetCategoryRecord,
  AssetHistoryRecord,
  AssetHolderType,
  AssetRecord,
  AuthPayload,
  DocumentRecord,
  DriverRecord,
  PaginatedResponse,
  PermissionRecord,
  RoleRecord,
  TripHistoryRecord,
  TripRecord,
  UserRecord,
  VehicleRecord,
} from '../types/auth';

type RequestOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const responseText = await response.text();
  let data: ApiResponse<T> | null = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText) as ApiResponse<T>;
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message || response.statusText || 'Request failed',
      response.status,
      data?.errors,
      responseText || undefined,
    );
  }

  if (!data) {
    return {
      success: true,
      message: 'Operation successful',
      data: undefined as T,
    };
  }

  return data;
}

export function getHealth() {
  return request<{ status: string; timestamp: string; uptime: number; database: string }>('/health');
}

export function login(identifier: string, password: string) {
  return request<AuthPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
}

export function logout(refreshToken: string) {
  return request<null>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export function refresh(refreshToken: string) {
  return request<AuthPayload>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export function getCurrentUser(token: string) {
  return request<{ user: AuthPayload['user']; permissions: string[] }>('/auth/me', {
    token,
  });
}

export function getRoles(token: string) {
  return request<RoleRecord[]>('/roles', { token });
}

export function createRole(
  token: string,
  payload: { name: string; key: string; description?: string; status: 'ACTIVE' | 'INACTIVE' },
) {
  return request<RoleRecord>('/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function updateRole(
  token: string,
  roleId: string,
  payload: Partial<{ name: string; key: string; description: string; status: 'ACTIVE' | 'INACTIVE' }>,
) {
  return request<RoleRecord>(`/roles/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });
}

export function getPermissions(token: string) {
  return request<PermissionRecord[]>('/permissions', { token });
}

export function updateRolePermissions(token: string, roleId: string, permissionKeys: string[]) {
  return request<RoleRecord>(`/roles/${roleId}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ permissionKeys }),
    token,
  });
}

export function getUsers(token: string) {
  return request<UserRecord[]>('/users', { token });
}

export function getUser(token: string, userId: string) {
  return request<UserRecord>(`/users/${userId}`, { token });
}

export function createUser(
  token: string,
  payload: {
    name: string;
    username: string;
    email: string;
    mobile?: string;
    password: string;
    roleId: string;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  },
) {
  return request<UserRecord>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function updateUser(
  token: string,
  userId: string,
  payload: Partial<{
    name: string;
    username: string;
    mobile: string;
    roleId: string;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  }>,
) {
  return request<UserRecord>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });
}

export function updateUserStatus(
  token: string,
  userId: string,
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
) {
  return request<UserRecord>(`/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    token,
  });
}

export function updateUserPassword(token: string, userId: string, password: string) {
  return request<{ id: string }>(`/users/${userId}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ password }),
    token,
  });
}

// Vehicles
export function getVehicles(
  token: string,
  params?: { search?: string; status?: string; page?: number; limit?: number },
) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return request<PaginatedResponse<VehicleRecord>>(`/vehicles${qs ? `?${qs}` : ''}`, { token });
}

export function getVehicle(token: string, vehicleId: string) {
  return request<VehicleRecord>(`/vehicles/${vehicleId}`, { token });
}

export function createVehicle(
  token: string,
  payload: Partial<VehicleRecord> & { vehicleNumber: string; vehicleType: string; fuelType: string },
) {
  return request<VehicleRecord>('/vehicles', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function updateVehicle(token: string, vehicleId: string, payload: Partial<VehicleRecord>) {
  return request<VehicleRecord>(`/vehicles/${vehicleId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });
}

export function updateVehicleStatus(token: string, vehicleId: string, status: string) {
  return request<VehicleRecord>(`/vehicles/${vehicleId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    token,
  });
}

// Drivers
export function getDrivers(
  token: string,
  params?: { search?: string; status?: string; page?: number; limit?: number },
) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return request<PaginatedResponse<DriverRecord>>(`/drivers${qs ? `?${qs}` : ''}`, { token });
}

export function getDriver(token: string, driverId: string) {
  return request<DriverRecord>(`/drivers/${driverId}`, { token });
}

export function createDriver(
  token: string,
  payload: { name: string; mobile: string; licenseNumber: string },
) {
  return request<DriverRecord>('/drivers', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function updateDriver(token: string, driverId: string, payload: Partial<DriverRecord>) {
  return request<DriverRecord>(`/drivers/${driverId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });
}

export function updateDriverStatus(token: string, driverId: string, status: string) {
  return request<DriverRecord>(`/drivers/${driverId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    token,
  });
}

// Assets - Categories
export function getAssetCategories(token: string) {
  return request<AssetCategoryRecord[]>('/assets/categories', { token });
}

export function createAssetCategory(
  token: string,
  payload: { name: string; key: string; description?: string; status?: 'ACTIVE' | 'INACTIVE' },
) {
  return request<AssetCategoryRecord>('/assets/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function updateAssetCategory(
  token: string,
  categoryId: string,
  payload: Partial<AssetCategoryRecord>,
) {
  return request<AssetCategoryRecord>(`/assets/categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });
}

// Assets
export function getAssets(
  token: string,
  params?: { search?: string; status?: string; categoryId?: string; page?: number; limit?: number },
) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.categoryId) query.set('categoryId', params.categoryId);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return request<PaginatedResponse<AssetRecord>>(`/assets${qs ? `?${qs}` : ''}`, { token });
}

export function getAsset(token: string, assetId: string) {
  return request<AssetRecord>(`/assets/${assetId}`, { token });
}

export function createAsset(
  token: string,
  payload: {
    assetCode: string;
    name: string;
    assetCategoryId: string;
    serialNumber?: string;
    purchaseDate?: string;
    purchaseAmount?: number;
    notes?: string;
  },
) {
  return request<AssetRecord>('/assets', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function updateAsset(token: string, assetId: string, payload: Partial<AssetRecord>) {
  return request<AssetRecord>(`/assets/${assetId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });
}

export function updateAssetStatus(token: string, assetId: string, currentStatus: string) {
  return request<AssetRecord>(`/assets/${assetId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ currentStatus }),
    token,
  });
}

export function getAssetAssignments(token: string, assetId: string) {
  return request<AssetAssignmentRecord[]>(`/assets/${assetId}/assignments`, { token });
}

export function getAssetHistory(token: string, assetId: string) {
  return request<AssetHistoryRecord[]>(`/assets/${assetId}/history`, { token });
}

export function assignAsset(
  token: string,
  assetId: string,
  payload: {
    assignedToType: AssetHolderType;
    assignedToId: string;
    notes?: string;
  },
) {
  return request<AssetAssignmentRecord>(`/assets/${assetId}/assign`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function returnAsset(
  token: string,
  assetId: string,
  payload: {
    notes?: string;
    proofUrl?: string;
  },
) {
  return request<AssetAssignmentRecord>(`/assets/${assetId}/return`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function transferAsset(
  token: string,
  assetId: string,
  payload: {
    assignedToType: AssetHolderType;
    assignedToId: string;
    notes?: string;
    proofUrl?: string;
  },
) {
  return request<AssetAssignmentRecord>(`/assets/${assetId}/transfer`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function markAssetDamaged(
  token: string,
  assetId: string,
  payload: {
    notes?: string;
    proofUrl?: string;
  },
) {
  return request<AssetRecord>(`/assets/${assetId}/mark-damaged`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function markAssetLost(
  token: string,
  assetId: string,
  payload: {
    notes?: string;
    proofUrl?: string;
  },
) {
  return request<AssetRecord>(`/assets/${assetId}/mark-lost`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

// Documents
export function getDocuments(
  token: string,
  params?: { entityType?: string; entityId?: string; documentType?: string },
) {
  const query = new URLSearchParams();
  if (params?.entityType) query.set('entityType', params.entityType);
  if (params?.entityId) query.set('entityId', params.entityId);
  if (params?.documentType) query.set('documentType', params.documentType);
  const qs = query.toString();
  return request<PaginatedResponse<DocumentRecord>>(`/documents${qs ? `?${qs}` : ''}`, { token });
}

export function createDocument(
  token: string,
  payload: {
    entityType: 'VEHICLE' | 'DRIVER' | 'ASSET';
    entityId: string;
    documentType: string;
    documentNumber?: string;
    expiryDate?: string;
    fileUrl?: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
  },
) {
  return request<DocumentRecord>('/documents', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function updateDocument(token: string, documentId: string, payload: Partial<DocumentRecord>) {
  return request<DocumentRecord>(`/documents/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });
}

export function deleteDocument(token: string, documentId: string) {
  return request<DocumentRecord>(`/documents/${documentId}`, {
    method: 'DELETE',
    token,
  });
}

// Trips
export function getTrips(
  token: string,
  params?: {
    search?: string;
    status?: string;
    tripType?: string;
    vehicleId?: string;
    driverId?: string;
    page?: number;
    limit?: number;
  },
) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.tripType) query.set('tripType', params.tripType);
  if (params?.vehicleId) query.set('vehicleId', params.vehicleId);
  if (params?.driverId) query.set('driverId', params.driverId);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return request<PaginatedResponse<TripRecord>>(`/trips${qs ? `?${qs}` : ''}`, { token });
}

export function createTrip(
  token: string,
  payload: {
    tripType: string;
    vehicleId: string;
    driverId?: string;
    assistantDriverId?: string;
    originName: string;
    originAddress?: string;
    destinationName: string;
    destinationAddress?: string;
    plannedStartAt?: string;
    plannedEndAt?: string;
    purpose?: string;
    notes?: string;
  },
) {
  return request<TripRecord>('/trips', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function getTrip(token: string, tripId: string) {
  return request<TripRecord>(`/trips/${tripId}`, { token });
}

export function updateTrip(token: string, tripId: string, payload: Partial<TripRecord>) {
  return request<TripRecord>(`/trips/${tripId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });
}

export function scheduleTrip(
  token: string,
  tripId: string,
  payload: {
    plannedStartAt?: string;
    plannedEndAt?: string;
    driverId?: string;
    assistantDriverId?: string;
    notes?: string;
  },
) {
  return request<TripRecord>(`/trips/${tripId}/schedule`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function startTrip(
  token: string,
  tripId: string,
  payload: {
    startOdometer?: number;
    notes?: string;
  },
) {
  return request<TripRecord>(`/trips/${tripId}/start`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function completeTrip(
  token: string,
  tripId: string,
  payload: {
    endOdometer?: number;
    distanceKm?: number;
    notes?: string;
  },
) {
  return request<TripRecord>(`/trips/${tripId}/complete`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function cancelTrip(
  token: string,
  tripId: string,
  payload: {
    notes?: string;
  },
) {
  return request<TripRecord>(`/trips/${tripId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function getTripHistory(token: string, tripId: string) {
  return request<TripHistoryRecord[]>(`/trips/${tripId}/history`, { token });
}
