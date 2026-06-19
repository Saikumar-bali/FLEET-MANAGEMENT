export type NavigationItem = {
  label: string;
  path: string;
  description: string;
  permissionKeys: string[];
  section?: string;
  pageTitle?: string;
  pageDescription?: string;
};

export const navigationItems: NavigationItem[] = [
  {
    label: 'Overview',
    path: '/',
    description: 'Current session and permission summary',
    permissionKeys: [],
    section: 'Workspace',
    pageTitle: 'Access dashboard',
    pageDescription: 'Identity, permission, and staging status',
  },
  {
    label: 'Vehicles',
    path: '/vehicles',
    description: 'Manage vehicle master data',
    permissionKeys: ['vehicle_view'],
    section: 'Masters',
    pageTitle: 'Vehicles',
    pageDescription: 'Vehicle master records',
  },
  {
    label: 'Drivers',
    path: '/drivers',
    description: 'Manage driver master data',
    permissionKeys: ['driver_view'],
    section: 'Masters',
    pageTitle: 'Drivers',
    pageDescription: 'Driver master records',
  },
  {
    label: 'Assets',
    path: '/assets',
    description: 'Manage inventory and equipment',
    permissionKeys: ['asset_view'],
    section: 'Masters',
    pageTitle: 'Assets',
    pageDescription: 'Asset master records',
  },
  {
    label: 'Asset Categories',
    path: '/asset-categories',
    description: 'Categorize inventory types',
    permissionKeys: ['asset_view'],
    section: 'Masters',
    pageTitle: 'Asset categories',
    pageDescription: 'Asset category configuration',
  },
  {
    label: 'Trips',
    path: '/trips',
    description: 'Manage trips and transfers',
    permissionKeys: ['trip_view'],
    section: 'Operations',
    pageTitle: 'Trips',
    pageDescription: 'Trip and transfer workflow',
  },
  {
    label: 'Fuel',
    path: '/fuel',
    description: 'Fuel entries and approvals',
    permissionKeys: ['fuel_view'],
    section: 'Operations',
    pageTitle: 'Fuel',
    pageDescription: 'Fuel entry workflow',
  },
  {
    label: 'Expenses',
    path: '/expenses',
    description: 'Vehicle and trip expenses',
    permissionKeys: ['expense_view'],
    section: 'Operations',
    pageTitle: 'Expenses',
    pageDescription: 'Expense workflow',
  },
  {
    label: 'Maintenance',
    path: '/maintenance',
    description: 'Maintenance requests and approvals',
    permissionKeys: ['maintenance_view'],
    section: 'Operations',
    pageTitle: 'Maintenance Requests',
    pageDescription: 'Maintenance request workflow',
  },
  {
    label: 'Repairs',
    path: '/repairs',
    description: 'Repair records and status',
    permissionKeys: ['repair_view'],
    section: 'Operations',
    pageTitle: 'Repairs',
    pageDescription: 'Repair workflow',
  },
  {
    label: 'Roles',
    path: '/roles',
    description: 'Roles and permission assignments',
    permissionKeys: ['role_view'],
    section: 'Security',
    pageTitle: 'Roles and permissions',
    pageDescription: 'Role definitions and permission coverage',
  },
  {
    label: 'Users',
    path: '/users',
    description: 'Create, update, and review user access',
    permissionKeys: ['user_view'],
    section: 'Security',
    pageTitle: 'Users',
    pageDescription: 'User access management',
  },
];
