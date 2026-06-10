import type { ReactNode } from 'react';

type EmptyStateProps = {
  message: string;
  action?: ReactNode;
};

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="centered-state">
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#5a6474', marginBottom: '1rem' }}>{message}</p>
        {action}
      </div>
    </div>
  );
}
