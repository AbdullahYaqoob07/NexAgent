'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useBackendAuth } from '@/lib/contexts/BackendAuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Workflow, Plus, Trash2, Edit, Clock, Share, ShoppingBag, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { workflowService } from '@/lib/api/services/workflowService';
import { formatDistanceToNow } from 'date-fns';
import { getAuthToken } from '@/lib/api/client';
import { marketplaceService, MarketplacePurchase } from '@/lib/api/services/marketplaceService';

type Tab = 'mine' | 'purchased';

export default function WorkflowsPage() {
  const router = useRouter();
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const { user: backendUser, loading: backendLoading, isAuthenticated } = useBackendAuth();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('mine');
  const [purchases, setPurchases] = useState<MarketplacePurchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  const {
    data: workflowsResponse,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await workflowService.listWorkflows({ page: 1, pageSize: 50 });
      if (!response.success) throw new Error((response as any).message || 'Failed to load workflows');
      return response;
    },
    enabled: !!isAuthenticated && !authLoading && !backendLoading,
    staleTime: 30 * 1000,
    retry: 2,
  });

  const workflows = workflowsResponse?.workflows ?? [];
  const errorMessage = (error as Error | null)?.message ?? null;

  // Load purchased nexas from Firestore when tab is opened
  useEffect(() => {
    if (activeTab === 'purchased' && firebaseUser) {
      setPurchasesLoading(true);
      marketplaceService.getPurchasedNexas(firebaseUser.uid)
        .then(setPurchases)
        .catch(() => setPurchases([]))
        .finally(() => setPurchasesLoading(false));
    }
  }, [activeTab, firebaseUser]);

  useEffect(() => {
    if (!authLoading && !backendLoading && !firebaseUser && !isAuthenticated) {
      router.push('/sign-in');
    }
  }, [firebaseUser, isAuthenticated, authLoading, backendLoading, router]);

  useEffect(() => {
    if (!authLoading && !backendLoading && isAuthenticated) refetch();
  }, [authLoading, backendLoading, isAuthenticated, refetch]);

  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      setDeleting(workflowId);
      await workflowService.deleteWorkflow(workflowId);
      await refetch();
    } catch {
      alert('Failed to delete workflow');
    } finally {
      setDeleting(null);
    }
  };

  if (authLoading || backendLoading || loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center">
          <div className="text-white">{backendLoading ? 'Authenticating...' : 'Loading workflows...'}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">Workflows</h1>
            <p className="text-white/70 text-lg mt-1">Build and manage your AI-powered automation workflows</p>
          </div>
          {activeTab === 'mine' && (
            <Link href="/workflows/new">
              <Button className="bg-[#FF6900] hover:bg-[#E55D00] text-white px-6">
                <Plus className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('mine')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'mine'
                ? 'bg-[#FF6900] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Workflow className="w-4 h-4" />
            My Workflows
            {workflows.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'mine' ? 'bg-white/20' : 'bg-zinc-700'}`}>
                {workflows.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('purchased')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'purchased'
                ? 'bg-[#FF6900] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Purchased
            {purchases.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'purchased' ? 'bg-white/20' : 'bg-zinc-700'}`}>
                {purchases.length}
              </span>
            )}
          </button>
        </div>

        {/* ── My Workflows tab ── */}
        {activeTab === 'mine' && (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                <p className="text-red-400 text-sm font-semibold mb-1">Error loading workflows</p>
                <p className="text-red-300/80 text-xs">{errorMessage || 'Failed to load workflows'}</p>
                <Button onClick={() => refetch()} variant="outline" className="mt-3 text-xs border-red-500/30" size="sm">Retry</Button>
              </div>
            )}

            {workflows.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="group relative bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1 duration-300">
                    <div className="relative h-48 w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#FF6900]/20 to-[#1a0c02]">
                      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
                      <div className="absolute top-3 left-3 z-10">
                        <div className={`px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-xs font-medium ${
                          workflow.status === 'active' ? 'text-green-400' :
                          workflow.status === 'draft' ? 'text-yellow-400' : 'text-gray-400'
                        }`}>{workflow.status}</div>
                      </div>
                      <div className="absolute top-3 right-3 z-10">
                        <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
                          {workflow.nodes?.length || 0} nodes
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 z-10">
                        <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white">
                          <div className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-sm font-medium">{workflow.executionCount || 0} runs</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col bg-[#0a0806]">
                      <h3 className="text-white font-semibold text-lg line-clamp-1 mb-2">{workflow.name}</h3>
                      <p className="text-white/60 text-sm line-clamp-2 mb-4">{workflow.description || 'No description provided'}</p>
                      <div className="mt-auto pt-4 border-t border-white/5">
                        <div className="text-xs text-white/50 mb-3">
                          Updated {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/workflows/editor?id=${workflow.id}`} className="flex-1">
                            <button className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 inline-flex items-center justify-center gap-1.5 transition-colors">
                              <Edit className="w-4 h-4" /> Edit
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDelete(workflow.id)}
                            disabled={deleting === workflow.id}
                            className="px-3 py-2 text-sm rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <Link href="/marketplace" className="flex-1">
                            <button className="w-full px-3 py-2 text-sm rounded-lg bg-[#FF6900] hover:bg-[#FF6900]/90 text-white inline-flex items-center justify-center gap-1.5 transition-colors">
                              <Store className="w-4 h-4" /> Publish
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
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
                    <Plus className="w-5 h-5 mr-2" />Get Started Now
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}

        {/* ── Purchased tab ── */}
        {activeTab === 'purchased' && (
          <>
            {purchasesLoading ? (
              <div className="text-white/60 text-sm text-center py-10">Loading purchased workflows...</div>
            ) : purchases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {purchases.map((purchase) => (
                  <div key={purchase.id} className="group relative bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1 duration-300">
                    <div className="relative h-48 w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-900/40 to-[#1a0c02]">
                      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
                      <div className="absolute top-3 left-3 z-10">
                        <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-blue-400 text-xs font-medium">Purchased</div>
                      </div>
                      <div className="absolute top-3 right-3 z-10">
                        <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
                          {purchase.price === 0 ? 'Free' : `$${purchase.price.toFixed(2)}`}
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 z-10">
                        <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white/70 text-xs">
                          by {purchase.authorName}
                        </div>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col bg-[#0a0806]">
                      <h3 className="text-white font-semibold text-lg line-clamp-1 mb-2">{purchase.nexaName}</h3>
                      <p className="text-white/60 text-sm line-clamp-2 mb-4">{purchase.description || 'No description'}</p>
                      <div className="mt-auto pt-4 border-t border-white/5">
                        <div className="text-xs text-white/50 mb-3">
                          Purchased {purchase.purchasedAt?.toDate ? formatDistanceToNow(purchase.purchasedAt.toDate(), { addSuffix: true }) : 'recently'}
                        </div>
                        <button
                          onClick={() => {
                            const json = JSON.stringify(purchase.workflowData);
                            const blob = new Blob([json], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${purchase.nexaName.replace(/\s+/g, '_')}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-[#FF6900] hover:bg-[#E55D00] text-white inline-flex items-center justify-center gap-1.5 transition-colors"
                        >
                          Download Workflow JSON
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-16 text-center">
                <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="w-10 h-10 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">No Purchased Workflows</h2>
                <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
                  Browse the marketplace to discover and integrate community-built workflows.
                </p>
                <Link href="/marketplace">
                  <Button className="bg-[#FF6900] hover:bg-[#FF6900]/90 text-white px-8 py-3">
                    <Store className="w-5 h-5 mr-2" />Browse Marketplace
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
