"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon, Settings as SettingsIcon } from "lucide-react";
import {
  Menu,
  X,
  ChevronRight,
  LayoutDashboard,
  BarChart3,
  LineChart,
  ShieldCheck,
  Boxes,
  Bell,
  FileText,
  CreditCard,
  Users,
} from "lucide-react";
import Image from "next/image";

// Custom icon component for SVG icons
const SvgIcon = ({ src, className }: { src: string; className?: string }) => (
  <Image src={src} alt="" width={24} height={24} className={className} />
);

export type AdminNavItem = {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconSrc?: string;
};

const navItems: AdminNavItem[] = [
  { name: "Overview", href: "/admin321", icon: LayoutDashboard },
  { name: "Analytics", href: "/admin321/analytics", icon: BarChart3 },
  { name: "System", href: "/admin321/system", icon: LineChart },
  { name: "Audit Logs", href: "/admin321/audit", icon: ShieldCheck },
  { name: "Integrations", href: "/admin321/integrations", icon: Boxes },
  { name: "Marketplace", href: "/admin321/marketplace", iconSrc: "/assets/dashboard/marketPlace.svg" },
  { name: "Templates", href: "/admin321/templates", icon: FileText },
  { name: "Notifications", href: "/admin321/notifications", icon: Bell },
  { name: "Billing", href: "/admin321/billing", icon: CreditCard },
  { name: "Workflows", href: "/admin321/workflows", iconSrc: "/assets/dashboard/workflow.svg" },
  { name: "Users", href: "/admin321/users", icon: Users },
  { name: "Settings", href: "/admin321/settings", iconSrc: "/assets/dashboard/setting.svg" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/sign-in';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserInitials = () => {
    if (!user) return 'A';
    if (user.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return user.email?.charAt(0).toUpperCase() || 'A';
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:fixed left-0 top-0 z-30 h-full w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col transform transition-transform duration-300 overflow-y-auto
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="p-6">
          <Link href="/admin321" className="flex items-center gap-3 group">
            <Image 
              src="/assets/logo/Logo.svg" 
              alt="NexAgent Logo" 
              width={122} 
              height={26}
              className="transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
          <p className="text-xs text-white/50 mt-2 font-montserrat">Admin Console</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                      isActive
                        ? "bg-gradient-to-r from-[#FF6900] to-[#C22C00] text-white"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {item.iconSrc ? (
                      <SvgIcon
                        src={item.iconSrc}
                        className={`w-5 h-5 transition-all ${isActive ? '' : 'opacity-80 group-hover:opacity-100'}`}
                      />
                    ) : Icon ? (
                      <Icon className={`w-5 h-5 transition-all ${isActive ? '' : 'opacity-80 group-hover:opacity-100'}`} />
                    ) : null}
                    <span className="font-montserrat font-medium">{item.name}</span>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 ml-auto text-white" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-white/10">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.photoURL || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-[#FF6900] to-[#FF8555] text-white text-xs">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-montserrat font-medium text-white">{user?.displayName || user?.email}</p>
                  <p className="text-xs font-montserrat text-white/50">Admin Account</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-black/90 backdrop-blur-xl border-white/10" align="end">
              <DropdownMenuLabel className="text-white">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem asChild className="text-white hover:bg-white/10">
                <Link href="/admin321/settings" className="flex items-center gap-2">
                  <SettingsIcon className="w-4 h-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-400 hover:bg-red-400/10">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-black/40 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden text-white hover:text-[#FF6900] transition-colors duration-300"
            >
              {isSidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            {/* Logo for Mobile */}
            <Link href="/admin321" className="lg:hidden flex items-center">
              <Image 
                src="/assets/logo/Logo.svg" 
                alt="NexAgent Logo" 
                width={100} 
                height={22}
              />
            </Link>

            {/* Admin indicator for desktop */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-white/50">
              <div className="w-2 h-2 rounded-full bg-[#FF6900]" />
              Admin Mode
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 relative z-10 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
