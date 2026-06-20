import { useTheme } from '../context/ThemeContext';

type SettingsPopoverProps = {
  anchorRect: DOMRect;
  onClose: () => void;
  onThemeClick: (anchor: HTMLElement) => void;
};

export function SettingsPopover({ anchorRect, onClose, onThemeClick }: SettingsPopoverProps) {
  const { theme } = useTheme();

  const top = anchorRect.bottom + 8;
  const left = anchorRect.left;

  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div className="popover" style={{ top, left }}>
        <button type="button" className="popover-row" onClick={(e) => onThemeClick(e.currentTarget)}>
          <span className="popover-row-label">Theme</span>
          <span className="popover-row-chevron">
            {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'} ›
          </span>
        </button>
        <button type="button" className="popover-row" onClick={() => {}}>
          <span className="popover-row-label">Submit prompt key</span>
        </button>
        <button type="button" className="popover-row" onClick={() => {}}>
          <span className="popover-row-label">Autocomplete</span>
          <span className="popover-row-chevron">›</span>
        </button>
        <div className="popover-divider" />
        <button type="button" className="popover-row" onClick={() => {}}>
          <span className="popover-row-label">Applet notifications</span>
          <span className="popover-row-chevron">›</span>
        </button>
        <button type="button" className="popover-row" onClick={() => {}}>
          <span className="popover-row-label">Account status</span>
          <span className="popover-row-chevron">›</span>
        </button>
        <button type="button" className="popover-row" onClick={() => {}}>
          <span className="popover-row-label">View status</span>
        </button>
        <div className="popover-divider" />
        <button type="button" className="popover-row" onClick={() => {}}>
          <span className="popover-row-label">Terms of service</span>
        </button>
        <button type="button" className="popover-row" onClick={() => {}}>
          <span className="popover-row-label">Privacy policy</span>
        </button>
        <button type="button" className="popover-row" onClick={() => {}}>
          <span className="popover-row-label">Send feedback</span>
        </button>
        <button type="button" className="popover-row" onClick={() => {}}>
          <span className="popover-row-label">Billing Support</span>
        </button>
      </div>
    </>
  );
}

type ThemeSubmenuProps = {
  anchorRect: DOMRect;
  onClose: () => void;
};

export function ThemeSubmenu({ anchorRect, onClose }: ThemeSubmenuProps) {
  const { theme, setTheme } = useTheme();

  const top = anchorRect.top;
  const left = anchorRect.right + 4;

  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div className="popover-submenu" style={{ top, left }}>
        {(['light', 'dark', 'system'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className="popover-submenu-row"
            onClick={() => { setTheme(option); onClose(); }}
          >
            <svg className="popover-submenu-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {theme === option ? (
                <polyline points="20 6 9 17 4 12" />
              ) : null}
            </svg>
            <span className="popover-submenu-label">{option.charAt(0).toUpperCase() + option.slice(1)}</span>
          </button>
        ))}
      </div>
    </>
  );
}
