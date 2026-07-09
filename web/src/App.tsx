import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppLayout } from "./components/Layout/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { VehiclesPage } from "./pages/VehiclesPage";
import { VehicleDetailPage } from "./pages/VehicleDetailPage";
import { DriversPage } from "./pages/DriversPage";
import { DriverDetailPage } from "./pages/DriverDetailPage";
import { TripsPage } from "./pages/TripsPage";
import { TripDetailPage } from "./pages/TripDetailPage";
import { DispatchPage } from "./pages/DispatchPage";
import { FuelPage } from "./pages/FuelPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { RepairsPage } from "./pages/RepairsPage";
import { FinancePage } from "./pages/FinancePage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { CompliancePage } from "./pages/CompliancePage";
import { DriverPortalPage } from "./pages/DriverPortalPage";
import { DriverPortalTripsPage } from "./pages/DriverPortalTripsPage";
import { DriverPortalFuelPage } from "./pages/DriverPortalFuelPage";
import { SubmissionsPage } from "./pages/SubmissionsPage";
import { UsersPage } from "./pages/UsersPage";
import { RolesPage } from "./pages/RolesPage";
import { AccessControlPage } from "./pages/AccessControlPage";
import { WorkspacePage } from "./pages/WorkspacePage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

function ProtectedRoute({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const { user, isLoading, permissions } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (permission && !permissions.includes(permission) && !permissions.includes("*")) return <Navigate to="/access-denied" />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="vehicles" element={<ProtectedRoute permission="vehicles:read"><VehiclesPage /></ProtectedRoute>} />
        <Route path="vehicles/:id" element={<ProtectedRoute permission="vehicles:read"><VehicleDetailPage /></ProtectedRoute>} />
        <Route path="drivers" element={<ProtectedRoute permission="drivers:read"><DriversPage /></ProtectedRoute>} />
        <Route path="drivers/:id" element={<ProtectedRoute permission="drivers:read"><DriverDetailPage /></ProtectedRoute>} />
        <Route path="trips" element={<ProtectedRoute permission="trips:read"><TripsPage /></ProtectedRoute>} />
        <Route path="trips/:id" element={<ProtectedRoute permission="trips:read"><TripDetailPage /></ProtectedRoute>} />
        <Route path="dispatch" element={<ProtectedRoute permission="dispatch:read"><DispatchPage /></ProtectedRoute>} />
        <Route path="fuel" element={<ProtectedRoute permission="fuel:read"><FuelPage /></ProtectedRoute>} />
        <Route path="expenses" element={<ProtectedRoute permission="expenses:read"><ExpensesPage /></ProtectedRoute>} />
        <Route path="maintenance" element={<ProtectedRoute permission="maintenance:read"><MaintenancePage /></ProtectedRoute>} />
        <Route path="repairs" element={<ProtectedRoute permission="repairs:read"><RepairsPage /></ProtectedRoute>} />
        <Route path="finance/*" element={<ProtectedRoute permission="finance:read"><FinancePage /></ProtectedRoute>} />
        <Route path="documents" element={<ProtectedRoute permission="documents:read"><DocumentsPage /></ProtectedRoute>} />
        <Route path="compliance" element={<ProtectedRoute permission="compliance:read"><CompliancePage /></ProtectedRoute>} />
        <Route path="driver-portal" element={<ProtectedRoute permission="driver_portal:read"><DriverPortalPage /></ProtectedRoute>} />
        <Route path="driver-portal/trips" element={<ProtectedRoute permission="driver_portal:read"><DriverPortalTripsPage /></ProtectedRoute>} />
        <Route path="driver-portal/fuel" element={<ProtectedRoute permission="driver_portal:read"><DriverPortalFuelPage /></ProtectedRoute>} />
        <Route path="submissions/*" element={<ProtectedRoute permission="submissions:read"><SubmissionsPage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute permission="users:read"><UsersPage /></ProtectedRoute>} />
        <Route path="roles" element={<ProtectedRoute permission="roles:read"><RolesPage /></ProtectedRoute>} />
        <Route path="access" element={<ProtectedRoute permission="access:read"><AccessControlPage /></ProtectedRoute>} />
        <Route path="workspace" element={<ProtectedRoute permission="workspace:read"><WorkspacePage /></ProtectedRoute>} />
        <Route path="access-denied" element={<div className="p-8 text-center"><h1 className="text-2xl font-bold text-red-600">Access Denied</h1><p>You don't have permission to access this page.</p></div>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
