import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import WorkflowEditor from '@/components/workflows/WorkflowEditor';

interface WorkflowPageProps {
  params: {
    id: string;
  };
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const user = await currentUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  // Await params in Next.js 15
  const { id } = await params;

  // In a real app, you would fetch the workflow by ID here
  // For now, we'll just show the editor with the workflow ID
  return <WorkflowEditor workflowId={id} />;
}