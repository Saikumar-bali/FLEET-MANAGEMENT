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
