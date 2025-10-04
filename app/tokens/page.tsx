import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import TokensView from '@/components/tokens/TokensView';

export default async function TokensPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        <TokensView />
      </div>
    </DashboardLayout>
  );
}
