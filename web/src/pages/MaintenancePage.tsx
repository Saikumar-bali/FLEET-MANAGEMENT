import { useNavigate } from "react-router-dom";
import { useMaintenance } from "../api/hooks";
import { CrudPage } from "../components/DynamicCrud/CrudPage";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "../components/ui/Badge";
import { format } from "date-fns";

interface Maintenance {
  id: string;
  vehicle: { vehicleNumber: string };
  type: string;
  description: string;
  cost: number;
  status: string;
  scheduledDate?: string;
  completedDate?: string;
}

const columns: ColumnDef<Maintenance>[] = [
  { accessorKey: "vehicle.vehicleNumber", header: "Vehicle" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "description", header: "Description" },
  { accessorKey: "cost", header: "Cost", cell: ({ row }) => `₹${row.original.cost?.toLocaleString("en-IN") || 0}` },
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
    const colors: Record<string, string> = { PENDING: "bg-yellow-100 text-yellow-800", SUBMITTED: "bg-blue-100 text-blue-800", APPROVED: "bg-green-100 text-green-800", REJECTED: "bg-red-100 text-red-800", CANCELLED: "bg-gray-100 text-gray-800" };
    return <Badge className={colors[row.original.status] || "bg-gray-100"}>{row.original.status}</Badge>;
  }},
  { accessorKey: "scheduledDate", header: "Scheduled", cell: ({ row }) => row.original.scheduledDate ? format(new Date(row.original.scheduledDate), "dd MMM yyyy") : "-" },
];

export function MaintenancePage() {
  const navigate = useNavigate();
  const { data, isLoading } = useMaintenance();

  return (
    <CrudPage title="Maintenance" subtitle="Schedule and track vehicle maintenance" data={data?.data?.items || []} columns={columns} isLoading={isLoading} createPath="/maintenance/new" createLabel="Schedule Maintenance" onRowClick={(row) => navigate(`/maintenance/${row.id}`)} />
  );
}
