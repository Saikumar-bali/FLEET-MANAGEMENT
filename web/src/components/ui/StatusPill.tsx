interface StatusPillProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const statusVariantMap: Record<string, string> = {
  active: 'success',
  completed: 'success',
  approved: 'success',
  available: 'success',
  pending: 'warning',
  scheduled: 'info',
  started: 'info',
  inactive: 'muted',
  expired: 'danger',
  cancelled: 'danger',
  rejected: 'danger',
  open: 'warning',
  draft: 'muted',
};

function getVariant(status: string): string {
  const key = status.toLowerCase().replace(/\s+/g, '_');
  return statusVariantMap[key] || 'default';
}

export function StatusPill({ status, variant, className = '' }: StatusPillProps) {
  const v = variant || getVariant(status);
  return (
    <span className={`status-pill status-pill-${v} ${className}`}>
      {status}
    </span>
  );
}
