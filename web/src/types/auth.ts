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
  documentNumber: string | null;
  title: string;
  description: string | null;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileExtension: string | null;
  storageProvider: string;
  storageBucket: string | null;
  storageKey: string;
  checksumSha256: string | null;
  documentType: string;
  documentCategory: string;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  vehicleId: string | null;
  driverId: string | null;
  tripId: string | null;
  customerId: string | null;
  vendorId: string | null;
  financeTransactionId: string | null;
  tripBillingId: string | null;
  maintenanceRequestId: string | null;
  repairId: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  documentStatus: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  tags: string[];
  metadata: Record<string, unknown> | null;
  uploadedById: string;
  verifiedById: string | null;
  verifiedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy: { id: string; name: string; email: string } | null;
  verifiedBy: { id: string; name: string } | null;
  vehicle: { id: string; vehicleNumber: string } | null;
  driver: { id: string; name: string } | null;
  trip: { id: string; tripNumber: string } | null;
  customer: { id: string; name: string } | null;
  vendor: { id: string; name: string } | null;
  fileUrl?: string | null;
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
  entryMode: 'QUICK_AMOUNT' | 'FULL_DETAILS' | 'RECEIPT_ASSISTED';
  quantityLiters: number | null;
  pricePerLiter: number | null;
  totalAmount: number;
  stationName: string | null;
  receiptNumber: string | null;
  paymentMode: string | null;
  extractionStatus: string;
  extractionConfidence: number | null;
  documents?: Array<{ id: string; title: string; documentType: string; originalFileName: string }>;
};
export type ExpenseRecord = WorkflowRelated & {
  category: string;
  expenseDate: string;
  amount: number;
  vendor: string | null;
  receiptNumber: string | null;
};
export type MaintenanceRecord = WorkflowRelated & {
  requestDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  description: string;
  estimatedCost: number | null;
  actualCost: number | null;
  scheduledDate: string | null;
  completedDate: string | null;
};
export type RepairRecord = {
  id: string;
  vehicleId: string;
  tripId: string | null;
  driverId: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle: { id: string; vehicleNumber: string; vehicleType: string };
  trip: { id: string; tripNumber: string; vehicleId: string } | null;
  driver: { id: string; name: string; status: string } | null;
  createdBy: { id: string; name: string; username: string } | null;
  closedBy: { id: string; name: string; username: string } | null;
  repairDate: string;
  category: string;
  description: string;
  estimatedCost: number | null;
  actualCost: number | null;
  provider: string | null;
  invoiceNumber: string | null;
  closedById: string | null;
  closedAt: string | null;
};

// ─── Phase 6.1: India Vehicle Compliance Types ───

export type InsurancePolicyType = 'COMPREHENSIVE' | 'THIRD_PARTY' | 'OWN_DAMAGE' | 'BUNDLED';
export type PermitType = 'NATIONAL_PERMIT' | 'STATE_PERMIT' | 'TEMPORARY_PERMIT' | 'FLEET_PERMIT' | 'LOCAL_PERMIT';
export type EmissionNorm = 'BS4' | 'BS6' | 'BS3' | 'PRE_BS3';
export type RoadTaxType = 'LIFETIME' | 'ANNUAL' | 'QUARTERLY';
export type FastagStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'LOST' | 'EXPIRED';
export type GpsDeviceStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'FAULTY' | 'REMOVED';
export type ComplianceType = 'RC' | 'INSURANCE' | 'PERMIT' | 'FITNESS' | 'PUC' | 'ROAD_TAX' | 'FASTAG' | 'GPS_AIS140' | 'HYPOTHECATION' | 'OTHER';
export type ComplianceDocStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED' | 'PENDING' | 'DRAFT' | 'VERIFIED' | 'REJECTED';
export type ComplianceHistoryAction = 'CREATED' | 'UPDATED' | 'RENEWED' | 'VERIFIED' | 'STATUS_CHANGED' | 'DOCUMENT_UPLOADED';

