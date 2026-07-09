export interface NavItem {
  label: string;
  path: string;
  icon: string;
  permission?: string;
  children?: NavItem[];
}

export const NAVIGATION: NavItem[] = [
  { label: "Dashboard", path: "/", icon: "LayoutDashboard", permission: "dashboard:read" },
  {
    label: "Fleet",
    path: "/fleet",
    icon: "Truck",
    children: [
      { label: "Vehicles", path: "/vehicles", icon: "Car", permission: "vehicles:read" },
      { label: "Drivers", path: "/drivers", icon: "Users", permission: "drivers:read" },
      { label: "Assets", path: "/assets", icon: "Package", permission: "assets:read" },
      { label: "Compliance", path: "/compliance", icon: "ShieldCheck", permission: "compliance:read" },
    ],
  },
  {
    label: "Operations",
    path: "/ops",
    icon: "Route",
    children: [
      { label: "Trips", path: "/trips", icon: "MapPin", permission: "trips:read" },
      { label: "Dispatch", path: "/dispatch", icon: "Radio", permission: "dispatch:read" },
      { label: "Fuel", path: "/fuel", icon: "Fuel", permission: "fuel:read" },
      { label: "Expenses", path: "/expenses", icon: "Receipt", permission: "expenses:read" },
    ],
  },
  {
    label: "Maintenance",
    path: "/maintenance",
    icon: "Wrench",
    children: [
      { label: "Maintenance", path: "/maintenance", icon: "Settings", permission: "maintenance:read" },
      { label: "Repairs", path: "/repairs", icon: "Hammer", permission: "repairs:read" },
    ],
  },
  {
    label: "Finance",
    path: "/finance",
    icon: "Banknote",
    permission: "finance:read",
    children: [
      { label: "Transactions", path: "/finance/transactions", icon: "ArrowLeftRight" },
      { label: "Accounts", path: "/finance/accounts", icon: "Wallet" },
      { label: "Vendors", path: "/finance/vendors", icon: "Building2" },
      { label: "Customers", path: "/finance/customers", icon: "UserCircle" },
      { label: "Trip Billing", path: "/finance/trip-billing", icon: "FileText" },
      { label: "Payments", path: "/finance/payments", icon: "CreditCard" },
      { label: "Categories", path: "/finance/categories", icon: "Tags" },
    ],
  },
  { label: "Documents", path: "/documents", icon: "FileStack", permission: "documents:read" },
  {
    label: "Driver Portal",
    path: "/driver-portal",
    icon: "Smartphone",
    permission: "driver_portal:read",
    children: [
      { label: "My Trips", path: "/driver-portal/trips", icon: "MapPin" },
      { label: "My Vehicles", path: "/driver-portal/vehicles", icon: "Car" },
      { label: "Fuel Entry", path: "/driver-portal/fuel", icon: "Fuel" },
      { label: "Expenses", path: "/driver-portal/expenses", icon: "Receipt" },
      { label: "Documents", path: "/driver-portal/documents", icon: "FileText" },
    ],
  },
  {
    label: "Submissions",
    path: "/submissions",
    icon: "Inbox",
    permission: "submissions:read",
    children: [
      { label: "Fuel", path: "/submissions/fuel", icon: "Fuel" },
      { label: "Expenses", path: "/submissions/expenses", icon: "Receipt" },
      { label: "Documents", path: "/submissions/documents", icon: "FileText" },
      { label: "Issues", path: "/submissions/issues", icon: "AlertTriangle" },
      { label: "Inspections", path: "/submissions/inspections", icon: "ClipboardCheck" },
    ],
  },
  {
    label: "Admin",
    path: "/admin",
    icon: "Settings",
    permission: "users:read",
    children: [
      { label: "Users", path: "/users", icon: "Users" },
      { label: "Roles", path: "/roles", icon: "Shield" },
      { label: "Permissions", path: "/permissions", icon: "Key" },
      { label: "Access Control", path: "/access", icon: "Lock" },
    ],
  },
  { label: "Workspace", path: "/workspace", icon: "Briefcase", permission: "workspace:read" },
];
