'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useBackendAuth } from '@/lib/contexts/BackendAuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Workflow, Plus, Trash2, Edit, Clock, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      console.log('🔍 Fetching workflows from backend...');
      try {
        const response = await workflowService.listWorkflows({ page: 1, pageSize: 50 });
        console.log('✅ Workflows response:', response);
        if (!response.success) {
          throw new Error((response as any).message || 'Failed to load workflows');
        }
        return response;
      } catch (err: any) {
        console.error('❌ Failed to fetch workflows:', err);
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        throw err;
      }
    },
    enabled: !!isAuthenticated && !authLoading && !backendLoading,
    staleTime: 30 * 1000,
    retry: 2,
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
      console.log('🔄 Auth complete, fetching workflows...');
      refetch();
    }
  }, [authLoading, backendLoading, isAuthenticated, refetch]);

  // Delete workflow
  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
      setDeleting(workflowId);
      await workflowService.deleteWorkflow(workflowId);
      await refetch();
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
            <p className="text-red-400 text-sm font-semibold mb-2">Error loading workflows</p>
            <p className="text-red-300/80 text-xs">{errorMessage || 'Failed to load workflows'}</p>
            <p className="text-red-300/60 text-xs mt-2">Check browser console for details</p>
            <Button 
              onClick={() => refetch()} 
              variant="outline"
              className="mt-3 text-xs border-red-500/30 hover:bg-red-500/10"
              size="sm"
            >
              Retry
            </Button>
          </div>
        )}

        {hasWorkflows ? (
          /* Show workflow cards with marketplace design */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="group relative bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1 duration-300">
                {/* Image header with overlays */}
                <div className="relative h-48 w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#FF6900]/20 to-[#1a0c02]">
                  {/* Overlay for better text visibility */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
                  
                  {/* Top left status badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <div className={`px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-medium ${
                      workflow.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      workflow.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {workflow.status}
                    </div>
                  </div>
                  
                  {/* Top right: nodes badge and Share button */}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
                      {workflow.nodes?.length || 0} nodes
                    </div>
                    <Link href="/marketplace">
                      <button 
                        className="p-2 rounded-lg bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors"
                        title="Share to marketplace"
                      >
                        <Share className="w-4 h-4" />
                      </button>
                    </Link>
                  </div>
                  
                  {/* Bottom stats badge */}
                  <div className="absolute bottom-3 left-3 z-10">
                    <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white">
                      <div className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-sm font-medium">{workflow.executionCount || 0} runs</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Card body */}
                <div className="p-5 flex-1 flex flex-col bg-[#0a0806]">
                  {/* Title and description */}
                  <h3 className="text-white font-semibold text-lg line-clamp-1 mb-2" title={workflow.name}>{workflow.name}</h3>
                  <p className="text-white/60 text-sm line-clamp-2 mb-4">{workflow.description || 'No description provided'}</p>
                  
                  {/* Updated info and actions */}
                  <div className="mt-auto pt-4 border-t border-white/5">
                    <div className="text-xs text-white/50 mb-3">
                      Updated {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                    </div>
                    
                    {/* Action buttons - only Edit and Delete */}
                    <div className="flex items-center gap-2">
                      <Link href={`/workflows/editor?id=${workflow.id}`} className="flex-1">
                        <button className="w-full px-4 py-2.5 text-sm rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 inline-flex items-center justify-center gap-2 transition-colors">
                          <Edit className="w-4 h-4" /> Edit
                        </button>
                      </Link>
                      <div className="flex-1">
                        <button 
                          onClick={() => handleDelete(workflow.id)}
                          disabled={deleting === workflow.id}
                          className="w-full px-4 py-2.5 text-sm rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
