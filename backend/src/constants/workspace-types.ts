export type WorkspaceType =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'SUPERVISOR'
  | 'DRIVER'
  | 'ASSISTANT_DRIVER'
  | 'MECHANIC'
  | 'FINANCE'
  | 'COLLECTOR'
  | 'VIEWER'
  | 'MIXED';

export type CapabilityName =
  | 'canUseDriverPortal'
  | 'canCreateDriverTrip'
  | 'canSelfCheckoutVehicle'
  | 'canViewAvailableVehicles'
  | 'canReviewDriverSubmissions'
  | 'canUseFinance'
  | 'canUseMaintenance'
  | 'canUseAdmin'
  | 'canViewReports'
  | 'canManageTrips'
  | 'canManageVehicles'
  | 'canManageDrivers'
  | 'canManageAssets'
  | 'canManageFuel'
  | 'canManageExpenses'
  | 'canManageMaintenance'
  | 'canManageRepairs'
  | 'canManageCompliance'
  | 'canManageDocuments'
  | 'canManageRoles'
  | 'canManageUsers'
  | 'canManageSettings'
  | 'canReviewFuel'
  | 'canReviewExpenses'
  | 'canReviewDocuments'
  | 'canReviewIssues'
  | 'canReviewInspections'
  | 'canCreateTrips'
  | 'canUseReports'
  | 'canExportReports';

export type Capabilities = Record<CapabilityName, boolean>;

export type NavItemDef = {
  id: string;
  label: string;
  path: string;
  icon: string;
  section: string;
  priority: number;
};

export type NavSection = {
  section: string;
  label: string;
  items: NavItemDef[];
};

export type QuickActionDef = {
  id: string;
  label: string;
  path: string;
  icon: string;
  priority: number;
};

export type PrimaryProfiles = {
  driver: { id: string; name: string; mobile: string; status: string } | null;
  mechanic: { id: string; name: string } | null;
  finance: { id: string; name: string } | null;
  collector: { id: string; name: string } | null;
};

export type WorkspaceResponse = {
  user: {
    id: string;
    name: string;
    username: string | null;
    roleKey: string;
  };
  workspaceType: WorkspaceType;
  profileLinks: Array<{
    id: string;
    profileType: string;
    profileId: string;
    isPrimary: boolean;
    status: string;
  }>;
  primaryProfiles: PrimaryProfiles;
  effectivePermissions: string[];
  dataScopes: Array<{
    id: string;
    scopeType: string;
    scopeId: string | null;
    accessLevel: string;
  }>;
  capabilities: Capabilities;
  navigation: NavSection[];
  quickActions: QuickActionDef[];
  emptyStates: string[];
  diagnostics: string[];
};

export const NAV_SECTION_LABELS: Record<string, string> = {
  WORKSPACE: 'Workspace',
  DRIVER: 'Driver',
  OPERATIONS: 'Operations',
  FINANCE: 'Finance',
  COMPLIANCE: 'Compliance',
  DOCUMENTS: 'Documents',
  ADMIN: 'Admin',
  SETTINGS: 'Settings',
};

export const ALL_SECTIONS = ['WORKSPACE', 'DRIVER', 'OPERATIONS', 'FINANCE', 'COMPLIANCE', 'DOCUMENTS', 'ADMIN', 'SETTINGS'];

