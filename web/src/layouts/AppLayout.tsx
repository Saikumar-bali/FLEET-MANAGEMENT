import { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { navigationItems } from '../config/navigation';
import { SettingsPopover, ThemeSubmenu } from '../components/SettingsPopover';
import { AccountMenu } from '../components/AccountMenu';

const COLLAPSE_KEY = 'fleet-studio-sidebar-collapsed';

function getStoredCollapse(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function AppLayout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(getStoredCollapse);

  const [settingsAnchor, setSettingsAnchor] = useState<DOMRect | null>(null);
  const [showThemeSubmenu, setShowThemeSubmenu] = useState(false);
  const [themeSubmenuAnchor, setThemeSubmenuAnchor] = useState<DOMRect | null>(null);
  const [accountAnchor, setAccountAnchor] = useState<DOMRect | null>(null);

  const currentItem = navigationItems.find((item) =>
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
  );

  const pageTitle = currentItem?.pageTitle ?? 'Fleet Management';
  const pageDescription = currentItem?.pageDescription ?? 'Workspace';
  const sectionLabel = currentItem?.section ?? 'Workspace';

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handleOpenSettings = useCallback((anchor: HTMLElement) => {
    setSettingsAnchor(anchor.getBoundingClientRect());
    setShowThemeSubmenu(false);
  }, []);

  const handleOpenThemeSubmenu = useCallback((anchor: HTMLElement) => {
    setThemeSubmenuAnchor(anchor.getBoundingClientRect());
    setShowThemeSubmenu(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsAnchor(null);
    setShowThemeSubmenu(false);
    setThemeSubmenuAnchor(null);
  }, []);

  const handleOpenAccount = useCallback((anchor: HTMLElement) => {
    setAccountAnchor(anchor.getBoundingClientRect());
  }, []);

  const handleCloseAccount = useCallback(() => {
    setAccountAnchor(null);
  }, []);

  return (
    <div className={`app-shell${isCollapsed ? ' sidebar-collapsed' : ''}`}>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onOpenSettings={handleOpenSettings}
        onOpenAccount={handleOpenAccount}
      />
      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-title-group">
            <div className="topbar-mobile-row">
              <button
                type="button"
                className="nav-toggle-button"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open navigation"
              >
                Menu
              </button>
              <span className="topbar-mobile-brand">Fleet Management Studio</span>
            </div>
            <p className="topbar-eyebrow">{sectionLabel}</p>
            <h2 className="page-title">{pageTitle}</h2>
            <p className="topbar-copy">{pageDescription}</p>
          </div>
        </header>
        <Outlet />
      </main>

      {settingsAnchor && !showThemeSubmenu && (
        <SettingsPopover anchorRect={settingsAnchor} onClose={handleCloseSettings} onThemeClick={handleOpenThemeSubmenu} />
      )}
      {showThemeSubmenu && themeSubmenuAnchor && (
        <ThemeSubmenu anchorRect={themeSubmenuAnchor} onClose={handleCloseSettings} />
      )}
      {accountAnchor && (
        <AccountMenu anchorRect={accountAnchor} onClose={handleCloseAccount} />
      )}
    </div>
  );
}
