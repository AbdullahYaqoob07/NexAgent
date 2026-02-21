"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { 
  Workflow, 
  Store, 
  Coins, 
  TrendingUp, 
  Activity, 
  Clock, 
  ArrowRight,
  Zap,
  Bot,
  BarChart3,
  Calendar,
  Search,
  Bell,
  X,
  Check,
  AlertCircle,
  Info,
  Users
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from 'next/navigation';

import { useUserProfile } from '@/lib/useUserProfile';
import { useAuth } from '@/lib/AuthContext';
import dashboardApiService, { DashboardOverview, RealTimeMetrics, Alert } from '@/lib/api/dashboard-api';

interface DashboardHomeProps {
  // No longer need user prop since we'll get it from the hook
}

export default function DashboardHome({}: DashboardHomeProps) {
  const { profileData, loading: profileLoading, displayName, trackFeature } = useUserProfile();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMarketplacePromo, setShowMarketplacePromo] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  // Backend dashboard data
  const [dashboardData, setDashboardData] = useState<DashboardOverview | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Track dashboard view
  React.useEffect(() => {
    trackFeature('dashboard_viewed');
  }, [trackFeature]);
  
  // Fetch dashboard data from backend - only when user is authenticated
  useEffect(() => {
    // Don't fetch if auth is still loading or user is not authenticated
    if (authLoading || !user) {
      setDataLoading(false);
      return;
    }
    
    const fetchDashboardData = async () => {
      // Double-check user is authenticated
      try {
        const { auth } = await import('@/lib/firebase');
        if (!auth.currentUser) {
          setDataLoading(false);
          return;
        }
        
        // Get fresh token
        const token = await auth.currentUser.getIdToken(true).catch(() => null);
        if (!token) {
          setDataLoading(false);
          return;
        }
      } catch (error) {
        setDataLoading(false);
        return;
      }
      
      try {
        setDataLoading(true);
        const [overview, realTime, alertsResponse] = await Promise.all([
          dashboardApiService.getDashboardOverview('24h'),
          dashboardApiService.getRealTimeMetrics(),
          dashboardApiService.getAlerts({ acknowledged: false, limit: 10 }),
        ]);
        setDashboardData(overview);
        setRealTimeMetrics(realTime);
        setAlerts(alertsResponse.alerts);
      } catch (error: any) {
        // Suppress "Invalid token" errors - they're expected if token is expired/invalid
        // These are handled gracefully by showing empty data
        if (error?.error !== 'NETWORK_ERROR' && 
            error?.status !== 401 && 
            error?.message !== 'Invalid token') {
          console.error('Failed to fetch dashboard data:', error);
        }
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [authLoading, user, profileLoading]);
  
  // Close notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const promoKey = `marketplace_promo_seen_${user.uid}`;
    try {
      const seen = localStorage.getItem(promoKey);
      if (!seen) {
        setShowMarketplacePromo(true);
      }
    } catch (error) {
      setShowMarketplacePromo(true);
    }
  }, [user?.uid]);

  const dismissMarketplacePromo = () => {
    if (user?.uid) {
      try {
        localStorage.setItem(`marketplace_promo_seen_${user.uid}`, '1');
      } catch (error) {
        // No-op if storage is unavailable
      }
    }
    setShowMarketplacePromo(false);
  };

  const handleMarketplacePromoClick = () => {
    if (user?.uid) {
      try {
        localStorage.setItem(`marketplace_promo_seen_${user.uid}`, '1');
      } catch (error) {
        // No-op if storage is unavailable
      }
    }
    setShowMarketplacePromo(false);
    router.push('/marketplace');
  };
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // For now, navigate to workflows with search query
      router.push(`/workflows?search=${encodeURIComponent(searchQuery)}`);
    }
  };
  
  // Convert alerts to notification format
  const notifications = alerts.map(alert => ({
    id: alert.id,
    type: alert.severity === 'critical' ? 'warning' : alert.severity === 'warning' ? 'warning' : alert.severity === 'info' ? 'info' : 'success',
    title: alert.title,
    message: alert.message,
    time: new Date(alert.timestamp).toLocaleString(),
    read: alert.acknowledged,
  }));
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const loading = profileLoading || dataLoading;
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-white text-lg">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }
  
  // Create dynamic stats from backend data
  const statsCards = [
    {
      title: "Workflows",
      value: dashboardData?.workflows.total.toString() || "0",
      change: `${dashboardData?.workflows.active || 0} active`,
      icon: Workflow,
      color: "from-[#FF6900] to-[#FF8555]",
      bgColor: "bg-[#FF6900]/10",
      borderColor: "border-[#FF6900]/20"
    },
    {
      title: "Executions",
      value: dashboardData?.executions.total.toLocaleString() || "0",
      change: `${dashboardData?.executions.running || 0} running`,
      icon: Activity,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      title: "Success Rate",
      value: `${dashboardData?.workflows.success_rate.toFixed(1) || 0}%`,
      change: `${dashboardData?.executions.successful || 0} successful`,
      icon: TrendingUp,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20"
    },
    {
      title: "Active Users",
      value: realTimeMetrics?.activeUsers.toString() || "0",
      change: `${realTimeMetrics?.requestsPerSecond.toFixed(1) || 0} req/s`,
      icon: Users,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20"
    }
  ];

  const featuredTemplates = [
    {
      id: '1',
      name: 'Google Sheets Automation',
      category: 'Data Processing',
      rating: 4.8,
      installs: 12500,
      author: 'NexAgent Team',
      price: 'Free',
      description: 'Automatically sync data between Google Sheets and your workflows.',
      image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=200&fit=crop'
    },
    {
      id: '2',
      name: 'Slack Integration Hub',
      category: 'Communication',
      rating: 4.6,
      installs: 8900,
      author: 'DevCorp',
      price: '$9.99',
      description: 'Send notifications and manage team communication directly from workflows.',
      image: 'https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=400&h=200&fit=crop'
    }
  ];
  
  // Quick actions for the dashboard
  const quickActions = [
    {
      title: "Workflows",
      description: "Create and manage AI workflows",
      icon: Workflow,
      href: "/workflows",
      color: "from-[#FF6900] to-[#FF8555]"
    },
    {
      title: "Workflow Demo",
      description: "Try the interactive workflow engine",
      icon: Bot,
      href: "/demo/workflow-engine",
      color: "from-green-500 to-green-600"
    },
    {
      title: "Marketplace",
      description: "Browse AI models and tools",
      icon: Store,
      href: "/marketplace",
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Tokens",
      description: "Manage your API tokens",
      icon: Coins,
      href: "/tokens",
      color: "from-yellow-500 to-yellow-600"
    }
  ];

  return (
    <DashboardLayout>
      <AnimatePresence>
        {showMarketplacePromo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Marketplace promotion"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm max-h-[80vh] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#121212] via-[#0b0b0b] to-[#1a0c02] p-5 shadow-2xl"
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  dismissMarketplacePromo();
                }}
                className="absolute right-3 top-3 rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close promotion"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF6900]/15">
                  <Store className="h-6 w-6 text-[#FF6900]" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Featured Marketplace</p>
                  <h2 className="text-2xl font-semibold text-white">Buy our featured workflows</h2>
                  <p className="text-sm text-white/70">
                    Explore curated automation packs and launch faster with proven templates.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {featuredTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={handleMarketplacePromoClick}
                    className="w-full text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex gap-3 p-3">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-white/10">
                        <img
                          src={template.image}
                          alt={template.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-white line-clamp-1">{template.name}</h3>
                          <span className="text-[11px] text-white/60">{template.price}</span>
                        </div>
                        <p className="mt-1 text-xs text-white/60 line-clamp-2">{template.description}</p>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-white/50">
                          <span>{template.category}</span>
                          <span className="text-white/30">•</span>
                          <span>{template.rating}★</span>
                          <span className="text-white/30">•</span>
                          <span>{template.installs.toLocaleString()} installs</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleMarketplacePromoClick}
                className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white hover:bg-white/10 transition-colors"
              >
                <span className="text-sm font-medium">Go to Marketplace</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Welcome Section + Search & Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-white">
              Welcome back, <span className="text-[#FF6900]">{displayName}</span>
            </h1>
            <p className="text-white/70 text-lg">
              Here&apos;s what&apos;s happening in your AI workspace today
            </p>
          </div>

          {/* Search bar + Notification bell */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 md:w-80 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2">
              <Search className="w-4 h-4 text-white/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workflows, tokens, anything..."
                className="bg-transparent border-none outline-none text-sm text-white placeholder:text-white/50 w-full"
              />
            </form>

            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-200"
              >
                <Bell className="w-5 h-5 text-white/80" />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#FF6900] shadow-[0_0_8px_rgba(255,105,0,0.8)]" />
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center rounded-full bg-[#FF6900] text-white text-[10px] font-bold px-1">
                      {unreadCount}
                    </span>
                  </>
                )}
              </button>
              
              {/* Notification Popup */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-80 md:w-96 bg-[#1a1410]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                      <h3 className="text-white font-semibold">Notifications</h3>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <X className="w-4 h-4 text-white/60" />
                      </button>
                    </div>
                    
                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => {
                          const Icon = 
                            notification.type === 'success' ? Check :
                            notification.type === 'warning' ? AlertCircle :
                            Info;
                          const iconColor = 
                            notification.type === 'success' ? 'text-green-400 bg-green-400/10' :
                            notification.type === 'warning' ? 'text-yellow-400 bg-yellow-400/10' :
                            'text-blue-400 bg-blue-400/10';
                          
                          return (
                            <div
                              key={notification.id}
                              className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${
                                !notification.read ? 'bg-white/5' : ''
                              }`}
                            >
                              <div className="flex gap-3">
                                <div className={`p-2 rounded-lg ${iconColor} shrink-0 h-fit`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-white text-sm font-medium">{notification.title}</h4>
                                    {!notification.read && (
                                      <div className="w-2 h-2 rounded-full bg-[#FF6900] shrink-0 mt-1" />
                                    )}
                                  </div>
                                  <p className="text-white/60 text-xs mt-1">{notification.message}</p>
                                  <p className="text-white/40 text-xs mt-2">{notification.time}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-white/20 mx-auto mb-3" />
                          <p className="text-white/60 text-sm">No notifications</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-white/5 text-center">
                        <button className="text-[#FF6900] text-sm font-medium hover:text-[#FF6900]/80 transition-colors">
                          View All Notifications
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
                className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:bg-[#1a1410]/90 transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-white/5">
                    <Icon className="w-5 h-5 text-white/80" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/50 mb-1">{stat.title}</p>
                    <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
<motion.div
  initial={{ opacity: 0, x: -30 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.6, delay: 0.3 }}
  className="space-y-6"
>
  <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {quickActions.map((action, index) => {
      const Icon = action.icon;
      return (
        <motion.div
          key={action.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
        >
          <Link
            href={action.href}
            className="block bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:bg-[#1a1410]/90 transition-all duration-300 group"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-[#FF6900]/10">
                <Icon className="w-5 h-5 text-[#FF6900]" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">{action.title}</h3>
              <p className="text-sm text-white/70">{action.description}</p>
            </div>
          </Link>
        </motion.div>
      );
    })}
  </div>
</motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-white">Account Overview</h2>
            <div className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-lg">
                  <div className="p-2 rounded-full bg-white/10 text-green-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Member since</p>
                    <p className="text-white/50 text-xs">
                      {profileData?.memberSince.toLocaleDateString() || 'Today'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-3 rounded-lg">
                  <div className="p-2 rounded-full bg-white/10 text-[#FF6900]">
                    <Workflow className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Current Plan</p>
                    <p className="text-white/50 text-xs capitalize">
                      {profileData?.subscription.plan || 'Free'} Plan
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-3 rounded-lg">
                  <div className="p-2 rounded-full bg-white/10 text-blue-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Login Count</p>
                    <p className="text-white/50 text-xs">
                      {profileData?.activity.loginCount || 1} total logins
                    </p>
                  </div>
                </div>
                
                {profileData?.onboarding && !profileData.onboarding.completed && (
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                    <div className="p-2 rounded-full bg-yellow-400/20 text-yellow-400">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-yellow-300 text-sm font-medium">Complete your setup</p>
                      <p className="text-yellow-400/70 text-xs">
                        Step {profileData.onboarding.currentStep} of 5
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Real-Time Metrics & System Health */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">System Performance</h2>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Activity className="w-4 h-4" />
              Real-time
            </div>
          </div>
          
          {realTimeMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-white/60 text-xs mb-1">Active Executions</div>
                <div className="text-2xl font-bold text-white">{realTimeMetrics.activeExecutions}</div>
                <div className="text-white/40 text-xs mt-1">{realTimeMetrics.executionsPerMinute.toFixed(1)}/min</div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-white/60 text-xs mb-1">Avg Response</div>
                <div className="text-2xl font-bold text-white">{realTimeMetrics.avgExecutionTime.toFixed(0)}ms</div>
                <div className="text-white/40 text-xs mt-1">execution time</div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-white/60 text-xs mb-1">Error Rate</div>
                <div className="text-2xl font-bold text-white">{realTimeMetrics.currentErrorRate.toFixed(2)}%</div>
                <div className="text-white/40 text-xs mt-1">current rate</div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-white/60 text-xs mb-1">System Load</div>
                <div className="text-2xl font-bold text-white">{realTimeMetrics.systemLoad.toFixed(0)}%</div>
                <div className="text-white/40 text-xs mt-1">{realTimeMetrics.queuedJobs} queued</div>
              </div>
            </div>
          )}
          
          {/* System Health Status */}
          {dashboardData && (
            <div className="mt-6 p-4 bg-white/5 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    dashboardData.system.health === 'healthy' ? 'bg-green-400' :
                    dashboardData.system.health === 'degraded' ? 'bg-yellow-400' :
                    'bg-red-400'
                  } animate-pulse`} />
                  <div>
                    <div className="text-white font-medium">System Status: {dashboardData.system.health}</div>
                    <div className="text-white/60 text-sm">Uptime: {dashboardData.system.uptime.toFixed(2)}% | Error Rate: {dashboardData.system.error_rate.toFixed(2)}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
