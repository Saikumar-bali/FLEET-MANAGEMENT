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
  effectivePermissions: string[];
  rolePermissions: string[];
  userAllowedPermissions: string[];
  userDeniedPermissions: string[];
  dataScopes: Array<{
    id: string;
    scopeType: string;
    scopeId: string | null;
    accessLevel: string;
    expiresAt: string | null;
  }>;
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

export type AssetRecord = any;
export type AssetHolderType = 'VEHICLE' | 'DRIVER' | 'USER';
export type AssetHolderSummary = { type: AssetHolderType; id: string; label: string; secondary: string | null };
export type AssetAssignmentRecord = any;
export type AssetHistoryRecord = any;
export type DocumentRecord = any;
export type TripRecord = any;
export type TripHistoryRecord = any;
export type PaginatedResponse<T> = { items: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
export type WorkflowStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type WorkflowRelated = any;
export type FuelRecord = any;
export type ExpenseRecord = any;
export type MaintenanceRecord = any;
export type RepairRecord = any;
export type InsurancePolicyType = any;
export type PermitType = any;
export type EmissionNorm = any;
export type RoadTaxType = any;
export type FastagStatus = any;
export type GpsDeviceStatus = any;
export type ComplianceType = any;
export type ComplianceDocStatus = any;
export type ComplianceHistoryAction = any;
export type VehicleRegistrationDetail = any;
export type VehicleInsuranceDetail = any;
export type VehiclePermitDetail = any;
export type VehicleFitnessDetail = any;
export type VehiclePucDetail = any;
export type VehicleRoadTaxDetail = any;
export type VehicleFastagDetail = any;
export type VehicleGpsDeviceDetail = any;
export type VehicleComplianceDocument = any;
export type VehicleComplianceHistory = any;
export type ComplianceDashboard = any;
export interface FinanceAccount { id: string; [key: string]: any }
export interface FinanceCategory { id: string; [key: string]: any }
export interface Vendor { id: string; [key: string]: any }
export interface Customer { id: string; [key: string]: any }
export interface TripBilling { id: string; [key: string]: any }
export interface FinanceTransaction { id: string; [key: string]: any }
export interface PaymentRecord { id: string; [key: string]: any }
export interface FinanceDashboardSummary { [key: string]: any }
export type DashboardOverview = any;
export interface PnlSummary { [key: string]: any }
export type EffectivePermissionsResponse = any;
export type UserPermissionOverrideRecord = any;
export type UserDataScopeRecord = any;
export type UserActivityRecord = any;
export type UserAccessSummaryRecord = any;
export type ProfileLinkRecord = any;
export type MyAccessSummary = any;

export type DriverPortalProfile = {
  id: string;
  name: string;
  mobile: string;
  alternateMobile: string | null;
  licenseNumber: string;
  licenseExpiry: string | null;
  address: string | null;
  emergencyContact: string | null;
  experienceYears: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type DriverPortalTrip = {
  id: string;
  tripNumber: string;
  tripType: string;
  status: string;
  currentAssignmentStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REASSIGNED' | 'CANCELLED' | null;
  vehicleId: string;
  driverId: string;
  originName: string;
  destinationName: string;
  plannedStartAt: string | null;
  actualStartAt: string | null;
  plannedEndAt: string | null;
  actualEndAt: string | null;
  distanceKm: number | null;
  createdAt: string;
  vehicle: { id: string; vehicleNumber: string; vehicleType: string };
  driver: { id: string; name: string; mobile: string } | null;
};

export type DriverPortalVehicle = any;
export type DriverPortalDocument = any;
export type DriverPortalFuelEntry = any;
export type ReceiptExtractedField = any;
export type ReceiptExtractionResult = any;
export type DriverPortalExpense = any;
