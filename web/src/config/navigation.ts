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
  {
    label: 'Overview',
    path: '/',
    description: 'Current session and permission summary',
    permissionKeys: [],
    section: 'EXPLORE',
    pageTitle: 'Overview',
    pageDescription: 'Identity, permission, and staging status',
  },
  {
    label: 'Activity History',
    path: '/trips',
    description: 'Recent trips and activity',
    permissionKeys: ['trip_view'],
    section: 'EXPLORE',
    pageTitle: 'Activity History',
    pageDescription: 'Recent trips and activity',
  },
  {
    label: 'New Trip',
    path: '/trips',
    description: 'Create a new trip',
    permissionKeys: ['trip_create'],
    section: 'BUILD',
    pageTitle: 'New Trip',
    pageDescription: 'Create a new trip',
  },
  {
    label: 'My Fleet',
    path: '/vehicles',
    description: 'Manage your vehicles',
    permissionKeys: ['vehicle_view'],
    section: 'BUILD',
    pageTitle: 'My Fleet',
    pageDescription: 'Manage your vehicles',
  },
  {
    label: 'Asset Library',
    path: '/assets',
    description: 'Browse assets and equipment',
    permissionKeys: ['asset_view'],
    section: 'BUILD',
    pageTitle: 'Asset Library',
    pageDescription: 'Browse assets and equipment',
  },
  {
    label: 'Dashboard',
    path: '/',
    description: 'Fleet overview and quick links',
    permissionKeys: [],
    section: 'MANAGE',
    pageTitle: 'Dashboard',
    pageDescription: 'Fleet overview and quick links',
  },
  {
    label: 'Vehicles',
    path: '/vehicles',
    description: 'Manage vehicle master data',
    permissionKeys: ['vehicle_view'],
    section: 'MANAGE',
    pageTitle: 'Vehicles',
    pageDescription: 'Vehicle master records',
  },
  {
    label: 'Drivers',
    path: '/drivers',
    description: 'Manage driver master data',
    permissionKeys: ['driver_view'],
    section: 'MANAGE',
    pageTitle: 'Drivers',
    pageDescription: 'Driver master records',
  },
  {
    label: 'Assets',
    path: '/assets',
    description: 'Manage inventory and equipment',
    permissionKeys: ['asset_view'],
    section: 'MANAGE',
    pageTitle: 'Assets',
    pageDescription: 'Asset master records',
  },
  {
    label: 'Trips',
    path: '/trips',
    description: 'Manage trips and transfers',
    permissionKeys: ['trip_view'],
    section: 'MANAGE',
    pageTitle: 'Trips',
    pageDescription: 'Trip and transfer workflow',
  },
  {
    label: 'Fuel',
    path: '/fuel',
    description: 'Fuel entries and approvals',
    permissionKeys: ['fuel_view'],
    section: 'MANAGE',
    pageTitle: 'Fuel',
    pageDescription: 'Fuel entry workflow',
  },
  {
    label: 'Expenses',
    path: '/expenses',
    description: 'Vehicle and trip expenses',
    permissionKeys: ['expense_view'],
    section: 'MANAGE',
    pageTitle: 'Expenses',
    pageDescription: 'Expense workflow',
  },
  {
    label: 'Roles',
    path: '/roles',
    description: 'Roles and permission assignments',
    permissionKeys: ['role_view'],
    section: 'MANAGE',
    pageTitle: 'Roles and permissions',
    pageDescription: 'Role definitions and permission coverage',
  },
  {
    label: 'Users',
    path: '/users',
    description: 'Create, update, and review user access',
    permissionKeys: ['user_view'],
    section: 'MANAGE',
    pageTitle: 'Users',
    pageDescription: 'User access management',
  },
];

export const sidebarSections: SidebarSection[] = [
  {
    key: 'EXPLORE',
    label: 'EXPLORE',
    items: navigationItems.filter((item) => item.section === 'EXPLORE'),
  },
  {
    key: 'BUILD',
    label: 'BUILD',
    items: navigationItems.filter((item) => item.section === 'BUILD'),
  },
  {
    key: 'MANAGE',
    label: 'MANAGE',
    items: navigationItems.filter((item) => item.section === 'MANAGE'),
  },
];
