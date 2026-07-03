import { RoleDashboardPage } from './RoleDashboardPage';

/**
 * Landing route at "/". Every authenticated user now receives a professional
 * dashboard shaped by their role and effective permissions.
 */
export function HomeRoute() {
  return <RoleDashboardPage />;
}
