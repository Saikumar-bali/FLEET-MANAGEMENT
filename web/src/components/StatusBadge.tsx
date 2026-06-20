const statusStyles: Record<string, { bg: string; color: string }> = {
  AVAILABLE: { bg: '#e6f4ea', color: '#1e8e3e' },
  ON_TRIP: { bg: '#e8f0fe', color: '#1a73e8' },
  ON_LEAVE: { bg: '#fef7e0', color: '#e37400' },
  UNDER_MAINTENANCE: { bg: '#fef7e0', color: '#e37400' },
  UNDER_REPAIR: { bg: '#fce8e6', color: '#d93025' },
  INACTIVE: { bg: '#f1f3f4', color: '#5f6368' },
  SOLD: { bg: '#f1f3f4', color: '#5f6368' },
  ACCIDENT: { bg: '#fce8e6', color: '#d93025' },
  SUSPENDED: { bg: '#fce8e6', color: '#d93025' },
  ACTIVE: { bg: '#e6f4ea', color: '#1e8e3e' },
  ASSIGNED: { bg: '#e8f0fe', color: '#1a73e8' },
  DAMAGED: { bg: '#fce8e6', color: '#d93025' },
  LOST: { bg: '#fce8e6', color: '#d93025' },
  RETIRED: { bg: '#f1f3f4', color: '#5f6368' },
  SYSTEM: { bg: '#f3e8ff', color: '#7c3aed' },
  DRAFT: { bg: '#f1f3f4', color: '#5f6368' },
  SUBMITTED: { bg: '#e8f0fe', color: '#1a73e8' },
  APPROVED: { bg: '#e6f4ea', color: '#1e8e3e' },
  REJECTED: { bg: '#fce8e6', color: '#d93025' },
  CANCELLED: { bg: '#f1f3f4', color: '#5f6368' },
  SCHEDULED: { bg: '#e8f0fe', color: '#1a73e8' },
  STARTED: { bg: '#e8f0fe', color: '#1a73e8' },
  COMPLETED: { bg: '#e6f4ea', color: '#1e8e3e' },
};

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] ?? { bg: '#f1f3f4', color: '#5f6368' };

  return (
    <span
      className="status-badge"
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.color}18`,
      }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
