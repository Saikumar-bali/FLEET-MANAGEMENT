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

export interface Capabilities {
  canUseDriverPortal: boolean;
  canCreateDriverTrip: boolean;
  canSelfCheckoutVehicle: boolean;
  canViewAvailableVehicles: boolean;
  canReviewDriverSubmissions: boolean;
  canUseFinance: boolean;
  canUseMaintenance: boolean;
  canUseAdmin: boolean;
  canViewReports: boolean;
  canManageTrips: boolean;
  canManageVehicles: boolean;
  canManageDrivers: boolean;
  canManageAssets: boolean;
  canManageFuel: boolean;
  canManageExpenses: boolean;
  canManageMaintenance: boolean;
  canManageRepairs: boolean;
  canManageCompliance: boolean;
  canManageDocuments: boolean;
  canManageRoles: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canReviewFuel: boolean;
  canReviewExpenses: boolean;
  canReviewDocuments: boolean;
  canReviewIssues: boolean;
  canReviewInspections: boolean;
  canCreateTrips: boolean;
  canUseReports: boolean;
  canExportReports: boolean;
}

export interface NavItemDef {
  id: string;
  label: string;
  path: string;
  icon: string;
  section: string;
  priority: number;
}

export interface NavSection {
  section: string;
  label: string;
  items: NavItemDef[];
}

export interface QuickActionDef {
  id: string;
  label: string;
  path: string;
  icon: string;
  priority: number;
}

export interface PrimaryProfiles {
  driver: { id: string; name: string; mobile: string; status: string } | null;
  mechanic: { id: string; name: string } | null;
  finance: { id: string; name: string } | null;
  collector: { id: string; name: string } | null;
}

export interface ProfileLinkRecord {
  id: string;
  profileType: string;
  profileId: string;
  isPrimary: boolean;
  status: string;
}

export interface DataScopeRecord {
  id: string;
  scopeType: string;
  scopeId: string | null;
  accessLevel: string;
}

export interface WorkspaceResponse {
  user: {
    id: string;
    name: string;
    username: string | null;
    roleKey: string;
  };
  workspaceType: WorkspaceType;
  profileLinks: ProfileLinkRecord[];
  primaryProfiles: PrimaryProfiles;
  effectivePermissions: string[];
  dataScopes: DataScopeRecord[];
  capabilities: Capabilities;
  navigation: NavSection[];
  quickActions: QuickActionDef[];
  emptyStates: string[];
  diagnostics: string[];
}
