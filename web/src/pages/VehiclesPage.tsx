import { useNavigate } from "react-router-dom";
import { useVehicles } from "../api/hooks";
import { CrudPage } from "../components/DynamicCrud/CrudPage";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "../components/ui/Badge";

interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  brand?: string;
  model?: string;
  status: string;
  currentOdometer: number;
  currentDriver?: { name: string };
}

const columns: ColumnDef<Vehicle>[] = [
  { accessorKey: "vehicleNumber", header: "Vehicle Number", cell: ({ row }) => <span className="font-mono font-medium">{row.original.vehicleNumber}</span> },
  { accessorKey: "vehicleType", header: "Type" },
  { accessorKey: "brand", header: "Brand/Model", cell: ({ row }) => `${row.original.brand || "-"} ${row.original.model || ""}` },
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
    const colors: Record<string, string> = {
      AVAILABLE: "bg-green-100 text-green-800", ON_TRIP: "bg-blue-100 text-blue-800",
      UNDER_MAINTENANCE: "bg-yellow-100 text-yellow-800", UNDER_REPAIR: "bg-orange-100 text-orange-800",
      INACTIVE: "bg-gray-100 text-gray-800", SOLD: "bg-red-100 text-red-800", ACCIDENT: "bg-red-100 text-red-800",
    };
    return <Badge className={colors[row.original.status] || "bg-gray-100"}>{row.original.status}</Badge>;
  }},
  { accessorKey: "currentOdometer", header: "Odometer", cell: ({ row }) => `${row.original.currentOdometer.toLocaleString()} km` },
  { accessorKey: "currentDriver.name", header: "Current Driver", cell: ({ row }) => row.original.currentDriver?.name || "Unassigned" },
];

export function VehiclesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useVehicles();

  return (
    <CrudPage
      title="Vehicles"
      subtitle="Manage your fleet vehicles"
      data={data?.data?.items || []}
      columns={columns}
      isLoading={isLoading}
      createPath="/vehicles/new"
      createLabel="Add Vehicle"
      onRowClick={(row) => navigate(`/vehicles/${row.id}`)}
      searchPlaceholder="Search by number, type, or brand..."
    />
  );
}
