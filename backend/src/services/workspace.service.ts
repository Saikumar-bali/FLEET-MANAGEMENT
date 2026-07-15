import { prisma } from '../lib/prisma';
import { getEffectivePermissions } from '../modules/access/effective-permissions.service';
import type { WorkspaceType, Capabilities, CapabilityName, NavSection, NavItemDef, QuickActionDef, WorkspaceResponse, PrimaryProfiles } from '../constants/workspace-types';
import { NAV_ITEMS, ALL_SECTIONS, NAV_SECTION_LABELS } from '../constants/workspace-types';

const PERM_CAPABILITY_MAP: Record<string, CapabilityName[]> = {
  driver_portal_view: ['canUseDriverPortal'],
  driver_trip_create: ['canCreateDriverTrip'],
  driver_vehicle_self_checkout: ['canSelfCheckoutVehicle'],
  driver_available_vehicle_select: ['canViewAvailableVehicles'],
  driver_submission_view: ['canReviewDriverSubmissions'],
  driver_submission_review: ['canReviewDriverSubmissions'],
  finance_view: ['canUseFinance'],
  user_view: ['canUseAdmin'],
  user_create: ['canManageUsers'],
  user_update: ['canManageUsers'],
  user_delete: ['canManageUsers'],
  role_view: ['canUseAdmin'],
  role_create: ['canManageRoles'],
  role_update: ['canManageRoles'],
  role_delete: ['canManageRoles'],
  report_view: ['canViewReports', 'canUseReports'],
  report_export: ['canExportReports'],
  trip_view: ['canManageTrips'],
  trip_create: ['canCreateTrips'],
  vehicle_view: ['canManageVehicles'],
  driver_view: ['canManageDrivers'],
  asset_view: ['canManageAssets'],
  fuel_view: ['canManageFuel'],
  expense_view: ['canManageExpenses'],
  maintenance_view: ['canUseMaintenance', 'canManageMaintenance'],
  repair_view: ['canManageRepairs'],
  vehicle_compliance_view: ['canManageCompliance'],
  documents_view: ['canManageDocuments'],
  settings_view: ['canManageSettings'],
  driver_fuel_approve: ['canReviewFuel'],
  driver_expense_approve: ['canReviewExpenses'],
  driver_document_verify: ['canReviewDocuments'],
  driver_issue_review: ['canReviewIssues'],
  driver_inspection_review: ['canReviewInspections'],
};

const NAV_ITEM_PERMISSION_REQUIREMENTS: Record<string, { all?: string[]; any?: string[] }> = {
  'overview': {},
  'activity-history': { all: ['trip_view'] },
  'new-trip': { all: ['trip_create'] },
  'driver-portal': { all: ['driver_portal_view'] },
  'my-trips': { any: ['driver_my_trips_view', 'driver_trip_create'] },
  'my-vehicle': { any: ['vehicle_view'] },
  'my-fuel': { any: ['driver_quick_fuel_create', 'driver_fuel_view_own'] },
  'my-expenses': { any: ['driver_expense_create', 'driver_expense_view_own'] },
  'my-documents': { any: ['driver_my_documents_view', 'driver_document_upload'] },
  'my-issues': { any: ['driver_vehicle_issue_report'] },
  'my-inspections': { any: ['driver_vehicle_inspection_create'] },
  'my-advances': { any: ['driver_advance_view_own', 'driver_settlement_view_own'] },
  'manage-trips': { all: ['trip_view'] },
  'dispatch-board': { all: ['trip_view', 'vehicle_view', 'driver_view'] },
  'vehicles': { all: ['vehicle_view'] },
  'drivers': { all: ['driver_view'] },
  'assets': { all: ['asset_view'] },
  'fuel': { all: ['fuel_view'] },
  'expenses': { all: ['expense_view'] },
  'maintenance': { all: ['maintenance_view'] },
  'repairs': { all: ['repair_view'] },
  'finance-dashboard': { any: ['finance_view', 'pnl_view'] },
  'compliance-dashboard': { all: ['vehicle_compliance_view'] },
  'documents': { all: ['documents_view'] },
  'driver-submissions': { any: ['driver_submission_view', 'driver_submission_review'] },
  'users': { all: ['user_view'] },
  'roles': { all: ['role_view'] },
  'my-access': {},
};

