import { useParams, useNavigate } from "react-router-dom";
import { useTrip } from "../api/hooks";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tripData, isLoading } = useTrip(id || "");
  const trip = tripData?.data;

  if (isLoading) return <div>Loading...</div>;
  if (!trip) return <div>Trip not found</div>;

  const statusColor: Record<string, string> = {
    PLANNED: "bg-gray-100 text-gray-800", ASSIGNED: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800", COMPLETED: "bg-green-100 text-green-800", CANCELLED: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/trips")}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{trip.tripNumber}</h1>
            <p className="text-gray-500">{trip.startLocation} → {trip.endLocation}</p>
          </div>
          <Badge className={statusColor[trip.status] || "bg-gray-100"}>{trip.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Vehicle</p><p className="font-medium">{trip.vehicle?.vehicleNumber || "-"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Driver</p><p className="font-medium">{trip.driver?.name || "-"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Start Time</p><p className="font-medium">{trip.startTime ? format(new Date(trip.startTime), "dd MMM yyyy HH:mm") : "-"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">End Time</p><p className="font-medium">{trip.endTime ? format(new Date(trip.endTime), "dd MMM yyyy HH:mm") : "-"}</p>
        </CardContent></Card>
      </div>
    </div>
  );
}
