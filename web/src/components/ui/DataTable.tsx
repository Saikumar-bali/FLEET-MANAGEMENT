import type { ReactNode } from 'react';

export interface ColumnDef<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  align?: 'left' | 'right' | 'center';
  width?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  emptyMessage = 'No data found.',
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="data-table-shell">
        <div className="data-table-skeleton">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-row">
              {columns.map((_, j) => (
                <div key={j} className="skeleton-cell" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="data-table-shell">
        <div className="data-table-empty">
          <span className="empty-icon" />
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="data-table-shell">
      <div className="data-table-scroll">
        <table className={`data-table ${className}`}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`text-${col.align || 'left'} ${col.sortable ? 'sortable' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={onRowClick ? 'data-table-row-clickable' : ''}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col, i) => (
                  <td key={i} className={`text-${col.align || 'left'}`}>
                    {typeof col.accessor === 'function' ? col.accessor(row) : String(row[col.accessor] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
