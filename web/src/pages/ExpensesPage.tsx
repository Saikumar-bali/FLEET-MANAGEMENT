import { useNavigate } from "react-router-dom";
import { useExpenses } from "../api/hooks";
import { CrudPage } from "../components/DynamicCrud/CrudPage";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "../components/ui/Badge";
import { format } from "date-fns";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  status: string;
  vehicle?: { vehicleNumber: string };
  driver?: { name: string };
  createdAt: string;
}

const columns: ColumnDef<Expense>[] = [
  { accessorKey: "category", header: "Category" },
  { accessorKey: "description", header: "Description" },
  { accessorKey: "amount", header: "Amount", cell: ({ row }) => `₹${row.original.amount.toLocaleString("en-IN")}` },
  { accessorKey: "vehicle.vehicleNumber", header: "Vehicle" },
  { accessorKey: "driver.name", header: "Driver" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
    const colors: Record<string, string> = { PENDING: "bg-yellow-100 text-yellow-800", SUBMITTED: "bg-blue-100 text-blue-800", APPROVED: "bg-green-100 text-green-800", REJECTED: "bg-red-100 text-red-800", CANCELLED: "bg-gray-100 text-gray-800" };
    return <Badge className={colors[row.original.status] || "bg-gray-100"}>{row.original.status}</Badge>;
  }},
  { accessorKey: "createdAt", header: "Date", cell: ({ row }) => format(new Date(row.original.createdAt), "dd MMM yyyy") },
];

export function ExpensesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useExpenses();

  return (
    <CrudPage title="Expenses" subtitle="Track and manage fleet expenses" data={data?.data?.items || []} columns={columns} isLoading={isLoading} createPath="/expenses/new" createLabel="Add Expense" onRowClick={(row) => navigate(`/expenses/${row.id}`)} />
  );
}
