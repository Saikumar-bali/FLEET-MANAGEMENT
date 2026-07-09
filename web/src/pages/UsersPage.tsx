import { useNavigate } from "react-router-dom";
import { useUsers } from "../api/hooks";
import { CrudPage } from "../components/DynamicCrud/CrudPage";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "../components/ui/Badge";

interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  status: string;
  role?: { name: string };
}

const columns: ColumnDef<User>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "mobile", header: "Mobile" },
  { accessorKey: "role.name", header: "Role" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
    const colors: Record<string, string> = { ACTIVE: "bg-green-100 text-green-800", INACTIVE: "bg-gray-100 text-gray-800", SUSPENDED: "bg-red-100 text-red-800" };
    return <Badge className={colors[row.original.status] || "bg-gray-100"}>{row.original.status}</Badge>;
  }},
];

export function UsersPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useUsers();

  return (
    <CrudPage title="Users" subtitle="Manage system users" data={data?.data?.items || []} columns={columns} isLoading={isLoading} createPath="/users/new" createLabel="Add User" onRowClick={(row) => navigate(`/users/${row.id}`)} />
  );
}
