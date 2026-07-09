import { useDriverTrips } from "../api/hooks";
import { CrudPage } from "../components/DynamicCrud/CrudPage";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "../components/ui/Badge";
import { format } from "date-fns";

interface DriverTrip {
  id: string;
  tripNumber: string;
  vehicle: { vehicleNumber: string };
  startLocation: string;
  endLocation: string;
  status: string;
  startTime?: string;
  endTime?: string;
}

const columns: ColumnDef<DriverTrip>[] = [
  { accessorKey: "tripNumber", header: "Trip #" },
  { accessorKey: "vehicle.vehicleNumber", header: "Vehicle" },
  { accessorKey: "startLocation", header: "From" },
  { accessorKey: "endLocation", header: "To" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
    const colors: Record<string, string> = { PLANNED: "bg-gray-100", ASSIGNED: "bg-blue-100 text-blue-800", IN_PROGRESS: "bg-yellow-100 text-yellow-800", COMPLETED: "bg-green-100 text-green-800", CANCELLED: "bg-red-100 text-red-800" };
    return <Badge className={colors[row.original.status] || "bg-gray-100"}>{row.original.status}</Badge>;
  }},
  { accessorKey: "startTime", header: "Started", cell: ({ row }) => row.original.startTime ? format(new Date(row.original.startTime), "dd MMM HH:mm") : "-" },
];

export function DriverPortalTripsPage() {
  const { data, isLoading } = useDriverTrips();

  return (
    <CrudPage title="My Trips" subtitle="View your assigned trips" data={data?.data || []} columns={columns} isLoading={isLoading} />
  );
}
