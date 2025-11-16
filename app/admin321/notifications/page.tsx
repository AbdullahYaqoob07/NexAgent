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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Settings,
  Bell,
  BellOff,
  Mail,
  Smartphone,
  Monitor,
  MessageSquare,
  Webhook,
  Slack,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Send,
  Eye,
  Edit,
  Trash2,
  RotateCcw,
  TrendingUp,
  Users,
  Activity,
  Zap,
  Shield,
  AlertCircle,
  Archive,
  Calendar,
  Target,
} from "lucide-react";

// Backend-aligned API response types
interface NotificationListApiResponse {
  success: boolean;
  notifications: Notification[];
  total: number;
  page: number;
  page_size: number;
  unread_count: number;
}

interface NotificationStatsApiResponse extends NotificationStats {}

type NotificationChannelType = "email" | "push" | "in_app" | "sms" | "webhook" | "slack";

interface NotificationPreferences {
  success: boolean;
  user_id: string;
  enabled_channels: NotificationChannelType[];
  // notification_types is present in backend but not yet visualized here.
  notification_types: Record<string, boolean>;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
  updated_at: string;
}

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "sent" | "delivered" | "read" | "failed" | "retrying";
  channels: string[];
  metadata: Record<string, any>;
  scheduled_for?: string;
  expires_at?: string;
  action_url?: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  delivery_attempts: number;
  last_error?: string;
}

interface NotificationStats {
  success: boolean;
  total_notifications: number;
  unread_count: number;
  read_count: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  by_status: Record<string, number>;
  recent_activity: Array<{
    type: string;
    count: number;
    timestamp: string;
  }>;
}

