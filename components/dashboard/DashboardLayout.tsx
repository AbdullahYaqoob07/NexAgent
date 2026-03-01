"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon, Settings, AlertTriangle, MailCheck, X, Menu, ChevronRight } from "lucide-react";
import Image from "next/image";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Custom icon component for SVG icons
const SvgIcon = ({ src, className }: { src: string; className?: string }) => (
  <Image src={src} alt="" width={24} height={24} className={className} />
);

const sidebarItems = [
  { name: "Dashboard", iconSrc: "/assets/dashboard/dasboard.svg", href: "/dashboard" },
  { name: "Workflows", iconSrc: "/assets/dashboard/workflow.svg", href: "/workflows" },
  { name: "Credentials", iconSrc: "/assets/dashboard/token.svg", href: "/credentials" },
  { name: "Marketplace", iconSrc: "/assets/dashboard/marketPlace.svg", href: "/marketplace" },
  // { name: "Tokens", iconSrc: "/assets/dashboard/token.svg", href: "/tokens" },
  { name: "Profile", iconSrc: "/assets/dashboard/profile.svg", href: "/profile" },
  { name: "Settings", iconSrc: "/assets/dashboard/setting.svg", href: "/settings" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(true);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const pathname = usePathname();
  const { user, loading, signOut, sendVerificationEmail } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6900] mx-auto mb-4"></div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated (handled by useEffect in pages)
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/70">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/sign-in';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    if (user.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return user.email?.charAt(0).toUpperCase() || 'U';
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      await sendVerificationEmail();
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error) {
      console.error('Failed to resend verification email:', error);
    } finally {
      setResendLoading(false);
    }
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
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <Image 
              src="/assets/logo/Logo.svg" 
              alt="NexAgent Logo" 
              width={122} 
              height={26}
              className="transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
          {/* <p className="text-xs text-white/50 mt-2 font-montserrat">AI Workspace</p> */}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                      isActive
                        ? "bg-gradient-to-r from-[#FF6900] to-[#C22C00] text-white"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <SvgIcon
                      src={item.iconSrc}
                      className={`w-5 h-5 transition-all ${isActive ? '' : 'opacity-80 group-hover:opacity-100'}`}
                    />
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
                  <p className="text-xs font-montserrat text-white/50">Manage Account</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-black/90 backdrop-blur-xl border-white/10" align="end">
              <DropdownMenuLabel className="text-white">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem asChild className="text-white hover:bg-white/10">
                <Link href="/profile" className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-white hover:bg-white/10">
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
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
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64 relative">
        {/* Global dashboard background */}
        <div className="pointer-events-none fixed inset-0 z-0">
          {/* Top-left background */}
          <div className="absolute -top-10 -left-10 md:-top-16 md:-left-8 opacity-40 md:opacity-60">
            <Image
              src="/assets/dashboard/BG-left.svg"
              alt=""
              width={700}
              height={700}
              className="max-w-none select-none"
              priority
            />
          </div>

          {/* Right-aligned background */}
          <div className="absolute top-10 right-0 md:-top-4 opacity-40 md:opacity-70">
            <Image
              src="/assets/dashboard/BG-right.svg"
              alt=""
              width={600}
              height={600}
              className="max-w-none select-none"
              priority
            />
          </div>
        </div>

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
            <Link href="/dashboard" className="lg:hidden flex items-center">
              <Image 
                src="/assets/logo/Logo.svg" 
                alt="NexAgent Logo" 
                width={100} 
                height={22}
              />
            </Link>

          </div>
        </header>

        {/* Email Verification Banner */}
        {user && !user.emailVerified && showVerificationBanner && (
          <div className="sticky top-[73px] z-10 bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-sm">
            <div className="px-4 lg:px-8 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-400 mb-1">
                      Please verify your email address
                    </p>
                    <p className="text-xs text-amber-300/80">
                      We've sent a verification link to <span className="font-semibold">{user.email}</span>. 
                      Please check your inbox and click the link to verify your account.
                    </p>
                    {resendSuccess && (
                      <p className="text-xs text-green-400 mt-2">
                        ✓ Verification email sent successfully!
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    variant="outline"
                    size="sm"
                    className="bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 text-xs h-8"
                  >
                    {resendLoading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <MailCheck className="w-3 h-3 mr-1.5" />
                        Resend
                      </>
                    )}
                  </Button>
                  <button
                    onClick={() => setShowVerificationBanner(false)}
                    className="text-amber-400/60 hover:text-amber-400 transition-colors p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 relative z-10">{children}</main>
      </div>
    </div>
  );
}
