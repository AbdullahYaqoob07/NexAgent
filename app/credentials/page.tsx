"use client";

import { useRequireAuth } from "@/lib/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CredentialsView from "@/components/credentials/CredentialsView";

export default function CredentialsPage() {
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

  // useRequireAuth will handle redirecting to /sign-in when not authenticated
  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        <CredentialsView />
      </div>
    </DashboardLayout>
  );
}
