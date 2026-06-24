import type { ReactNode } from 'react';

interface KpiGridProps {
  children: ReactNode;
  columns?: 3 | 4 | 5 | 6;
  className?: string;
}

export function KpiGrid({ children, columns = 4, className = '' }: KpiGridProps) {
  return (
    <div className={`kpi-grid kpi-cols-${columns} ${className}`}>
      {children}
    </div>
  );
}