const NAV_ITEM_PROFILE_TYPE_REQUIREMENTS: Record<string, string[]> = {
  'driver-portal': ['DRIVER'],
  'my-trips': ['DRIVER'],
  'my-vehicle': ['DRIVER'],
  'my-fuel': ['DRIVER'],
  'my-expenses': ['DRIVER'],
  'my-documents': ['DRIVER'],
  'my-issues': ['DRIVER'],
  'my-inspections': ['DRIVER'],
  'my-advances': ['DRIVER'],
};

const NAV_ITEM_HIDDEN_ROLES: Record<string, string[]> = {
  'activity-history': ['driver', 'assistant_driver'],
  'new-trip': ['driver', 'assistant_driver'],
  'manage-trips': ['driver', 'assistant_driver'],
  'dispatch-board': ['driver', 'assistant_driver'],
  'vehicles': ['driver', 'assistant_driver'],
  'drivers': ['driver', 'assistant_driver'],
  'assets': ['driver', 'assistant_driver'],
  'fuel': ['driver', 'assistant_driver'],
  'expenses': ['driver', 'assistant_driver'],
  'maintenance': ['driver', 'assistant_driver'],
  'repairs': ['driver', 'assistant_driver'],
  'finance-dashboard': ['driver', 'assistant_driver'],
  'finance-fuel': ['driver', 'assistant_driver'],
  'finance-expenses': ['driver', 'assistant_driver'],
  'trip-billing': ['driver', 'assistant_driver'],
  'payments': ['driver', 'assistant_driver'],
  'finance-transactions': ['driver', 'assistant_driver'],
  'finance-accounts': ['driver', 'assistant_driver'],
  'finance-vendors': ['driver', 'assistant_driver'],
  'finance-customers': ['driver', 'assistant_driver'],
  'finance-reports': ['driver', 'assistant_driver'],
  'compliance-dashboard': ['driver', 'assistant_driver'],
  'documents': ['driver', 'assistant_driver'],
  'driver-submissions': ['driver', 'assistant_driver'],
  'users': ['driver', 'assistant_driver', 'viewer', 'mechanic', 'finance', 'supervisor', 'collector'],
  'roles': ['driver', 'assistant_driver', 'viewer', 'mechanic', 'finance', 'supervisor', 'collector'],
  'driver-portal': ['super_admin', 'admin'],
  'my-trips': ['super_admin', 'admin'],
  'my-vehicle': ['super_admin', 'admin'],
  'my-fuel': ['super_admin', 'admin'],
  'my-expenses': ['super_admin', 'admin'],
  'my-documents': ['super_admin', 'admin'],
  'my-issues': ['super_admin', 'admin'],
  'my-inspections': ['super_admin', 'admin'],
  'my-advances': ['super_admin', 'admin'],
};

const QUICK_ACTIONS: QuickActionDef[] = [
  { id: 'create_trip', label: 'Create Trip', path: '/driver-portal/trips/new', icon: 'NewTrip', priority: 100 },
  { id: 'checkout_vehicle', label: 'Take Vehicle', path: '/driver-portal/vehicles', icon: 'MyVehicle', priority: 110 },
  { id: 'return_vehicle', label: 'Return Vehicle', path: '/driver-portal/vehicles', icon: 'MyVehicle', priority: 115 },
  { id: 'add_fuel', label: 'Add Fuel', path: '/driver-portal/fuel/new', icon: 'MyFuel', priority: 120 },
  { id: 'claim_expense', label: 'Claim Expense', path: '/driver-portal/expenses/new', icon: 'MyExpenses', priority: 130 },
  { id: 'upload_document', label: 'Upload Document', path: '/driver-portal/documents/upload', icon: 'MyDocuments', priority: 140 },
  { id: 'report_issue', label: 'Report Issue', path: '/driver-portal/vehicles/issue', icon: 'Issues', priority: 150 },
  { id: 'do_inspection', label: 'Vehicle Inspection', path: '/driver-portal/vehicles/inspect', icon: 'Inspections', priority: 160 },
  { id: 'review_submissions', label: 'Review Submissions', path: '/driver-submissions', icon: 'Submissions', priority: 200 },
  { id: 'approve_fuel', label: 'Approve Fuel', path: '/driver-submissions/fuel', icon: 'Fuel', priority: 210 },
  { id: 'approve_expense', label: 'Approve Expenses', path: '/driver-submissions/expenses', icon: 'Expenses', priority: 220 },
  { id: 'manage_trips', label: 'Manage Trips', path: '/trips', icon: 'Trips', priority: 300 },
  { id: 'manage_vehicles', label: 'Vehicles', path: '/vehicles', icon: 'Vehicles', priority: 310 },
  { id: 'manage_drivers', label: 'Drivers', path: '/drivers', icon: 'Drivers', priority: 320 },
  { id: 'view_finance', label: 'Finance', path: '/finance', icon: 'FinanceDashboard', priority: 400 },
  { id: 'view_reports', label: 'Reports', path: '/finance/reports', icon: 'Reports', priority: 410 },
  { id: 'manage_users', label: 'Users', path: '/users', icon: 'Users', priority: 500 },
  { id: 'manage_roles', label: 'Roles & Permissions', path: '/roles', icon: 'Roles', priority: 510 },
];

