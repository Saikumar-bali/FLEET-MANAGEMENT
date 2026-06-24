interface ActionToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function ActionToolbar({ children, className = '' }: ActionToolbarProps) {
  return (
    <div className={`action-toolbar ${className}`}>
      {children}
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  href?: string;
  disabled?: boolean;
}

export function ActionButton({ label, icon, onClick, variant = 'secondary', href, disabled }: ActionButtonProps) {
  const className = `action-btn action-btn-${variant}`;

  if (href) {
    return (
      <a href={href} className={className}>
        {icon ? <span className="action-btn-icon">{icon}</span> : null}
        <span className="action-btn-label">{label}</span>
      </a>
    );
  }

  return (
    <button className={className} onClick={onClick} disabled={disabled} type="button">
      {icon ? <span className="action-btn-icon">{icon}</span> : null}
      <span className="action-btn-label">{label}</span>
    </button>
  );
}
