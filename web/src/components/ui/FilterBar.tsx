import type { ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export function FilterBar({ children, className = '' }: FilterBarProps) {
  return (
    <div className={`filter-bar ${className}`}>
      {children}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      className={`filter-chip ${active ? 'filter-chip-active' : ''}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
