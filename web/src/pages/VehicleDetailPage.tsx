import { useParams, useNavigate } from "react-router-dom";
import { useVehicle } from "../api/hooks";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { Badge } from "../components/ui/Badge";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: vehicleData, isLoading } = useVehicle(id || "");
  const vehicle = vehicleData?.data;

  if (isLoading) return <div>Loading...</div>;
  if (!vehicle) return <div>Vehicle not found</div>;

  const statusColor: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-800", ON_TRIP: "bg-blue-100 text-blue-800",
    UNDER_MAINTENANCE: "bg-yellow-100 text-yellow-800", UNDER_REPAIR: "bg-orange-100 text-orange-800",
    INACTIVE: "bg-gray-100 text-gray-800", SOLD: "bg-red-100 text-red-800", ACCIDENT: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/vehicles")}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{vehicle.vehicleNumber}</h1>
            <p className="text-gray-500">{vehicle.brand} {vehicle.model}</p>
          </div>
          <Badge className={statusColor[vehicle.status] || "bg-gray-100"}>{vehicle.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/vehicles/${id}/edit`)}><Edit className="w-4 h-4 mr-2" /> Edit</Button>
          <Button variant="destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="fuel">Fuel History</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardContent className="p-4">
              <p className="text-sm text-gray-500">Vehicle Type</p><p className="font-medium">{vehicle.vehicleType}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-sm text-gray-500">Fuel Type</p><p className="font-medium">{vehicle.fuelType}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-sm text-gray-500">Chassis Number</p><p className="font-medium">{vehicle.chassisNumber || "-"}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-sm text-gray-500">Engine Number</p><p className="font-medium">{vehicle.engineNumber || "-"}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-sm text-gray-500">RC Number</p><p className="font-medium">{vehicle.rcNumber || "-"}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-sm text-gray-500">Current Odometer</p><p className="font-medium">{vehicle.currentOdometer.toLocaleString()} km</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-sm text-gray-500">Current Driver</p><p className="font-medium">{vehicle.currentDriver?.name || "Unassigned"}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-sm text-gray-500">Year</p><p className="font-medium">{vehicle.year || "-"}</p>
            </CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