function determineWorkspaceType(
  roleKey: string,
  profileTypes: string[],
  effectivePermissions: string[],
  hasActiveLinks: boolean,
): WorkspaceType {
  if (roleKey === 'super_admin') return 'SUPER_ADMIN';

  if (roleKey === 'admin') return 'ADMIN';
  if (roleKey === 'manager') return 'MANAGER';
  if (roleKey === 'supervisor') return 'SUPERVISOR';
  if (roleKey === 'mechanic') return 'MECHANIC';
  if (roleKey === 'finance') return 'FINANCE';
  if (roleKey === 'collector') return 'COLLECTOR';
  if (roleKey === 'viewer') return 'VIEWER';

  if (profileTypes.length > 1) return 'MIXED';

  if (profileTypes.includes('DRIVER')) return 'DRIVER';
  if (profileTypes.includes('ASSISTANT_DRIVER')) return 'ASSISTANT_DRIVER';
  if (roleKey === 'driver') return 'DRIVER';
  if (roleKey === 'assistant_driver') return 'ASSISTANT_DRIVER';

  if (effectivePermissions.some(p => p.startsWith('driver_') || p.startsWith('driver_portal_'))) return 'DRIVER';
  if (roleKey === 'driver') return 'DRIVER';

  if (effectivePermissions.includes('finance_view') || effectivePermissions.includes('trip_billing_view')) return 'FINANCE';
  if (effectivePermissions.includes('maintenance_view') || effectivePermissions.includes('repair_view')) return 'MECHANIC';

  return 'VIEWER';
}

function buildCapabilities(effectivePermissions: string[], profileTypes: string[]): Capabilities {
  const permSet = new Set(effectivePermissions);
  const caps: Record<string, boolean> = {};

  const allCapNames: CapabilityName[] = [
    'canUseDriverPortal', 'canCreateDriverTrip', 'canSelfCheckoutVehicle',
    'canViewAvailableVehicles', 'canReviewDriverSubmissions', 'canUseFinance',
    'canUseMaintenance', 'canUseAdmin', 'canViewReports', 'canManageTrips',
    'canManageVehicles', 'canManageDrivers', 'canManageAssets', 'canManageFuel',
    'canManageExpenses', 'canManageMaintenance', 'canManageRepairs', 'canManageCompliance',
    'canManageDocuments', 'canManageRoles', 'canManageUsers', 'canManageSettings',
    'canReviewFuel', 'canReviewExpenses', 'canReviewDocuments', 'canReviewIssues',
    'canReviewInspections', 'canCreateTrips', 'canUseReports', 'canExportReports',
  ];

  for (const cap of allCapNames) {
    caps[cap] = false;
  }

  for (const [perm, capabilityNames] of Object.entries(PERM_CAPABILITY_MAP)) {
    if (permSet.has(perm)) {
      for (const cap of capabilityNames) {
        (caps as Record<string, boolean>)[cap] = true;
      }
    }
  }

  if (!profileTypes.includes('DRIVER')) {
    caps.canUseDriverPortal = false;
  }

  return caps as Capabilities;
}

