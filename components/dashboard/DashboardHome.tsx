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
  Info
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from 'next/navigation';

import { useUserProfile } from '@/lib/useUserProfile';

interface DashboardHomeProps {
  // No longer need user prop since we'll get it from the hook
}

export default function DashboardHome({}: DashboardHomeProps) {
  const { profileData, loading, displayName, trackFeature } = useUserProfile();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  // Track dashboard view
  React.useEffect(() => {
    trackFeature('dashboard_viewed');
  }, [trackFeature]);
  
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
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // For now, navigate to workflows with search query
      router.push(`/workflows?search=${encodeURIComponent(searchQuery)}`);
    }
  };
  
  // Mock notifications data
  const notifications = [
    {
      id: '1',
      type: 'success',
      title: 'Workflow Completed',
      message: 'Your "Email Automation" workflow finished successfully',
      time: '5 minutes ago',
      read: false
    },
    {
      id: '2',
      type: 'info',
      title: 'New Feature Available',
      message: 'Check out our new AI model integrations in the marketplace',
      time: '1 hour ago',
      read: false
    },
    {
      id: '3',
      type: 'warning',
      title: 'Token Usage Alert',
      message: 'You have used 80% of your monthly token limit',
      time: '3 hours ago',
      read: true
    },
    {
      id: '4',
      type: 'success',
      title: 'Credential Added',
      message: 'OpenAI API credentials successfully configured',
      time: '1 day ago',
      read: true
    }
  ];
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-white text-lg">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }
  
  // Create dynamic stats from user data
  const statsCards = [
    {
      title: "Workflows Created",
      value: profileData?.usage.totalWorkflows.toString() || "0",
      change: `${profileData?.usage.workflowsCreated || 0} this month`,
      icon: Workflow,
      color: "from-[#FF6900] to-[#FF8555]",
      bgColor: "bg-[#FF6900]/10",
      borderColor: "border-[#FF6900]/20"
    },
    {
      title: "API Calls",
      value: profileData?.usage.totalApiCalls.toLocaleString() || "0",
      change: `${profileData?.usage.apiCallsThisMonth || 0} this month`,
      icon: Activity,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      title: "Tokens Used",
      value: profileData?.usage.tokensUsed.toLocaleString() || "0",
      change: `of ${profileData?.usage.limits.tokensPerMonth.toLocaleString() || 0} limit`,
      icon: Coins,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20"
    },
    {
      title: "Success Rate",
      value: `${profileData?.usage.successRate || 0}%`,
      change: `Avg ${profileData?.usage.avgResponseTime || 0}ms response`,
      icon: TrendingUp,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20"
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
      <div className="relative p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Background decorative SVGs */}
        <div className="pointer-events-none fixed inset-0 -z-10">
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

          {/* Right-aligned background (slightly higher) */}
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

        {/* Performance Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Performance Overview</h2>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Clock className="w-4 h-4" />
              Last 7 days
            </div>
          </div>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-white/20 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/50">Performance chart will be displayed here</p>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
