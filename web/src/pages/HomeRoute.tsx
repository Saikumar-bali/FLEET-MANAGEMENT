import { useAuth } from '../context/AuthContext';
import { DashboardPage } from './DashboardPage';
import { WorkspaceHome } from './workspace/WorkspaceHome';

/**
 * Landing route at "/". Renders the fleet-wide operational dashboard only
 * for roles that actually have dashboard_view (super_admin, admin, manager,
 * supervisor, viewer). Everyone else (driver, mechanic, finance, collector,
 * assistant_driver) lands on the existing role-aware WorkspaceHome instead —
 * their own nav/quick-actions, not someone else's fleet-wide numbers.
 */
export function HomeRoute() {
  const auth = useAuth();
  return auth.hasPermission('dashboard_view') ? <DashboardPage /> : <WorkspaceHome />;
}
