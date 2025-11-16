"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Activity,
  Lock,
  Unlock,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail,
  Calendar,
  LogIn,
  LogOut,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

interface User {
  user_id: string;
  email: string;
  display_name?: string;
  profile_picture?: string;
  subscription?: {
    plan_id: string;
    status: string;
    billing_cycle: string;
    current_period_end: string;
  };
  total_revenue?: number;
  risk_score?: number;
  created_at?: string;
  last_login?: string;
}

interface UserActivity {
  userId: string;
  userName?: string;
  totalSessions: number;
  totalActions: number;
  avgSessionDuration: number;
  lastActive: string;
  workflowsCreated: number;
  workflowsExecuted: number;
  integrationsConnected: number;
  apiCallsMade: number;
}

interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  newUsers: number;
  returningUsers: number;
  avgSessionsPerUser: number;
  avgActionsPerUser: number;
  engagementRate: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-400",
  inactive: "bg-gray-400",
  suspended: "bg-red-400",
  trial: "bg-blue-400",
  free: "bg-indigo-400",
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  active: "text-emerald-400",
  inactive: "text-gray-400",
  suspended: "text-red-400",
  trial: "text-blue-400",
  free: "text-indigo-400",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserDetailsDialogOpen, setIsUserDetailsDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  const fetchUsersData = async () => {
    setLoading(true);
    try {
      const [usersRes, activitiesRes, engagementRes] = await Promise.all([
        apiClient.get("/api/billing/admin/users", { params: { limit: 500 } }),
        apiClient.get("/api/v1/analytics/users/activity", {
          params: { page: 1, pageSize: 100, timeRange: "30d" },
        }),
        apiClient.get("/api/v1/analytics/users/engagement", {
          params: { timeRange: "30d" },
        }),
      ]);

      const userData = usersRes.data?.users || [];
      setUsers(Array.isArray(userData) ? userData : []);

      const activityData = activitiesRes.data?.metrics || [];
      setUserActivities(Array.isArray(activityData) ? activityData : []);

      const engagement = engagementRes.data as UserMetrics | null;
      setMetrics(engagement ?? null);

      setLastRefresh(new Date());
    } catch (error) {
      console.error("❌ Users API Error:", error);
      // On error, show explicit empty state instead of demo data
      setUsers([]);
      setUserActivities([]);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.display_name?.toLowerCase() || "").includes(searchQuery.toLowerCase());
      
      const matchesStatus =
        statusFilter === "all" ||
        user.subscription?.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [users, searchQuery, statusFilter]);

  const chartData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: "Active", value: metrics.activeUsers, fill: "#10b981" },
      { name: "New", value: metrics.newUsers, fill: "#3b82f6" },
      { name: "Returning", value: metrics.returningUsers, fill: "#f59e0b" },
    ];
  }, [metrics]);

  const activityChartData = useMemo(() => {
    if (!userActivities.length) return [];

    return userActivities.slice(0, 7).map((activity) => ({
      name: activity.userName || activity.userId,
      sessions: activity.totalSessions,
      actions: activity.totalActions,
    }));
  }, [userActivities]);

  const KpiCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    color 
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: { value: number; direction: "up" | "down" };
    color: string;
  }) => (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/60 text-sm mb-2">{title}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                trend.direction === "up" ? "text-emerald-400" : "text-red-400"
              }`}>
                {trend.direction === "up" ? (
                  <ArrowUpRight size={14} />
                ) : (
                  <ArrowDownLeft size={14} />
                )}
                <span>{Math.abs(trend.value)}% vs last month</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            {Icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Users</h1>
          <p className="text-white/60 mt-2">User directory, activity tracking, and account management</p>
        </div>
        <Button 
          onClick={fetchUsersData}
          className="bg-white/10 hover:bg-white/20 border border-white/20"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard 
          title="Total Users" 
          value={metrics?.totalUsers ?? 0} 
          icon={<Users size={20} className="text-white" />}
          color="text-blue-400"
        />
        <KpiCard 
          title="Active Users" 
          value={metrics?.activeUsers ?? 0} 
          icon={<UserCheck size={20} className="text-white" />}
          color="text-emerald-400"
        />
        <KpiCard 
          title="Daily Active" 
          value={metrics?.dailyActiveUsers ?? 0} 
          icon={<Clock size={20} className="text-white" />}
          color="text-yellow-400"
        />
        <KpiCard 
          title="Weekly Active" 
          value={metrics?.weeklyActiveUsers ?? 0} 
          icon={<Users size={20} className="text-white" />}
          color="text-red-400"
        />
        <KpiCard 
          title="New Users" 
          value={metrics?.newUsers ?? 0} 
          icon={<TrendingUp size={20} className="text-white" />}
          color="text-purple-400"
        />
        <KpiCard 
          title="Engagement Rate" 
          value={`${(metrics?.engagementRate ?? 0).toFixed(1)}%`} 
          icon={<Activity size={20} className="text-white" />}
          color="text-orange-400"
        />
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-transparent border-b border-white/10">
          <TabsTrigger value="users" className="text-white/60 hover:text-white/80 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-b-transparent data-[state=active]:border-b-orange-500">User Directory</TabsTrigger>
          <TabsTrigger value="activity" className="text-white/60 hover:text-white/80 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-b-transparent data-[state=active]:border-b-orange-500">Activity Timeline</TabsTrigger>
          <TabsTrigger value="analytics" className="text-white/60 hover:text-white/80 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-b-transparent data-[state=active]:border-b-orange-500">Analytics</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {/* Search & Filters */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-3 top-3 text-white/40" />
                  <Input
                    placeholder="Search by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/5 border-white/10 pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="border-white/20">
                  <Download size={16} className="mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/10">
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/70">User</TableHead>
                      <TableHead className="text-white/70">Email</TableHead>
                      <TableHead className="text-white/70">Plan</TableHead>
                      <TableHead className="text-white/70">Status</TableHead>
                      <TableHead className="text-white/70 text-right">Revenue</TableHead>
                      <TableHead className="text-white/70">Last Login</TableHead>
                      <TableHead className="text-white/70 text-right">Risk</TableHead>
                      <TableHead className="text-white/70 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const initials = (user.display_name || user.email)
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);
                      return (
                      <TableRow key={user.user_id} className="border-b border-white/5 hover:bg-white/5">
                        <TableCell className="text-white/90 font-medium">
                          <div className="flex items-center gap-3">
                            {user.profile_picture ? (
                              <img
                                src={user.profile_picture}
                                alt={user.display_name || user.email}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                                {initials}
                              </div>
                            )}
                            {user.display_name || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="text-white/70">{user.email}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-400/20 text-blue-300 border border-blue-400/30">
                            {user.subscription?.plan_id || "free"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className={`w-2 h-2 rounded-full ${STATUS_COLORS[user.subscription?.status || "inactive"]}`}
                            />
                            <span className="text-sm capitalize text-white/90 font-medium">
                              {user.subscription?.status || "inactive"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-white/90">
                          ${(user.total_revenue ?? 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-white/60 text-sm">
                          {user.last_login 
                            ? new Date(user.last_login).toLocaleDateString() 
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            className={
                              (user.risk_score || 0) > 0.5
                                ? "bg-red-400/20 text-red-300 border border-red-400/30"
                                : "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                            }
                          >
                            {((user.risk_score || 0) * 100).toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsUserDetailsDialogOpen(true);
                              }}
                              className="h-8 w-8 p-0 hover:bg-white/10"
                            >
                              <Eye size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsSuspendDialogOpen(true);
                              }}
                              className="h-8 w-8 p-0 hover:bg-white/10"
                            >
                              <Lock size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>User Sessions (top users)</CardTitle>
              </CardHeader>
              <CardContent>
                {activityChartData.length === 0 ? (
                  <div className="h-72 flex flex-col items-center justify-center text-white/50">
                    <Activity className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No user activity data available</p>
                  </div>
                ) : (
                  <ChartContainer config={{ sessions: { label: "Sessions" } }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={activityChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                        <YAxis stroke="rgba(255,255,255,0.5)" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="sessions"
                          stroke="#FF6900"
                          strokeWidth={2}
                          dot={{ fill: "#FF6900", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>User Activity (actions)</CardTitle>
              </CardHeader>
              <CardContent>
                {activityChartData.length === 0 ? (
                  <div className="h-72 flex flex-col items-center justify-center text-white/50">
                    <Activity className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No user activity data available</p>
                  </div>
                ) : (
                  <ChartContainer config={{ actions: { label: "Actions" } }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={activityChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                        <YAxis stroke="rgba(255,255,255,0.5)" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="actions" fill="#10b981" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Recent Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userActivities.slice(0, 10).map((activity, idx) => (
                  <div key={idx} className="flex items-center gap-4 pb-4 border-b border-white/5 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <div className="flex-1">
                      <p className="text-white/90 font-medium">{activity.userName || activity.userId}</p>
                      <p className="text-white/50 text-sm">
                        {activity.totalSessions} sessions • {activity.apiCallsMade} API calls
                      </p>
                    </div>
                    <p className="text-white/50 text-sm">
                      {new Date(activity.lastActive).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>User Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ status: { label: "Users" } }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {chartData.map((item) => (
                    <div key={item.name}>
                      <p className="text-white/60 text-xs">{item.name}</p>
                      <p className="text-white/90 font-bold">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-white/70">Avg Sessions / User</p>
                  <p className="text-white/90 font-bold">
                    {metrics ? metrics.avgSessionsPerUser.toFixed(1) : "N/A"}
                  </p>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex items-center justify-between">
                  <p className="text-white/70">Engagement Rate</p>
                  <p className="text-emerald-400 font-bold">
                    {metrics ? `${metrics.engagementRate.toFixed(1)}%` : "0.0%"}
                  </p>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex items-center justify-between">
                  <p className="text-white/70">Last Updated</p>
                  <p className="text-white/60 text-sm">{lastRefresh.toLocaleTimeString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* User Details Dialog */}
      <Dialog open={isUserDetailsDialogOpen} onOpenChange={setIsUserDetailsDialogOpen}>
        <DialogContent className="bg-white/10 border border-white/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white">User Details</DialogTitle>
            <DialogDescription className="text-white/60">View and manage user information</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70">Email</Label>
                  <p className="text-white/90 mt-1">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-white/70">Name</Label>
                  <p className="text-white/90 mt-1">{selectedUser.display_name || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-white/70">Plan</Label>
                  <p className="text-white/90 mt-1 capitalize">{selectedUser.subscription?.plan_id || "free"}</p>
                </div>
                <div>
                  <Label className="text-white/70">Status</Label>
                  <p className="text-white/90 mt-1 capitalize">{selectedUser.subscription?.status || "inactive"}</p>
                </div>
                <div>
                  <Label className="text-white/70">Total Revenue</Label>
                  <p className="text-white/90 mt-1">${(selectedUser.total_revenue ?? 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-white/70">Risk Score</Label>
                  <p className="text-white/90 mt-1">{((selectedUser.risk_score || 0) * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsUserDetailsDialogOpen(false)} className="bg-white/10 hover:bg-white/20">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend User Dialog */}
      <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <DialogContent className="bg-white/10 border border-white/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Suspend User</DialogTitle>
            <DialogDescription className="text-white/60">
              Suspend {selectedUser?.email}? This will disable their account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">Reason for Suspension</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter reason..."
                className="bg-white/5 border-white/10 mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSuspendDialogOpen(false)} className="bg-white/10 hover:bg-white/20">
              Cancel
            </Button>
            <Button onClick={() => {
              console.log(`Suspend ${selectedUser?.email}: ${suspendReason}`);
              setIsSuspendDialogOpen(false);
              setSuspendReason("");
            }} className="bg-red-500/20 hover:bg-red-500/30 text-red-400">
              Suspend User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
