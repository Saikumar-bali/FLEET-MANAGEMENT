import type { ReactNode } from 'react';

type EmptyStateProps = {
  title?: string;
  message: string;
  action?: ReactNode;
};

export function EmptyState({ title = 'Nothing to show yet', message, action }: EmptyStateProps) {
  return (
    <div className="state-panel">
      <div>
        <h3>{title}</h3>
        <p>{message}</p>
        {action}
      </div>
    </div>
  );
}
