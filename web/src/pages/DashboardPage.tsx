import { useDashboardOverview } from "../api/hooks";
import { Card, CardContent } from "../components/ui/Card";
import { Truck, Users, Activity, Wrench, Fuel, Receipt } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function DashboardPage() {
  const { data: overview, isLoading } = useDashboardOverview();
  const d = overview?.data;

  const stats = [
    { label: "Total Vehicles", value: d?.vehicleCount || 0, icon: Truck, color: "bg-blue-500" },
    { label: "Active Drivers", value: d?.driverCount || 0, icon: Users, color: "bg-green-500" },
    { label: "Ongoing Trips", value: d?.activeTripCount || 0, icon: Activity, color: "bg-purple-500" },
    { label: "Pending Maintenance", value: d?.pendingMaintenanceCount || 0, icon: Wrench, color: "bg-orange-500" },
    { label: "Fuel Today", value: d?.todayFuelEntries || 0, icon: Fuel, color: "bg-red-500" },
    { label: "Expenses Pending", value: d?.pendingExpenseCount || 0, icon: Receipt, color: "bg-yellow-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your fleet operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center p-6">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold">{isLoading ? "-" : stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {d?.recentActivity && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.recentActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="trips" fill="#3b82f6" />
                  <Bar dataKey="fuel" fill="#ef4444" />
                  <Bar dataKey="expenses" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
