import { NavLink } from 'react-router-dom';
import { navigationItems } from '../config/navigation';
import { useAuth } from '../context/AuthContext';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const auth = useAuth();
  const visibleItems = navigationItems.filter((item) => auth.hasAnyPermission(item.permissionKeys));
  const groupedItems = visibleItems.reduce<Record<string, typeof visibleItems>>((groups, item) => {
    const key = item.section ?? 'Workspace';
    groups[key] = groups[key] ?? [];
    groups[key].push(item);
    return groups;
  }, {});

  return (
    <>
      <button
        type="button"
        className={`sidebar-backdrop${isOpen ? ' sidebar-backdrop-open' : ''}`}
        aria-label="Close navigation"
        onClick={onClose}
      />
      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand-row">
            <div className="sidebar-brand-mark">HF</div>
            <button type="button" className="sidebar-close-button" onClick={onClose}>
              Close
            </button>
          </div>
          <h1 className="sidebar-title">Hippofleet</h1>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section}>
              <p className="sidebar-section-label">{section}</p>
              <div className="sidebar-nav">
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) => `nav-item${isActive ? ' nav-item-active' : ''}`}
                  >
                    <span>{item.label}</span>
                    <small>{item.description}</small>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-profile">
            <p className="profile-name">{auth.user?.name}</p>
            <p className="profile-meta">{auth.user?.username ? `@${auth.user.username}` : auth.user?.email}</p>
            <p className="profile-role">{auth.user?.role.name}</p>
            <p className="profile-meta">{auth.permissions.length} active permissions</p>
          </div>
        </div>
      </aside>
    </>
  );
}
