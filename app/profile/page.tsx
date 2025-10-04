import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ProfileView from '@/components/profile/ProfileView';

export default async function ProfilePage() {
  const user = await currentUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  // Extract only serializable data from the Clerk user object
  const userData = {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    username: user.username || '',
    profileImageUrl: user.imageUrl || '',
    createdAt: user.createdAt || Date.now(),
    lastSignInAt: user.lastSignInAt || Date.now(),
    emailVerified: user.emailAddresses[0]?.verification?.status === 'verified',
    phoneVerified: user.phoneNumbers[0]?.verification?.status === 'verified'
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        <ProfileView user={userData} />
      </div>
    </DashboardLayout>
  );
}
