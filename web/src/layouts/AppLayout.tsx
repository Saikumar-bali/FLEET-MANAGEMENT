import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { navigationItems } from '../config/navigation';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export function AppLayout() {
  const auth = useAuth();
  const location = useLocation();

  const currentItem = navigationItems.find((item) =>
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
  );

  const pageTitle = currentItem?.pageTitle ?? 'Fleet management';
  const pageDescription = currentItem?.pageDescription ?? 'Workspace';
  const sectionLabel = currentItem?.section ?? 'Workspace';

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-title-group">
            <p className="topbar-eyebrow">{sectionLabel}</p>
            <h2 className="page-title">{pageTitle}</h2>
            <p className="topbar-copy">{pageDescription}</p>
          </div>
          <div className="topbar-meta">
            <StatusBadge status={auth.user?.role.key === 'super_admin' ? 'SYSTEM' : auth.user?.role.status ?? 'ACTIVE'} />
            <span className="table-secondary">{auth.user?.role.name}</span>
            <button type="button" className="secondary-button" onClick={() => void auth.logout()}>
              Sign out
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
