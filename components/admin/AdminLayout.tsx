"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  BarChart3,
  LineChart,
  ShieldCheck,
  Boxes,
  Store,
  Bell,
  FileText,
  CreditCard,
  Workflow,
  Users,
  Settings,
  Menu,
  Search,
  ChevronRight,
  LogOut,
} from "lucide-react";

export type AdminNavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: AdminNavItem[] = [
  { name: "Overview", href: "/admin321", icon: LayoutDashboard },
  { name: "Analytics", href: "/admin321/analytics", icon: BarChart3 },
  { name: "System", href: "/admin321/system", icon: LineChart },
  { name: "Audit Logs", href: "/admin321/audit", icon: ShieldCheck },
  { name: "Integrations", href: "/admin321/integrations", icon: Boxes },
  { name: "Marketplace", href: "/admin321/marketplace", icon: Store },
  { name: "Templates", href: "/admin321/templates", icon: FileText },
  { name: "Notifications", href: "/admin321/notifications", icon: Bell },
  { name: "Billing", href: "/admin321/billing", icon: CreditCard },
  { name: "Workflows", href: "/admin321/workflows", icon: Workflow },
  { name: "Users", href: "/admin321/users", icon: Users },
  { name: "Settings", href: "/admin321/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase()
    : (user?.email?.[0] || "U").toUpperCase();

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-30 h-full w-72 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col transform transition-transform duration-300 overflow-y-auto admin-scroll ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF6900] to-[#FF8555]" />
          <div>
            <h1 className="text-xl font-bold">Nex<span className="text-[#FF6900]">Agent</span></h1>
            <p className="text-xs text-white/50">Admin Console</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input placeholder="Search..." className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40" />
          </div>
        </div>

        <Separator className="my-4 bg-white/10" />

        {/* Nav */}
        <nav className="px-3 pb-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                      active
                        ? "bg-gradient-to-r from-[#FF6900]/20 to-[#FF8555]/20 border border-[#FF6900]/30 text-[#FF6900]"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? "text-[#FF6900]" : ""}`} />
                    <span className="font-medium">{item.name}</span>
                    {active && <ChevronRight className="w-4 h-4 ml-auto text-[#FF6900]" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9">
              <AvatarImage src={user?.photoURL || ""} />
              <AvatarFallback className="bg-gradient-to-br from-[#FF6900] to-[#FF8555] text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.displayName || user?.email}</p>
              <p className="text-xs text-white/50 truncate">Admin</p>
            </div>
            <Button
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={async () => { try { await signOut(); window.location.href = "/sign-in" } catch {} }}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Topbar + Content */}
      <div className="flex-1 min-h-screen md:ml-72 flex flex-col">
        <header className="sticky top-0 z-20 bg-black/40 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between px-4 md:px-8 py-4">
            <Button
              variant="ghost"
              className="md:hidden text-white hover:text-[#FF6900]"
              onClick={() => setOpen((v) => !v)}
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div className="hidden md:block text-sm text-white/60">Admin Console</div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-xs text-white/50">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                Live
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
