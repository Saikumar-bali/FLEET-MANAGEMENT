import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { CheckCircle, XCircle, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

interface Submission {
  id: string;
  type?: string;
  driver?: { name: string };
  vehicle?: { vehicleNumber: string };
  amount?: number;
  status: string;
  createdAt: string;
}

function SubmissionList({ type, endpoint }: { type: string; endpoint: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<Submission[]>({
    queryKey: ["submissions", type],
    queryFn: async () => {
      const res = await apiClient.get(endpoint);
      return res.data;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      await apiClient.patch(`${endpoint}/${id}/${action}`, {});
    },
    onSuccess: () => {
      toast.success("Review submitted");
      queryClient.invalidateQueries({ queryKey: ["submissions", type] });
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-3">
      {data?.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.driver?.name || "Unknown"}</p>
                  <Badge className={item.status === "PENDING" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}>{item.status}</Badge>
                </div>
                {item.vehicle && <p className="text-sm text-gray-500">{item.vehicle.vehicleNumber}</p>}
                {item.amount && <p className="text-sm font-medium">₹{item.amount}</p>}
                <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-green-600" onClick={() => reviewMutation.mutate({ id: item.id, action: type === "documents" ? "verify" : "approve" })}>
                  <CheckCircle className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" className="text-red-600" onClick={() => reviewMutation.mutate({ id: item.id, action: "reject" })}>
                  <XCircle className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => reviewMutation.mutate({ id: item.id, action: "request-changes" })}>
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SubmissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Driver Submissions</h1>
        <p className="text-gray-500">Review and approve driver submissions</p>
      </div>

      <Tabs defaultValue="fuel">
        <TabsList>
          <TabsTrigger value="fuel">Fuel</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
        </TabsList>
        <TabsContent value="fuel"><SubmissionList type="fuel" endpoint="/driver-submissions/fuel" /></TabsContent>
        <TabsContent value="expenses"><SubmissionList type="expenses" endpoint="/driver-submissions/expenses" /></TabsContent>
        <TabsContent value="documents"><SubmissionList type="documents" endpoint="/driver-submissions/documents" /></TabsContent>
        <TabsContent value="issues"><SubmissionList type="issues" endpoint="/driver-submissions/issues" /></TabsContent>
        <TabsContent value="inspections"><SubmissionList type="inspections" endpoint="/driver-submissions/inspections" /></TabsContent>
      </Tabs>
    </div>
  );
}
