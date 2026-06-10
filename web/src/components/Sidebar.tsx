import { NavLink } from 'react-router-dom';
import { navigationItems } from '../config/navigation';
import { useAuth } from '../context/AuthContext';

export function Sidebar() {
  const auth = useAuth();
  const visibleItems = navigationItems.filter((item) => auth.hasAnyPermission(item.permissionKeys));
  const groupedItems = visibleItems.reduce<Record<string, typeof visibleItems>>((groups, item) => {
    const key = item.section ?? 'Workspace';
    groups[key] = groups[key] ?? [];
    groups[key].push(item);
    return groups;
  }, {});

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <p className="eyebrow">Fleet Management</p>
        <h1 className="sidebar-title">Access Foundation</h1>
        <p className="sidebar-copy">
          Enterprise access administration and master-data controls.
        </p>
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
          <p className="profile-role">{auth.user?.role.name}</p>
          <p className="profile-meta">{auth.permissions.length} active permissions</p>
        </div>
      </div>
    </aside>
  );
}
