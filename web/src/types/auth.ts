export interface RoleRecord {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  permissions: PermissionRecord[];
  _count?: { users: number };
}

export interface PermissionRecord {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  module: string;
  action: string;
  isSystem: boolean;
}

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  name: string;
  mobile?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  lastLoginAt?: string | null;
  roleId: string;
  role: { id: string; name: string; key: string };
  dataScopes?: UserDataScopeRecord[];
  permissionOverrides?: UserPermissionOverrideRecord[];
}

export interface AuthPayload {
  user: UserRecord;
  accessToken: string;
  refreshToken: string;
  permissions: string[];
  effectivePermissions?: string[];
  rolePermissions?: string[];
  userAllowedPermissions?: string[];
  userDeniedPermissions?: string[];
  dataScopes?: UserDataScopeRecord[];
}

export type VehicleStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE' | 'ON_TRIP';
export interface VehicleRecord {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  fuelType: string;
  chassisNumber?: string | null;
  engineNumber?: string | null;
  rcNumber?: string | null;
  insuranceExpiry?: string | null;
  fitnessExpiry?: string | null;
  pollutionExpiry?: string | null;
  permitExpiry?: string | null;
  currentOdometer: number;
  status: VehicleStatus;
  currentDriverId?: string | null;
  currentDriver?: DriverRecord | null;
}

export type DriverStatus = 'AVAILABLE' | 'ON_TRIP' | 'INACTIVE';
export interface DriverRecord {
  id: string;
  name: string;
  mobile: string;
  alternateMobile?: string | null;
  licenseNumber: string;
  licenseExpiry?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  experienceYears?: number | null;
  status: DriverStatus;
}

