import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type ApiResponse } from "./client";

// Generic list hook factory
export const createListHook = <T,>(endpoint: string, key: string) => {
  return (params?: Record<string, string>) =>
    useQuery<ApiResponse<{ items: T[]; pagination: any }>>({
      queryKey: [key, params],
      queryFn: () => apiClient.get(endpoint, params),
    });
};

// Generic detail hook factory
export const createDetailHook = <T,>(endpoint: string, key: string) => {
  return (id: string) =>
    useQuery<ApiResponse<T>>({
      queryKey: [key, id],
      queryFn: () => apiClient.get(`${endpoint}/${id}`),
      enabled: !!id,
    });
};

// Auth hooks
export const useLogin = () => {
  return useMutation({
    mutationFn: (credentials: { identifier: string; password: string }) =>
      apiClient.post("/auth/login", credentials),
  });
};

export const useMe = () => {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiClient.get("/auth/me"),
    retry: false,
    enabled: !!localStorage.getItem("accessToken"),
  });
};

// Module hooks
export const useVehicles = createListHook("/vehicles", "vehicles");
export const useVehicle = createDetailHook("/vehicles", "vehicles");
export const useDrivers = createListHook("/drivers", "drivers");
export const useDriver = createDetailHook("/drivers", "drivers");
export const useTrips = createListHook("/trips", "trips");
export const useTrip = createDetailHook("/trips", "trips");
export const useFuelEntries = createListHook("/fuel", "fuel");
export const useFuelEntry = createDetailHook("/fuel", "fuel");
export const useExpenses = createListHook("/expenses", "expenses");
export const useExpense = createDetailHook("/expenses", "expenses");
export const useMaintenance = createListHook("/maintenance", "maintenance");
export const useMaintenanceItem = createDetailHook("/maintenance", "maintenance");
export const useRepairs = createListHook("/repairs", "repairs");
export const useRepair = createDetailHook("/repairs", "repairs");
export const useDocuments = createListHook("/documents", "documents");
export const useFinanceAccounts = createListHook("/finance/accounts", "finance-accounts");
export const useFinanceTransactions = createListHook("/finance/transactions", "finance-transactions");
export const useFinanceVendors = createListHook("/finance/vendors", "finance-vendors");
export const useFinanceCustomers = createListHook("/finance/customers", "finance-customers");
export const useFinanceCategories = createListHook("/finance/categories", "finance-categories");
export const useFinancePayments = createListHook("/finance/payments", "finance-payments");
export const useFinanceTripBillings = createListHook("/finance/trip-billings", "finance-trip-billings");
export const useUsers = createListHook("/users", "users");
export const useUser = createDetailHook("/users", "users");
export const useRoles = createListHook("/roles", "roles");
export const usePermissions = createListHook("/permissions", "permissions");
export const useAssetCategories = createListHook("/assets/categories", "asset-categories");
export const useAssets = createListHook("/assets", "assets");

export const useDashboardOverview = () =>
  useQuery({ queryKey: ["dashboard"], queryFn: () => apiClient.get("/dashboard/overview") });

export const useDispatchBoard = () =>
  useQuery({ queryKey: ["dispatch"], queryFn: () => apiClient.get("/dispatch/board") });

export const useComplianceDashboard = () =>
  useQuery({ queryKey: ["compliance"], queryFn: () => apiClient.get("/compliance/dashboard") });

export const useComplianceExpiring = () =>
  useQuery({ queryKey: ["compliance-expiring"], queryFn: () => apiClient.get("/compliance/alerts/expiring") });

export const useComplianceExpired = () =>
  useQuery({ queryKey: ["compliance-expired"], queryFn: () => apiClient.get("/compliance/alerts/expired") });

export const useDriverContext = () =>
  useQuery({ queryKey: ["driver-context"], queryFn: () => apiClient.get("/me/driver-context") });

export const useDriverTrips = () =>
  useQuery({ queryKey: ["driver-trips"], queryFn: () => apiClient.get("/me/driver-trips") });

export const useDriverFuel = () =>
  useQuery({ queryKey: ["driver-fuel"], queryFn: () => apiClient.get("/me/driver-fuel") });

export const useDriverExpenses = () =>
  useQuery({ queryKey: ["driver-expenses"], queryFn: () => apiClient.get("/me/driver-expenses") });

export const useDriverDocuments = () =>
  useQuery({ queryKey: ["driver-documents"], queryFn: () => apiClient.get("/me/driver-documents") });

export const useDriverVehicles = () =>
  useQuery({ queryKey: ["driver-vehicles"], queryFn: () => apiClient.get("/me/driver-vehicles") });

export const useSubmissions = (type: string) =>
  useQuery({
    queryKey: ["submissions", type],
    queryFn: () => apiClient.get(`/driver-submissions/${type}`),
  });

export const useWorkspace = () =>
  useQuery({ queryKey: ["workspace"], queryFn: () => apiClient.get("/me/workspace") });

export const useNotifications = () =>
  useQuery({ queryKey: ["notifications"], queryFn: () => apiClient.get("/me/notifications") });

export const useUnreadCount = () =>
  useQuery({ queryKey: ["notifications-count"], queryFn: () => apiClient.get("/me/notifications/unread-count") });
