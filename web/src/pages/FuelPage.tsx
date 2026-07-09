import { useNavigate } from "react-router-dom";
import { useFuelEntries } from "../api/hooks";
import { CrudPage } from "../components/DynamicCrud/CrudPage";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "../components/ui/Badge";
import { format } from "date-fns";

interface FuelEntry {
  id: string;
  vehicle: { vehicleNumber: string };
  driver?: { name: string };
  quantity: number;
  amount: number;
  odometerReading: number;
  status: string;
  createdAt: string;
}

const columns: ColumnDef<FuelEntry>[] = [
  { accessorKey: "vehicle.vehicleNumber", header: "Vehicle" },
  { accessorKey: "driver.name", header: "Driver" },
  { accessorKey: "quantity", header: "Quantity (L)", cell: ({ row }) => `${row.original.quantity} L` },
  { accessorKey: "amount", header: "Amount", cell: ({ row }) => `₹${row.original.amount.toLocaleString("en-IN")}` },
  { accessorKey: "odometerReading", header: "Odometer", cell: ({ row }) => `${row.original.odometerReading.toLocaleString()} km` },
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
    const colors: Record<string, string> = { PENDING: "bg-yellow-100 text-yellow-800", APPROVED: "bg-green-100 text-green-800", REJECTED: "bg-red-100 text-red-800", CANCELLED: "bg-gray-100 text-gray-800" };
    return <Badge className={colors[row.original.status] || "bg-gray-100"}>{row.original.status}</Badge>;
  }},
  { accessorKey: "createdAt", header: "Date", cell: ({ row }) => format(new Date(row.original.createdAt), "dd MMM yyyy") },
];

export function FuelPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useFuelEntries();

  return (
    <CrudPage title="Fuel Entries" subtitle="Track fuel consumption and costs" data={data?.data?.items || []} columns={columns} isLoading={isLoading} createPath="/fuel/new" createLabel="Add Fuel Entry" onRowClick={(row) => navigate(`/fuel/${row.id}`)} />
  );
}
