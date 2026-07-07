export type NavItem = {
  id: string;
  label: string;
  path: string;
  icon: string;
  section: string;
  description?: string;
  pageTitle?: string;
  pageDescription?: string;

  /** All required permissions must be present. */
  requiredPermissions?: string[];

  /** At least one of these permissions must be present. */
  requiredAnyPermissions?: string[];

  /** User must have at least one of these profile types. */
  requiredProfileTypes?: string[];

  /** Only show for these role keys (if specified). */
  requiredRoleKeys?: string[];

  /** Hide for these role keys. */
  hiddenForRoleKeys?: string[];

  /** Requires a primary DRIVER profile link to be active. */
  requirePrimaryDriverProfile?: boolean;

  /** Requires global access (super_admin or GLOBAL/MANAGE scope). */
  requireGlobalAccess?: boolean;

  /** Child items (for sub-navigation). */
  children?: NavItem[];

  /** Sort order within section (lower = first). */
  priority: number;
};

export const SECTIONS = [
  'WORKSPACE',
  'DRIVER',
  'OPERATIONS',
  'FINANCE',
  'COMPLIANCE',
  'DOCUMENTS',
  'ADMIN',
  'SETTINGS',
] as const;

export type Section = (typeof SECTIONS)[number];

export const SECTION_LABELS: Record<Section, string> = {
  WORKSPACE: 'Workspace',
  DRIVER: 'Driver',
  OPERATIONS: 'Operations',
  FINANCE: 'Finance',
  COMPLIANCE: 'Compliance',
  DOCUMENTS: 'Documents',
  ADMIN: 'Admin',
  SETTINGS: 'Settings',
};

/**
 * Complete navigation registry.
 *
 * Each item is filtered at render time by:
 *  1. role key (requiredRoleKeys / hiddenForRoleKeys)
 *  2. effective permissions (requiredPermissions / requiredAnyPermissions)
 *  3. profile type (requiredProfileTypes)
 *  4. primary driver profile (requirePrimaryDriverProfile)
 *  5. global access (requireGlobalAccess)
 *
 * super_admin bypasses all permission/profile checks.
 */
