import { useAuth } from '../context/AuthContext';

type AccountMenuProps = {
  anchorRect: DOMRect;
  onClose: () => void;
};

export function AccountMenu({ anchorRect, onClose }: AccountMenuProps) {
  const auth = useAuth();

  const top = anchorRect.top;
  const left = anchorRect.right + 4;

  const handleSignOut = async () => {
    onClose();
    await auth.logout();
  };

  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div className="popover" style={{ top, left, minWidth: 260 }}>
        <div className="account-menu-header">
          <div className="account-menu-name">{auth.user?.name || 'User'}</div>
          <div className="account-menu-identifier">{auth.user?.username ? `@${auth.user.username}` : auth.user?.email || ''}</div>
          <div className="account-menu-meta">{auth.user?.role.name} · {auth.permissions.length} permissions</div>
        </div>
        <button type="button" className="popover-row" onClick={handleSignOut}>
          <span className="popover-row-label">Sign out</span>
        </button>
      </div>
    </>
  );
}
