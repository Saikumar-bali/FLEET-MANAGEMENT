import type { ReactNode } from 'react';

interface EmptyStatePanelProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyStatePanel({ icon, title, description, action, className = '' }: EmptyStatePanelProps) {
  return (
    <div className={`empty-state-panel ${className}`}>
      {icon ? <div className="empty-state-icon">{icon}</div> : null}
      <h3 className="empty-state-title">{title}</h3>
      {description ? <p className="empty-state-desc">{description}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
