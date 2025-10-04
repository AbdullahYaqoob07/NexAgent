"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { 
  Key, 
  Plus, 
  MoreVertical, 
  Copy, 
  Eye, 
  EyeOff,
  Trash2, 
  Edit3, 
  Calendar,
  Clock,
  TrendingUp,
  Shield,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  Zap,
  Globe,
  Server,
  CreditCard,
  Settings,
  Filter,
  Download,
  Search
} from "lucide-react";
import Link from "next/link";

// Types
interface APIToken {
  id: string;
  name: string;
  key: string;
  description: string;
  scopes: string[];
  status: 'active' | 'inactive' | 'expired';
  createdAt: string;
  lastUsed: string | null;
  expiresAt: string | null;
  usageCount: number;
  rateLimit: {
    limit: number;
    window: string;
    remaining: number;
  };
  environment: 'production' | 'development' | 'staging';
}

interface UsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  tokensConsumed: number;
  costThisMonth: number;
  dailyUsage: Array<{ date: string; requests: number; tokens: number }>;
}

// Mock data
const mockTokens: APIToken[] = [
  {
    id: 'tok_1',
    name: 'Production API Key',
    key: 'nx_prod_abc123def456ghi789jkl012mno345pqr678stu901',
    description: 'Main production API key for customer-facing workflows',
    scopes: ['workflows.execute', 'workflows.read', 'analytics.read'],
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z',
    lastUsed: '2024-01-20T14:22:00Z',
    expiresAt: '2024-12-15T10:30:00Z',
    usageCount: 45230,
    rateLimit: { limit: 10000, window: '1h', remaining: 8750 },
    environment: 'production'
  },
  {
    id: 'tok_2',
    name: 'Development Key',
    key: 'nx_dev_xyz789abc012def345ghi678jkl901mno234pqr567stu',
    description: 'Development and testing environment key',
    scopes: ['workflows.execute', 'workflows.read', 'workflows.write'],
    status: 'active',
    createdAt: '2024-01-10T08:15:00Z',
    lastUsed: '2024-01-19T16:45:00Z',
    expiresAt: null,
    usageCount: 8945,
    rateLimit: { limit: 1000, window: '1h', remaining: 892 },
    environment: 'development'
  },
  {
    id: 'tok_3',
    name: 'Legacy Integration',
    key: 'nx_legacy_old123key456deprecated789xyz012abc345def',
    description: 'Deprecated key for legacy system integration',
    scopes: ['workflows.execute'],
    status: 'inactive',
    createdAt: '2023-06-20T12:00:00Z',
    lastUsed: '2023-12-15T09:30:00Z',
    expiresAt: '2024-02-01T00:00:00Z',
    usageCount: 125680,
    rateLimit: { limit: 5000, window: '1h', remaining: 5000 },
    environment: 'production'
  }
];

const mockUsageMetrics: UsageMetrics = {
  totalRequests: 54175,
  successfulRequests: 52840,
  failedRequests: 1335,
  averageResponseTime: 245,
  tokensConsumed: 1287450,
  costThisMonth: 64.37,
  dailyUsage: [
    { date: '2024-01-14', requests: 2450, tokens: 58800 },
    { date: '2024-01-15', requests: 2890, tokens: 69360 },
    { date: '2024-01-16', requests: 3120, tokens: 74880 },
    { date: '2024-01-17', requests: 2780, tokens: 66720 },
    { date: '2024-01-18', requests: 3450, tokens: 82800 },
    { date: '2024-01-19', requests: 4180, tokens: 100320 },
    { date: '2024-01-20', requests: 3890, tokens: 93360 }
  ]
};

