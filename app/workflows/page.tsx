'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useBackendAuth } from '@/lib/contexts/BackendAuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Workflow, Plus, Trash2, Edit, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { workflowService } from '@/lib/api/services/workflowService';
import { BackendWorkflow } from '@/lib/api/types/workflow';
import { formatDistanceToNow } from 'date-fns';
import { getAuthToken } from '@/lib/api/client';

export default function WorkflowsPage() {
  const router = useRouter();
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const { user: backendUser, loading: backendLoading, isAuthenticated } = useBackendAuth();
  const [deleting, setDeleting] = useState<string | null>(null);

  const {
    data: workflowsResponse,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await workflowService.listWorkflows({ page: 1, pageSize: 50 });
      if (!response.success) {
        throw new Error(response.message || 'Failed to load workflows');
      }
      return response;
    },
    enabled: !!isAuthenticated && !authLoading && !backendLoading,
    staleTime: 30 * 1000,
  });

  const workflows = workflowsResponse?.workflows ?? [];
  const errorMessage = (error as Error | null)?.message ?? null;

  // Check auth and redirect if needed
  useEffect(() => {
    console.log('Workflows page auth state:', { 
      firebaseUser: !!firebaseUser, 
      backendUser: !!backendUser,
      backendToken: !!getAuthToken(),
      isAuthenticated,
      authLoading, 
      backendLoading 
    });
    
    if (!authLoading && !backendLoading) {
      // Only redirect to sign-in if we have neither Firebase nor backend auth
      if (!firebaseUser && !isAuthenticated) {
        console.log('No authenticated user (Firebase or backend), redirecting to sign-in');
        router.push('/sign-in');
      }
    }
  }, [firebaseUser, backendUser, isAuthenticated, authLoading, backendLoading, router]);

  // Refetch when auth state transitions to authenticated
  useEffect(() => {
    if (!authLoading && !backendLoading && isAuthenticated) {
      refetch();
    }
  }, [authLoading, backendLoading, isAuthenticated, refetch]);

  // Delete workflow
  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
      setDeleting(workflowId);
      await workflowService.deleteWorkflow(workflowId);
      setWorkflows(workflows.filter(w => w.id !== workflowId));
    } catch (err: any) {
      console.error('Failed to delete workflow:', err);
      alert('Failed to delete workflow');
    } finally {
      setDeleting(null);
    }
  };
  
  if (authLoading || backendLoading || loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center">
          <div className="text-white">
            {backendLoading ? 'Authenticating...' : 'Loading workflows...'}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const hasWorkflows = workflows.length > 0;

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

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {hasWorkflows ? (
          /* Show workflow cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <Card key={workflow.id} className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all rounded-2xl overflow-hidden">
                <div className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {workflow.name}
                      </h3>
                      {workflow.description && (
                        <p className="text-sm text-white/60 mt-1 line-clamp-2">
                          {workflow.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-white/50">
                    <div className="flex items-center gap-1">
                      <Workflow className="w-3 h-3" />
                      <span>{workflow.nodes?.length || 0} nodes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{workflow.executionCount || 0} runs</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      workflow.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      workflow.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {workflow.status}
                    </span>
                    <span className="text-xs text-white/40">
                      {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-white/5 mt-2">
                    <Link href={`/workflows/editor?id=${workflow.id}`} className="flex-1">
                      <Button 
                        variant="outline" 
                        className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
                        size="sm"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 px-3"
                      onClick={() => handleDelete(workflow.id)}
                      disabled={deleting === workflow.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty state when no workflows */
          <div className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-16 text-center">
            <div className="w-20 h-20 bg-[#FF6900]/10 border border-[#FF6900]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Workflow className="w-10 h-10 text-[#FF6900]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">No NEXA's Created Yet</h2>
            <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
              Create your first intelligent workflow to automate tasks and streamline your business processes.
            </p>
            <Link href="/workflows/new">
              <Button className="bg-[#FF6900] hover:bg-[#FF6900]/90 text-white px-8 py-3">
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
