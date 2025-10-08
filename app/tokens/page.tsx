'use client';

import { useRequireAuth } from '@/lib/AuthContext';
import { useUserProfile } from '@/lib/useUserProfile';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Key, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TokensPage() {
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

  const apiKeys = profileData?.apiKeys || [];
  const hasTokens = apiKeys.length > 0;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">API Tokens</h1>
            <p className="text-white/70 text-lg mt-1">Manage your API authentication and monitor usage</p>
          </div>
          <Button className="bg-[#FF6900] hover:bg-[#E55D00] text-white px-6">
            <Plus className="w-4 h-4 mr-2" />
            Create Token
          </Button>
        </div>

        {hasTokens ? (
          /* Show actual tokens when available */
          <div className="grid grid-cols-1 gap-6">
            {apiKeys.map((token) => (
              <div key={token.id} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#FF6900]/10">
                      <Key className="w-5 h-5 text-[#FF6900]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{token.name}</h3>
                      <p className="text-white/60 text-sm">Created {token.createdAt.toDate().toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full border ${
                      token.status === 'active' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                      token.status === 'inactive' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                      'text-red-400 bg-red-400/10 border-red-400/20'
                    }`}>
                      {token.status}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full border ${
                      token.environment === 'production' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                      token.environment === 'development' ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' :
                      'text-orange-400 bg-orange-400/10 border-orange-400/20'
                    }`}>
                      {token.environment}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-mono text-sm text-white/80 bg-white/5 p-2 rounded">
                    {token.keyPreview}••••••••••••••••••••
                  </div>
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <span>Scopes: {token.scopes.join(', ')}</span>
                    <span>Rate limit: {token.rateLimit}/hr</span>
                    {token.lastUsed && (
                      <span>Last used: {token.lastUsed.toDate().toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state when no tokens */
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Key className="w-10 h-10 text-white/40" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">No API Tokens Created Yet</h2>
            <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
              Create your first API token to start integrating with NexAgent's powerful workflow engine.
            </p>
            <Button className="bg-[#FF6900] hover:bg-[#E55D00] text-white px-8 py-3">
              <Plus className="w-5 h-5 mr-2" />
              Get Started Now
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
