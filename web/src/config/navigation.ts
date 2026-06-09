export const navigationItems = [
  {
    label: 'Overview',
    path: '/',
    description: 'Current session and permission summary',
    permissionKeys: [],
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
