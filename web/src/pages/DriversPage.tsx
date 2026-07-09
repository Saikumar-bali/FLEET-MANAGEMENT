import { useNavigate } from "react-router-dom";
import { useDrivers } from "../api/hooks";
import { CrudPage } from "../components/DynamicCrud/CrudPage";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "../components/ui/Badge";
import { format } from "date-fns";

interface Driver {
  id: string;
  name: string;
  mobile: string;
  licenseNumber: string;
  licenseExpiry?: string;
  status: string;
  experienceYears?: number;
}

const columns: ColumnDef<Driver>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "mobile", header: "Mobile" },
  { accessorKey: "licenseNumber", header: "License" },
  { accessorKey: "licenseExpiry", header: "License Expiry", cell: ({ row }) => row.original.licenseExpiry ? format(new Date(row.original.licenseExpiry), "dd MMM yyyy") : "-" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
    const colors: Record<string, string> = { AVAILABLE: "bg-green-100 text-green-800", ON_TRIP: "bg-blue-100 text-blue-800", ON_LEAVE: "bg-yellow-100 text-yellow-800", SUSPENDED: "bg-red-100 text-red-800", INACTIVE: "bg-gray-100 text-gray-800" };
    return <Badge className={colors[row.original.status] || "bg-gray-100"}>{row.original.status}</Badge>;
  }},
  { accessorKey: "experienceYears", header: "Experience (Yrs)" },
];

export function DriversPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useDrivers();

  return (
    <CrudPage title="Drivers" subtitle="Manage drivers and their assignments" data={data?.data?.items || []} columns={columns} isLoading={isLoading} createPath="/drivers/new" createLabel="Add Driver" onRowClick={(row) => navigate(`/drivers/${row.id}`)} />
  );
}
