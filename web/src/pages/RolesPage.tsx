import { useNavigate } from "react-router-dom";
import { useRoles } from "../api/hooks";
import { CrudPage } from "../components/DynamicCrud/CrudPage";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "../components/ui/Badge";

interface Role {
  id: string;
  name: string;
  key: string;
  description?: string;
  isSystem: boolean;
  status: string;
}

const columns: ColumnDef<Role>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "key", header: "Key", cell: ({ row }) => <span className="font-mono text-xs">{row.original.key}</span> },
  { accessorKey: "description", header: "Description" },
  { accessorKey: "isSystem", header: "System", cell: ({ row }) => row.original.isSystem ? <Badge className="bg-blue-100 text-blue-800">Yes</Badge> : <Badge className="bg-gray-100">No</Badge> },
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
    const colors: Record<string, string> = { ACTIVE: "bg-green-100 text-green-800", INACTIVE: "bg-gray-100 text-gray-800" };
    return <Badge className={colors[row.original.status] || "bg-gray-100"}>{row.original.status}</Badge>;
  }},
];

export function RolesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useRoles();

  return (
    <CrudPage title="Roles" subtitle="Manage user roles and permissions" data={data?.data?.items || []} columns={columns} isLoading={isLoading} createPath="/roles/new" createLabel="Add Role" onRowClick={(row) => navigate(`/roles/${row.id}`)} />
  );
}
