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
        <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border-light)' }}>
          <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', marginBottom: 2 }}>
            {auth.user?.name || 'User'}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {auth.user?.username ? `@${auth.user.username}` : auth.user?.email || ''}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            {auth.user?.role.name} · {auth.permissions.length} permissions
          </div>
        </div>
        <button type="button" className="popover-row" onClick={handleSignOut}>
          <span className="popover-row-label">Sign out</span>
        </button>
      </div>
    </>
  );
}
