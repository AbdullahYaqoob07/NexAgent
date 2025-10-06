'use client';

import { useRequireAuth } from '@/lib/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useParams } from 'next/navigation';

export default function WorkflowPage() {
  const { user, loading } = useRequireAuth();
  const params = useParams();
  const id = params?.id as string;
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="text-white">
          <h1 className="text-2xl font-bold mb-4">Workflow Editor</h1>
          <p className="text-white/70 mb-4">Editing workflow: {id}</p>
          <p className="text-white/50">This page is being updated for Firebase authentication.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