function buildNavigation(
  roleKey: string,
  effectivePermissions: string[],
  profileTypes: string[],
  capabilities: Capabilities,
  hasPrimaryDriverProfile: boolean,
  hasActiveLinks: boolean,
): NavSection[] {
  const permSet = new Set(effectivePermissions);
  const isSuperAdmin = roleKey === 'super_admin';

  const allowed = NAV_ITEMS.filter((item) => {
    const hiddenRoles = NAV_ITEM_HIDDEN_ROLES[item.id];
    if (hiddenRoles?.includes(roleKey)) return false;

    if (isSuperAdmin) return true;

    const reqs = NAV_ITEM_PERMISSION_REQUIREMENTS[item.id];
    if (reqs) {
      if (reqs.all && reqs.all.length > 0) {
        if (!reqs.all.every((p) => permSet.has(p))) return false;
      }
      if (reqs.any && reqs.any.length > 0) {
        if (!reqs.any.some((p) => permSet.has(p))) return false;
      }
    }

    const profileReqs = NAV_ITEM_PROFILE_TYPE_REQUIREMENTS[item.id];
    if (profileReqs && profileReqs.length > 0) {
      const hasMatchingProfileType = profileReqs.some((t) => profileTypes.includes(t));
      const hasMatchingRoleKey = profileReqs.some((t) => {
        if (t === 'DRIVER') return roleKey === 'driver' || roleKey === 'assistant_driver';
        if (t === 'ASSISTANT_DRIVER') return roleKey === 'assistant_driver';
        return false;
      });
      if (!hasMatchingProfileType && !hasMatchingRoleKey) return false;
      if (item.id.startsWith('driver-') || item.id.startsWith('my-')) {
        if (!hasPrimaryDriverProfile && !hasActiveLinks && !hasMatchingRoleKey) return false;
      }
    }

    return true;
  });

  allowed.sort((a, b) => a.priority - b.priority);

  const sections: NavSection[] = [];
  const grouped = new Map<string, NavItemDef[]>();

  for (const item of allowed) {
    const list = grouped.get(item.section) ?? [];
    list.push(item);
    grouped.set(item.section, list);
  }

  for (const sectionKey of ALL_SECTIONS) {
    const items = grouped.get(sectionKey);
    if (items && items.length > 0) {
      sections.push({
        section: sectionKey,
        label: NAV_SECTION_LABELS[sectionKey] ?? sectionKey,
        items,
      });
    }
  }

  return sections;
}

