'use client';

import { useRequireAuth } from '@/lib/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ProfileView from '@/components/profile/ProfileView';

export default function ProfilePageWrapper() {
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

  // Transform user to serializable format for ProfileView
  const serializableUser = {
    id: user?.uid || '',
    email: user?.email || '',
    firstName: user?.displayName?.split(' ')[0] || '',
    lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
    username: user?.displayName || '',
    profileImageUrl: user?.photoURL || '',
    createdAt: (user as any)?.metadata?.creationTime ? new Date((user as any).metadata.creationTime).getTime() : 0,
    lastSignInAt: (user as any)?.metadata?.lastSignInTime ? new Date((user as any).metadata.lastSignInTime).getTime() : 0,
    emailVerified: user?.emailVerified || false,
    phoneVerified: false
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        <ProfileView user={serializableUser} />
      </div>
    </DashboardLayout>
  );
}
