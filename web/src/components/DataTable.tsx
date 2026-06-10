import { type ReactNode } from 'react';

type Column<T> = {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  width?: string;
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
    <div className="data-table-shell">
      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="data-table-state-cell">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="data-table-state-cell">
                  No data found
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={onRowClick ? 'data-table-row-clickable' : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key}>
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
        <div className="table-pagination">
          <button
            type="button"
            className="secondary-button"
            disabled={pagination.page <= 1}
            onClick={() => pagination.onPageChange(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="table-pagination-copy">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className="secondary-button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => pagination.onPageChange(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
