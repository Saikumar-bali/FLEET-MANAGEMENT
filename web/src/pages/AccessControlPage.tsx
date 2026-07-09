import { usePermissions } from "../api/hooks";
import { CrudPage } from "../components/DynamicCrud/CrudPage";
import type { ColumnDef } from "@tanstack/react-table";

interface Permission {
  id: string;
  key: string;
  module: string;
  action: string;
  description?: string;
}

const columns: ColumnDef<Permission>[] = [
  { accessorKey: "key", header: "Key", cell: ({ row }) => <span className="font-mono text-xs">{row.original.key}</span> },
  { accessorKey: "module", header: "Module" },
  { accessorKey: "action", header: "Action" },
  { accessorKey: "description", header: "Description" },
];

export function AccessControlPage() {
  const { data, isLoading } = usePermissions();

  return (
    <CrudPage title="Access Control" subtitle="Manage permissions and access policies" data={data?.data?.items || []} columns={columns} isLoading={isLoading} />
  );
}