export default function TokensView() {
  const [tokens] = useState<APIToken[]>(mockTokens);
  const [usageMetrics] = useState<UsageMetrics>(mockUsageMetrics);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [revealedTokens, setRevealedTokens] = useState<Set<string>>(new Set());

  // Filter tokens
  const filteredTokens = useMemo(() => {
    return tokens.filter(token => {
      const matchesSearch = token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           token.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || token.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tokens, searchQuery, statusFilter]);

  const toggleTokenVisibility = (tokenId: string) => {
    const newRevealed = new Set(revealedTokens);
    if (newRevealed.has(tokenId)) {
      newRevealed.delete(tokenId);
    } else {
      newRevealed.add(tokenId);
    }
    setRevealedTokens(newRevealed);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };


  const getStatusColor = (status: APIToken['status']) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'inactive': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'expired': return 'text-red-400 bg-red-400/10 border-red-400/20';
    }
  };

  const getEnvironmentColor = (env: APIToken['environment']) => {
    switch (env) {
      case 'production': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'development': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'staging': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white">API Tokens</h1>
          <p className="text-white/70 text-lg mt-1">Manage your API authentication and monitor usage</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-[#FF6900] hover:bg-[#E55D00] text-white px-6"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Token
        </Button>
      </div>

      {/* Usage Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Requests"
          value={usageMetrics.totalRequests.toLocaleString()}
          change="+12.3%"
          icon={<Activity className="w-5 h-5" />}
          trend="up"
        />
        <MetricCard
          title="Success Rate"
          value={`${((usageMetrics.successfulRequests / usageMetrics.totalRequests) * 100).toFixed(1)}%`}
          change="+0.8%"
          icon={<CheckCircle className="w-5 h-5" />}
          trend="up"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${usageMetrics.averageResponseTime}ms`}
          change="-5.2%"
          icon={<Zap className="w-5 h-5" />}
          trend="down"
        />
        <MetricCard
          title="Monthly Cost"
          value={`$${usageMetrics.costThisMonth}`}
          change="+8.4%"
          icon={<CreditCard className="w-5 h-5" />}
          trend="up"
        />
      </div>

      {/* Usage Chart */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">Usage Analytics</h3>
            <p className="text-white/70">API requests and token consumption over time</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        <UsageChart data={usageMetrics.dailyUsage} />
      </div>

      {/* Tokens Management */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">API Tokens</h3>
            <p className="text-white/70">Manage your authentication tokens and permissions</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white/5 border border-white/15 rounded-lg text-white placeholder-white/40 focus:border-[#FF6900] focus:outline-none w-64"
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white focus:border-[#FF6900] focus:outline-none"
            >
              <option value="all" className="bg-zinc-900">All Status</option>
              <option value="active" className="bg-zinc-900">Active</option>
              <option value="inactive" className="bg-zinc-900">Inactive</option>
              <option value="expired" className="bg-zinc-900">Expired</option>
            </select>
          </div>
        </div>

        {/* Tokens List */}
        <div className="space-y-4">
          {filteredTokens.map((token) => (
            <TokenCard
              key={token.id}
              token={token}
              isRevealed={revealedTokens.has(token.id)}
              onToggleVisibility={() => toggleTokenVisibility(token.id)}
              onCopy={() => copyToClipboard(token.key)}
              onEdit={() => console.log('Edit token:', token.id)}
              onDelete={() => console.log('Delete token:', token.id)}
            />
          ))}
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-[#FF6900]" />
          <div>
            <h3 className="text-xl font-semibold text-white">Security Recommendations</h3>
            <p className="text-white/70">Best practices for token management</p>
          </div>
        </div>
        <SecurityRecommendations />
      </div>
    </div>
  );
}

// Helper functions
const formatTokenKey = (key: string, isRevealed: boolean) => {
  if (isRevealed) return key;
  return key.substring(0, 12) + '•'.repeat(20) + key.substring(key.length - 8);
};

function MetricCard({
  title, 
  value, 
  change, 
  icon, 
  trend 
}: { 
  title: string; 
  value: string; 
  change: string; 
  icon: React.ReactNode; 
  trend: 'up' | 'down'; 
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white/80">
          {icon}
        </div>
        <span className={`text-sm px-2 py-1 rounded-full ${
          trend === 'up' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
        }`}>
          {change}
        </span>
      </div>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
      <p className="text-white/70 text-sm mt-1">{title}</p>
    </div>
  );
}

function TokenCard({ 
  token, 
  isRevealed, 
  onToggleVisibility, 
  onCopy, 
  onEdit, 
  onDelete 
}: {
  token: APIToken;
  isRevealed: boolean;
  onToggleVisibility: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-semibold text-white">{token.name}</h4>
            <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(token.status)}`}>
              {token.status}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full border ${getEnvironmentColor(token.environment)}`}>
              {token.environment}
            </span>
          </div>
          <p className="text-white/70 text-sm mb-3">{token.description}</p>
          
          {/* Token Key */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono text-white/90 flex-1">
                {formatTokenKey(token.key, isRevealed)}
              </code>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={onToggleVisibility}
                  className="text-white/60 hover:text-white transition-colors"
                  title={isRevealed ? 'Hide token' : 'Reveal token'}
                >
                  {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={onCopy}
                  className="text-white/60 hover:text-white transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Scopes */}
          <div className="flex flex-wrap gap-2 mb-3">
            {token.scopes.map((scope, idx) => (
              <span key={idx} className="px-2 py-1 text-xs bg-white/10 text-white/80 rounded">
                {scope}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-white/60">Usage Count</p>
              <p className="text-white font-medium">{token.usageCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/60">Rate Limit</p>
              <p className="text-white font-medium">{token.rateLimit.remaining}/{token.rateLimit.limit}</p>
            </div>
            <div>
              <p className="text-white/60">Last Used</p>
              <p className="text-white font-medium">
                {token.lastUsed ? new Date(token.lastUsed).toLocaleDateString() : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-white/60">Expires</p>
              <p className="text-white font-medium">
                {token.expiresAt ? new Date(token.expiresAt).toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-6">
          <button
            onClick={onEdit}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Edit token"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
            title="Delete token"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function UsageChart({ data }: { data: UsageMetrics['dailyUsage'] }) {
  const maxRequests = Math.max(...data.map(d => d.requests));
  
  return (
    <div className="h-64 flex items-end justify-between gap-2">
      {data.map((day, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
          <div 
            className="w-full bg-[#FF6900]/80 rounded-t-sm hover:bg-[#FF6900] transition-colors cursor-pointer relative group"
            style={{ height: `${(day.requests / maxRequests) * 200}px` }}
            title={`${day.requests.toLocaleString()} requests`}
          >
            {/* Tooltip */}
            <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-white/20 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              <p className="text-white text-sm font-medium">{day.requests.toLocaleString()} requests</p>
              <p className="text-white/70 text-xs">{day.tokens.toLocaleString()} tokens</p>
            </div>
          </div>
          <span className="text-white/60 text-xs">
            {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
          </span>
        </div>
      ))}
    </div>
  );
}

function SecurityRecommendations() {
  const recommendations = [
    {
      title: "Rotate tokens regularly",
      description: "Update your API tokens every 90 days or when team members leave",
      status: "warning",
      icon: <Clock className="w-4 h-4" />
    },
    {
      title: "Use environment-specific tokens",
      description: "Never use production tokens in development environments",
      status: "success",
      icon: <CheckCircle className="w-4 h-4" />
    },
    {
      title: "Monitor usage patterns",
      description: "Review token usage regularly for unusual activity",
      status: "info",
      icon: <BarChart3 className="w-4 h-4" />
    },
    {
      title: "Implement rate limiting",
      description: "Set appropriate rate limits to prevent abuse",
      status: "warning",
      icon: <Shield className="w-4 h-4" />
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-white/60';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {recommendations.map((rec, idx) => (
        <div key={idx} className="flex items-start gap-3 p-4 bg-white/5 rounded-lg">
          <div className={`mt-0.5 ${getStatusColor(rec.status)}`}>
            {rec.icon}
          </div>
          <div>
            <h4 className="text-white font-medium mb-1">{rec.title}</h4>
            <p className="text-white/70 text-sm">{rec.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper functions for status and environment colors
function getStatusColor(status: APIToken['status']) {
  switch (status) {
    case 'active': return 'text-green-400 bg-green-400/10 border-green-400/20';
    case 'inactive': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    case 'expired': return 'text-red-400 bg-red-400/10 border-red-400/20';
  }
}

function getEnvironmentColor(env: APIToken['environment']) {
  switch (env) {
    case 'production': return 'text-red-400 bg-red-400/10 border-red-400/20';
    case 'development': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    case 'staging': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
  }
}