function buildQuickActions(
  roleKey: string,
  effectivePermissions: string[],
  profileTypes: string[],
  capabilities: Capabilities,
): QuickActionDef[] {
  const permSet = new Set(effectivePermissions);

  if (roleKey === 'super_admin') {
    return [
      { id: 'manage_users', label: 'Users', path: '/users', icon: 'Users', priority: 100 },
      { id: 'manage_roles', label: 'Roles', path: '/roles', icon: 'Roles', priority: 110 },
      { id: 'manage_trips', label: 'Manage Trips', path: '/trips', icon: 'Trips', priority: 200 },
      { id: 'view_finance', label: 'Finance', path: '/finance', icon: 'FinanceDashboard', priority: 300 },
    ];
  }

  const actions: QuickActionDef[] = [];

  if (capabilities.canUseDriverPortal && profileTypes.includes('DRIVER')) {
    if (permSet.has('driver_trip_create')) {
      actions.push({ id: 'create_trip', label: 'Create Trip', path: '/driver-portal/trips/new', icon: 'NewTrip', priority: 100 });
    }
    if (permSet.has('driver_vehicle_self_checkout') || permSet.has('driver_available_vehicle_select')) {
      actions.push({ id: 'checkout_vehicle', label: 'Take Vehicle', path: '/driver-portal/vehicles', icon: 'MyVehicle', priority: 110 });
    }
    if (permSet.has('driver_quick_fuel_create')) {
      actions.push({ id: 'add_fuel', label: 'Add Fuel', path: '/driver-portal/fuel/new', icon: 'MyFuel', priority: 120 });
    }
    if (permSet.has('driver_expense_create')) {
      actions.push({ id: 'claim_expense', label: 'Claim Expense', path: '/driver-portal/expenses/new', icon: 'MyExpenses', priority: 130 });
    }
    if (permSet.has('driver_document_upload')) {
      actions.push({ id: 'upload_document', label: 'Upload Document', path: '/driver-portal/documents/upload', icon: 'MyDocuments', priority: 140 });
    }
    if (permSet.has('driver_vehicle_issue_report')) {
      actions.push({ id: 'report_issue', label: 'Report Issue', path: '/driver-portal/vehicles/issue', icon: 'Issues', priority: 150 });
    }
  }

  if (capabilities.canReviewDriverSubmissions) {
    actions.push({ id: 'review_submissions', label: 'Review Submissions', path: '/driver-submissions', icon: 'Submissions', priority: 200 });
    if (permSet.has('driver_fuel_approve')) {
      actions.push({ id: 'approve_fuel', label: 'Approve Fuel', path: '/driver-submissions/fuel', icon: 'Fuel', priority: 210 });
    }
    if (permSet.has('driver_expense_approve')) {
      actions.push({ id: 'approve_expense', label: 'Approve Expenses', path: '/driver-submissions/expenses', icon: 'Expenses', priority: 220 });
    }
  }

  if (capabilities.canManageTrips) {
    actions.push({ id: 'manage_trips', label: 'Manage Trips', path: '/trips', icon: 'Trips', priority: 300 });
  }
  if (capabilities.canManageVehicles) {
    actions.push({ id: 'manage_vehicles', label: 'Vehicles', path: '/vehicles', icon: 'Vehicles', priority: 310 });
  }
  if (capabilities.canManageDrivers) {
    actions.push({ id: 'manage_drivers', label: 'Drivers', path: '/drivers', icon: 'Drivers', priority: 320 });
  }
  if (capabilities.canUseFinance) {
    actions.push({ id: 'view_finance', label: 'Finance', path: '/finance', icon: 'FinanceDashboard', priority: 400 });
  }
  if (capabilities.canManageUsers) {
    actions.push({ id: 'manage_users', label: 'Users', path: '/users', icon: 'Users', priority: 500 });
  }
  if (capabilities.canManageRoles) {
    actions.push({ id: 'manage_roles', label: 'Roles & Permissions', path: '/roles', icon: 'Roles', priority: 510 });
  }
  if (capabilities.canUseReports || capabilities.canViewReports) {
    actions.push({ id: 'view_reports', label: 'Reports', path: '/finance/reports', icon: 'Reports', priority: 520 });
  }

  actions.sort((a, b) => a.priority - b.priority);
  return actions;
}

function buildEmptyStates(workspaceType: WorkspaceType, capabilities: Capabilities, profileTypes: string[]): string[] {
  const states: string[] = [];

  if (workspaceType === 'DRIVER' && !profileTypes.includes('DRIVER')) {
    states.push('No active driver profile. Contact an admin to link your account to a driver.');
  }

  if (!capabilities.canUseDriverPortal && profileTypes.includes('DRIVER')) {
    states.push('Driver portal access is restricted. You may be missing required permissions.');
  }

  if (!capabilities.canManageTrips && !capabilities.canCreateTrips && workspaceType !== 'SUPER_ADMIN') {
    states.push('No trip management access. Contact an admin to grant trip permissions.');
  }

  return states;
}

function buildDiagnostics(roleKey: string, profileTypes: string[], effectivePermissions: string[], dataScopes: unknown[]): string[] {
  const diag: string[] = [];

  const driverPerms = effectivePermissions.filter(p => p.startsWith('driver_'));
  if (profileTypes.includes('DRIVER') && driverPerms.length === 0) {
    diag.push('Driver profile detected but no driver-related permissions found.');
  }

  if (profileTypes.includes('DRIVER') && !effectivePermissions.includes('driver_portal_view')) {
    diag.push('Missing driver_portal_view permission — driver portal will be limited.');
  }

  if (dataScopes.length === 0 && profileTypes.length === 0 && roleKey !== 'super_admin') {
    diag.push('No profile links or data scopes — access may be limited to role-based permissions only.');
  }

  return diag;
}

