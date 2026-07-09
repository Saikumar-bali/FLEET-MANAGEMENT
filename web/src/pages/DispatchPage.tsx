import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { MapPin, Truck, User, Calendar, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

interface DispatchBoard {
  pendingAssignments: Array<{
    id: string;
    vehicle: { vehicleNumber: string; vehicleType: string };
    driver?: { name: string };
    startLocation: string;
    endLocation: string;
    scheduledDate: string;
  }>;
  activeTrips: Array<{
    id: string;
    tripNumber: string;
    vehicle: { vehicleNumber: string };
    driver: { name: string };
    startLocation: string;
    status: string;
    startedAt: string;
  }>;
}

export function DispatchPage() {
  const queryClient = useQueryClient();

  const { data: board, isLoading } = useQuery<DispatchBoard>({
    queryKey: ["dispatch-board"],
    queryFn: async () => {
      const res = await apiClient.get("/dispatch/board");
      return res.data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (tripId: string) => {
      await apiClient.post("/dispatch/assign", { tripId });
    },
    onSuccess: () => {
      toast.success("Trip assigned");
      queryClient.invalidateQueries({ queryKey: ["dispatch-board"] });
    },
  });

  if (isLoading) return <div>Loading dispatch board...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dispatch Board</h1>
        <p className="text-gray-500">Manage vehicle and driver assignments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Pending Assignments ({board?.pendingAssignments?.length || 0})
          </h2>
          <div className="space-y-3">
            {board?.pendingAssignments?.map((trip) => (
              <Card key={trip.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{trip.startLocation} → {trip.endLocation}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {trip.vehicle.vehicleNumber}</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {trip.driver?.name || "Unassigned"}</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => assignMutation.mutate(trip.id)} disabled={!trip.driver}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-green-600" />
            Active Trips ({board?.activeTrips?.length || 0})
          </h2>
          <div className="space-y-3">
            {board?.activeTrips?.map((trip) => (
              <Card key={trip.id} className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{trip.tripNumber}</p>
                      <p className="text-sm text-gray-500">{trip.vehicle.vehicleNumber} • {trip.driver.name}</p>
                      <p className="text-sm text-gray-500">{trip.startLocation}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">{trip.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
