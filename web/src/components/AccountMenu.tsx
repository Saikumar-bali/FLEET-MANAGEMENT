import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

type AccountMenuProps = {
  anchorRect: DOMRect;
  onClose: () => void;
};

export function AccountMenu({ anchorRect, onClose }: AccountMenuProps) {
  const auth = useAuth();
  const navigate = useNavigate();

  const menuHeight = 260;
  const viewportHeight = window.innerHeight;

  let top = anchorRect.top;
  if (top + menuHeight > viewportHeight - 16) {
    top = anchorRect.bottom - menuHeight;
  }
  if (top < 16) top = 16;

  const left = anchorRect.right + 4;

  const handleSignOut = async () => {
    onClose();
    await auth.logout();
  };

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div className="popover" style={{ top, left, minWidth: 260 }}>
        <div className="account-menu-header">
          <div className="account-menu-name">{auth.user?.name || 'User'}</div>
          <div className="account-menu-identifier">{auth.user?.username ? `@${auth.user.username}` : auth.user?.email || ''}</div>
          <div className="account-menu-meta">{auth.user?.role.name} ({auth.user?.role.key})</div>
        </div>

        <div className="popover-divider" />

        <button type="button" className="popover-row" onClick={() => handleNavigate('/my-access')}>
          <span className="popover-row-label">My Access</span>
          <span className="popover-row-desc">Permissions, scopes, and visible menus</span>
        </button>

        <div className="popover-divider" />

        <button type="button" className="popover-row" onClick={handleSignOut}>
          <span className="popover-row-label">Sign out</span>
        </button>
      </div>
    </>
  );
}
