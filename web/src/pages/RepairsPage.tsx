import { useNavigate } from "react-router-dom";
import { useRepairs } from "../api/hooks";
import { CrudPage } from "../components/DynamicCrud/CrudPage";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "../components/ui/Badge";
import { format } from "date-fns";

interface Repair {
  id: string;
  vehicle: { vehicleNumber: string };
  issue: string;
  description: string;
  estimatedCost: number;
  actualCost?: number;
  status: string;
  assignedTo?: { name: string };
  createdAt: string;
}

const columns: ColumnDef<Repair>[] = [
  { accessorKey: "vehicle.vehicleNumber", header: "Vehicle" },
  { accessorKey: "issue", header: "Issue" },
  { accessorKey: "estimatedCost", header: "Est. Cost", cell: ({ row }) => `₹${row.original.estimatedCost?.toLocaleString("en-IN") || 0}` },
  { accessorKey: "actualCost", header: "Actual Cost", cell: ({ row }) => row.original.actualCost ? `₹${row.original.actualCost.toLocaleString("en-IN")}` : "-" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
    const colors: Record<string, string> = { PENDING: "bg-yellow-100 text-yellow-800", STARTED: "bg-blue-100 text-blue-800", COMPLETED: "bg-green-100 text-green-800", CANCELLED: "bg-gray-100 text-gray-800" };
    return <Badge className={colors[row.original.status] || "bg-gray-100"}>{row.original.status}</Badge>;
  }},
  { accessorKey: "assignedTo.name", header: "Assigned To" },
  { accessorKey: "createdAt", header: "Created", cell: ({ row }) => format(new Date(row.original.createdAt), "dd MMM yyyy") },
];

export function RepairsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useRepairs();

  return (
    <CrudPage title="Repairs" subtitle="Track vehicle repairs and issues" data={data?.data?.items || []} columns={columns} isLoading={isLoading} createPath="/repairs/new" createLabel="Create Repair" onRowClick={(row) => navigate(`/repairs/${row.id}`)} />
  );
}
