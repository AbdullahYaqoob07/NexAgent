import { WorkflowDashboard } from "@/components/workflows/WorkflowDashboard";

export default function WorkflowsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-8 space-y-12">
        {/* Main Dashboard */}
        <div className="space-y-8">
          <WorkflowDashboard />
        </div>
      </div>
    </div>
  );
}
