export type AuthUser = {
  id: string;
  name: string;
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
  createdAt: string;
  updatedAt: string;
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

export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
