type Props = {
  status: string;
  className?: string;
};

export function DocumentVerificationBadge({ status, className = '' }: Props) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Pending', cls: 'doc-verify-pending' },
    VERIFIED: { label: 'Verified', cls: 'doc-verify-verified' },
    REJECTED: { label: 'Rejected', cls: 'doc-verify-rejected' },
  };
  const info = map[status] || map.PENDING;
  return <span className={`doc-verify-badge ${info.cls} ${className}`}>{info.label}</span>;
}
