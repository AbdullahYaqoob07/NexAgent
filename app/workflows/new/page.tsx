import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import WorkflowEditor from '@/components/workflows/WorkflowEditor';

export default async function NewWorkflowPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  return <WorkflowEditor />;
}