export type AuthUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  mobile: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  role: {
    id: string;
    name: string;
    key: string;
    status: 'ACTIVE' | 'INACTIVE';
  };
};

export type AuthState = {
  user: AuthUser | null;
  permissions: string[];
  accessToken: string | null;
  refreshToken: string | null;
};

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  permissions: string[];
};

export type RoleRecord = {
  id: string;
  name: string;
  key: string;
  description: string | null;
  isSystem: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  rolePermissions: Array<{
    permission: PermissionRecord;
  }>;
};

export type PermissionRecord = {
  id: string;
  key: string;
  module: string;
  action: string;
  description: string | null;
};

export type UserRecord = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  mobile: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: {
    id: string;
    name: string;
    key: string;
    status: 'ACTIVE' | 'INACTIVE';
  };
};

export type VehicleRecord = {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  fuelType: string;
  chassisNumber: string | null;
  engineNumber: string | null;
  rcNumber: string | null;
  insuranceExpiry: string | null;
  fitnessExpiry: string | null;
  pollutionExpiry: string | null;
  permitExpiry: string | null;
  currentOdometer: number;
  status: 'AVAILABLE' | 'ON_TRIP' | 'UNDER_MAINTENANCE' | 'UNDER_REPAIR' | 'INACTIVE' | 'SOLD' | 'ACCIDENT';
  currentDriverId: string | null;
  currentDriver: { id: string; name: string; mobile: string; status: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type DriverRecord = {
  id: string;
  name: string;
  mobile: string;
  alternateMobile: string | null;
  licenseNumber: string;
  licenseExpiry: string | null;
  address: string | null;
  emergencyContact: string | null;
  experienceYears: number | null;
  status: 'AVAILABLE' | 'ON_TRIP' | 'ON_LEAVE' | 'SUSPENDED' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
};

export type AssetCategoryRecord = {
  id: string;
  name: string;
  key: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  _count?: { assets: number };
  createdAt: string;
  updatedAt: string;
};

export type AssetRecord = {
  id: string;
  assetCode: string;
  name: string;
  assetCategoryId: string;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchaseAmount: number | null;
  currentStatus: 'AVAILABLE' | 'ASSIGNED' | 'DAMAGED' | 'LOST' | 'UNDER_REPAIR' | 'RETIRED';
  notes: string | null;
  assetCategory: AssetCategoryRecord;
  currentAssignment?: AssetAssignmentRecord | null;
  createdAt: string;
  updatedAt: string;
};

export type AssetHolderType = 'VEHICLE' | 'DRIVER' | 'USER';

export type AssetHolderSummary = {
  type: AssetHolderType;
  id: string;
  label: string;
  secondary: string | null;
};

export type AssetAssignmentRecord = {
  id: string;
  assetId: string;
  assignedToType: AssetHolderType;
  assignedToId: string;
  assignedById: string | null;
  assignedAt: string;
  returnedAt: string | null;
  status: 'ACTIVE' | 'RETURNED' | 'TRANSFERRED' | 'DAMAGED' | 'LOST';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  assignedBy: {
    id: string;
    name: string;
    email: string;
    username: string | null;
  } | null;
  holder: AssetHolderSummary;
};

export type AssetHistoryRecord = {
  id: string;
  assetId: string;
  action: 'CREATED' | 'UPDATED' | 'ASSIGNED' | 'RETURNED' | 'TRANSFERRED' | 'DAMAGED' | 'LOST' | 'REPAIRED' | 'RETIRED';
  fromHolderType: AssetHolderType | null;
  fromHolderId: string | null;
  toHolderType: AssetHolderType | null;
  toHolderId: string | null;
  remarks: string | null;
  proofUrl: string | null;
  createdById: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    username: string | null;
  } | null;
  fromHolder: AssetHolderSummary | null;
  toHolder: AssetHolderSummary | null;
};

export type DocumentRecord = {
  id: string;
  entityType: 'VEHICLE' | 'DRIVER' | 'ASSET';
  entityId: string;
  documentType: string;
  documentNumber: string | null;
  expiryDate: string | null;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TripRecord = {
  id: string;
  tripNumber: string;
  tripType: 'TRANSFER' | 'DELIVERY' | 'PICKUP' | 'SERVICE' | 'INTERNAL';
  status: 'DRAFT' | 'SCHEDULED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
  vehicleId: string;
  driverId: string | null;
  assistantDriverId: string | null;
  originName: string;
  originAddress: string | null;
  destinationName: string;
  destinationAddress: string | null;
  plannedStartAt: string | null;
  actualStartAt: string | null;
  plannedEndAt: string | null;
  actualEndAt: string | null;
  startOdometer: number | null;
  endOdometer: number | null;
  distanceKm: number | null;
  purpose: string | null;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle: { id: string; vehicleNumber: string; vehicleType: string; status: string };
  driver: { id: string; name: string; mobile: string; status: string } | null;
  assistantDriver: { id: string; name: string; mobile: string; status: string } | null;
  createdBy: { id: string; name: string; email: string; username: string | null } | null;
};

export type TripHistoryRecord = {
  id: string;
  tripId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  remarks: string | null;
  metadata: Record<string, unknown> | null;
  createdById: string | null;
  createdAt: string;
  createdBy: { id: string; name: string; email: string; username: string | null } | null;
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type WorkflowStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type WorkflowRelated = {
  id: string;
  vehicleId: string;
  tripId: string | null;
  driverId: string | null;
  status: WorkflowStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle: { id: string; vehicleNumber: string; vehicleType: string };
  trip: { id: string; tripNumber: string; vehicleId: string } | null;
  driver: { id: string; name: string; status: string } | null;
};
export type FuelRecord = WorkflowRelated & {
  fuelDate: string;
  odometerReading: number | null;
  fuelType: string;
  quantityLiters: number;
  pricePerLiter: number;
  totalAmount: number;
  stationName: string | null;
  receiptNumber: string | null;
};
export type ExpenseRecord = WorkflowRelated & {
  category: string;
  expenseDate: string;
  amount: number;
  vendor: string | null;
  receiptNumber: string | null;
};
