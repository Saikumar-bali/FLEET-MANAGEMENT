import { useNavigate } from "react-router-dom";
import { useDocuments } from "../api/hooks";
import { CrudPage } from "../components/DynamicCrud/CrudPage";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "../components/ui/Badge";
import { format } from "date-fns";

interface Document {
  id: string;
  title: string;
  type: string;
  status: string;
  vehicle?: { vehicleNumber: string };
  driver?: { name: string };
  expiryDate?: string;
  createdAt: string;
}

const columns: ColumnDef<Document>[] = [
  { accessorKey: "title", header: "Title" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "vehicle.vehicleNumber", header: "Vehicle" },
  { accessorKey: "driver.name", header: "Driver" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => {
    const colors: Record<string, string> = { ACTIVE: "bg-green-100 text-green-800", EXPIRED: "bg-red-100 text-red-800", PENDING: "bg-yellow-100 text-yellow-800" };
    return <Badge className={colors[row.original.status] || "bg-gray-100"}>{row.original.status}</Badge>;
  }},
  { accessorKey: "expiryDate", header: "Expires", cell: ({ row }) => row.original.expiryDate ? format(new Date(row.original.expiryDate), "dd MMM yyyy") : "-" },
  { accessorKey: "createdAt", header: "Created", cell: ({ row }) => format(new Date(row.original.createdAt), "dd MMM yyyy") },
];

export function DocumentsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useDocuments();

  return (
    <CrudPage title="Documents" subtitle="Manage fleet documents and compliance records" data={data?.data?.items || []} columns={columns} isLoading={isLoading} createPath="/documents/new" createLabel="Upload Document" onRowClick={(row) => navigate(`/documents/${row.id}`)} />
  );
}
