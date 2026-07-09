import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, flexRender, type ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { cn } from "../../utils/cn";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ data, columns, isLoading, onRowClick }: DataTableProps<T>) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const table = useReactTable({
    data,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left font-medium text-gray-700">
                    {header.isPlaceholder ? null : (
                      <button className="flex items-center gap-1 hover:text-gray-900" onClick={header.column.getToggleSortingHandler()}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} onClick={() => onRowClick?.(row.original)} className={cn("border-b hover:bg-gray-50 transition-colors", onRowClick && "cursor-pointer")}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t">
        <span className="text-sm text-gray-600">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex gap-2">
          <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