export const NAV_ITEMS: NavItemDef[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: 'Dashboard', section: 'WORKSPACE', priority: 0 },
  { id: 'activity-history', label: 'Activity History', path: '/trips', icon: 'Activity', section: 'WORKSPACE', priority: 10 },
  { id: 'new-trip', label: 'New Trip', path: '/trips/new', icon: 'NewTrip', section: 'WORKSPACE', priority: 20 },
  { id: 'driver-portal', label: 'Driver Portal', path: '/driver-portal', icon: 'DriverPortal', section: 'DRIVER', priority: 100 },
  { id: 'my-trips', label: 'My Trips', path: '/driver-portal/trips', icon: 'MyTrips', section: 'DRIVER', priority: 110 },
  { id: 'my-vehicle', label: 'My Vehicle', path: '/driver-portal/vehicles', icon: 'MyVehicle', section: 'DRIVER', priority: 115 },
  { id: 'my-fuel', label: 'My Fuel', path: '/driver-portal/fuel', icon: 'MyFuel', section: 'DRIVER', priority: 120 },
  { id: 'my-expenses', label: 'My Expenses', path: '/driver-portal/expenses', icon: 'MyExpenses', section: 'DRIVER', priority: 130 },
  { id: 'my-documents', label: 'My Documents', path: '/driver-portal/documents', icon: 'MyDocuments', section: 'DRIVER', priority: 140 },
  { id: 'my-issues', label: 'My Issues', path: '/driver-portal/vehicles/issue', icon: 'Issues', section: 'DRIVER', priority: 150 },
  { id: 'my-inspections', label: 'My Inspections', path: '/driver-portal/vehicles/inspect', icon: 'Inspections', section: 'DRIVER', priority: 160 },
  { id: 'manage-trips', label: 'Manage Trips', path: '/trips', icon: 'Trips', section: 'OPERATIONS', priority: 200 },
  { id: 'dispatch-board', label: 'Dispatch Board', path: '/dispatch-board', icon: 'Activity', section: 'OPERATIONS', priority: 205 },
  { id: 'vehicles', label: 'Vehicles', path: '/vehicles', icon: 'Vehicles', section: 'OPERATIONS', priority: 210 },
  { id: 'drivers', label: 'Drivers', path: '/drivers', icon: 'Drivers', section: 'OPERATIONS', priority: 220 },
  { id: 'assets', label: 'Assets', path: '/assets', icon: 'Assets', section: 'OPERATIONS', priority: 225 },
  { id: 'fuel', label: 'Fuel', path: '/fuel', icon: 'Fuel', section: 'OPERATIONS', priority: 230 },
  { id: 'expenses', label: 'Expenses', path: '/expenses', icon: 'Expenses', section: 'OPERATIONS', priority: 240 },
  { id: 'maintenance', label: 'Maintenance', path: '/maintenance', icon: 'Maintenance', section: 'OPERATIONS', priority: 250 },
  { id: 'repairs', label: 'Repairs', path: '/repairs', icon: 'Repairs', section: 'OPERATIONS', priority: 260 },
  { id: 'finance-dashboard', label: 'Finance Dashboard', path: '/finance', icon: 'FinanceDashboard', section: 'FINANCE', priority: 300 },
  { id: 'finance-fuel', label: 'Fuel Expenses', path: '/fuel', icon: 'Fuel', section: 'FINANCE', priority: 310 },
  { id: 'finance-expenses', label: 'Driver Expenses', path: '/expenses', icon: 'Expenses', section: 'FINANCE', priority: 320 },
  { id: 'trip-billing', label: 'Trip Billing', path: '/finance/billings', icon: 'Billing', section: 'FINANCE', priority: 330 },
  { id: 'payments', label: 'Payments', path: '/finance/payments', icon: 'Payments', section: 'FINANCE', priority: 340 },
  { id: 'finance-transactions', label: 'Transactions', path: '/finance/transactions', icon: 'Transactions', section: 'FINANCE', priority: 350 },
  { id: 'finance-accounts', label: 'Accounts', path: '/finance/accounts', icon: 'Accounts', section: 'FINANCE', priority: 360 },
  { id: 'finance-vendors', label: 'Vendors', path: '/finance/vendors', icon: 'Vendors', section: 'FINANCE', priority: 370 },
  { id: 'finance-customers', label: 'Customers', path: '/finance/customers', icon: 'Customers', section: 'FINANCE', priority: 380 },
  { id: 'finance-reports', label: 'Reports', path: '/finance/reports', icon: 'Reports', section: 'FINANCE', priority: 390 },
  { id: 'compliance-dashboard', label: 'Compliance Dashboard', path: '/compliance', icon: 'Compliance', section: 'COMPLIANCE', priority: 400 },
  { id: 'documents', label: 'Documents Vault', path: '/documents', icon: 'Documents', section: 'DOCUMENTS', priority: 500 },
  { id: 'driver-submissions', label: 'Driver Submissions', path: '/driver-submissions', icon: 'Submissions', section: 'DOCUMENTS', priority: 510 },
  { id: 'users', label: 'Users', path: '/users', icon: 'Users', section: 'ADMIN', priority: 600 },
  { id: 'roles', label: 'Roles & Permissions', path: '/roles', icon: 'Roles', section: 'ADMIN', priority: 610 },
];
