import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AccessDeniedPage } from '../pages/AccessDeniedPage';

type PermissionRouteProps = {
  requiredPermissions?: string[];
  requireAll?: boolean;
};

export function PermissionRoute({ requiredPermissions = [], requireAll = false }: PermissionRouteProps) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isBootstrapping) {
    return <div className="centered-state">Checking your session...</div>;
  }

  if (!auth.accessToken || !auth.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiredPermissions.length === 0) {
    return <Outlet />;
  }

  const hasAccess = requireAll
    ? requiredPermissions.every((p) => auth.hasPermission(p))
    : auth.hasAnyPermission(requiredPermissions);

  if (!hasAccess) {
    return <AccessDeniedPage />;
  }

  return <Outlet />;
}
