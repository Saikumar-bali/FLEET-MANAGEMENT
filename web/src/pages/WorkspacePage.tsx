import { useWorkspace } from "../api/hooks";
import { Card, CardContent } from "../components/ui/Card";

export function WorkspacePage() {
  const { data, isLoading } = useWorkspace();

  if (isLoading) return <div>Loading workspace...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workspace</h1>
        <p className="text-gray-500">Your workspace settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Workspace Info</h3>
            <pre className="text-sm text-gray-600 overflow-auto">{JSON.stringify(data?.data, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
