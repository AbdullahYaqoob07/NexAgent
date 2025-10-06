'use client';

import { useRequireAuth } from '@/lib/AuthContext'
import DashboardHome from '@/components/dashboard/DashboardHome'

export default function DashboardPage() {
  const { user, loading } = useRequireAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return <DashboardHome />
}
