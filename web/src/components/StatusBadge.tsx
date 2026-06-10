const statusStyles: Record<string, { bg: string; color: string }> = {
  AVAILABLE: { bg: '#e8fff3', color: '#127a4a' },
  ON_TRIP: { bg: '#e0f0ff', color: '#1a5fa8' },
  ON_LEAVE: { bg: '#fff0da', color: '#a85c00' },
  UNDER_MAINTENANCE: { bg: '#fff0da', color: '#a85c00' },
  UNDER_REPAIR: { bg: '#ffe3e3', color: '#9f1239' },
  INACTIVE: { bg: '#e9ecef', color: '#5a6474' },
  SOLD: { bg: '#e9ecef', color: '#5a6474' },
  ACCIDENT: { bg: '#ffe3e3', color: '#9f1239' },
  SUSPENDED: { bg: '#ffe3e3', color: '#9f1239' },
  ACTIVE: { bg: '#e8fff3', color: '#127a4a' },
  ASSIGNED: { bg: '#e0f0ff', color: '#1a5fa8' },
  DAMAGED: { bg: '#ffe3e3', color: '#9f1239' },
  LOST: { bg: '#ffe3e3', color: '#9f1239' },
  RETIRED: { bg: '#e9ecef', color: '#5a6474' },
};

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] ?? { bg: '#e9ecef', color: '#5a6474' };

  return (
    <span
      className="status-pill"
      style={{
        background: style.bg,
        color: style.color,
        padding: '0.3rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.8rem',
        fontWeight: 600,
        display: 'inline-block',
      }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
