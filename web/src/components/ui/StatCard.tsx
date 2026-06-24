import type { ReactNode } from 'react';

type StatVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: ReactNode;
  variant?: StatVariant;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  onClick?: () => void;
}

const variantColors: Record<StatVariant, { bg: string; dot: string; text: string }> = {
  default: { bg: 'stat-default', dot: 'stat-dot-default', text: '' },
  success: { bg: 'stat-success', dot: 'stat-dot-success', text: 'text-success' },
  warning: { bg: 'stat-warning', dot: 'stat-dot-warning', text: 'text-warning' },
  danger: { bg: 'stat-danger', dot: 'stat-dot-danger', text: 'text-danger' },
  info: { bg: 'stat-info', dot: 'stat-dot-info', text: 'text-info' },
  muted: { bg: 'stat-muted', dot: 'stat-dot-muted', text: 'text-muted' },
};

export function StatCard({ label, value, subtext, icon, variant = 'default', trend, trendLabel, onClick }: StatCardProps) {
  const colors = variantColors[variant];
  const classes = ['stat-card', colors.bg, onClick ? 'stat-card-clickable' : ''].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="stat-header">
        <span className="stat-icon">{icon}</span>
        {trend ? (
          <span className={`stat-trend stat-trend-${trend}`}>
            {trendLabel}
          </span>
        ) : null}
      </div>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <span className={`stat-value ${colors.text}`}>{value}</span>
        {subtext ? <span className="stat-subtext">{subtext}</span> : null}
      </div>
      <div className={`stat-dot ${colors.dot}`} />
    </div>
  );
}
