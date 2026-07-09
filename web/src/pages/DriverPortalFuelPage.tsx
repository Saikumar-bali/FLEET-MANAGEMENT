import { useState } from "react";
import { useDriverFuel } from "../api/hooks";
import { apiClient } from "../api/client";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Fuel, Upload } from "lucide-react";
import toast from "react-hot-toast";

export function DriverPortalFuelPage() {
  const { data, refetch } = useDriverFuel();
  const [form, setForm] = useState({ vehicleId: "", quantity: "", amount: "", odometerReading: "", receipt: null as File | null });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/me/driver-fuel", {
        vehicleId: form.vehicleId,
        quantity: Number(form.quantity),
        amount: Number(form.amount),
        odometerReading: Number(form.odometerReading),
      });
      toast.success("Fuel entry submitted");
      setForm({ vehicleId: "", quantity: "", amount: "", odometerReading: "", receipt: null });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Fuel Entry</h1>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vehicle ID</label>
              <input type="text" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Quantity (L)</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Odometer Reading</label>
              <input type="number" value={form.odometerReading} onChange={(e) => setForm({ ...form, odometerReading: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required />
            </div>
            <Button type="submit" className="w-full"><Fuel className="w-4 h-4 mr-2" /> Submit Fuel Entry</Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold">Recent Entries</h2>
      <div className="space-y-3">
        {data?.data?.map((entry: any) => (
          <Card key={entry.id}>
            <CardContent className="p-4 flex justify-between">
              <div>
                <p className="font-medium">{entry.quantity} L</p>
                <p className="text-sm text-gray-500">₹{entry.amount} • {entry.odometerReading} km</p>
              </div>
              <span className="text-sm text-gray-400">{new Date(entry.createdAt).toLocaleDateString()}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
