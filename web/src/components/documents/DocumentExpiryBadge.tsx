type Props = {
  expiryDate: string | null | undefined;
  className?: string;
};

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - now.getTime()) / 86400000);
}

export function DocumentExpiryBadge({ expiryDate, className = '' }: Props) {
  if (!expiryDate) return null;

  const days = daysUntil(expiryDate);

  if (days < 0) {
    return <span className={`doc-expiry-badge doc-expiry-expired ${className}`}>Expired</span>;
  }
  if (days <= 7) {
    return <span className={`doc-expiry-badge doc-expiry-critical ${className}`}>{days}d left</span>;
  }
  if (days <= 30) {
    return <span className={`doc-expiry-badge doc-expiry-warning ${className}`}>{days}d left</span>;
  }
  return <span className={`doc-expiry-badge doc-expiry-ok ${className}`}>{days}d</span>;
}