export interface AssetCategoryRecord {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'RETIRED' | 'LOST';
export interface AssetRecord {
  id: string;
  assetCode: string;
  name: string;
  assetCategoryId: string;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  purchaseAmount?: number | null;
  currentStatus: AssetStatus;
  notes?: string | null;
  assetCategory?: AssetCategoryRecord;
  assignments?: AssetAssignmentRecord[];
}

export type AssetHolderType = 'DRIVER' | 'VEHICLE' | 'EMPLOYEE' | 'DEPARTMENT' | 'OTHER';
export interface AssetAssignmentRecord {
  id: string;
  assetId: string;
  assignedToType: AssetHolderType;
  assignedToId: string;
  assignedById?: string | null;
  assignedAt: string;
  returnedAt?: string | null;
  status: 'ACTIVE' | 'RETURNED' | 'LOST';
  notes?: string | null;
  asset?: AssetRecord;
}

export interface AssetHistoryRecord {
  id: string;
  assetId: string;
  action: string;
  fromHolderType?: string | null;
  fromHolderId?: string | null;
  toHolderType?: string | null;
  toHolderId?: string | null;
  remarks?: string | null;
  proofUrl?: string | null;
  createdAt: string;
}

export type TripStatus = 'DRAFT' | 'SCHEDULED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
export interface TripRecord {
  id: string;
  tripNumber: string;
  tripType: string;
  status: TripStatus;
  vehicleId: string;
  driverId?: string | null;
  assistantDriverId?: string | null;
  originName: string;
  originAddress?: string | null;
  destinationName: string;
  destinationAddress?: string | null;
  plannedStartAt?: string | null;
  actualStartAt?: string | null;
  plannedEndAt?: string | null;
  actualEndAt?: string | null;
  startOdometer?: number | null;
  endOdometer?: number | null;
  distanceKm?: number | null;
  purpose?: string | null;
  notes?: string | null;
  vehicle?: VehicleRecord;
  driver?: DriverRecord | null;
}

export interface TripHistoryRecord {
  id: string;
  tripId: string;
  action: string;
  fromStatus?: TripStatus | null;
  toStatus?: TripStatus | null;
  remarks?: string | null;
  createdAt: string;
}

export interface FuelRecord {
  id: string;
  vehicleId: string;
  tripId?: string | null;
  driverId?: string | null;
  fuelDate: string;
  odometerReading?: number | null;
  fuelType: string;
  quantityLiters?: number | null;
  pricePerLiter?: number | null;
  totalAmount: number;
  stationName?: string | null;
  receiptNumber?: string | null;
  paymentMode?: string | null;
  notes?: string | null;
  status: string;
}

export interface ExpenseRecord {
  id: string;
  vehicleId: string;
  tripId?: string | null;
  driverId?: string | null;
  category: string;
  expenseDate: string;
  amount: number;
  vendor?: string | null;
  receiptNumber?: string | null;
  notes?: string | null;
  status: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  tripId?: string | null;
  driverId?: string | null;
  requestDate: string;
  priority: string;
  category: string;
  description: string;
  estimatedCost?: number | null;
  actualCost?: number | null;
  scheduledDate?: string | null;
  completedDate?: string | null;
  notes?: string | null;
  status: string;
}

export interface RepairRecord {
  id: string;
  vehicleId: string;
  tripId?: string | null;
  driverId?: string | null;
  repairDate: string;
  category: string;
  description: string;
  estimatedCost?: number | null;
  actualCost?: number | null;
  provider?: string | null;
  invoiceNumber?: string | null;
  notes?: string | null;
  status: string;
}

export interface DocumentRecord {
  id: string;
  documentNumber?: string | null;
  title: string;
  description?: string | null;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  documentType: string;
  documentCategory: string;
  verificationStatus: string;
  reviewComments?: string | null;
  fileUrl?: string | null;
  createdAt: string;
}

export type PaginatedResponse<T> = {
  items: T[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
};

export interface ReceiptExtractionResult {
  extractedText: string;
  confidence: number;
  fields: Record<string, unknown>;
}

export interface MyAccessSummary {
  rolePermissions: string[];
  userAllowedPermissions: string[];
  userDeniedPermissions: string[];
  effectivePermissions: string[];
  dataScopes: UserDataScopeRecord[];
}

export interface EffectivePermissionsResponse {
  rolePermissions: string[];
  userAllowedPermissions: string[];
  userDeniedPermissions: string[];
  effectivePermissions: string[];
}

export interface UserDataScopeRecord {
  id: string;
  userId: string;
  scopeType: string;
  scopeId: string;
  createdAt: string;
}

export interface UserPermissionOverrideRecord {
  id: string;
  userId: string;
  permissionKey: string;
  effect: 'ALLOW' | 'DENY';
  reason?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface UserAccessSummaryRecord {
  userId: string;
  username: string;
  name: string;
  roleKey: string;
  effectivePermissionsCount: number;
  dataScopesCount: number;
  overridesCount: number;
}

export interface UserActivityRecord {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
}

export interface ProfileLinkRecord {
  id: string;
  userId: string;
  profileType: string;
  profileId: string;
  isPrimary: boolean;
  status: string;
  linkedAt: string;
  user?: { id: string; name: string; email: string };
}

export interface DriverPortalProfile {
  driver: DriverRecord;
  user: UserRecord;
}

export interface DriverPortalTrip extends TripRecord {
  vehicle: VehicleRecord;
}

export interface DriverPortalVehicle extends VehicleRecord {}
export interface DriverPortalDocument extends DocumentRecord {}
export interface DriverPortalFuelEntry extends FuelRecord {}
export interface DriverPortalExpense extends ExpenseRecord {}

export type ComplianceType = 'RC' | 'INSURANCE' | 'PERMIT' | 'FITNESS' | 'PUC' | 'ROAD_TAX' | 'FASTAG' | 'GPS_DEVICE' | 'OTHER';
export type ComplianceDocStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'RENEWED' | 'REJECTED';
export type ComplianceHistoryAction = 'CREATED' | 'UPDATED' | 'VERIFIED' | 'REJECTED' | 'RENEWED' | 'EXPIRED' | 'DELETED';

export interface VehicleRegistrationDetail {
  id: string;
  vehicleId: string;
  registrationNumber?: string | null;
  registrationDate?: string | null;
  ownerName?: string | null;
  rtoCode?: string | null;
  rtoName?: string | null;
  vehicleClass?: string | null;
  transportCategory?: string | null;
  bodyType?: string | null;
  seatingCapacity?: number | null;
  grossVehicleWeight?: number | null;
  unladenWeight?: number | null;
  hypothecationName?: string | null;
  hypothecationType?: string | null;
  status: string;
}

export interface VehicleInsuranceDetail {
  id: string;
  vehicleId: string;
  policyNumber: string;
  insurerName: string;
  policyType: string;
  validFrom: string;
  validTo: string;
  premiumAmount?: number | null;
  idvAmount?: number | null;
  status: ComplianceDocStatus;
}

export interface VehiclePermitDetail {
  id: string;
  vehicleId: string;
  permitNumber: string;
  permitType: string;
  validFrom: string;
  validTo: string;
  status: ComplianceDocStatus;
}

export interface VehicleFitnessDetail {
  id: string;
  vehicleId: string;
  certificateNumber: string;
  inspectionDate: string;
  validFrom: string;
  validTo: string;
  status: ComplianceDocStatus;
}

export interface VehiclePucDetail {
  id: string;
  vehicleId: string;
  certificateNumber: string;
  emissionNorm: string;
  validFrom: string;
  validTo: string;
  status: ComplianceDocStatus;
}

export interface VehicleRoadTaxDetail {
  id: string;
  vehicleId: string;
  taxReceiptNumber: string;
  taxType: string;
  paidFrom: string;
  paidTo: string;
  amount?: number | null;
  status: ComplianceDocStatus;
}

export interface VehicleFastagDetail {
  id: string;
  vehicleId: string;
  fastagId: string;
  issuerBank?: string | null;
  status: string;
}

export interface VehicleGpsDeviceDetail {
  id: string;
  vehicleId: string;
  deviceId: string;
  imei?: string | null;
  status: string;
}

export interface VehicleComplianceDocument {
  id: string;
  vehicleId: string;
  complianceType: ComplianceType;
  documentNumber?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  externalFileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  status: ComplianceDocStatus;
  notes: string | null;
  verifiedById: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  verifiedBy: { id: string; name: string } | null;
  vehicle: { id: string; vehicleNumber: string };
}

export interface VehicleComplianceHistory {
  id: string;
  vehicleId: string;
  complianceType: ComplianceType;
  entityType: string;
  entityId: string | null;
  action: ComplianceHistoryAction;
  fromStatus: string | null;
  toStatus: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  remarks: string | null;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
}

export type ComplianceDashboard = {
  expired: number;
  expiring7Days: number;
  expiring30Days: number;
  pendingVerification: number;
  totalDocuments: number;
};

export interface FinanceAccount {
  id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'WALLET' | 'CREDIT' | 'OTHER';
  accountNumberMasked?: string | null;
  bankName?: string | null;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  module: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  vendorCode?: string | null;
  name: string;
  legalName?: string | null;
  tradeName?: string | null;
  vendorType: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  pan?: string | null;
  state?: string | null;
  stateCode?: string | null;
  pincode?: string | null;
  contactPersonName?: string | null;
  contactPersonPhone?: string | null;
  paymentTermsDays?: number | null;
  bankAccountMasked?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  customerCode?: string | null;
  name: string;
  legalName?: string | null;
  tradeName?: string | null;
  customerType?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  pan?: string | null;
  state?: string | null;
  stateCode?: string | null;
  pincode?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  contactPersonName?: string | null;
  contactPersonPhone?: string | null;
  paymentTermsDays?: number | null;
  creditLimit?: number | null;
  isGstRegistered: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TripBilling {
  id: string;
  tripId: string;
  customerId?: string | null;
  vehicleId?: string | null;
  driverId?: string | null;
  invoiceNumber?: string | null;
  invoiceDate: string;
  lrNumber?: string | null;
  challanNumber?: string | null;
  ewayBillNumber?: string | null;
  customerPoNumber?: string | null;
  placeOfSupplyState?: string | null;
  originState?: string | null;
  destinationState?: string | null;
  freightAmount: number;
  loadingCharges: number;
  unloadingCharges: number;
  detentionCharges: number;
  tollCharges: number;
  permitCharges: number;
  otherCharges: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  tdsAmount: number;
  netReceivable: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'UNBILLED' | 'BILLED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  trip?: TripRecord | null;
  customer?: Customer | null;
  vehicle?: VehicleRecord | null;
  driver?: DriverRecord | null;
}

export interface FinanceTransaction {
  id: string;
  transactionNumber: string;
  transactionType: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ADJUSTMENT';
  sourceModule: string;
  sourceId?: string | null;
  vehicleId?: string | null;
  tripId?: string | null;
  driverId?: string | null;
  vendorId?: string | null;
  customerId?: string | null;
  accountId?: string | null;
  categoryId?: string | null;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  transactionDate: string;
  paymentMode: string;
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL' | 'FAILED' | 'CANCELLED';
  referenceNumber?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  vendor?: Vendor | null;
  customer?: Customer | null;
}

export interface PaymentRecord {
  id: string;
  paymentNumber?: string | null;
  transactionId?: string | null;
  tripBillingId?: string | null;
  accountId?: string | null;
  vendorId?: string | null;
  customerId?: string | null;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  upiReference?: string | null;
  bankUtrNumber?: string | null;
  chequeNumber?: string | null;
  chequeDate?: string | null;
  collectedByDriverId?: string | null;
  reconciledStatus?: string | null;
  reconciledAt?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  account?: FinanceAccount | null;
  vendor?: Vendor | null;
  customer?: Customer | null;
  tripBilling?: TripBilling | null;
}

export interface FinanceDashboardSummary {
  currentMonthIncome: number;
  currentMonthExpenses: number;
  pendingPayments: number;
  overduePayments: number;
  totalReceivable: number;
  totalPayable: number;
  recentTransactions: FinanceTransaction[];
}

export type DashboardOverview = {
  totalVehicles: number;
  activeVehicles: number;
  inactiveVehicles: number;
  driversCount: number;
  activeTrips: number;
  completedTripsThisMonth: number;
  pendingTrips: number;
  fuelCostThisMonth: number;
  expensesThisMonth: number;
  maintenanceOpen: number;
  repairsOpen: number;
  complianceExpired: number;
  complianceExpiring7: number;
  complianceExpiring30: number;
  recentTrips: Array<{
    id: string;
    tripType: string;
    status: string;
    originName: string;
    destinationName: string;
    createdAt: string;
  }>;
  recentFuel: Array<{
    id: string;
    vehicleId: string;
    quantityLiters: number;
    totalAmount: number;
    fuelDate: string;
  }>;
};
