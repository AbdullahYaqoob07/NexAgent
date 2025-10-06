"use client";

import React from 'react';
import { motion } from "framer-motion";
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
  Calendar
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import Link from "next/link";

import { useUserProfile } from '@/lib/useUserProfile';

interface DashboardHomeProps {
  // No longer need user prop since we'll get it from the hook
}

export default function DashboardHome({}: DashboardHomeProps) {
  const { profileData, loading, displayName, trackFeature } = useUserProfile();
  
  // Track dashboard view
  React.useEffect(() => {
    trackFeature('dashboard_viewed');
  }, [trackFeature]);
  
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
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-2"
        >
          <h1 className="text-3xl lg:text-4xl font-bold text-white">
            Welcome back, <span className="text-[#FF6900]">{displayName}</span>
          </h1>
          <p className="text-white/70 text-lg">
            Here&apos;s what&apos;s happening in your AI workspace today
          </p>
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
                className={`${stat.bgColor} ${stat.borderColor} border backdrop-blur-xl rounded-xl p-6 hover:scale-105 transition-transform duration-300`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs text-white/50">{stat.change}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
                  <p className="text-sm text-white/70">{stat.title}</p>
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
            className="block bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-br ${action.color}`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
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
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
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
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
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
