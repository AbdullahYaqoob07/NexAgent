'use client';

import { useRequireAuth } from '@/lib/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import SettingsView from '@/components/settings/SettingsView';

export default function SettingsPage() {
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

  // Transform user to serializable format for SettingsView
  const serializableUser = {
    id: user?.uid || '',
    email: user?.email || '',
    firstName: user?.displayName?.split(' ')[0] || '',
    lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
    username: user?.displayName || '',
    profileImageUrl: user?.photoURL || '',
    createdAt: Date.now(),
    lastSignInAt: Date.now(),
    emailVerified: user?.emailVerified || false,
    phoneVerified: false
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        <SettingsView user={serializableUser} />
      </div>
    </DashboardLayout>
  );
}
