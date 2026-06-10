import { type ReactNode } from 'react';

type Column<T> = {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  sortable?: boolean;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  isLoading?: boolean;
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  pagination,
  isLoading,
}: DataTableProps<T>) {
  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(20,33,61,0.1)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    textAlign: 'left',
                    padding: '0.75rem 0.5rem',
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#5a6474',
                    fontWeight: 600,
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '2rem', textAlign: 'center', color: '#5a6474' }}>
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '2rem', textAlign: 'center', color: '#5a6474' }}>
                  No data found
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  style={{
                    borderBottom: '1px solid rgba(20,33,61,0.06)',
                    cursor: onRowClick ? 'pointer' : undefined,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(20,33,61,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={{ padding: '0.75rem 0.5rem' }}>
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && pagination.totalPages > 1 ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="secondary-button"
            disabled={pagination.page <= 1}
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', color: '#5a6474', fontSize: '0.85rem' }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className="secondary-button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
