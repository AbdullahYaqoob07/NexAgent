import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default async function TokensPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white">API Tokens</h1>
          <p className="text-white/70 text-lg mt-1">Manage your API tokens and usage</p>
        </div>
        
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔑</span>
          </div>
          <h3 className="text-xl font-medium text-white mb-2">Token Management Coming Soon</h3>
          <p className="text-white/70">
            Manage your API tokens, view usage statistics, and configure rate limits.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}