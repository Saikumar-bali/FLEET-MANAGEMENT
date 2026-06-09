import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

export function AppLayout() {
  const auth = useAuth();

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Phase 1</p>
            <h2 className="page-title">Authentication and dynamic RBAC</h2>
          </div>
          <button type="button" className="secondary-button" onClick={() => void auth.logout()}>
            Sign out
          </button>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
