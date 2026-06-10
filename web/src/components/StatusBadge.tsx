const statusStyles: Record<string, { bg: string; color: string }> = {
  AVAILABLE: { bg: '#edf7f1', color: '#0f6b42' },
  ON_TRIP: { bg: '#eef4ff', color: '#2a5bd7' },
  ON_LEAVE: { bg: '#fff6e8', color: '#9a6400' },
  UNDER_MAINTENANCE: { bg: '#fff6e8', color: '#9a6400' },
  UNDER_REPAIR: { bg: '#fff0f1', color: '#b42318' },
  INACTIVE: { bg: '#f2f4f7', color: '#475467' },
  SOLD: { bg: '#f2f4f7', color: '#475467' },
  ACCIDENT: { bg: '#fff0f1', color: '#b42318' },
  SUSPENDED: { bg: '#fff0f1', color: '#b42318' },
  ACTIVE: { bg: '#edf7f1', color: '#0f6b42' },
  ASSIGNED: { bg: '#eef4ff', color: '#2a5bd7' },
  DAMAGED: { bg: '#fff0f1', color: '#b42318' },
  LOST: { bg: '#fff0f1', color: '#b42318' },
  RETIRED: { bg: '#f2f4f7', color: '#475467' },
  SYSTEM: { bg: '#f4f3ff', color: '#6941c6' },
};

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] ?? { bg: '#e9ecef', color: '#5a6474' };

  return (
    <span
      className="status-badge"
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.color}22`,
        fontWeight: 600,
      }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
