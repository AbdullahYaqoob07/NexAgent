'use client';

import { useRequireAuth } from '@/lib/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth();
  
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
      {children}
    </DashboardLayout>
  );
}
