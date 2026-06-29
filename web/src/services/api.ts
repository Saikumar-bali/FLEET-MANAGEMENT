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
  DashboardOverview,
  DocumentRecord,
  DriverRecord,
  PaginatedResponse,
  PermissionRecord,
  RoleRecord,
  TripHistoryRecord,
  TripRecord,
  UserRecord,
  VehicleRecord,
  FuelRecord,
  ExpenseRecord,
  MaintenanceRecord,
  RepairRecord,
  VehicleRegistrationDetail,
  VehicleInsuranceDetail,
  VehiclePermitDetail,
  VehicleFitnessDetail,
  VehiclePucDetail,
  VehicleRoadTaxDetail,
  VehicleFastagDetail,
  VehicleGpsDeviceDetail,
  VehicleComplianceDocument,
  VehicleComplianceHistory,
  ComplianceDashboard,
  FinanceAccount,
  FinanceCategory,
  Vendor,
  Customer,
  TripBilling,
  FinanceTransaction,
  PaymentRecord,
  FinanceDashboardSummary,
  PnlSummary,
} from '../types/auth';

type RequestOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

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

export function getDashboardOverview(accessToken: string) {
  return request<DashboardOverview>('/dashboard/overview', { method: 'GET', token: accessToken });
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
  return request<{
    user: AuthPayload['user'];
    permissions: string[];
    effectivePermissions: string[];
    rolePermissions: string[];
    userAllowedPermissions: string[];
    userDeniedPermissions: string[];
    dataScopes: AuthPayload['dataScopes'];
  }>('/auth/me', {
    token,
  });
}

export function getEffectivePermissions(token: string) {
  return request<{
    rolePermissions: string[];
    userAllowedPermissions: string[];
    userDeniedPermissions: string[];
    effectivePermissions: string[];
  }>('/auth/effective-permissions', { token });
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
  params?: Record<string, string>,
) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
  }
  const qs = query.toString();
  return request<PaginatedResponse<DocumentRecord>>(`/documents${qs ? `?${qs}` : ''}`, { token });
}

export function getDocument(token: string, documentId: string) {
  return request<DocumentRecord>(`/documents/${documentId}`, { token });
}

export function uploadDocument(
  token: string,
  formData: FormData,
) {
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  return request<DocumentRecord>('/documents/upload', {
    method: 'POST',
    headers,
    body: formData,
  });
}

export function downloadDocument(token: string, documentId: string) {
  return request<{ url: string; document: DocumentRecord }>(`/documents/${documentId}/download`, { token });
}

export function viewDocument(token: string, documentId: string) {
  return request<{ url: string; document: DocumentRecord }>(`/documents/${documentId}/view`, { token });
}

export function updateDocumentMetadata(token: string, documentId: string, payload: Record<string, unknown>) {
  return request<DocumentRecord>(`/documents/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

export function verifyDocument(token: string, documentId: string, verificationStatus: string, notes?: string) {
  return request<DocumentRecord>(`/documents/${documentId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ verificationStatus, notes }),
    token,
  });
}

