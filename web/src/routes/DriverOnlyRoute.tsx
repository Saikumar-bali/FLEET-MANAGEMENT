import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AccessDeniedPage } from '../pages/AccessDeniedPage';

export function DriverOnlyRoute() {
  const auth = useAuth();

  if (auth.isBootstrapping) {
    return <div className="centered-state">Checking your session...</div>;
  }

  if (!auth.accessToken || !auth.user) {
    return <Navigate to="/login" replace />;
  }

  if (auth.user.role?.key !== 'driver') {
    return <AccessDeniedPage />;
  }

  return <Outlet />;
}
