import { useComplianceDashboard, useComplianceExpiring, useComplianceExpired } from "../api/hooks";
import { Card, CardContent } from "../components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export function CompliancePage() {
  const { data: dashboard } = useComplianceDashboard();
  const { data: expiring } = useComplianceExpiring();
  const { data: expired } = useComplianceExpired();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vehicle Compliance</h1>
        <p className="text-gray-500">Track insurance, fitness, permits, and more</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{dashboard?.data?.compliantCount || 0}</p>
                <p className="text-sm text-gray-500">Fully Compliant</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{expiring?.data?.length || 0}</p>
                <p className="text-sm text-gray-500">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{expired?.data?.length || 0}</p>
                <p className="text-sm text-gray-500">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expiring">
        <TabsList>
          <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>

        <TabsContent value="expiring">
          <div className="space-y-3">
            {expiring?.data?.map((item: any) => (
              <Card key={item.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.vehicle?.vehicleNumber} - {item.documentType}</p>
                    <p className="text-sm text-gray-500">Expires: {format(new Date(item.expiryDate), "dd MMM yyyy")}</p>
                  </div>
                  <span className="text-sm font-medium text-yellow-600">
                    {differenceInDays(new Date(item.expiryDate), new Date())} days left
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="expired">
          <div className="space-y-3">
            {expired?.data?.map((item: any) => (
              <Card key={item.id} className="border-l-4 border-l-red-500">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.vehicle?.vehicleNumber} - {item.documentType}</p>
                    <p className="text-sm text-gray-500">Expired: {format(new Date(item.expiryDate), "dd MMM yyyy")}</p>
                  </div>
                  <span className="text-sm font-medium text-red-600">EXPIRED</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
