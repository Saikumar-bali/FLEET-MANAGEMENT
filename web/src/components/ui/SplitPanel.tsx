import type { ReactNode } from 'react';

interface SplitPanelProps {
  left: ReactNode;
  right: ReactNode;
  className?: string;
  leftWidth?: string;
}

export function SplitPanel({ left, right, className = '', leftWidth }: SplitPanelProps) {
  return (
    <div
      className={`split-panel ${className}`}
      style={leftWidth ? { gridTemplateColumns: `${leftWidth} minmax(0, 1fr)` } : undefined}
    >
      <div className="split-left">{left}</div>
      <div className="split-right">{right}</div>
    </div>
  );
}
