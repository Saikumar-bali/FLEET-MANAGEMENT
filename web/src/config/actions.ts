import type { Capabilities } from '../types/workspace';

export type ActionDefinition = {
  id: string;
  label: string;
  path: string;
  icon: string;
  section: 'driver' | 'operations' | 'finance' | 'admin' | 'reports';
  priority: number;
  requiredCapabilities: Array<keyof Capabilities>;
  requiresDriverProfile?: boolean;
};

export const actionRegistry: ActionDefinition[] = [
  {
    id: 'create_trip',
    label: 'Create Trip',
    path: '/driver-portal/trips/new',
    icon: 'NewTrip',
    section: 'driver',
    priority: 100,
    requiredCapabilities: ['canCreateDriverTrip'],
    requiresDriverProfile: true,
  },
  {
    id: 'checkout_vehicle',
    label: 'Take Vehicle',
    path: '/driver-portal/vehicles',
    icon: 'MyVehicle',
    section: 'driver',
    priority: 110,
    requiredCapabilities: ['canSelfCheckoutVehicle', 'canViewAvailableVehicles'],
    requiresDriverProfile: true,
  },
  {
    id: 'return_vehicle',
    label: 'Return Vehicle',
    path: '/driver-portal/vehicles',
    icon: 'MyVehicle',
    section: 'driver',
    priority: 115,
    requiredCapabilities: ['canSelfCheckoutVehicle'],
    requiresDriverProfile: true,
  },
  {
    id: 'add_fuel',
    label: 'Add Fuel',
    path: '/driver-portal/fuel/new',
    icon: 'MyFuel',
    section: 'driver',
    priority: 120,
    requiredCapabilities: ['canCreateDriverTrip'],
    requiresDriverProfile: true,
  },
  {
    id: 'claim_expense',
    label: 'Claim Expense',
    path: '/driver-portal/expenses/new',
    icon: 'MyExpenses',
    section: 'driver',
    priority: 130,
    requiredCapabilities: [],
    requiresDriverProfile: true,
  },
  {
    id: 'upload_document',
    label: 'Upload Document',
    path: '/driver-portal/documents/upload',
    icon: 'MyDocuments',
    section: 'driver',
    priority: 140,
    requiredCapabilities: [],
    requiresDriverProfile: true,
  },
  {
    id: 'report_issue',
    label: 'Report Issue',
    path: '/driver-portal/vehicles/issue',
    icon: 'Issues',
    section: 'driver',
    priority: 150,
    requiredCapabilities: [],
    requiresDriverProfile: true,
  },
  {
    id: 'do_inspection',
    label: 'Vehicle Inspection',
    path: '/driver-portal/vehicles/inspect',
    icon: 'Inspections',
    section: 'driver',
    priority: 160,
    requiredCapabilities: [],
    requiresDriverProfile: true,
  },
  {
    id: 'review_submissions',
    label: 'Review Submissions',
    path: '/driver-submissions',
    icon: 'Submissions',
    section: 'operations',
    priority: 200,
    requiredCapabilities: ['canReviewDriverSubmissions'],
  },
  {
    id: 'approve_fuel',
    label: 'Approve Fuel',
    path: '/driver-submissions/fuel',
    icon: 'Fuel',
    section: 'operations',
    priority: 210,
    requiredCapabilities: ['canReviewFuel'],
  },
  {
    id: 'approve_expense',
    label: 'Approve Expenses',
    path: '/driver-submissions/expenses',
    icon: 'Expenses',
    section: 'operations',
    priority: 220,
    requiredCapabilities: ['canReviewExpenses'],
  },
  {
    id: 'manage_trips',
    label: 'Manage Trips',
    path: '/trips',
    icon: 'Trips',
    section: 'operations',
    priority: 300,
    requiredCapabilities: ['canManageTrips'],
  },
  {
    id: 'manage_vehicles',
    label: 'Vehicles',
    path: '/vehicles',
    icon: 'Vehicles',
    section: 'operations',
    priority: 310,
    requiredCapabilities: ['canManageVehicles'],
  },
  {
    id: 'manage_drivers',
    label: 'Drivers',
    path: '/drivers',
    icon: 'Drivers',
    section: 'operations',
    priority: 320,
    requiredCapabilities: ['canManageDrivers'],
  },
  {
    id: 'view_finance',
    label: 'Finance',
    path: '/finance',
    icon: 'FinanceDashboard',
    section: 'finance',
    priority: 400,
    requiredCapabilities: ['canUseFinance'],
  },
  {
    id: 'view_reports',
    label: 'Reports',
    path: '/finance/reports',
    icon: 'Reports',
    section: 'reports',
    priority: 410,
    requiredCapabilities: ['canViewReports'],
  },
  {
    id: 'manage_users',
    label: 'Users',
    path: '/users',
    icon: 'Users',
    section: 'admin',
    priority: 500,
    requiredCapabilities: ['canManageUsers'],
  },
  {
    id: 'manage_roles',
    label: 'Roles & Permissions',
    path: '/roles',
    icon: 'Roles',
    section: 'admin',
    priority: 510,
    requiredCapabilities: ['canManageRoles'],
  },
];

export function getVisibleActions(
  capabilities: Capabilities,
  hasDriverProfile: boolean,
): ActionDefinition[] {
  return actionRegistry
    .filter((action) => {
      if (action.requiresDriverProfile && !hasDriverProfile) return false;
      if (action.requiredCapabilities.length === 0) return true;
      return action.requiredCapabilities.some((cap) => capabilities[cap]);
    })
    .sort((a, b) => a.priority - b.priority);
}

export function getActionsBySection(
  actions: ActionDefinition[],
): Record<string, ActionDefinition[]> {
  const grouped: Record<string, ActionDefinition[]> = {};
  for (const action of actions) {
    const list = grouped[action.section] ?? [];
    list.push(action);
    grouped[action.section] = list;
  }
  return grouped;
}
