"use client";

import { motion } from "framer-motion";
import { 
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  Activity,
  Shield,
  AlertTriangle,
  Key,
  BarChart3,
  Clock
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useState } from "react";

interface Token {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
  usage: number;
  limit: number;
  status: 'active' | 'expired' | 'disabled';
}

const tokenData: Token[] = [
  {
    id: '1',
    name: 'Production API Key',
    key: 'nxa_1234567890abcdef1234567890abcdef12345678',
    created: '2024-01-15',
    lastUsed: '2 hours ago',
    usage: 45670,
    limit: 100000,
    status: 'active'
  },
  {
    id: '2',
    name: 'Development Key',
    key: 'nxa_abcdef1234567890abcdef1234567890abcdef12',
    created: '2024-01-10',
    lastUsed: '5 minutes ago',
    usage: 12340,
    limit: 50000,
    status: 'active'
  },
  {
    id: '3',
    name: 'Testing Environment',
    key: 'nxa_567890abcdef1234567890abcdef1234567890ab',
    created: '2023-12-20',
    lastUsed: '3 days ago',
    usage: 89230,
    limit: 100000,
    status: 'disabled'
  }
];

const usageStats = [
  {
    title: "Total API Calls",
    value: "147K",
    change: "+12% this month",
    icon: Activity,
    color: "from-[#FF6900] to-[#FF8555]"
  },
  {
    title: "Active Tokens",
    value: "2",
    change: "No change",
    icon: Key,
    color: "from-blue-500 to-blue-600"
  },
  {
    title: "Usage Limit",
    value: "250K",
    change: "Available",
    icon: BarChart3,
    color: "from-green-500 to-green-600"
  },
  {
    title: "Avg Response Time",
    value: "245ms",
    change: "-15ms this week",
    icon: Clock,
    color: "from-purple-500 to-purple-600"
  }
];

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>(tokenData);
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);

  const toggleTokenVisibility = (tokenId: string) => {
    const newVisible = new Set(visibleTokens);
    if (newVisible.has(tokenId)) {
      newVisible.delete(tokenId);
    } else {
      newVisible.add(tokenId);
    }
    setVisibleTokens(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-400/20';
      case 'expired':
        return 'text-yellow-400 bg-yellow-400/20';
      case 'disabled':
        return 'text-red-400 bg-red-400/20';
      default:
        return 'text-white/50 bg-white/10';
    }
  };

  const maskToken = (token: string) => {
    return token.substring(0, 8) + '•••••••••••••••••••••••••••••••';
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-between items-start"
        >
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-white">
              API <span className="text-[#FF6900]">Tokens</span>
            </h1>
            <p className="text-white/70 text-lg">
              Manage your API keys and monitor token usage
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-[#FF6900] to-[#FF8555] hover:from-[#E55D00] hover:to-[#E66A33] text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            Create Token
          </button>
        </motion.div>

        {/* Usage Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {usageStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:scale-105 transition-transform duration-300"
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

        {/* Security Warning */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-yellow-300 font-medium">Security Notice</p>
            <p className="text-yellow-200/80">
              Keep your API tokens secure. Never share them publicly or commit them to version control.
            </p>
          </div>
        </motion.div>

        {/* Tokens List */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold text-white">Your API Tokens</h2>
          
          <div className="space-y-4">
            {tokens.map((token, index) => (
              <motion.div
                key={token.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Token Name and Status */}
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{token.name}</h3>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(token.status)}`}>
                        {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
                      </span>
                    </div>

                    {/* Token Key */}
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <span className="text-white/70 bg-black/40 px-3 py-2 rounded-lg flex-1">
                        {visibleTokens.has(token.id) ? token.key : maskToken(token.key)}
                      </span>
                      <button
                        onClick={() => toggleTokenVisibility(token.id)}
                        className="p-2 text-white/50 hover:text-white transition-colors duration-300"
                      >
                        {visibleTokens.has(token.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(token.key)}
                        className="p-2 text-white/50 hover:text-[#FF6900] transition-colors duration-300"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Token Info */}
                    <div className="flex flex-wrap gap-6 text-sm text-white/60">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Created: {token.created}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Last used: {token.lastUsed}</span>
                      </div>
                    </div>

                    {/* Usage Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/70">Usage</span>
                        <span className="text-white">
                          {token.usage.toLocaleString()} / {token.limit.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-[#FF6900] to-[#FF8555] h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(token.usage / token.limit) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button className="p-2 text-white/50 hover:text-red-400 transition-colors duration-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Usage Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Usage Analytics</h2>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <BarChart3 className="w-4 h-4" />
              Last 30 days
            </div>
          </div>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-white/20 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/50">Token usage analytics will be displayed here</p>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
