export type DriverCapability = {
  id: string;
  label: string;
  permission: string;
  group: string;
  description: string;
  category: 'portal' | 'trips' | 'fuel' | 'expenses' | 'vehicle' | 'maintenance';
};

export const DRIVER_CAPABILITIES: DriverCapability[] = [
  { id: 'view_dashboard', label: 'View Dashboard', permission: 'driver_my_dashboard_view', group: 'Portal', description: 'View personal driver dashboard', category: 'portal' },
  { id: 'view_my_trips', label: 'View My Trips', permission: 'driver_my_trips_view', group: 'Portal', description: 'View own trip list', category: 'portal' },
  { id: 'view_documents', label: 'View Documents', permission: 'driver_my_documents_view', group: 'Portal', description: 'View own documents', category: 'portal' },
  { id: 'view_profile', label: 'View Profile', permission: 'driver_my_profile_view', group: 'Portal', description: 'View own profile', category: 'portal' },
  { id: 'create_trip', label: 'Create Trip', permission: 'driver_trip_create', group: 'Trips', description: 'Create new trips', category: 'trips' },
  { id: 'view_trip', label: 'View Trip Details', permission: 'driver_trip_view', group: 'Trips', description: 'View trip details', category: 'trips' },
  { id: 'start_trip', label: 'Start Trip', permission: 'driver_trip_start', group: 'Trips', description: 'Start a trip', category: 'trips' },
  { id: 'end_trip', label: 'End Trip', permission: 'driver_trip_end', group: 'Trips', description: 'End a trip', category: 'trips' },
  { id: 'cancel_trip', label: 'Cancel Trip', permission: 'driver_trip_cancel', group: 'Trips', description: 'Cancel a trip', category: 'trips' },
  { id: 'upload_pod', label: 'Upload POD', permission: 'driver_pod_upload', group: 'Trips', description: 'Upload proof of delivery', category: 'trips' },
  { id: 'upload_lr', label: 'Upload LR', permission: 'driver_lr_upload', group: 'Trips', description: 'Upload lorry receipt', category: 'trips' },
  { id: 'upload_challan', label: 'Upload Challan', permission: 'driver_challan_upload', group: 'Trips', description: 'Upload challan document', category: 'trips' },
  { id: 'upload_eway_bill', label: 'Upload E-Way Bill', permission: 'driver_eway_bill_upload', group: 'Trips', description: 'Upload e-way bill', category: 'trips' },
  { id: 'upload_trip_doc', label: 'Upload Trip Document', permission: 'driver_trip_document_upload', group: 'Trips', description: 'Upload trip documents', category: 'trips' },
  { id: 'quick_fuel', label: 'Quick Fuel Entry', permission: 'driver_quick_fuel_create', group: 'Fuel', description: 'Create quick fuel entry', category: 'fuel' },
  { id: 'upload_fuel_bill', label: 'Upload Fuel Bill', permission: 'driver_fuel_receipt_upload', group: 'Fuel', description: 'Upload fuel receipt', category: 'fuel' },
  { id: 'view_fuel', label: 'View Fuel Entries', permission: 'driver_fuel_view_own', group: 'Fuel', description: 'View own fuel entries', category: 'fuel' },
  { id: 'create_expense', label: 'Create Expense', permission: 'driver_expense_create', group: 'Expenses', description: 'Create expense claim', category: 'expenses' },
  { id: 'view_expenses', label: 'View Expenses', permission: 'driver_expense_view_own', group: 'Expenses', description: 'View own expenses', category: 'expenses' },
  { id: 'view_vehicle', label: 'View Assigned Vehicle', permission: 'driver_assigned_vehicle_view', group: 'Vehicle', description: 'View assigned vehicle details', category: 'vehicle' },
  { id: 'vehicle_inspection', label: 'Vehicle Inspection', permission: 'driver_vehicle_inspection_create', group: 'Vehicle', description: 'Submit vehicle inspection', category: 'vehicle' },
  { id: 'report_issue', label: 'Report Vehicle Issue', permission: 'driver_vehicle_issue_report', group: 'Vehicle', description: 'Report vehicle issue', category: 'vehicle' },
  { id: 'report_maintenance', label: 'Report Maintenance', permission: 'driver_maintenance_report_create', group: 'Maintenance', description: 'Report maintenance request', category: 'maintenance' },
  { id: 'report_repair', label: 'Report Repair', permission: 'driver_repair_report_create', group: 'Maintenance', description: 'Report repair issue', category: 'maintenance' },
];

export const DRIVER_CAPABILITY_GROUPS = [
  { key: 'Portal', label: 'Driver Portal', description: 'Basic portal access permissions' },
  { key: 'Trips', label: 'Driver Trips', description: 'Trip creation, management, and document uploads' },
  { key: 'Fuel', label: 'Driver Fuel', description: 'Fuel entry creation and receipt uploads' },
  { key: 'Expenses', label: 'Driver Expenses', description: 'Expense creation and viewing' },
  { key: 'Vehicle', label: 'Driver Vehicle', description: 'Vehicle inspection, issue reporting, and viewing' },
  { key: 'Maintenance', label: 'Maintenance / Repair', description: 'Maintenance and repair reporting' },
];

export const DRIVER_CAPABILITY_MAP: Record<string, string> = Object.fromEntries(
  DRIVER_CAPABILITIES.map((c) => [c.permission, c.label]),
);

export function getCapabilitiesByGroup(): Record<string, DriverCapability[]> {
  const groups: Record<string, DriverCapability[]> = {};
  for (const cap of DRIVER_CAPABILITIES) {
    groups[cap.group] = groups[cap.group] ?? [];
    groups[cap.group].push(cap);
  }
  return groups;
}

export function getCapabilityForPermission(permissionKey: string): DriverCapability | undefined {
  return DRIVER_CAPABILITIES.find((c) => c.permission === permissionKey);
}
