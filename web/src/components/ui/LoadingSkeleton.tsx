interface LoadingSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingSkeleton({ rows = 3, columns = 4, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`loading-skeleton ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-line" style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '1rem' }}>
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="skeleton-block" />
          ))}
        </div>
      ))}
    </div>
  );
}
