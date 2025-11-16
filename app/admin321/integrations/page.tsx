"use client";

import { useEffect, useState, useMemo } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Settings,
  Zap,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  Users,
  Database,
  Globe,
  Key,
  Link,
  Edit,
  Trash2,
  TestTube,
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  logo?: string;
  authType: string;
  scopes: string[];
  isActive: boolean;
  popularity: number;
  requiredFields: string[];
  tags: string[];
  webhookSupport: boolean;
}

interface Connection {
  id: string;
  userId: string;
  integrationId: string;
  integrationName: string;
  name: string;
  authType: string;
  status: "active" | "expired" | "error" | "testing";
  metadata: Record<string, any>;
  lastTested?: string;
  createdAt: string;
  updatedAt: string;
  hasCredentials: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
  integrationCount: number;
}

interface ConnectionStats {
  success: boolean;
  totalConnections: number;
  activeConnections: number;
  expiredConnections: number;
  errorConnections: number;
  byIntegration: Array<{
    integrationName: string;
    count: number;
    status: string;
  }>;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchIntegrationsData = async () => {
    try {
      const [integrationsRes, connectionsRes, categoriesRes, statsRes] = await Promise.all([
        apiClient.get("/api/v1/integrations", { params: { pageSize: 100 } }),
        apiClient.get("/api/v1/integrations/connections"),
        apiClient.get("/api/v1/integrations/categories/all"),
        apiClient.get("/api/v1/integrations/connections/stats/summary"),
      ]);

      setIntegrations(typeof integrationsRes.data === 'string' ? [] : (integrationsRes.data?.integrations || []));
      setConnections(typeof connectionsRes.data === 'string' ? [] : (connectionsRes.data?.connections || []));
      setCategories(typeof categoriesRes.data === 'string' ? [] : (categoriesRes.data?.categories || []));
      setConnectionStats(typeof statsRes.data === 'string' ? null : statsRes.data);
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error("❌ Integrations API Error:", error);
      // Set fallback data for demonstration
      setIntegrations([
        {
          id: "slack",
          name: "Slack",
          description: "Team communication and collaboration platform",
          category: "communication",
          logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/slack/slack-original.svg",
          authType: "oauth2",
          scopes: ["chat:write", "channels:read"],
          isActive: true,
          popularity: 95,
          requiredFields: [],
          tags: ["messaging", "teams"],
          webhookSupport: true,
        },
        {
          id: "github",
          name: "GitHub",
          description: "Code repository and version control platform",
          category: "productivity",
          logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg",
          authType: "oauth2",
          scopes: ["repo", "user"],
          isActive: true,
          popularity: 90,
          requiredFields: [],
          tags: ["git", "development"],
          webhookSupport: true,
        },
        {
          id: "google-sheets",
          name: "Google Sheets",
          description: "Cloud-based spreadsheet application",
          category: "productivity",
          logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg",
          authType: "oauth2",
          scopes: ["spreadsheets", "drive"],
          isActive: true,
          popularity: 85,
          requiredFields: [],
          tags: ["spreadsheets", "data"],
          webhookSupport: false,
        },
        {
          id: "stripe",
          name: "Stripe",
          description: "Payment processing platform",
          category: "payments",
          logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/stripe/stripe-original.svg",
          authType: "api_key",
          scopes: [],
          isActive: true,
          popularity: 88,
          requiredFields: ["api_key", "webhook_secret"],
          tags: ["payments", "billing"],
          webhookSupport: true,
        },
        {
          id: "salesforce",
          name: "Salesforce",
          description: "Customer relationship management platform",
          category: "crm",
          logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/salesforce/salesforce-original.svg",
          authType: "oauth2",
          scopes: ["api", "refresh_token"],
          isActive: true,
          popularity: 80,
          requiredFields: [],
          tags: ["crm", "sales"],
          webhookSupport: true,
        },
      ]);

      setConnections([
        {
          id: "conn_1",
          userId: "user_123",
          integrationId: "slack",
          integrationName: "Slack",
          name: "Main Slack Workspace",
          authType: "oauth2",
          status: "active",
          metadata: { workspace: "acme-corp" },
          lastTested: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          hasCredentials: true,
        },
        {
          id: "conn_2",
          userId: "user_456",
          integrationId: "github",
          integrationName: "GitHub",
          name: "Development Repository",
          authType: "oauth2",
          status: "active",
          metadata: { organization: "acme-dev" },
          lastTested: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          hasCredentials: true,
        },
        {
          id: "conn_3",
          userId: "user_789",
          integrationId: "stripe",
          integrationName: "Stripe",
          name: "Payment Processing",
          authType: "api_key",
          status: "expired",
          metadata: { account: "acct_test" },
          lastTested: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          hasCredentials: true,
        },
      ]);

      setCategories([
        { id: "communication", name: "Communication", description: "Team chat and messaging", integrationCount: 5 },
        { id: "productivity", name: "Productivity", description: "Tools to enhance workflow", integrationCount: 12 },
        { id: "payments", name: "Payments", description: "Payment processing services", integrationCount: 4 },
        { id: "crm", name: "CRM", description: "Customer relationship management", integrationCount: 3 },
        { id: "analytics", name: "Analytics", description: "Data analysis and reporting", integrationCount: 6 },
      ]);

      setConnectionStats({
        success: true,
        totalConnections: 3,
        activeConnections: 2,
        expiredConnections: 1,
        errorConnections: 0,
        byIntegration: [
          { integrationName: "Slack", count: 1, status: "active" },
          { integrationName: "GitHub", count: 1, status: "active" },
          { integrationName: "Stripe", count: 1, status: "expired" },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrationsData();
  }, []);

  const handleTestConnection = async (connectionId: string) => {
    try {
      const response = await apiClient.post(`/api/v1/integrations/connections/${connectionId}/test`);
      // Update connection status based on test result
      fetchIntegrationsData();
    } catch (error) {
      console.error("Test connection error:", error);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm("Are you sure you want to delete this connection?")) return;
    try {
      await apiClient.delete(`/api/v1/integrations/connections/${connectionId}`);
      fetchIntegrationsData();
    } catch (error) {
      console.error("Delete connection error:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "expired":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "error":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "testing":
        return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      default:
        return "text-white/70 bg-white/5 border-white/10";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4" />;
      case "expired":
        return <Clock className="w-4 h-4" />;
      case "error":
        return <XCircle className="w-4 h-4" />;
      case "testing":
        return <TestTube className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "communication":
        return <Users className="w-5 h-5" />;
      case "productivity":
        return <Zap className="w-5 h-5" />;
      case "payments":
        return <Database className="w-5 h-5" />;
      case "crm":
        return <Users className="w-5 h-5" />;
      case "analytics":
        return <Activity className="w-5 h-5" />;
      default:
        return <Globe className="w-5 h-5" />;
    }
  };

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || integration.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredConnections = connections.filter(connection => {
    const matchesSearch = connection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         connection.integrationName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || connection.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    integrations.forEach(integration => {
      counts[integration.category] = (counts[integration.category] || 0) + 1;
    });
    return Object.entries(counts).map(([category, count]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: count,
      fill: category === "communication" ? "#3B82F6" :
           category === "productivity" ? "#10B981" :
           category === "payments" ? "#F59E0B" :
           category === "crm" ? "#EF4444" :
           category === "analytics" ? "#8B5CF6" : "#6B7280"
    }));
  }, [integrations]);

  const statusData = useMemo(() => {
    if (!connectionStats) return [];
    return [
      { name: "Active", value: connectionStats.activeConnections, fill: "#10B981" },
      { name: "Expired", value: connectionStats.expiredConnections, fill: "#F59E0B" },
      { name: "Error", value: connectionStats.errorConnections, fill: "#EF4444" },
    ].filter(item => item.value > 0);
  }, [connectionStats]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-white/5 rounded-md w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-96 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Integrations</h1>
          <p className="text-white/60 mt-1">
            Manage external integrations and monitor connection health
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-white/60">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchIntegrationsData}
            className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-[#FF6900] hover:bg-[#E55A00]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Integration
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Integrations"
          value={integrations.length.toString()}
          icon={<Globe className="w-4 h-4" />}
          color="text-white"
        />
        <KPICard
          title="Active Connections"
          value={connectionStats?.activeConnections.toString() || "0"}
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-emerald-400"
        />
        <KPICard
          title="Total Connections"
          value={connectionStats?.totalConnections.toString() || "0"}
          icon={<Link className="w-4 h-4" />}
          color="text-blue-400"
        />
        <KPICard
          title="Issues"
          value={((connectionStats?.expiredConnections || 0) + (connectionStats?.errorConnections || 0)).toString()}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="text-red-400"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">Integrations by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                communication: { color: "#3B82F6" },
                productivity: { color: "#10B981" },
                payments: { color: "#F59E0B" },
                crm: { color: "#EF4444" },
                analytics: { color: "#8B5CF6" }
              }}
              className="h-64"
            >
              <PieChart>
                <Pie 
                  data={categoryData} 
                  dataKey="value" 
                  nameKey="name" 
                  innerRadius={40} 
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {categoryData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-white/90 text-sm">{item.name}</span>
                  </div>
                  <span className="text-white font-semibold text-sm">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                active: { color: "#10B981" },
                expired: { color: "#F59E0B" },
                error: { color: "#EF4444" }
              }}
              className="h-64"
            >
              <PieChart>
                <Pie 
                  data={statusData} 
                  dataKey="value" 
                  nameKey="name" 
                  innerRadius={40} 
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="mt-4 space-y-2">
              {statusData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-white/90 text-sm">{item.name}</span>
                  </div>
                  <span className="text-white font-semibold text-sm">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <TabsTrigger 
            value="integrations" 
            className="text-white/70 data-[state=active]:bg-[#FF6900] data-[state=active]:text-white hover:text-white transition-colors"
          >
            <Globe className="w-4 h-4 mr-2" />
            Available Integrations
          </TabsTrigger>
          <TabsTrigger 
            value="connections" 
            className="text-white/70 data-[state=active]:bg-[#FF6900] data-[state=active]:text-white hover:text-white transition-colors"
          >
            <Link className="w-4 h-4 mr-2" />
            Active Connections
          </TabsTrigger>
          <TabsTrigger 
            value="categories" 
            className="text-white/70 data-[state=active]:bg-[#FF6900] data-[state=active]:text-white hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          {/* Filters */}
          <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    Search Integrations
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                    <Input
                      placeholder="Search by name or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    Category
                  </label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="communication">Communication</SelectItem>
                      <SelectItem value="productivity">Productivity</SelectItem>
                      <SelectItem value="payments">Payments</SelectItem>
                      <SelectItem value="crm">CRM</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integrations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((integration) => (
              <Card key={integration.id} className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {integration.logo ? (
                        <img src={integration.logo} alt={integration.name} className="w-8 h-8" />
                      ) : (
                        getCategoryIcon(integration.category)
                      )}
                      <div>
                        <CardTitle className="text-white text-lg">{integration.name}</CardTitle>
                        <Badge variant="outline" className="border-white/30 text-white/70 text-xs mt-1">
                          {integration.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {integration.webhookSupport && (
                        <Shield className="w-4 h-4 text-emerald-400" />
                      )}
                      <Badge variant={integration.isActive ? "default" : "secondary"} className="text-xs">
                        {integration.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-white/70 text-sm mb-4">{integration.description}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-white/60" />
                      <span className="text-sm text-white/70">Auth: {integration.authType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-white/60" />
                      <span className="text-sm text-white/70">Popularity: {integration.popularity}%</span>
                    </div>
                  </div>
                  {integration.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {integration.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs border-white/20 text-white/60">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 border-white/20 hover:bg-white/10"
                      onClick={() => {
                        setSelectedIntegration(integration);
                        setIsConnectionDialogOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Connect
                    </Button>
                    <Button size="sm" variant="outline" className="border-white/20 hover:bg-white/10">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="connections" className="space-y-6">
          {/* Filters */}
          <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    Search Connections
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                    <Input
                      placeholder="Search connections..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    Status
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connections Table */}
          <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white">Active Connections ({filteredConnections.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-white/70">Connection</TableHead>
                    <TableHead className="text-white/70">Integration</TableHead>
                    <TableHead className="text-white/70">Auth Type</TableHead>
                    <TableHead className="text-white/70">Status</TableHead>
                    <TableHead className="text-white/70">Last Tested</TableHead>
                    <TableHead className="text-white/70">Created</TableHead>
                    <TableHead className="text-white/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConnections.map((connection) => (
                    <TableRow key={connection.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-white/90">{connection.name}</div>
                          <div className="text-xs text-white/50">{connection.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-white/60" />
                          <span className="text-white/90">{connection.integrationName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-white/30 text-white/70">
                          {connection.authType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(connection.status)}>
                          {getStatusIcon(connection.status)}
                          <span className="ml-1">{connection.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-white/70 text-sm">
                          {connection.lastTested ? new Date(connection.lastTested).toLocaleString() : "Never"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-white/70 text-sm">
                          {new Date(connection.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTestConnection(connection.id)}
                            className="h-8 w-8 p-0 hover:bg-white/10"
                          >
                            <TestTube className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-white/10"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteConnection(connection.id)}
                            className="h-8 w-8 p-0 hover:bg-red-500/20 text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Card key={category.id} className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    {getCategoryIcon(category.id)}
                    {category.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/70 text-sm mb-4">{category.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-white/30 text-white/70">
                      {category.integrationCount} integrations
                    </Badge>
                    <Button size="sm" variant="outline" className="border-white/20 hover:bg-white/10">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Integration Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Integration</DialogTitle>
            <DialogDescription className="text-white/70">
              Configure a new integration for your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/90">Integration Name</Label>
              <Input className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white" placeholder="e.g., Custom API" />
            </div>
            <div>
              <Label className="text-white/90">Description</Label>
              <Textarea className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white" placeholder="Describe the integration..." />
            </div>
            <div>
              <Label className="text-white/90">Category</Label>
              <Select>
                <SelectTrigger className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="payments">Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#FF6900] hover:bg-[#E55A00]">
              Create Integration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Connection Dialog */}
      <Dialog open={isConnectionDialogOpen} onOpenChange={setIsConnectionDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Connect to {selectedIntegration?.name}</DialogTitle>
            <DialogDescription className="text-white/70">
              Configure your connection to {selectedIntegration?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/90">Connection Name</Label>
              <Input 
                className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white" 
                placeholder={`My ${selectedIntegration?.name} Connection`} 
              />
            </div>
            {selectedIntegration?.authType === "api_key" && (
              <div>
                <Label className="text-white/90">API Key</Label>
                <Input 
                  type="password"
                  className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white" 
                  placeholder="Enter your API key" 
                />
              </div>
            )}
            {selectedIntegration?.authType === "oauth2" && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400 font-medium">OAuth2 Authorization</span>
                </div>
                <p className="text-white/70 text-sm">
                  You'll be redirected to {selectedIntegration?.name} to authorize this connection.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConnectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#FF6900] hover:bg-[#E55A00]">
              {selectedIntegration?.authType === "oauth2" ? "Authorize" : "Create Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon,
  color
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm font-medium">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <div className={color}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

