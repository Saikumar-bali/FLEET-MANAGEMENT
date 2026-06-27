import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AccessDeniedPage } from '../pages/AccessDeniedPage';
import { AccountNotLinkedPage } from '../pages/AccountNotLinkedPage';

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

  // Driver role but no userDriverId — account not linked
  if (!auth.user.userDriverId) {
    return <AccountNotLinkedPage />;
  }

  return <Outlet />;
}
