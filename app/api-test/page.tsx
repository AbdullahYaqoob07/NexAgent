'use client';

/**
 * Example page showing how to use the integrated Backend API
 * This demonstrates both Firebase auth and Backend API integration
 */

import { useState, useEffect } from 'react';
import { useBackendAuth } from '@/lib/contexts/BackendAuthContext';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function APITestPage() {
  const { user: firebaseUser, getUserToken } = useAuth();
  const { user: backendUser, loading, isAuthenticated, refreshUser } = useBackendAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const fbToken = await getUserToken();
      setToken(fbToken);
    };
    if (firebaseUser) {
      fetchToken();
    }
  }, [firebaseUser, getUserToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6900] mx-auto mb-4"></div>
          <p>Loading authentication state...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-[#FF6900] mb-8">
          Backend API Integration Test
        </h1>

        {/* Firebase User Info */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h2 className="text-xl font-semibold mb-4 text-[#FF6900]">
            Firebase Authentication
          </h2>
          {firebaseUser ? (
            <div className="space-y-2 text-sm">
              <p><span className="text-zinc-400">UID:</span> {firebaseUser.uid}</p>
              <p><span className="text-zinc-400">Email:</span> {firebaseUser.email}</p>
              <p><span className="text-zinc-400">Display Name:</span> {firebaseUser.displayName || 'Not set'}</p>
              <p><span className="text-zinc-400">Email Verified:</span> {firebaseUser.emailVerified ? '✅ Yes' : '❌ No'}</p>
              <div className="mt-4 p-3 bg-zinc-800 rounded text-xs">
                <p className="text-zinc-400 mb-2">Firebase ID Token:</p>
                <p className="break-all font-mono">{token ? token.substring(0, 50) + '...' : 'Loading...'}</p>
              </div>
            </div>
          ) : (
            <p className="text-zinc-400">Not signed in with Firebase</p>
          )}
        </Card>

        {/* Backend User Info */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h2 className="text-xl font-semibold mb-4 text-[#FF6900]">
            Backend API Session
          </h2>
          {isAuthenticated && backendUser ? (
            <div className="space-y-2 text-sm">
              <p><span className="text-zinc-400">UID:</span> {backendUser.uid}</p>
              <p><span className="text-zinc-400">Email:</span> {backendUser.email}</p>
              <p><span className="text-zinc-400">Display Name:</span> {backendUser.display_name || 'Not set'}</p>
              <p><span className="text-zinc-400">Email Verified:</span> {backendUser.email_verified ? '✅ Yes' : '❌ No'}</p>
              <div className="mt-4">
                <Button 
                  onClick={refreshUser}
                  className="bg-[#FF6900] hover:bg-[#E55D00]"
                >
                  Refresh Backend Session
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-zinc-400">No backend session active</p>
              {firebaseUser && (
                <p className="text-sm text-yellow-400">
                  ℹ️ Backend session will be created automatically when you sign in with Firebase
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Integration Status */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h2 className="text-xl font-semibold mb-4 text-[#FF6900]">
            Integration Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <span className="text-zinc-400">Backend API URL:</span>
              <span className="text-sm font-mono">
                {process.env.NEXT_PUBLIC_BACKEND_API_URL || 'Not configured'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <span className="text-zinc-400">Firebase Auth:</span>
              <span className={firebaseUser ? 'text-green-400' : 'text-red-400'}>
                {firebaseUser ? '✅ Active' : '❌ Not active'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <span className="text-zinc-400">Backend Session:</span>
              <span className={isAuthenticated ? 'text-green-400' : 'text-red-400'}>
                {isAuthenticated ? '✅ Active' : '❌ Not active'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <span className="text-zinc-400">Token Sync:</span>
              <span className={firebaseUser && isAuthenticated ? 'text-green-400' : 'text-yellow-400'}>
                {firebaseUser && isAuthenticated ? '✅ Synced' : '⚠️ Not synced'}
              </span>
            </div>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h2 className="text-xl font-semibold mb-4 text-[#FF6900]">
            How It Works
          </h2>
          <div className="space-y-3 text-sm text-zinc-300">
            <div className="flex gap-3">
              <span className="text-[#FF6900] font-bold">1.</span>
              <p>User signs in with Firebase (email/password or Google)</p>
            </div>
            <div className="flex gap-3">
              <span className="text-[#FF6900] font-bold">2.</span>
              <p>Firebase generates an ID token</p>
            </div>
            <div className="flex gap-3">
              <span className="text-[#FF6900] font-bold">3.</span>
              <p>Frontend sends Firebase ID token to backend API <code className="bg-zinc-800 px-2 py-1 rounded">/api/v1/auth/verify-token</code></p>
            </div>
            <div className="flex gap-3">
              <span className="text-[#FF6900] font-bold">4.</span>
              <p>Backend verifies the token and creates a session (valid for 1 week)</p>
            </div>
            <div className="flex gap-3">
              <span className="text-[#FF6900] font-bold">5.</span>
              <p>Backend returns a session token stored in localStorage</p>
            </div>
            <div className="flex gap-3">
              <span className="text-[#FF6900] font-bold">6.</span>
              <p>All subsequent API calls use the session token automatically</p>
            </div>
          </div>
        </Card>

        {!firebaseUser && (
          <div className="text-center py-8">
            <p className="text-zinc-400 mb-4">Sign in to test the integration</p>
            <Button 
              onClick={() => window.location.href = '/sign-in'}
              className="bg-[#FF6900] hover:bg-[#E55D00]"
            >
              Go to Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
