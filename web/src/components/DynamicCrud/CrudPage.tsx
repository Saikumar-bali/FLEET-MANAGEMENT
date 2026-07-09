import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { DataTable } from "./DataTable";
import type { ColumnDef } from "@tanstack/react-table";

interface CrudPageProps<T> {
  title: string;
  subtitle?: string;
  data: T[];
  columns: ColumnDef<T>[];
  isLoading: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  createPath?: string;
  createLabel?: string;
  onRowClick?: (row: T) => void;
  filterComponent?: React.ReactNode;
}

export function CrudPage<T>({ title, subtitle, data, columns, isLoading, searchPlaceholder = "Search...", onSearch, createPath, createLabel = "Create New", onRowClick, filterComponent }: CrudPageProps<T>) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {createPath && (
          <button onClick={() => navigate(createPath)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            {createLabel}
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); onSearch?.(e.target.value); }}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        {filterComponent}
      </div>

      <DataTable data={data} columns={columns} isLoading={isLoading} onRowClick={onRowClick} />
    </div>
  );
}
