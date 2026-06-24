import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function ChartCard({ title, subtitle, children, className = '', action }: ChartCardProps) {
  return (
    <article className={`chart-card ${className}`}>
      <div className="chart-card-header">
        <div>
          <h3 className="chart-card-title">{title}</h3>
          {subtitle ? <p className="chart-card-subtitle">{subtitle}</p> : null}
        </div>
        {action ? <div className="chart-card-action">{action}</div> : null}
      </div>
      <div className="chart-card-body">
        {children}
      </div>
    </article>
  );
}
