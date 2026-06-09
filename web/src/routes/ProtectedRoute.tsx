import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isBootstrapping) {
    return <div className="centered-state">Checking your session...</div>;
  }

  if (!auth.accessToken || !auth.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