export type VehicleRegistrationDetail = {
  id: string;
  vehicleId: string;
  registrationNumber: string | null;
  registrationDate: string | null;
  ownerName: string | null;
  rtoCode: string | null;
  rtoName: string | null;
  vehicleClass: string | null;
  transportCategory: string | null;
  bodyType: string | null;
  seatingCapacity: number | null;
  grossVehicleWeight: number | null;
  unladenWeight: number | null;
  hypothecationName: string | null;
  hypothecationType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VehicleInsuranceDetail = {
  id: string;
  vehicleId: string;
  policyNumber: string;
  insurerName: string;
  policyType: InsurancePolicyType;
  validFrom: string;
  validTo: string;
  premiumAmount: number | null;
  idvAmount: number | null;
  renewalReminderDays: number;
  status: ComplianceDocStatus;
  createdAt: string;
  updatedAt: string;
};

export type VehiclePermitDetail = {
  id: string;
  vehicleId: string;
  permitNumber: string;
  permitType: PermitType;
  issuingAuthority: string | null;
  coveredStates: string | null;
  coveredRoutes: string | null;
  validFrom: string;
  validTo: string;
  renewalReminderDays: number;
  status: ComplianceDocStatus;
  createdAt: string;
  updatedAt: string;
};

export type VehicleFitnessDetail = {
  id: string;
  vehicleId: string;
  certificateNumber: string;
  inspectionDate: string;
  validFrom: string;
  validTo: string;
  inspectionCenter: string | null;
  remarks: string | null;
  renewalReminderDays: number;
  status: ComplianceDocStatus;
  createdAt: string;
  updatedAt: string;
};

export type VehiclePucDetail = {
  id: string;
  vehicleId: string;
  certificateNumber: string;
  emissionNorm: EmissionNorm;
  testingCenter: string | null;
  validFrom: string;
  validTo: string;
  renewalReminderDays: number;
  status: ComplianceDocStatus;
  createdAt: string;
  updatedAt: string;
};

export type VehicleRoadTaxDetail = {
  id: string;
  vehicleId: string;
  taxReceiptNumber: string;
  taxType: RoadTaxType;
  paidFrom: string;
  paidTo: string;
  amount: number | null;
  issuingState: string | null;
  renewalReminderDays: number;
  status: ComplianceDocStatus;
  createdAt: string;
  updatedAt: string;
};

export type VehicleFastagDetail = {
  id: string;
  vehicleId: string;
  fastagId: string;
  issuerBank: string | null;
  linkedMobileMasked: string | null;
  status: FastagStatus;
  lastRechargeDate: string | null;
  lastKnownBalance: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VehicleGpsDeviceDetail = {
  id: string;
  vehicleId: string;
  deviceId: string;
  imei: string | null;
  simNumberMasked: string | null;
  vendorName: string | null;
  installedAt: string | null;
  ais140Certified: boolean;
  certificateNumber: string | null;
  status: GpsDeviceStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VehicleComplianceDocument = {
  id: string;
  vehicleId: string;
  complianceType: ComplianceType;
  documentNumber: string | null;
  validFrom: string | null;
  validTo: string | null;
  issuingAuthority: string | null;
  externalFileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  status: ComplianceDocStatus;
  notes: string | null;
  verifiedById: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  verifiedBy: { id: string; name: string } | null;
  vehicle: { id: string; vehicleNumber: string };
};

export type VehicleComplianceHistory = {
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
};

export type ComplianceDashboard = {
  expired: number;
  expiring7Days: number;
  expiring30Days: number;
  pendingVerification: number;
  totalDocuments: number;
};

// Finance Types
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
  financialPostedAt?: string | null;
  journalEntryId?: string | null;
  referenceNumber?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  vendor?: Vendor | null;
  customer?: Customer | null;
  driver?: DriverRecord | null;
}

export interface PaymentRecord {
  id: string;
  direction: 'INCOMING' | 'OUTGOING';
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
  reconciledById?: string | null;
  reversedAt?: string | null;
  reversalOfId?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt: string;
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
  recentExpenses: Array<{
    id: string;
    vehicleId: string;
    category: string;
    amount: number;
    notes: string | null;
    expenseDate: string;
  }>;
  totalDocuments: number;
  activeDocuments: number;
  archivedDocuments: number;
  unverifiedDocuments: number;
  rejectedDocuments: number;
  expiringDocuments30: number;
  expiredDocuments: number;
  storageUsageBytes: number;
  documentsByCategory: Array<{ category: string; count: number }>;
  recentDocuments: Array<{
    id: string;
    title: string;
    documentType: string;
    documentCategory: string;
    fileSizeBytes: number;
    documentStatus: string;
    verificationStatus: string;
    createdAt: string;
    uploadedBy: { name: string } | null;
  }>;
};

export interface PnlSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  breakdown: Array<{
    category: string;
    type: 'INCOME' | 'EXPENSE';
    total: number;
  }>;
}

// ─── Phase 2: User Access Management Types ───

export type EffectivePermissionsResponse = {
  rolePermissions: string[];
  userAllowedPermissions: string[];
  userDeniedPermissions: string[];
  effectivePermissions: string[];
  dataScopes: Array<{
    id: string;
    scopeType: string;
    scopeId: string | null;
    accessLevel: string;
    expiresAt: string | null;
  }>;
};

export type UserPermissionOverrideRecord = {
  id: string;
  userId: string;
  permissionId: string;
  effect: 'ALLOW' | 'DENY';
  reason: string | null;
  expiresAt: string | null;
  grantedById: string | null;
  createdAt: string;
  updatedAt: string;
  permission: PermissionRecord;
  grantedBy: { id: string; name: string } | null;
};

export type UserDataScopeRecord = {
  id: string;
  userId: string;
  scopeType: string;
  scopeId: string | null;
  accessLevel: string;
  reason: string | null;
  expiresAt: string | null;
  grantedById: string | null;
  createdAt: string;
  updatedAt: string;
  grantedBy: { id: string; name: string } | null;
};

export type UserActivityRecord = {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type UserAccessSummaryRecord = {
  userId: string;
  effectivePermissionsCount: number;
  dataScopesCount: number;
  overridesCount: number;
  recentActivityAction: string | null;
  recentActivityAt: string | null;
};

export type ProfileLinkRecord = {
  id: string;
  userId: string;
  profileType: string;
  profileId: string;
  isPrimary: boolean;
  status: string;
  linkedAt: string;
  linkedBy: { id: string; name: string; email: string } | null;
};

export type MyAccessSummary = {
  user: { id: string; name: string; email: string; username: string | null; status: string };
  role: { id: string; name: string; key: string };
  effectivePermissions: string[];
  rolePermissions: string[];
  userAllowedPermissions: string[];
  userDeniedPermissions: string[];
  dataScopes: UserDataScopeRecord[];
  recentActivity: UserActivityRecord[];
  profileLinks: ProfileLinkRecord[];
  primaryDriverProfile: { id: string; name: string; mobile: string; status: string } | null;
  profileTypes: string[];
};

// ─── Phase 17: Driver Portal Types ───

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

export type DriverPortalVehicle = {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  brand: string | null;
  model: string | null;
  status: string;
  currentDriverId: string | null;
  isCurrent: boolean;
  lastTripId: string | null;
  lastTripNumber: string | null;
  source: 'CURRENT_ASSIGNMENT' | 'TRIP_HISTORY';
};

export type DriverPortalDocument = {
  id: string;
  title: string;
  documentType: string;
  documentCategory: string;
  expiryDate: string | null;
  verificationStatus: string;
  createdAt: string;
};

export type DriverPortalFuelEntry = {
  id: string;
  vehicleId: string;
  driverId: string;
  fuelDate: string;
  fuelType: string;
  quantityLiters: number | null;
  totalAmount: number;
  status: string;
  createdAt: string;
  vehicle: { id: string; vehicleNumber: string };
};

export type ReceiptExtractedField = {
  value: string | number | null;
  confidence: number;
  source: string;
};

export type ReceiptExtractionResult = {
  extractedFields: {
    fuelStationName: ReceiptExtractedField;
    billNumber: ReceiptExtractedField;
    fuelDate: ReceiptExtractedField;
    totalAmount: ReceiptExtractedField;
    quantityLiters: ReceiptExtractedField;
    pricePerLiter: ReceiptExtractedField;
    vehicleNumber: ReceiptExtractedField;
    gstin: ReceiptExtractedField;
    paymentMode: ReceiptExtractedField;
  };
  overallConfidence: number;
  rawText: string | null;
  needsReview: boolean;
  warnings: string[];
};

export type DriverPortalExpense = {
  id: string;
  vehicleId: string;
  driverId: string;
  category: string;
  expenseDate: string;
  amount: number;
  notes: string | null;
  status: string;
  createdAt: string;
  vehicle: { id: string; vehicleNumber: string };
};
