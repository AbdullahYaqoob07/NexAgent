'use client';

import { useRequireAuth } from '@/lib/AuthContext';
import { useUserProfile } from '@/lib/useUserProfile';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Workflow, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function WorkflowsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { profileData, loading: profileLoading } = useUserProfile();
  
  if (authLoading || profileLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  // For now, we'll assume workflows are stored in user's usage stats
  // In a real implementation, you'd have a separate workflows collection
  const workflowCount = profileData?.usage.totalWorkflows || 0;
  const hasWorkflows = workflowCount > 0;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">Workflows</h1>
            <p className="text-white/70 text-lg mt-1">Build and manage your AI-powered automation workflows</p>
          </div>
          <Link href="/workflows/new">
            <Button className="bg-[#FF6900] hover:bg-[#E55D00] text-white px-6">
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </Link>
        </div>

        {hasWorkflows ? (
          /* Show actual workflows when available - for now just show a placeholder */
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-4">Your Workflows</h3>
            <p className="text-white/70 mb-4">You have {workflowCount} workflow{workflowCount !== 1 ? 's' : ''} created.</p>
            <p className="text-white/60">Full workflow management interface coming soon!</p>
          </div>
        ) : (
          /* Empty state when no workflows */
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Workflow className="w-10 h-10 text-white/40" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">No NEXA's Created Yet</h2>
            <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
              Create your first intelligent workflow to automate tasks and streamline your business processes.
            </p>
            <Link href="/workflows/new">
              <Button className="bg-[#FF6900] hover:bg-[#E55D00] text-white px-8 py-3">
                <Plus className="w-5 h-5 mr-2" />
                Get Started Now
              </Button>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