interface BulkOperationResult {
  success: boolean;
  message: string;
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [selectedNotificationForModal, setSelectedNotificationForModal] = useState<Notification | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchNotificationsData = async () => {
    try {
      const [notificationsRes, statsRes, prefsRes] = await Promise.all([
        apiClient.get<NotificationListApiResponse>("/api/v1/notifications", {
          params: {
            page: currentPage,
            page_size: pageSize,
            status: statusFilter !== "all" ? statusFilter : undefined,
            priority: priorityFilter !== "all" ? priorityFilter : undefined,
            notification_type: typeFilter !== "all" ? typeFilter : undefined,
            include_read: true,
          },
        }),
        apiClient.get<NotificationStatsApiResponse>("/api/v1/notifications/stats"),
        apiClient.get<NotificationPreferences>("/api/v1/notifications/preferences"),
      ]);

      setNotifications(notificationsRes.data.notifications || []);
      setStats(statsRes.data || null);
      setPreferences(prefsRes.data || null);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("❌ Notifications API Error:", error);
      setNotifications([]);
      setStats(null);
      setPreferences(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationsData();
  }, [currentPage, statusFilter, priorityFilter, typeFilter]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchNotificationsData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleBulkMarkAsRead = async () => {
    if (selectedNotifications.length === 0) return;
    try {
      await apiClient.post("/api/v1/notifications/mark-read", {
        notification_ids: selectedNotifications,
        status: "read",
      });
      fetchNotificationsData();
      setSelectedNotifications([]);
    } catch (error) {
      console.error("Bulk mark as read error:", error);
    }
  };

  const handleResendNotification = async (notificationId: string) => {
    try {
      await apiClient.post(`/api/v1/notifications/${notificationId}/deliver`, {
        notification_id: notificationId,
        force_resend: true,
      });
      fetchNotificationsData();
    } catch (error) {
      console.error("Resend notification error:", error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;
    try {
      await apiClient.delete(`/api/v1/notifications/${notificationId}`);
      fetchNotificationsData();
    } catch (error) {
      console.error("Delete notification error:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "sent":
        return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      case "read":
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
      case "pending":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "failed":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "retrying":
        return "text-orange-400 bg-orange-500/10 border-orange-500/30";
      default:
        return "text-white/70 bg-white/5 border-white/10";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="w-4 h-4" />;
      case "sent":
        return <Send className="w-4 h-4" />;
      case "read":
        return <Eye className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "failed":
        return <XCircle className="w-4 h-4" />;
      case "retrying":
        return <RotateCcw className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-red-300 bg-red-600/20 border-red-600/40";
      case "high":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "medium":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "low":
        return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      default:
        return "text-white/70 bg-white/5 border-white/10";
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="w-4 h-4" />;
      case "push":
        return <Smartphone className="w-4 h-4" />;
      case "in_app":
        return <Monitor className="w-4 h-4" />;
      case "sms":
        return <MessageSquare className="w-4 h-4" />;
      case "webhook":
        return <Webhook className="w-4 h-4" />;
      case "slack":
        return <Slack className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "workflow_success":
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "workflow_failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "security_alert":
        return <Shield className="w-4 h-4 text-red-400" />;
      case "quota_warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case "payment_failed":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case "team_invitation":
        return <Users className="w-4 h-4 text-blue-400" />;
      case "system_maintenance":
        return <Settings className="w-4 h-4 text-orange-400" />;
      default:
        return <Bell className="w-4 h-4 text-white/60" />;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || notification.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || notification.priority === priorityFilter;
    const matchesType = typeFilter === "all" || notification.notification_type === typeFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesType;
  });

  const statusData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.by_status).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      fill: status === "delivered" ? "#10B981" :
           status === "sent" ? "#3B82F6" :
           status === "read" ? "#6B7280" :
           status === "pending" ? "#F59E0B" :
           status === "failed" ? "#EF4444" : "#F97316"
    }));
  }, [stats]);

  const priorityData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.by_priority).map(([priority, count]) => ({
      name: priority.charAt(0).toUpperCase() + priority.slice(1),
      value: count,
      fill: priority === "critical" ? "#DC2626" :
           priority === "high" ? "#EF4444" :
           priority === "medium" ? "#F59E0B" : "#3B82F6"
    }));
  }, [stats]);

  const typeData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.by_type).slice(0, 6).map(([type, count]) => ({
      name: type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
      value: count
    }));
  }, [stats]);

  const recentActivityData = useMemo(() => {
    if (!stats) return [];
    return stats.recent_activity.map((activity, index) => ({
      time: new Date(activity.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      count: activity.count,
      type: activity.type
    }));
  }, [stats]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-white/5 rounded-md w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-96 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between w-full px-0 md:px-0">
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          <p className="text-white/60 mt-1">
            Manage notification channels, delivery, and analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-white/60">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotificationsData}
            className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsBulkDialogOpen(true)}
            className="bg-[#FF6900] hover:bg-[#E55A00]"
          >
            <Send className="w-4 h-4 mr-2" />
            Send Bulk
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-[#FF6900] hover:bg-[#E55A00]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <KPICard
          title="Total Notifications"
          value={stats ? stats.total_notifications.toLocaleString() : "0"}
          icon={<Bell className="w-4 h-4" />}
          color="text-white"
        />
        <KPICard
          title="Unread"
          value={stats ? stats.unread_count.toString() : "0"}
          icon={<BellOff className="w-4 h-4" />}
          color="text-yellow-400"
        />
        <KPICard
          title="Delivered"
          value={stats?.by_status?.delivered?.toString() ?? "0"}
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-emerald-400"
        />
        <KPICard
          title="Failed"
          value={stats?.by_status?.failed?.toString() ?? "0"}
          icon={<XCircle className="w-4 h-4" />}
          color="text-red-400"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-max w-full">
        {/* Status pie */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Notification Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-white/60">
                No notification status data available yet.
              </div>
            ) : (
              <>
                <ChartContainer
                  config={{
                    delivered: { color: "#10B981" },
                    sent: { color: "#3B82F6" },
                    pending: { color: "#F59E0B" },
                    failed: { color: "#EF4444" },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height={300}>
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
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {statusData.slice(0, 4).map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-white/90 text-sm">{item.name}</span>
                      </div>
                      <span className="text-white font-semibold text-sm">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Priority pie */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {priorityData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-white/60">
                No priority distribution data available yet.
              </div>
            ) : (
              <>
                <ChartContainer
                  config={{
                    critical: { color: "#DC2626" },
                    high: { color: "#EF4444" },
                    medium: { color: "#F59E0B" },
                    low: { color: "#3B82F6" },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={priorityData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={40}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="mt-4 space-y-2">
                  {priorityData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-white/90 text-sm">{item.name}</span>
                      </div>
                      <span className="text-white font-semibold text-sm">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent activity line chart */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivityData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-white/60">
                No recent notification activity.
              </div>
            ) : (
              <ChartContainer
                config={{ count: { label: "Notifications", color: "#FF6900" } }}
                className="h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={recentActivityData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="time" tick={{ fill: "#9CA3AF" }} />
                    <YAxis tick={{ fill: "#9CA3AF" }} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-count)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <TabsTrigger 
            value="notifications" 
            className="text-white/70 data-[state=active]:bg-[#FF6900] data-[state=active]:text-white hover:text-white transition-colors"
          >
            <Bell className="w-4 h-4 mr-2" />
            All Notifications
          </TabsTrigger>
          <TabsTrigger 
            value="types" 
            className="text-white/70 data-[state=active]:bg-[#FF6900] data-[state=active]:text-white hover:text-white transition-colors"
          >
            <Target className="w-4 h-4 mr-2" />
            Notification Types
          </TabsTrigger>
          <TabsTrigger 
            value="channels" 
            className="text-white/70 data-[state=active]:bg-[#FF6900] data-[state=active]:text-white hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Channels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6 w-full overflow-x-hidden">
          {/* Filters */}
          <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 items-end w-full">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    Search Notifications
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                    <Input
                      placeholder="Search by title or message..."
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="retrying">Retrying</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    Priority
                  </label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    Type
                  </label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="workflow_success">Workflow Success</SelectItem>
                      <SelectItem value="workflow_failed">Workflow Failed</SelectItem>
                      <SelectItem value="security_alert">Security Alert</SelectItem>
                      <SelectItem value="quota_warning">Quota Warning</SelectItem>
                      <SelectItem value="payment_failed">Payment Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedNotifications.length > 0 && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <span className="text-blue-400 text-sm">
                    {selectedNotifications.length} notification(s) selected
                  </span>
                  <Button size="sm" onClick={handleBulkMarkAsRead} className="bg-blue-600 hover:bg-blue-700">
                    <Eye className="w-4 h-4 mr-1" />
                    Mark as Read
                  </Button>
                  <Button size="sm" onClick={() => setSelectedNotifications([])} variant="outline">
                    Clear Selection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications Table */}
          <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white">Notifications ({filteredNotifications.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <div className="w-full min-w-0">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 min-w-12">
                      <input 
                        type="checkbox" 
                        checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedNotifications(filteredNotifications.map(n => n.id));
                          } else {
                            setSelectedNotifications([]);
                          }
                        }}
                        className="rounded border-white/30"
                      />
                    </TableHead>
                    <TableHead className="text-white/70 min-w-[350px]">Notification</TableHead>
                    <TableHead className="text-white/70 min-w-[100px]">Priority</TableHead>
                    <TableHead className="text-white/70 min-w-[120px]">Status</TableHead>
                    <TableHead className="text-white/70 min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-white/60">
                        No notifications found for the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNotifications.map((notification) => (
                      <TableRow key={notification.id}>
                      <TableCell>
                        <input 
                          type="checkbox" 
                          checked={selectedNotifications.includes(notification.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedNotifications([...selectedNotifications, notification.id]);
                            } else {
                              setSelectedNotifications(selectedNotifications.filter(id => id !== notification.id));
                            }
                          }}
                          className="rounded border-white/30"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-sm">
                          <div className="font-medium text-white/90">{notification.title}</div>
                          <div className="text-sm text-white/60 line-clamp-1">{notification.message}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                          {notification.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(notification.status)}>
                          {getStatusIcon(notification.status)}
                          <span className="ml-1">{notification.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedNotificationForModal(notification);
                              setIsDetailModalOpen(true);
                            }}
                            className="h-8 w-8 p-0 hover:bg-white/10"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {(notification.status === "failed" || notification.status === "retrying") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResendNotification(notification.id)}
                              className="h-8 w-8 p-0 hover:bg-white/10"
                              title="Retry delivery"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="h-8 w-8 p-0 hover:bg-red-500/20 text-red-400"
                            title="Delete notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-6">
          <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white">Notification Types Analytics</CardTitle>
            </CardHeader>
          <CardContent>
            {typeData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-sm text-white/60">
                No notification type analytics available yet.
              </div>
            ) : (
              <ChartContainer
                config={{ value: { label: "Count", color: "#FF6900" } }}
                className="h-80"
              >
                <BarChart data={typeData} margin={{ left: 12, right: 12, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: "#9CA3AF" }} 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fill: "#9CA3AF" }} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ChartContainer>
            )}
            </CardContent>
        </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats && Object.keys(stats.by_type || {}).length > 0 ? (
              Object.entries(stats.by_type || {}).map(([type, count]) => (
              <Card key={type} className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3 text-lg">
                    {getTypeIcon(type)}
                    {type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white mb-2">{count.toLocaleString()}</div>
                  <div className="text-sm text-white/60">
                    {((count / (stats?.total_notifications || 1)) * 100).toFixed(1)}% of total
                  </div>
                </CardContent>
              </Card>
            ))
            ) : (
              <div className="text-sm text-white/60">
                No per-type notification analytics available yet.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="channels" className="space-y-6 w-full overflow-x-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ChannelCard
              name="Email"
              icon={<Mail className="w-6 h-6" />}
              description="HTML email notifications with templates"
              active={preferences?.enabled_channels.includes("email") ?? false}
            />
            <ChannelCard
              name="In-App"
              icon={<Monitor className="w-6 h-6" />}
              description="Real-time notifications in the application"
              active={preferences?.enabled_channels.includes("in_app") ?? false}
            />
            <ChannelCard
              name="Push Notifications"
              icon={<Smartphone className="w-6 h-6" />}
              description="Mobile and browser push notifications"
              active={preferences?.enabled_channels.includes("push") ?? false}
            />
            <ChannelCard
              name="SMS"
              icon={<MessageSquare className="w-6 h-6" />}
              description="Text message notifications for critical alerts"
              active={preferences?.enabled_channels.includes("sms") ?? false}
            />
            <ChannelCard
              name="Slack"
              icon={<Slack className="w-6 h-6" />}
              description="Team notifications via Slack integration"
              active={preferences?.enabled_channels.includes("slack") ?? false}
            />
            <ChannelCard
              name="Webhook"
              icon={<Webhook className="w-6 h-6" />}
              description="Custom HTTP endpoints for integrations"
              active={preferences?.enabled_channels.includes("webhook") ?? false}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Notification Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Notification</DialogTitle>
            <DialogDescription className="text-white/70">
              Send a notification to users across multiple channels.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/90">User ID</Label>
                <Input className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white" placeholder="user_123" />
              </div>
              <div>
                <Label className="text-white/90">Priority</Label>
                <Select>
                  <SelectTrigger className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-white/90">Title</Label>
              <Input className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white" placeholder="Notification title" />
            </div>
            <div>
              <Label className="text-white/90">Message</Label>
              <Textarea className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white" placeholder="Notification message..." rows={4} />
            </div>
            <div>
              <Label className="text-white/90">Notification Type</Label>
              <Select>
                <SelectTrigger className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workflow_success">Workflow Success</SelectItem>
                  <SelectItem value="workflow_failed">Workflow Failed</SelectItem>
                  <SelectItem value="security_alert">Security Alert</SelectItem>
                  <SelectItem value="quota_warning">Quota Warning</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/90 mb-2 block">Delivery Channels</Label>
              <div className="grid grid-cols-3 gap-2">
                {["email", "in_app", "push", "sms", "slack", "webhook"].map((channel) => (
                  <div key={channel} className="flex items-center space-x-2">
                    <input type="checkbox" id={channel} className="rounded" />
                    <label htmlFor={channel} className="text-sm text-white/90 capitalize">{channel.replace("_", " ")}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#FF6900] hover:bg-[#E55A00]">
              Create Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="bg-white/10 border border-white/20 backdrop-blur-xl max-w-2xl">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-2xl text-white">Notification Details</DialogTitle>
          </DialogHeader>
          {selectedNotificationForModal && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Title and Type Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">Title</Label>
                  <p className="text-white font-semibold mt-2">{selectedNotificationForModal.title}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">Type</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {getTypeIcon(selectedNotificationForModal.notification_type)}
                    <p className="text-white font-semibold">{selectedNotificationForModal.notification_type.replace("_", " ")}</p>
                  </div>
                </div>
              </div>

              {/* Priority and Status Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">Priority</Label>
                  <div className="mt-2">
                    <Badge className={`${getPriorityColor(selectedNotificationForModal.priority)}`}>
                      {selectedNotificationForModal.priority.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">Status</Label>
                  <div className="mt-2">
                    <Badge className={`${getStatusColor(selectedNotificationForModal.status)}`}>
                      {getStatusIcon(selectedNotificationForModal.status)}
                      <span className="ml-1">{selectedNotificationForModal.status}</span>
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <Label className="text-white/60 text-xs uppercase tracking-wide">Message</Label>
                <p className="text-white/90 mt-2 leading-relaxed">{selectedNotificationForModal.message}</p>
              </div>

              {/* Channels and Delivery Attempts */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">Channels</Label>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {selectedNotificationForModal.channels.map((channel, idx) => (
                      <Badge key={idx} className="bg-orange-500/20 text-orange-300 border border-orange-500/30">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">Delivery Attempts</Label>
                  <p className="text-white text-lg font-semibold mt-2">{selectedNotificationForModal.delivery_attempts}</p>
                </div>
              </div>

              {/* Timeline - Created, Sent, Delivered */}
              <div className="space-y-3">
                <Label className="text-white/60 text-xs uppercase tracking-wide">Timeline</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <p className="text-white/50 text-xs">Created</p>
                    <p className="text-white/90 text-sm mt-1">{new Date(selectedNotificationForModal.created_at).toLocaleString()}</p>
                  </div>
                  {selectedNotificationForModal.sent_at && (
                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                      <p className="text-white/50 text-xs">Sent</p>
                      <p className="text-white/90 text-sm mt-1">{new Date(selectedNotificationForModal.sent_at).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedNotificationForModal.delivered_at && (
                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                      <p className="text-white/50 text-xs">Delivered</p>
                      <p className="text-white/90 text-sm mt-1">{new Date(selectedNotificationForModal.delivered_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {selectedNotificationForModal.last_error && (
                <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                  <Label className="text-red-400 text-xs uppercase tracking-wide">Last Error</Label>
                  <p className="text-red-300 text-sm mt-2">{selectedNotificationForModal.last_error}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="border-t border-white/10 pt-4 mt-4">
            <Button onClick={() => setIsDetailModalOpen(false)} className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Send Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Send Bulk Notifications</DialogTitle>
            <DialogDescription className="text-white/70">
              Send the same notification to multiple users at once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/90">User IDs (comma-separated)</Label>
              <Textarea className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white" placeholder="user_1, user_2, user_3..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/90">Priority</Label>
                <Select>
                  <SelectTrigger className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/90">Type</Label>
                <Select>
                  <SelectTrigger className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system_maintenance">System Maintenance</SelectItem>
                    <SelectItem value="security_alert">Security Alert</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-white/90">Title</Label>
              <Input className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white" placeholder="Bulk notification title" />
            </div>
            <div>
              <Label className="text-white/90">Message</Label>
              <Textarea className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white" placeholder="Bulk notification message..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#FF6900] hover:bg-[#E55A00]">
              Send to All Users
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

function ChannelCard({
  name,
  icon,
  description,
  active,
}: {
  name: string;
  icon: React.ReactNode;
  description: string;
  active: boolean;
}) {
  return (
    <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5 text-white/90">
              {icon}
            </div>
            <CardTitle className="text-white">{name}</CardTitle>
          </div>
          <Badge variant={active ? "default" : "secondary"} className="text-xs">
            {active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-white/70 text-sm mb-4">{description}</p>
        <div className="flex items-center justify-between">
          <div className="text-sm text-white/60">Channel Status</div>
          <div
            className={
              "text-sm font-semibold " +
              (active ? "text-emerald-400" : "text-white/60")
            }
          >
            {active ? "Enabled for this user" : "Disabled for this user"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

