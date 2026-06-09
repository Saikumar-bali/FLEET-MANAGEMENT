import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { AppLayout } from '../layouts/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { RolesPage } from '../pages/RolesPage';
import { UsersPage } from '../pages/UsersPage';
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
