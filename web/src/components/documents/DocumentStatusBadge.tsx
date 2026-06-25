type Props = {
  status: string;
  className?: string;
};

export function DocumentStatusBadge({ status, className = '' }: Props) {
  const map: Record<string, string> = {
    ACTIVE: 'doc-status-active',
    ARCHIVED: 'doc-status-archived',
    DELETED: 'doc-status-deleted',
    PENDING: 'doc-status-pending',
    VERIFIED: 'doc-status-verified',
    REJECTED: 'doc-status-rejected',
  };
  return <span className={`doc-status-badge ${map[status] || 'doc-status-pending'} ${className}`}>{status}</span>;
}
