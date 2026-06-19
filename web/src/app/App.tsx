import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { AppLayout } from '../layouts/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { RolesPage } from '../pages/RolesPage';
import { UsersPage } from '../pages/UsersPage';
import { VehiclesPage } from '../pages/VehiclesPage';
import { VehicleDetailPage } from '../pages/VehicleDetailPage';
import { DriversPage } from '../pages/DriversPage';
import { DriverDetailPage } from '../pages/DriverDetailPage';
import { AssetsPage } from '../pages/AssetsPage';
import { AssetDetailPage } from '../pages/AssetDetailPage';
import { AssetCategoriesPage } from '../pages/AssetCategoriesPage';
import { TripsPage } from '../pages/TripsPage';
import { TripDetailPage } from '../pages/TripDetailPage';
import { WorkflowListPage } from '../pages/WorkflowListPage';
import { WorkflowDetailPage } from '../pages/WorkflowDetailPage';
import { MaintenanceListPage } from '../pages/MaintenanceListPage';
import { MaintenanceDetailPage } from '../pages/MaintenanceDetailPage';
import { RepairListPage } from '../pages/RepairListPage';
import { RepairDetailPage } from '../pages/RepairDetailPage';
import { ProtectedRoute } from '../routes/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route element={<ProtectedRoute requiredPermissions={['vehicle_view']} />}>
                <Route path="/vehicles" element={<VehiclesPage />} />
                <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermissions={['driver_view']} />}>
                <Route path="/drivers" element={<DriversPage />} />
                <Route path="/drivers/:id" element={<DriverDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermissions={['asset_view']} />}>
                <Route path="/assets" element={<AssetsPage />} />
                <Route path="/assets/:id" element={<AssetDetailPage />} />
                <Route path="/asset-categories" element={<AssetCategoriesPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermissions={['trip_view']} />}>
                <Route path="/trips" element={<TripsPage />} />
                <Route path="/trips/:id" element={<TripDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermissions={['fuel_view']} />}>
                <Route path="/fuel" element={<WorkflowListPage kind="fuel" />} />
                <Route path="/fuel/:id" element={<WorkflowDetailPage kind="fuel" />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermissions={['expense_view']} />}>
                <Route path="/expenses" element={<WorkflowListPage kind="expense" />} />
                <Route path="/expenses/:id" element={<WorkflowDetailPage kind="expense" />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermissions={['maintenance_view']} />}>
                <Route path="/maintenance" element={<MaintenanceListPage />} />
                <Route path="/maintenance/:id" element={<MaintenanceDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermissions={['repair_view']} />}>
                <Route path="/repairs" element={<RepairListPage />} />
                <Route path="/repairs/:id" element={<RepairDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermissions={['role_view']} />}>
                <Route path="/roles" element={<RolesPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermissions={['user_view']} />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