export const navigationRegistry: NavItem[] = [
  // ── WORKSPACE ──────────────────────────────────────────────
  {
    id: 'overview',
    label: 'Overview',
    path: '/',
    icon: 'Dashboard',
    section: 'WORKSPACE',
    priority: 0,
    description: 'Fleet overview and quick links',
    pageTitle: 'Overview',
    pageDescription: 'Identity, permission, and staging status',
  },
  {
    id: 'activity-history',
    label: 'Activity History',
    path: '/trips',
    icon: 'Activity',
    section: 'WORKSPACE',
    requiredPermissions: ['trip_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 10,
    description: 'Recent trips and activity',
    pageTitle: 'Activity History',
    pageDescription: 'Recent trips and activity',
  },
  {
    id: 'new-trip',
    label: 'New Trip',
    path: '/trips/new',
    icon: 'NewTrip',
    section: 'WORKSPACE',
    requiredPermissions: ['trip_create'],
    hiddenForRoleKeys: ['driver'],
    priority: 20,
    description: 'Create a new trip',
    pageTitle: 'New Trip',
    pageDescription: 'Create a new trip',
  },

  // ── DRIVER ─────────────────────────────────────────────────
  // These items only appear for users with an active DRIVER profile link
  {
    id: 'driver-portal',
    label: 'Driver Portal',
    path: '/driver-portal',
    icon: 'DriverPortal',
    section: 'DRIVER',
    requiredPermissions: ['driver_portal_view'],
    requiredProfileTypes: ['DRIVER'],
    requirePrimaryDriverProfile: true,
    hiddenForRoleKeys: ['super_admin', 'admin'],
    priority: 100,
    description: 'Driver workspace dashboard',
  },
  {
    id: 'my-trips',
    label: 'My Trips',
    path: '/driver-portal/trips',
    icon: 'MyTrips',
    section: 'DRIVER',
    requiredAnyPermissions: ['driver_my_trips_view', 'driver_trip_view'],
    requiredProfileTypes: ['DRIVER'],
    requirePrimaryDriverProfile: true,
    hiddenForRoleKeys: ['super_admin', 'admin'],
    priority: 110,
    description: 'Your trips and history',
  },
  {
    id: 'my-vehicle',
    label: 'My Vehicle',
    path: '/driver-portal/vehicles',
    icon: 'MyVehicle',
    section: 'DRIVER',
    requiredAnyPermissions: ['driver_vehicle_view', 'vehicle_view'],
    requiredProfileTypes: ['DRIVER'],
    requirePrimaryDriverProfile: true,
    hiddenForRoleKeys: ['super_admin', 'admin'],
    priority: 115,
    description: 'Your assigned vehicle',
  },
  {
    id: 'my-fuel',
    label: 'My Fuel',
    path: '/driver-portal/fuel',
    icon: 'MyFuel',
    section: 'DRIVER',
    requiredAnyPermissions: ['driver_fuel_view_own', 'driver_quick_fuel_create'],
    requiredProfileTypes: ['DRIVER'],
    requirePrimaryDriverProfile: true,
    hiddenForRoleKeys: ['super_admin', 'admin'],
    priority: 120,
    description: 'Fuel entries and quick fuel',
  },
  {
    id: 'my-expenses',
    label: 'My Expenses',
    path: '/driver-portal/expenses',
    icon: 'MyExpenses',
    section: 'DRIVER',
    requiredAnyPermissions: ['driver_expense_view_own', 'driver_expense_create'],
    requiredProfileTypes: ['DRIVER'],
    requirePrimaryDriverProfile: true,
    hiddenForRoleKeys: ['super_admin', 'admin'],
    priority: 130,
    description: 'Expense claims',
  },
  {
    id: 'my-documents',
    label: 'My Documents',
    path: '/driver-portal/documents',
    icon: 'MyDocuments',
    section: 'DRIVER',
    requiredAnyPermissions: ['driver_my_documents_view', 'driver_document_upload'],
    requiredProfileTypes: ['DRIVER'],
    requirePrimaryDriverProfile: true,
    hiddenForRoleKeys: ['super_admin', 'admin'],
    priority: 140,
    description: 'Your documents',
  },
  {
    id: 'my-issues',
    label: 'My Issues',
    path: '/driver-portal/vehicles/issue',
    icon: 'Issues',
    section: 'DRIVER',
    requiredAnyPermissions: ['driver_issue_create', 'driver_issue_view_own'],
    requiredProfileTypes: ['DRIVER'],
    requirePrimaryDriverProfile: true,
    hiddenForRoleKeys: ['super_admin', 'admin'],
    priority: 150,
    description: 'Report and view issues',
  },
  {
    id: 'my-inspections',
    label: 'My Inspections',
    path: '/driver-portal/vehicles/inspect',
    icon: 'Inspections',
    section: 'DRIVER',
    requiredAnyPermissions: ['driver_inspection_create', 'driver_inspection_view_own'],
    requiredProfileTypes: ['DRIVER'],
    requirePrimaryDriverProfile: true,
    hiddenForRoleKeys: ['super_admin', 'admin'],
    priority: 160,
    description: 'Vehicle inspections',
  },

  // ── OPERATIONS ─────────────────────────────────────────────
  {
    id: 'dispatch-board',
    label: 'Dispatch Board',
    path: '/dispatch-board',
    icon: 'Activity',
    section: 'OPERATIONS',
    requiredPermissions: ['trip_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 205,
    description: 'Dispatch board with drag-drop assignment',
    pageTitle: 'Dispatch Board',
    pageDescription: 'Assign drivers and vehicles to trips',
  },
  {
    id: 'manage-trips',
    label: 'Manage Trips',
    path: '/trips',
    icon: 'Trips',
    section: 'OPERATIONS',
    requiredPermissions: ['trip_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 200,
    description: 'Manage trips and transfers',
    pageTitle: 'Manage Trips',
    pageDescription: 'Trip and transfer workflow',
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    path: '/vehicles',
    icon: 'Vehicles',
    section: 'OPERATIONS',
    requiredPermissions: ['vehicle_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 210,
    description: 'Manage vehicle master data',
    pageTitle: 'Vehicles',
    pageDescription: 'Vehicle master records',
  },
  {
    id: 'drivers',
    label: 'Drivers',
    path: '/drivers',
    icon: 'Drivers',
    section: 'OPERATIONS',
    requiredPermissions: ['driver_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 220,
    description: 'Manage driver master data',
    pageTitle: 'Drivers',
    pageDescription: 'Driver master records',
  },
  {
    id: 'assets',
    label: 'Assets',
    path: '/assets',
    icon: 'Assets',
    section: 'OPERATIONS',
    requiredPermissions: ['asset_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 225,
    description: 'Manage inventory and equipment',
    pageTitle: 'Assets',
    pageDescription: 'Asset master records',
  },
  {
    id: 'fuel',
    label: 'Fuel',
    path: '/fuel',
    icon: 'Fuel',
    section: 'OPERATIONS',
    requiredPermissions: ['fuel_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 230,
    description: 'Fuel entries and approvals',
    pageTitle: 'Fuel',
    pageDescription: 'Fuel entry workflow',
  },
  {
    id: 'expenses',
    label: 'Expenses',
    path: '/expenses',
    icon: 'Expenses',
    section: 'OPERATIONS',
    requiredPermissions: ['expense_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 240,
    description: 'Vehicle and trip expenses',
    pageTitle: 'Expenses',
    pageDescription: 'Expense workflow',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    path: '/maintenance',
    icon: 'Maintenance',
    section: 'OPERATIONS',
    requiredPermissions: ['maintenance_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 250,
    description: 'Maintenance requests and schedules',
    pageTitle: 'Maintenance',
    pageDescription: 'Maintenance request workflow',
  },
  {
    id: 'repairs',
    label: 'Repairs',
    path: '/repairs',
    icon: 'Repairs',
    section: 'OPERATIONS',
    requiredPermissions: ['repair_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 260,
    description: 'Vehicle repair tracking',
    pageTitle: 'Repairs',
    pageDescription: 'Repair tracking workflow',
  },

  // ── FINANCE ────────────────────────────────────────────────
  {
    id: 'finance-dashboard',
    label: 'Finance Dashboard',
    path: '/finance',
    icon: 'FinanceDashboard',
    section: 'FINANCE',
    requiredAnyPermissions: ['finance_view', 'pnl_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 300,
    description: 'Financial overview and P&L',
    pageTitle: 'Finance',
    pageDescription: 'Financial management',
  },
  {
    id: 'finance-fuel',
    label: 'Fuel Expenses',
    path: '/fuel',
    icon: 'Fuel',
    section: 'FINANCE',
    requiredPermissions: ['fuel_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 310,
    description: 'Fuel expense entries',
  },
  {
    id: 'finance-expenses',
    label: 'Driver Expenses',
    path: '/expenses',
    icon: 'Expenses',
    section: 'FINANCE',
    requiredPermissions: ['expense_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 320,
    description: 'Driver expense entries',
  },
  {
    id: 'trip-billing',
    label: 'Trip Billing',
    path: '/finance/trip-billings',
    icon: 'Billing',
    section: 'FINANCE',
    requiredPermissions: ['trip_billing_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 330,
    description: 'Trip billing and invoicing',
    pageTitle: 'Trip Billing',
    pageDescription: 'Customer billing and invoicing for trips',
  },
  {
    id: 'payments',
    label: 'Payments',
    path: '/finance/payments',
    icon: 'Payments',
    section: 'FINANCE',
    requiredPermissions: ['payments_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 340,
    description: 'Payment tracking and reconciliation',
    pageTitle: 'Payments',
    pageDescription: 'Payment management',
  },
  {
    id: 'finance-transactions',
    label: 'Transactions',
    path: '/finance/transactions',
    icon: 'Transactions',
    section: 'FINANCE',
    requiredPermissions: ['finance_transactions_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 350,
    description: 'All financial transactions',
    pageTitle: 'Transactions',
    pageDescription: 'Financial transaction history',
  },
  {
    id: 'finance-accounts',
    label: 'Accounts',
    path: '/finance/accounts',
    icon: 'Accounts',
    section: 'FINANCE',
    requiredPermissions: ['finance_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 360,
    description: 'Bank and cash accounts',
    pageTitle: 'Accounts',
    pageDescription: 'Financial accounts management',
  },
  {
    id: 'finance-vendors',
    label: 'Vendors',
    path: '/finance/vendors',
    icon: 'Vendors',
    section: 'FINANCE',
    requiredPermissions: ['vendors_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 370,
    description: 'Vendor management',
    pageTitle: 'Vendors',
    pageDescription: 'Vendor master data',
  },
  {
    id: 'finance-customers',
    label: 'Customers',
    path: '/finance/customers',
    icon: 'Customers',
    section: 'FINANCE',
    requiredPermissions: ['customers_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 380,
    description: 'Customer management',
    pageTitle: 'Customers',
    pageDescription: 'Customer master data',
  },
  {
    id: 'finance-reports',
    label: 'Reports',
    path: '/finance/reports',
    icon: 'Reports',
    section: 'FINANCE',
    requiredAnyPermissions: ['finance_view', 'pnl_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 390,
    description: 'Financial reports',
    pageTitle: 'Reports',
    pageDescription: 'Generate financial reports',
  },

  // ── COMPLIANCE ─────────────────────────────────────────────
  {
    id: 'compliance-dashboard',
    label: 'Compliance Dashboard',
    path: '/compliance',
    icon: 'Compliance',
    section: 'COMPLIANCE',
    requiredPermissions: ['vehicle_compliance_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 400,
    description: 'India vehicle compliance dashboard',
    pageTitle: 'Compliance Dashboard',
    pageDescription: 'Insurance, permits, fitness, PUC, road tax, FASTag, and AIS-140 GPS tracking',
  },

  // ── DOCUMENTS ──────────────────────────────────────────────
  {
    id: 'documents',
    label: 'Documents Vault',
    path: '/documents',
    icon: 'Documents',
    section: 'DOCUMENTS',
    requiredPermissions: ['documents_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 500,
    description: 'Manage fleet documents and files',
    pageTitle: 'Documents Vault',
    pageDescription: 'Store and manage fleet documents',
  },
  {
    id: 'driver-submissions',
    label: 'Driver Submissions',
    path: '/driver-submissions',
    icon: 'Submissions',
    section: 'DOCUMENTS',
    requiredAnyPermissions: ['driver_submission_view', 'driver_submission_review'],
    hiddenForRoleKeys: ['driver'],
    priority: 510,
    description: 'Review driver submissions',
    pageTitle: 'Driver Submissions',
    pageDescription: 'Review and approve driver-submitted fuel, expenses, documents, issues, and inspections',
  },

  // ── ADMIN ──────────────────────────────────────────────────
  {
    id: 'users',
    label: 'Users',
    path: '/users',
    icon: 'Users',
    section: 'ADMIN',
    requiredPermissions: ['user_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 600,
    description: 'Create, update, and review user access',
    pageTitle: 'Users',
    pageDescription: 'User access management',
  },
  {
    id: 'roles',
    label: 'Roles & Permissions',
    path: '/roles',
    icon: 'Roles',
    section: 'ADMIN',
    requiredPermissions: ['role_view'],
    hiddenForRoleKeys: ['driver'],
    priority: 610,
    description: 'Roles and permission assignments',
    pageTitle: 'Roles and Permissions',
    pageDescription: 'Role definitions and permission coverage',
  },

];

// ── Backward Compatibility ────────────────────────────────────
// These are kept for existing pages that reference navigationItems/sidebarSections.
// New code should use navigationRegistry + getVisibleNavItems instead.

export type NavigationItem = {
  label: string;
  path: string;
  description: string;
  permissionKeys: string[];
  section?: string;
  pageTitle?: string;
  pageDescription?: string;
};

export type SidebarSection = {
  key: string;
  label: string;
  items: NavigationItem[];
};

export const navigationItems: NavigationItem[] = [
  { label: 'Overview', path: '/', description: 'Current session and permission summary', permissionKeys: [], section: 'EXPLORE', pageTitle: 'Overview', pageDescription: 'Identity, permission, and staging status' },
  { label: 'Activity History', path: '/trips', description: 'Recent trips and activity', permissionKeys: ['trip_view'], section: 'EXPLORE', pageTitle: 'Activity History', pageDescription: 'Recent trips and activity' },
  { label: 'New Trip', path: '/trips/new', description: 'Create a new trip', permissionKeys: ['trip_create'], section: 'BUILD', pageTitle: 'New Trip', pageDescription: 'Create a new trip' },
  { label: 'My Fleet', path: '/vehicles', description: 'Manage your vehicles', permissionKeys: ['vehicle_view'], section: 'BUILD', pageTitle: 'My Fleet', pageDescription: 'Manage your vehicles' },
  { label: 'Asset Library', path: '/assets', description: 'Browse assets and equipment', permissionKeys: ['asset_view'], section: 'BUILD', pageTitle: 'Asset Library', pageDescription: 'Browse assets and equipment' },
  { label: 'Dashboard', path: '/', description: 'Fleet overview and quick links', permissionKeys: [], section: 'MANAGE', pageTitle: 'Dashboard', pageDescription: 'Fleet overview and quick links' },
  { label: 'Vehicles', path: '/vehicles', description: 'Manage vehicle master data', permissionKeys: ['vehicle_view'], section: 'MANAGE', pageTitle: 'Vehicles', pageDescription: 'Vehicle master records' },
  { label: 'Drivers', path: '/drivers', description: 'Manage driver master data', permissionKeys: ['driver_view'], section: 'MANAGE', pageTitle: 'Drivers', pageDescription: 'Driver master records' },
  { label: 'Assets', path: '/assets', description: 'Manage inventory and equipment', permissionKeys: ['asset_view'], section: 'MANAGE', pageTitle: 'Assets', pageDescription: 'Asset master records' },
  { label: 'Manage Trips', path: '/trips', description: 'Manage trips and transfers', permissionKeys: ['trip_view'], section: 'MANAGE', pageTitle: 'Manage Trips', pageDescription: 'Trip and transfer workflow' },
  { label: 'Fuel', path: '/fuel', description: 'Fuel entries and approvals', permissionKeys: ['fuel_view'], section: 'MANAGE', pageTitle: 'Fuel', pageDescription: 'Fuel entry workflow' },
  { label: 'Expenses', path: '/expenses', description: 'Vehicle and trip expenses', permissionKeys: ['expense_view'], section: 'MANAGE', pageTitle: 'Expenses', pageDescription: 'Expense workflow' },
  { label: 'Maintenance', path: '/maintenance', description: 'Maintenance requests and schedules', permissionKeys: ['maintenance_view'], section: 'MANAGE', pageTitle: 'Maintenance', pageDescription: 'Maintenance request workflow' },
  { label: 'Repairs', path: '/repairs', description: 'Vehicle repair tracking', permissionKeys: ['repair_view'], section: 'MANAGE', pageTitle: 'Repairs', pageDescription: 'Repair tracking workflow' },
  { label: 'Compliance', path: '/compliance', description: 'India vehicle compliance dashboard', permissionKeys: ['vehicle_compliance_view'], section: 'MANAGE', pageTitle: 'Compliance Dashboard', pageDescription: 'Insurance, permits, fitness, PUC, road tax, FASTag, and AIS-140 GPS tracking' },
  { label: 'Finance', path: '/finance', description: 'Finance management, P&L, transactions, and billing', permissionKeys: ['finance_view', 'pnl_view', 'finance_transactions_view', 'vendors_view', 'customers_view', 'trip_billing_view', 'payments_view'], section: 'MANAGE', pageTitle: 'Finance', pageDescription: 'Financial management' },
  { label: 'Documents', path: '/documents', description: 'Manage fleet documents and files', permissionKeys: ['documents_view'], section: 'MANAGE', pageTitle: 'Documents Vault', pageDescription: 'Store and manage fleet documents' },
  { label: 'Roles', path: '/roles', description: 'Roles and permission assignments', permissionKeys: ['role_view'], section: 'MANAGE', pageTitle: 'Roles and permissions', pageDescription: 'Role definitions and permission coverage' },
  { label: 'Users', path: '/users', description: 'Create, update, and review user access', permissionKeys: ['user_view'], section: 'MANAGE', pageTitle: 'Users', pageDescription: 'User access management' },
  { label: 'My Access', path: '/my-access', description: 'Your permissions, scopes, and visible menus', permissionKeys: [], section: 'EXPLORE', pageTitle: 'My Access', pageDescription: 'Current session and permission summary' },
];

export const sidebarSections: SidebarSection[] = [
  { key: 'EXPLORE', label: 'EXPLORE', items: navigationItems.filter((item) => item.section === 'EXPLORE') },
  { key: 'BUILD', label: 'BUILD', items: navigationItems.filter((item) => item.section === 'BUILD') },
  { key: 'MANAGE', label: 'MANAGE', items: navigationItems.filter((item) => item.section === 'MANAGE') },
];

/** Derive visible nav items filtered by access summary and role key. */
export function getVisibleNavItems(
  roleKey: string | undefined,
  effectivePermissions: string[],
  profileTypes: string[],
  hasPrimaryDriverProfile: boolean,
  hasGlobalAccess: boolean,
): NavItem[] {
  const isSuperAdmin = roleKey === 'super_admin';

  return navigationRegistry
    .filter((item) => {
      if (item.hiddenForRoleKeys?.includes(roleKey ?? '')) return false;
      if (item.requiredRoleKeys && !item.requiredRoleKeys.includes(roleKey ?? '')) return false;

      if (isSuperAdmin) return true;

      if (item.requireGlobalAccess && !hasGlobalAccess) return false;

      if (item.requirePrimaryDriverProfile && !hasPrimaryDriverProfile) return false;

      if (item.requiredProfileTypes && item.requiredProfileTypes.length > 0) {
        if (!item.requiredProfileTypes.some((t) => profileTypes.includes(t))) return false;
      }

      if (item.requiredPermissions && item.requiredPermissions.length > 0) {
        if (!item.requiredPermissions.every((p) => effectivePermissions.includes(p))) return false;
      }

      if (item.requiredAnyPermissions && item.requiredAnyPermissions.length > 0) {
        if (!item.requiredAnyPermissions.some((p) => effectivePermissions.includes(p))) return false;
      }

      return true;
    })
    .sort((a, b) => a.priority - b.priority);
}

/** Group nav items by section, maintaining section order. */
export function groupNavItemsBySection(items: NavItem[]): { section: Section; label: string; items: NavItem[] }[] {
  const groups = new Map<string, NavItem[]>();
  for (const item of items) {
    const list = groups.get(item.section) ?? [];
    list.push(item);
    groups.set(item.section, list);
  }
  return SECTIONS
    .filter((s) => (groups.get(s)?.length ?? 0) > 0)
    .map((s) => ({ section: s, label: SECTION_LABELS[s], items: groups.get(s)! }));
}
