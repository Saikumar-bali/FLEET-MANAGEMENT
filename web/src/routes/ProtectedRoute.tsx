import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AccessDeniedPage } from '../pages/AccessDeniedPage';

type ProtectedRouteProps = {
  requiredPermissions?: string[];
};

export function ProtectedRoute({ requiredPermissions = [] }: ProtectedRouteProps) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isBootstrapping) {
    return <div className="centered-state">Checking your session...</div>;
  }

  if (!auth.accessToken || !auth.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!auth.hasAnyPermission(requiredPermissions)) {
    return <AccessDeniedPage />;
  }

  return <Outlet />;
}
