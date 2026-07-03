import { useAuth } from '../context/AuthContext';
import { DashboardPage } from './DashboardPage';
import { RoleDashboardPage } from './RoleDashboardPage';

/**
 * Landing route at "/". Users with fleet-wide dashboard permission keep the
 * command-center overview. Other roles now get a professional permission-aware
 * dashboard instead of only quick-action tiles.
 */
export function HomeRoute() {
  const auth = useAuth();
  return auth.hasPermission('dashboard_view') ? <DashboardPage /> : <RoleDashboardPage />;
}
