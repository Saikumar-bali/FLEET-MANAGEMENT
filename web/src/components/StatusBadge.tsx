const statusStyles: Record<string, { bg: string; color: string; border: string }> = {
  AVAILABLE: { bg: 'rgba(129, 201, 149, 0.10)', color: '#81c995', border: 'rgba(129, 201, 149, 0.2)' },
  ON_TRIP: { bg: 'rgba(138, 180, 248, 0.10)', color: '#8ab4f8', border: 'rgba(138, 180, 248, 0.2)' },
  ON_LEAVE: { bg: 'rgba(253, 214, 99, 0.10)', color: '#fdd663', border: 'rgba(253, 214, 99, 0.2)' },
  UNDER_MAINTENANCE: { bg: 'rgba(253, 214, 99, 0.10)', color: '#fdd663', border: 'rgba(253, 214, 99, 0.2)' },
  UNDER_REPAIR: { bg: 'rgba(242, 139, 130, 0.10)', color: '#f28b82', border: 'rgba(242, 139, 130, 0.2)' },
  INACTIVE: { bg: 'rgba(154, 160, 166, 0.10)', color: '#9aa0a6', border: 'rgba(154, 160, 166, 0.2)' },
  SOLD: { bg: 'rgba(154, 160, 166, 0.10)', color: '#9aa0a6', border: 'rgba(154, 160, 166, 0.2)' },
  ACCIDENT: { bg: 'rgba(242, 139, 130, 0.10)', color: '#f28b82', border: 'rgba(242, 139, 130, 0.2)' },
  SUSPENDED: { bg: 'rgba(242, 139, 130, 0.10)', color: '#f28b82', border: 'rgba(242, 139, 130, 0.2)' },
  ACTIVE: { bg: 'rgba(129, 201, 149, 0.10)', color: '#81c995', border: 'rgba(129, 201, 149, 0.2)' },
  ASSIGNED: { bg: 'rgba(138, 180, 248, 0.10)', color: '#8ab4f8', border: 'rgba(138, 180, 248, 0.2)' },
  DAMAGED: { bg: 'rgba(242, 139, 130, 0.10)', color: '#f28b82', border: 'rgba(242, 139, 130, 0.2)' },
  LOST: { bg: 'rgba(242, 139, 130, 0.10)', color: '#f28b82', border: 'rgba(242, 139, 130, 0.2)' },
  RETIRED: { bg: 'rgba(154, 160, 166, 0.10)', color: '#9aa0a6', border: 'rgba(154, 160, 166, 0.2)' },
  SYSTEM: { bg: 'rgba(138, 180, 248, 0.08)', color: '#8ab4f8', border: 'rgba(138, 180, 248, 0.2)' },
  DRAFT: { bg: 'rgba(154, 160, 166, 0.10)', color: '#9aa0a6', border: 'rgba(154, 160, 166, 0.2)' },
  SUBMITTED: { bg: 'rgba(138, 180, 248, 0.10)', color: '#8ab4f8', border: 'rgba(138, 180, 248, 0.2)' },
  APPROVED: { bg: 'rgba(129, 201, 149, 0.10)', color: '#81c995', border: 'rgba(129, 201, 149, 0.2)' },
  REJECTED: { bg: 'rgba(242, 139, 130, 0.10)', color: '#f28b82', border: 'rgba(242, 139, 130, 0.2)' },
  CANCELLED: { bg: 'rgba(154, 160, 166, 0.10)', color: '#9aa0a6', border: 'rgba(154, 160, 166, 0.2)' },
  SCHEDULED: { bg: 'rgba(138, 180, 248, 0.10)', color: '#8ab4f8', border: 'rgba(138, 180, 248, 0.2)' },
  STARTED: { bg: 'rgba(138, 180, 248, 0.10)', color: '#8ab4f8', border: 'rgba(138, 180, 248, 0.2)' },
  COMPLETED: { bg: 'rgba(129, 201, 149, 0.10)', color: '#81c995', border: 'rgba(129, 201, 149, 0.2)' },
};

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] ?? { bg: 'rgba(154, 160, 166, 0.10)', color: '#9aa0a6', border: 'rgba(154, 160, 166, 0.2)' };

  return (
    <span
      className="status-badge"
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
