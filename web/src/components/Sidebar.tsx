import { NavLink } from 'react-router-dom';
import { navigationItems } from '../config/navigation';
import { useAuth } from '../context/AuthContext';

export function Sidebar() {
  const auth = useAuth();
  const visibleItems = navigationItems.filter((item) => auth.hasAnyPermission(item.permissionKeys));

  return (
    <aside className="sidebar">
      <div>
        <p className="eyebrow">Fleet Management</p>
        <h1 className="sidebar-title">Access Foundation</h1>
        <p className="sidebar-copy">
          Dynamic roles, permissions, and session controls live here first.
        </p>
      </div>

      <nav className="nav-list" aria-label="Primary">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item${isActive ? ' nav-item-active' : ''}`}
          >
            <span>{item.label}</span>
            <small>{item.description}</small>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-profile">
        <p className="profile-name">{auth.user?.name}</p>
        <p className="profile-role">{auth.user?.role.name}</p>
        <p className="profile-meta">{auth.permissions.length} active permissions</p>
      </div>
    </aside>
  );
}
