"use client";

import React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";

export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Not logged in -> go to sign-in
    if (!user) {
      router.replace("/sign-in");
      return;
    }

    // Logged in but not the admin account -> send to normal dashboard
    if (user.email !== "admin@gmail.com") {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  // While checking auth, or while redirecting away, render nothing to avoid flicker
  if (loading || !user || user.email !== "admin@gmail.com") {
    return null;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
