'use client';

import { useAuth } from '@/lib/AuthContext';
import WorkflowEditor from '@/components/workflows/WorkflowEditor';
import { Button } from '@/components/ui/button';

export default function NewWorkflowPage() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-white shadow-2xl">
          <h1 className="text-2xl font-bold mb-2">Sign in required</h1>
          <p className="text-white/70 mb-6">You need to sign in to create and save workflows.</p>
          <div className="flex gap-3">
            <Button
              className="bg-[#FF6900] hover:bg-[#E55D00] text-white flex-1"
              onClick={() => { window.location.href = '/sign-in'; }}
            >
              Sign in to continue
            </Button>
            <Button
              variant="ghost"
              className="text-white/80 flex-1"
              onClick={() => { window.location.href = '/'; }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <WorkflowEditor />;
}
