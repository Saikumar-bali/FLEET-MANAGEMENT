export type NavigationItem = {
  label: string;
  path: string;
  description: string;
  permissionKeys: string[];
};

export const navigationItems: NavigationItem[] = [
  {
    label: 'Overview',
    path: '/',
    description: 'Current session and permission summary',
    permissionKeys: [],
  },
  {
    label: 'Vehicles',
    path: '/vehicles',
    description: 'Manage vehicle master data',
    permissionKeys: ['vehicle_view'],
  },
  {
    label: 'Drivers',
    path: '/drivers',
    description: 'Manage driver master data',
    permissionKeys: ['driver_view'],
  },
  {
    label: 'Assets',
    path: '/assets',
    description: 'Manage inventory and equipment',
    permissionKeys: ['asset_view'],
  },
  {
    label: 'Asset Categories',
    path: '/asset-categories',
    description: 'Categorize inventory types',
    permissionKeys: ['asset_view'],
  },
  {
    label: 'Access Control',
    path: '/roles',
    description: 'Roles and permission assignments',
    permissionKeys: ['role_view'],
  },
  {
    label: 'Users',
    path: '/users',
    description: 'Create, update, and review user access',
    permissionKeys: ['user_view'],
  },
];