export function archiveDocument(token: string, documentId: string) {
  return request<DocumentRecord>(`/documents/${documentId}/archive`, {
    method: 'POST',
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

type WorkflowQuery = { search?: string; status?: string; vehicleId?: string; tripId?: string; driverId?: string; customerId?: string; vendorId?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number };
function workflowQuery(params?: WorkflowQuery) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  return query.toString();
}
export function getFuelEntries(token: string, params?: WorkflowQuery) { const q = workflowQuery(params); return request<PaginatedResponse<FuelRecord>>(`/fuel${q ? `?${q}` : ''}`, { token }); }
export function getFuelEntry(token: string, id: string) { return request<FuelRecord>(`/fuel/${id}`, { token }); }
export function createFuelEntry(token: string, payload: Record<string, unknown>) { return request<FuelRecord>('/fuel', { method: 'POST', body: JSON.stringify(payload), token }); }
export function updateFuelEntry(token: string, id: string, payload: Record<string, unknown>) { return request<FuelRecord>(`/fuel/${id}`, { method: 'PATCH', body: JSON.stringify(payload), token }); }
export function fuelAction(token: string, id: string, action: string) { return request<FuelRecord>(`/fuel/${id}/${action}`, { method: 'POST', body: '{}', token }); }
export function extractReceipt(token: string, payload: { storageKey: string; mimeType: string }) { return request<any>('/fuel/extract-receipt', { method: 'POST', body: JSON.stringify(payload), token }); }
export function getExpenses(token: string, params?: WorkflowQuery) { const q = workflowQuery(params); return request<PaginatedResponse<ExpenseRecord>>(`/expenses${q ? `?${q}` : ''}`, { token }); }
export function getExpense(token: string, id: string) { return request<ExpenseRecord>(`/expenses/${id}`, { token }); }
export function createExpense(token: string, payload: Record<string, unknown>) { return request<ExpenseRecord>('/expenses', { method: 'POST', body: JSON.stringify(payload), token }); }
export function updateExpense(token: string, id: string, payload: Record<string, unknown>) { return request<ExpenseRecord>(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(payload), token }); }
export function expenseAction(token: string, id: string, action: string) { return request<ExpenseRecord>(`/expenses/${id}/${action}`, { method: 'POST', body: '{}', token }); }

export function getMaintenanceRecords(token: string, params?: WorkflowQuery) { const q = workflowQuery(params); return request<PaginatedResponse<MaintenanceRecord>>(`/maintenance${q ? `?${q}` : ''}`, { token }); }
export function getMaintenanceRecord(token: string, id: string) { return request<MaintenanceRecord>(`/maintenance/${id}`, { token }); }
export function createMaintenanceRecord(token: string, payload: Record<string, unknown>) { return request<MaintenanceRecord>('/maintenance', { method: 'POST', body: JSON.stringify(payload), token }); }
export function updateMaintenanceRecord(token: string, id: string, payload: Record<string, unknown>) { return request<MaintenanceRecord>(`/maintenance/${id}`, { method: 'PATCH', body: JSON.stringify(payload), token }); }
export function maintenanceAction(token: string, id: string, action: string) { return request<MaintenanceRecord>(`/maintenance/${id}/${action}`, { method: 'POST', body: '{}', token }); }

export function getRepairs(token: string, params?: WorkflowQuery) { const q = workflowQuery(params); return request<PaginatedResponse<RepairRecord>>(`/repairs${q ? `?${q}` : ''}`, { token }); }
export function getRepair(token: string, id: string) { return request<RepairRecord>(`/repairs/${id}`, { token }); }
export function createRepair(token: string, payload: Record<string, unknown>) { return request<RepairRecord>('/repairs', { method: 'POST', body: JSON.stringify(payload), token }); }
export function updateRepair(token: string, id: string, payload: Record<string, unknown>) { return request<RepairRecord>(`/repairs/${id}`, { method: 'PATCH', body: JSON.stringify(payload), token }); }
export function repairAction(token: string, id: string, action: string) { return request<RepairRecord>(`/repairs/${id}/${action}`, { method: 'POST', body: '{}', token }); }

// ─── Phase 6.1: Vehicle Compliance API ───

export function getComplianceDashboard(token: string) { return request<ComplianceDashboard>('/compliance/dashboard', { token }); }
export function getExpiringSoon(token: string, days = 30) { return request<VehicleComplianceDocument[]>(`/compliance/alerts/expiring?days=${days}`, { token }); }
export function getExpired(token: string) { return request<VehicleComplianceDocument[]>('/compliance/alerts/expired', { token }); }

export function getRegistration(token: string, vehicleId: string) { return request<VehicleRegistrationDetail>(`/vehicle/${vehicleId}/compliance/registration`, { token }); }
export function upsertRegistration(token: string, vehicleId: string, payload: Record<string, unknown>) { return request<VehicleRegistrationDetail>(`/vehicle/${vehicleId}/compliance/registration`, { method: 'PUT', body: JSON.stringify(payload), token }); }

export function listInsurance(token: string, vehicleId: string) { return request<VehicleInsuranceDetail[]>(`/vehicle/${vehicleId}/compliance/insurance`, { token }); }
export function getInsurance(token: string, vehicleId: string, id: string) { return request<VehicleInsuranceDetail>(`/vehicle/${vehicleId}/compliance/insurance/${id}`, { token }); }
export function createInsurance(token: string, vehicleId: string, payload: Record<string, unknown>) { return request<VehicleInsuranceDetail>(`/vehicle/${vehicleId}/compliance/insurance`, { method: 'POST', body: JSON.stringify(payload), token }); }
export function updateInsurance(token: string, vehicleId: string, id: string, payload: Record<string, unknown>) { return request<VehicleInsuranceDetail>(`/vehicle/${vehicleId}/compliance/insurance/${id}`, { method: 'PUT', body: JSON.stringify(payload), token }); }

export function listPermits(token: string, vehicleId: string) { return request<VehiclePermitDetail[]>(`/vehicle/${vehicleId}/compliance/permits`, { token }); }
export function getPermit(token: string, vehicleId: string, id: string) { return request<VehiclePermitDetail>(`/vehicle/${vehicleId}/compliance/permits/${id}`, { token }); }
export function createPermit(token: string, vehicleId: string, payload: Record<string, unknown>) { return request<VehiclePermitDetail>(`/vehicle/${vehicleId}/compliance/permits`, { method: 'POST', body: JSON.stringify(payload), token }); }
export function updatePermit(token: string, vehicleId: string, id: string, payload: Record<string, unknown>) { return request<VehiclePermitDetail>(`/vehicle/${vehicleId}/compliance/permits/${id}`, { method: 'PUT', body: JSON.stringify(payload), token }); }

export function listFitness(token: string, vehicleId: string) { return request<VehicleFitnessDetail[]>(`/vehicle/${vehicleId}/compliance/fitness`, { token }); }
export function getFitness(token: string, vehicleId: string, id: string) { return request<VehicleFitnessDetail>(`/vehicle/${vehicleId}/compliance/fitness/${id}`, { token }); }
export function createFitness(token: string, vehicleId: string, payload: Record<string, unknown>) { return request<VehicleFitnessDetail>(`/vehicle/${vehicleId}/compliance/fitness`, { method: 'POST', body: JSON.stringify(payload), token }); }
export function updateFitness(token: string, vehicleId: string, id: string, payload: Record<string, unknown>) { return request<VehicleFitnessDetail>(`/vehicle/${vehicleId}/compliance/fitness/${id}`, { method: 'PUT', body: JSON.stringify(payload), token }); }

export function listPuc(token: string, vehicleId: string) { return request<VehiclePucDetail[]>(`/vehicle/${vehicleId}/compliance/puc`, { token }); }
export function getPuc(token: string, vehicleId: string, id: string) { return request<VehiclePucDetail>(`/vehicle/${vehicleId}/compliance/puc/${id}`, { token }); }
export function createPuc(token: string, vehicleId: string, payload: Record<string, unknown>) { return request<VehiclePucDetail>(`/vehicle/${vehicleId}/compliance/puc`, { method: 'POST', body: JSON.stringify(payload), token }); }
export function updatePuc(token: string, vehicleId: string, id: string, payload: Record<string, unknown>) { return request<VehiclePucDetail>(`/vehicle/${vehicleId}/compliance/puc/${id}`, { method: 'PUT', body: JSON.stringify(payload), token }); }

export function listRoadTax(token: string, vehicleId: string) { return request<VehicleRoadTaxDetail[]>(`/vehicle/${vehicleId}/compliance/road-tax`, { token }); }
export function getRoadTax(token: string, vehicleId: string, id: string) { return request<VehicleRoadTaxDetail>(`/vehicle/${vehicleId}/compliance/road-tax/${id}`, { token }); }
export function createRoadTax(token: string, vehicleId: string, payload: Record<string, unknown>) { return request<VehicleRoadTaxDetail>(`/vehicle/${vehicleId}/compliance/road-tax`, { method: 'POST', body: JSON.stringify(payload), token }); }
export function updateRoadTax(token: string, vehicleId: string, id: string, payload: Record<string, unknown>) { return request<VehicleRoadTaxDetail>(`/vehicle/${vehicleId}/compliance/road-tax/${id}`, { method: 'PUT', body: JSON.stringify(payload), token }); }

export function getFastag(token: string, vehicleId: string) { return request<VehicleFastagDetail | null>(`/vehicle/${vehicleId}/compliance/fastag`, { token }); }
export function upsertFastag(token: string, vehicleId: string, payload: Record<string, unknown>) { return request<VehicleFastagDetail>(`/vehicle/${vehicleId}/compliance/fastag`, { method: 'PUT', body: JSON.stringify(payload), token }); }

export function getGpsDevice(token: string, vehicleId: string) { return request<VehicleGpsDeviceDetail | null>(`/vehicle/${vehicleId}/compliance/gps-device`, { token }); }
export function upsertGpsDevice(token: string, vehicleId: string, payload: Record<string, unknown>) { return request<VehicleGpsDeviceDetail>(`/vehicle/${vehicleId}/compliance/gps-device`, { method: 'PUT', body: JSON.stringify(payload), token }); }

type ComplianceDocQuery = { vehicleId?: string; complianceType?: string; status?: string; expiringWithinDays?: number; page?: number; limit?: number };
export function listComplianceDocuments(token: string, params?: ComplianceDocQuery) {
  const q = workflowQuery(params);
  return request<PaginatedResponse<VehicleComplianceDocument>>(`/compliance/documents${q ? `?${q}` : ''}`, { token });
}
export function getComplianceDocument(token: string, id: string) { return request<VehicleComplianceDocument>(`/compliance/documents/${id}`, { token }); }
export function createComplianceDocument(token: string, vehicleId: string, payload: Record<string, unknown>) { return request<VehicleComplianceDocument>(`/vehicle/${vehicleId}/compliance/documents`, { method: 'POST', body: JSON.stringify(payload), token }); }
export function updateComplianceDocument(token: string, id: string, payload: Record<string, unknown>) { return request<VehicleComplianceDocument>(`/compliance/documents/${id}`, { method: 'PUT', body: JSON.stringify(payload), token }); }
export function verifyComplianceDocument(token: string, id: string, status: string, notes?: string) { return request<VehicleComplianceDocument>(`/compliance/documents/${id}/verify`, { method: 'PUT', body: JSON.stringify({ status, notes }), token }); }

type HistoryQuery = { complianceType?: string; action?: string; page?: number; limit?: number };
export function listComplianceHistory(token: string, vehicleId: string, params?: HistoryQuery) {
  const q = workflowQuery(params);
  return request<PaginatedResponse<VehicleComplianceHistory>>(`/vehicle/${vehicleId}/compliance/history${q ? `?${q}` : ''}`, { token });
}

// Finance API
export function getFinanceAccounts(token: string, params?: WorkflowQuery) { const q = workflowQuery(params); return request<PaginatedResponse<FinanceAccount>>(`/finance/accounts${q ? `?${q}` : ''}`, { token }); }
export function getFinanceAccount(token: string, id: string) { return request<FinanceAccount>(`/finance/accounts/${id}`, { token }); }
export function createFinanceAccount(token: string, data: Record<string, unknown>) { return request<FinanceAccount>('/finance/accounts', { method: 'POST', body: JSON.stringify(data), token }); }
export function updateFinanceAccount(token: string, id: string, data: Record<string, unknown>) { return request<FinanceAccount>(`/finance/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data), token }); }
export function deleteFinanceAccount(token: string, id: string) { return request<null>(`/finance/accounts/${id}`, { method: 'DELETE', token }); }

export function getFinanceCategories(token: string, params?: WorkflowQuery) { const q = workflowQuery(params); return request<PaginatedResponse<FinanceCategory>>(`/finance/categories${q ? `?${q}` : ''}`, { token }); }
export function getFinanceCategory(token: string, id: string) { return request<FinanceCategory>(`/finance/categories/${id}`, { token }); }
export function createFinanceCategory(token: string, data: Record<string, unknown>) { return request<FinanceCategory>('/finance/categories', { method: 'POST', body: JSON.stringify(data), token }); }
export function deleteFinanceCategory(token: string, id: string) { return request<null>(`/finance/categories/${id}`, { method: 'DELETE', token }); }

export function getVendors(token: string, params?: WorkflowQuery) { const q = workflowQuery(params); return request<PaginatedResponse<Vendor>>(`/finance/vendors${q ? `?${q}` : ''}`, { token }); }
export function getVendor(token: string, id: string) { return request<Vendor>(`/finance/vendors/${id}`, { token }); }
export function createVendor(token: string, data: Record<string, unknown>) { return request<Vendor>('/finance/vendors', { method: 'POST', body: JSON.stringify(data), token }); }
export function updateVendor(token: string, id: string, data: Record<string, unknown>) { return request<Vendor>(`/finance/vendors/${id}`, { method: 'PUT', body: JSON.stringify(data), token }); }
export function deleteVendor(token: string, id: string) { return request<null>(`/finance/vendors/${id}`, { method: 'DELETE', token }); }

export function getFinanceCustomers(token: string, params?: WorkflowQuery) { const q = workflowQuery(params); return request<PaginatedResponse<Customer>>(`/finance/customers${q ? `?${q}` : ''}`, { token }); }
export function getFinanceCustomer(token: string, id: string) { return request<Customer>(`/finance/customers/${id}`, { token }); }
export function createFinanceCustomer(token: string, data: Record<string, unknown>) { return request<Customer>('/finance/customers', { method: 'POST', body: JSON.stringify(data), token }); }
export function updateFinanceCustomer(token: string, id: string, data: Record<string, unknown>) { return request<Customer>(`/finance/customers/${id}`, { method: 'PUT', body: JSON.stringify(data), token }); }
export function deleteFinanceCustomer(token: string, id: string) { return request<null>(`/finance/customers/${id}`, { method: 'DELETE', token }); }

export function getTripBillings(token: string, params?: WorkflowQuery) { const q = workflowQuery(params); return request<PaginatedResponse<TripBilling>>(`/finance/trip-billings${q ? `?${q}` : ''}`, { token }); }
export function getTripBilling(token: string, id: string) { return request<TripBilling>(`/finance/trip-billings/${id}`, { token }); }
export function createTripBilling(token: string, data: Record<string, unknown>) { return request<TripBilling>('/finance/trip-billings', { method: 'POST', body: JSON.stringify(data), token }); }
export function updateTripBilling(token: string, id: string, data: Record<string, unknown>) { return request<TripBilling>(`/finance/trip-billings/${id}`, { method: 'PUT', body: JSON.stringify(data), token }); }
export function deleteTripBilling(token: string, id: string) { return request<null>(`/finance/trip-billings/${id}`, { method: 'DELETE', token }); }

export function getFinanceTransactions(token: string, params?: WorkflowQuery) { const q = workflowQuery(params); return request<PaginatedResponse<FinanceTransaction>>(`/finance/transactions${q ? `?${q}` : ''}`, { token }); }
export function getFinanceTransaction(token: string, id: string) { return request<FinanceTransaction>(`/finance/transactions/${id}`, { token }); }
export function createFinanceTransaction(token: string, data: Record<string, unknown>) { return request<FinanceTransaction>('/finance/transactions', { method: 'POST', body: JSON.stringify(data), token }); }
export function deleteFinanceTransaction(token: string, id: string) { return request<null>(`/finance/transactions/${id}`, { method: 'DELETE', token }); }

export function getPayments(token: string, params?: WorkflowQuery) { const q = workflowQuery(params); return request<PaginatedResponse<PaymentRecord>>(`/finance/payments${q ? `?${q}` : ''}`, { token }); }
export function getPayment(token: string, id: string) { return request<PaymentRecord>(`/finance/payments/${id}`, { token }); }
export function createPayment(token: string, data: Record<string, unknown>) { return request<PaymentRecord>('/finance/payments', { method: 'POST', body: JSON.stringify(data), token }); }
export function deletePayment(token: string, id: string) { return request<null>(`/finance/payments/${id}`, { method: 'DELETE', token }); }

export function getFinanceDashboardSummary(token: string) { return request<FinanceDashboardSummary>('/finance/dashboard-summary', { token }); }
export function getFinancePnl(token: string, params?: WorkflowQuery) { const q = workflowQuery(params); return request<PnlSummary>(`/finance/pnl${q ? `?${q}` : ''}`, { token }); }
