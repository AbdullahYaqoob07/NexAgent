import { WorkflowEditor } from "@/components/workflows/WorkflowEditor";

interface WorkflowEditPageProps {
  params: {
    id: string;
  };
}

export default function WorkflowEditPage({ params }: WorkflowEditPageProps) {
  return (
    <div className="min-h-screen bg-black">
      <WorkflowEditor />
    </div>
  );
}
