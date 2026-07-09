import { useParams, useNavigate } from "react-router-dom";
import { useDriver } from "../api/hooks";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { ArrowLeft, Edit } from "lucide-react";
import { format } from "date-fns";

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: driverData, isLoading } = useDriver(id || "");
  const driver = driverData?.data;

  if (isLoading) return <div>Loading...</div>;
  if (!driver) return <div>Driver not found</div>;

  const statusColor: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-800", ON_TRIP: "bg-blue-100 text-blue-800",
    ON_LEAVE: "bg-yellow-100 text-yellow-800", SUSPENDED: "bg-red-100 text-red-800", INACTIVE: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/drivers")}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{driver.name}</h1>
            <p className="text-gray-500">{driver.mobile}</p>
          </div>
          <Badge className={statusColor[driver.status] || "bg-gray-100"}>{driver.status}</Badge>
        </div>
        <Button variant="outline" onClick={() => navigate(`/drivers/${id}/edit`)}><Edit className="w-4 h-4 mr-2" /> Edit</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">License Number</p><p className="font-medium">{driver.licenseNumber}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">License Expiry</p><p className="font-medium">{driver.licenseExpiry ? format(new Date(driver.licenseExpiry), "dd MMM yyyy") : "-"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Experience</p><p className="font-medium">{driver.experienceYears || 0} years</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Address</p><p className="font-medium">{driver.address || "-"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Emergency Contact</p><p className="font-medium">{driver.emergencyContact || "-"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Alternate Mobile</p><p className="font-medium">{driver.alternateMobile || "-"}</p>
        </CardContent></Card>
      </div>
    </div>
  );
}
