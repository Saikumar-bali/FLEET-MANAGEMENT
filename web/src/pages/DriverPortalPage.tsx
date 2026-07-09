import { useDriverContext, useDriverTrips } from "../api/hooks";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Truck, Fuel, Receipt, FileText, MapPin, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DriverPortalPage() {
  const navigate = useNavigate();
  const { data: context } = useDriverContext();
  const { data: trips } = useDriverTrips();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Driver Portal</h1>
        <p className="text-gray-500">Welcome, {context?.data?.driver?.name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/driver-portal/trips")}>
          <CardContent className="p-6 text-center">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="font-medium">My Trips</p>
            <p className="text-2xl font-bold">{trips?.data?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/driver-portal/fuel")}>
          <CardContent className="p-6 text-center">
            <Fuel className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="font-medium">Fuel Entry</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/driver-portal/expenses")}>
          <CardContent className="p-6 text-center">
            <Receipt className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <p className="font-medium">Expenses</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/driver-portal/documents")}>
          <CardContent className="p-6 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <p className="font-medium">Documents</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Current Assignment</h3>
          {context?.data?.currentTrip ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-lg">{context.data.currentTrip.tripNumber}</p>
                  <p className="text-gray-500">{context.data.currentTrip.startLocation} → {context.data.currentTrip.endLocation}</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{context.data.currentTrip.status}</span>
              </div>
              <Button onClick={() => navigate(`/driver-portal/trips/${context.data.currentTrip.id}`)}>View Details</Button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No active assignment</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