const WORKSPACE_CACHE_TTL_MS = 30000;
const workspaceCache = new Map<string, { expiresAt: number; value: WorkspaceResponse }>();

type PreloadedUser = {
  id: string;
  name: string;
  username: string | null;
  role: { id: string; name: string; key: string; status: string };
  permissionOverrides: { effect: string; permission: { key: string } }[];
  dataScopes: { id: string; scopeType: string; scopeId: string | null; accessLevel: string; expiresAt: Date | null }[];
  profileLinks: { id: string; profileType: string; profileId: string; isPrimary: boolean; status: string }[];
};

export async function getWorkspace(userId: string, preloadedUser?: PreloadedUser): Promise<WorkspaceResponse> {
  const cached = workspaceCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const user = preloadedUser ?? await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      permissionOverrides: {
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: { permission: true },
      },
      dataScopes: true,
      profileLinks: {
        where: { status: 'ACTIVE' },
        orderBy: [{ isPrimary: 'desc' }],
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const permResult = await getEffectivePermissions(userId);
  const effectivePermissions = permResult.effectivePermissions;
  // Derive profileTypes from preloaded profileLinks instead of querying DB
  const profileTypes = [...new Set(user.profileLinks.map(l => l.profileType))];
  const profileLinks = user.profileLinks;
  const hasActiveLinks = profileLinks.length > 0;
  const hasPrimaryDriverProfile = profileLinks.some(
    (l) => l.profileType === 'DRIVER' && l.isPrimary && l.status === 'ACTIVE',
  );

  // Derive driverId from preloaded profileLinks instead of querying DB
  const driverLink = user.profileLinks.find(l => l.profileType === 'DRIVER' && l.isPrimary)
    ?? user.profileLinks.find(l => l.profileType === 'DRIVER');
  const driverId = driverLink?.profileId ?? null;
  const workspaceType = determineWorkspaceType(user.role.key, profileTypes, effectivePermissions, hasActiveLinks);

  const capabilities = buildCapabilities(effectivePermissions, profileTypes);
  const navigation = buildNavigation(user.role.key, effectivePermissions, profileTypes, capabilities, hasPrimaryDriverProfile, hasActiveLinks);
  const quickActions = buildQuickActions(user.role.key, effectivePermissions, profileTypes, capabilities);
  const emptyStates = buildEmptyStates(workspaceType, capabilities, profileTypes);
  const diagnostics = buildDiagnostics(user.role.key, profileTypes, effectivePermissions, user.dataScopes);

  const primaryProfiles: PrimaryProfiles = {
    driver: null,
    mechanic: null,
    finance: null,
    collector: null,
  };

  if (driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, name: true, mobile: true, status: true },
    });
    primaryProfiles.driver = driver;
  }

  // Resolve primary user-based profiles (mechanic, finance, collector)
  const userBasedProfileTypes = ['MECHANIC', 'FINANCE', 'COLLECTOR'] as const;
  for (const pt of userBasedProfileTypes) {
    const link = user.profileLinks.find(l => l.profileType === pt && l.isPrimary)
      ?? user.profileLinks.find(l => l.profileType === pt);
    if (link) {
      const linkedUser = await prisma.user.findUnique({
        where: { id: link.profileId },
        select: { id: true, name: true },
      });
      if (linkedUser) {
        const key = pt.toLowerCase() as 'mechanic' | 'finance' | 'collector';
        primaryProfiles[key] = linkedUser;
      }
    }
  }

  const result: WorkspaceResponse = {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      roleKey: user.role.key,
    },
    workspaceType,
    profileLinks: profileLinks.map((l) => ({
      id: l.id,
      profileType: l.profileType,
      profileId: l.profileId,
      isPrimary: l.isPrimary,
      status: l.status,
    })),
    primaryProfiles,
    effectivePermissions,
    dataScopes: user.dataScopes.map((s) => ({
      id: s.id,
      scopeType: s.scopeType,
      scopeId: s.scopeId,
      accessLevel: s.accessLevel,
    })),
    capabilities,
    navigation,
    quickActions,
    emptyStates,
    diagnostics,
  };

  workspaceCache.set(userId, { expiresAt: Date.now() + WORKSPACE_CACHE_TTL_MS, value: result });
  return result;
}
