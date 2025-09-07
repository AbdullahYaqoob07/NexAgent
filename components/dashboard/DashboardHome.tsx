"use client";

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

interface SerializedUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: Array<{
    emailAddress: string;
    verification?: {
      status?: string;
    };
  }>;
  phoneNumbers: Array<{
    phoneNumber: string;
  }>;
  createdAt: Date;
  lastSignInAt: Date | null;
  imageUrl: string;
}

interface DashboardHomeProps {
  user: SerializedUser | null;
}

const statsCards = [
  {
    title: "Active Workflows",
    value: "12",
    change: "+3 this week",
    icon: Workflow,
    color: "from-[#FF6900] to-[#FF8555]",
    bgColor: "bg-[#FF6900]/10",
    borderColor: "border-[#FF6900]/20"
  },
  {
    title: "API Calls",
    value: "24.5K",
    change: "+12% today",
    icon: Activity,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20"
  },
  {
    title: "Tokens Used",
    value: "1.2M",
    change: "+8% this month",
    icon: Coins,
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20"
  },
  {
    title: "Success Rate",
    value: "99.2%",
    change: "+0.5% this week",
    icon: TrendingUp,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20"
  }
];

const quickActions = [
  {
    title: "Workflows",
    description: "Create and manage AI workflows",
    icon: Workflow,
    href: "/workflows",
    color: "from-[#FF6900] to-[#FF8555]"
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
    color: "from-green-500 to-green-600"
  },
  {
    title: "Analytics",
    description: "View performance metrics",
    icon: BarChart3,
    href: "/analytics",
    color: "from-purple-500 to-purple-600"
  }
];

const recentActivity = [
  {
    title: "Workflow 'Data Analysis' completed",
    time: "2 minutes ago",
    icon: Bot,
    color: "text-green-400"
  },
  {
    title: "New model added to marketplace",
    time: "15 minutes ago",
    icon: Store,
    color: "text-blue-400"
  },
  {
    title: "API limit increased to 100K calls",
    time: "1 hour ago",
    icon: TrendingUp,
    color: "text-[#FF6900]"
  },
  {
    title: "Scheduled workflow started",
    time: "2 hours ago",
    icon: Calendar,
    color: "text-purple-400"
  }
];

export default function DashboardHome({ user }: DashboardHomeProps) {
  const firstName = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User';

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
            Welcome back, <span className="text-[#FF6900]">{firstName}</span>
          </h1>
          <p className="text-white/70 text-lg">
            Here's what's happening in your AI workspace today
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
            <h2 className="text-2xl font-bold text-white">Recent Activity</h2>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors duration-300"
                    >
                      <div className={`p-2 rounded-full bg-white/10 ${activity.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{activity.title}</p>
                        <p className="text-white/50 text-xs">{activity.time}</p>
                      </div>
                    </motion.div>
                  );
                })}
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
