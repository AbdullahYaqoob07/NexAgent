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
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  Zap,
  Activity,
  Target,
  PieChart as PieChartIcon,
  Calendar,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  plan_type: string;
  price_monthly: number;
  price_yearly: number;
  is_active: boolean;
  is_popular: boolean;
  limits: Record<string, any>;
  features: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface AdminAnalytics {
  mrr: number;
  arr: number;
  churn_rate: number;
  total_users: number;
  paying_users: number;
  trial_users: number;
  canceled_users: number;
  users_by_plan: Record<string, number>;
  revenue_by_plan: Record<string, number>;
  new_subscriptions_this_month: number;
  upgrades_this_month: number;
  downgrades_this_month: number;
  cancellations_this_month: number;
  failed_payments_this_month: number;
  dunning_users: number;
  recovery_rate: number;
}

interface UserBilling {
  user_id: string;
  email: string;
  display_name?: string;
  subscription: {
    plan_id: string;
    status: string;
    billing_cycle: string;
    current_period_end: string;
  };
  total_revenue: number;
  invoices_count: number;
  last_payment_date?: string;
  risk_score: number;
}

export default function AdminBillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [users, setUsers] = useState<UserBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodDays, setPeriodDays] = useState(30);
  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchBillingData = async () => {
    try {
      const [plansRes, analyticsRes, usersRes] = await Promise.all([
        apiClient.get("/api/billing/plans", { params: { active_only: false } }),
        apiClient.get("/api/billing/admin/analytics", { params: { period_days: periodDays } }),
        apiClient.get("/api/billing/admin/users", { params: { limit: 100 } }),
      ]);

      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setAnalytics(typeof analyticsRes.data === "string" ? null : analyticsRes.data);
      setUsers(
        typeof usersRes.data === "string" ? [] : (usersRes.data?.users || [])
      );
      setLastRefresh(new Date());
    } catch (error) {
      console.error("❌ Billing API Error:", error);
      // Fallback data
      setPlans([
        {
          id: "plan_free",
          name: "Free",
          plan_type: "free",
          price_monthly: 0,
          price_yearly: 0,
          is_active: true,
          is_popular: false,
          limits: { nexas_max: 5, executions_per_month: 100, api_calls_per_month: 500 },
          features: { api_access: true },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "plan_pro",
          name: "Pro",
          plan_type: "pro",
          price_monthly: 29.99,
          price_yearly: 299.99,
          is_active: true,
          is_popular: true,
          limits: { nexas_max: 100, executions_per_month: 10000, api_calls_per_month: 50000 },
          features: { priority_support: true, advanced_analytics: true },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      setAnalytics({
        mrr: 24500,
        arr: 294000,
        churn_rate: 0.05,
        total_users: 1250,
        paying_users: 450,
        trial_users: 120,
        canceled_users: 85,
        users_by_plan: { free: 650, basic: 280, pro: 170 },
        revenue_by_plan: { basic: 8400, pro: 16100 },
        new_subscriptions_this_month: 45,
        upgrades_this_month: 12,
        downgrades_this_month: 5,
        cancellations_this_month: 8,
        failed_payments_this_month: 3,
        dunning_users: 7,
        recovery_rate: 0.714,
      });

      setUsers([
        {
          user_id: "user_123",
          email: "john@example.com",
          display_name: "John Doe",
          subscription: {
            plan_id: "plan_pro",
            status: "active",
            billing_cycle: "monthly",
            current_period_end: "2025-02-01",
          },
          total_revenue: 29.99,
          invoices_count: 3,
          last_payment_date: "2025-01-01",
          risk_score: 0.1,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [periodDays]);

  const revenueByPlanData = useMemo(() => {
    if (!analytics) return [];
    return Object.entries(analytics.revenue_by_plan).map(([plan, revenue]) => ({
      name: plan.charAt(0).toUpperCase() + plan.slice(1),
      value: revenue,
      fill: plan === "pro" ? "#FF6900" : plan === "basic" ? "#3B82F6" : "#10B981",
    }));
  }, [analytics]);

  const usersByPlanData = useMemo(() => {
    if (!analytics) return [];
    return Object.entries(analytics.users_by_plan).map(([plan, count]) => ({
      name: plan.charAt(0).toUpperCase() + plan.slice(1),
      value: count,
      fill: plan === "pro" ? "#FF6900" : plan === "basic" ? "#3B82F6" : "#10B981",
    }));
  }, [analytics]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesPlan = planFilter === "all" || user.subscription.plan_id.includes(planFilter);
    const matchesStatus = statusFilter === "all" || user.subscription.status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const filteredPlans = plans.filter((plan) => plan.is_active);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-white/5 rounded-md w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Billing Management</h1>
          <p className="text-white/60 mt-1">Plans, subscriptions, revenue analytics, and user management</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-white/60">Last updated: {lastRefresh.toLocaleTimeString()}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBillingData}
            className="bg-white/5 border-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreatePlanDialogOpen(true)}
            className="bg-[#FF6900] hover:bg-[#E55A00]"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Plan
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <KpiCard
            title="MRR"
            value={`$${analytics.mrr.toLocaleString()}`}
            icon={<DollarSign className="w-4 h-4" />}
            color="text-emerald-400"
          />
          <KpiCard
            title="ARR"
            value={`$${analytics.arr.toLocaleString()}`}
            icon={<TrendingUp className="w-4 h-4" />}
            color="text-blue-400"
          />
          <KpiCard
            title="Churn Rate"
            value={`${(analytics.churn_rate * 100).toFixed(1)}%`}
            icon={<AlertTriangle className="w-4 h-4" />}
            color={analytics.churn_rate > 0.1 ? "text-red-400" : "text-yellow-400"}
          />
          <KpiCard
            title="Paying Users"
            value={analytics.paying_users.toLocaleString()}
            icon={<Users className="w-4 h-4" />}
            color="text-white"
          />
          <KpiCard
            title="Failed Payments"
            value={analytics.failed_payments_this_month.toString()}
            icon={<XCircle className="w-4 h-4" />}
            color="text-red-400"
          />
          <KpiCard
            title="Recovery Rate"
            value={`${(analytics.recovery_rate * 100).toFixed(1)}%`}
            icon={<CheckCircle className="w-4 h-4" />}
            color="text-emerald-400"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue by Plan */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "#FF6900" },
              }}
              className="h-64"
            >
              <PieChart>
                <Pie
                  data={revenueByPlanData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={90}
                >
                  {revenueByPlanData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="mt-4 space-y-2">
              {revenueByPlanData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-white/90 text-sm">{item.name}</span>
                  </div>
                  <span className="text-white font-semibold text-sm">${item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users by Plan */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Users by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                users: { label: "Users", color: "#FF6900" },
              }}
              className="h-64"
            >
              <PieChart>
                <Pie
                  data={usersByPlanData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={90}
                >
                  {usersByPlanData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="mt-4 space-y-2">
              {usersByPlanData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-white/90 text-sm">{item.name}</span>
                  </div>
                  <span className="text-white font-semibold text-sm">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Subscription Activity */}
        {analytics && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5" />
                This Month Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ActivityItem
                label="New Subscriptions"
                value={analytics.new_subscriptions_this_month}
                icon={<CheckCircle className="w-4 h-4" />}
                color="text-emerald-400"
              />
              <ActivityItem
                label="Upgrades"
                value={analytics.upgrades_this_month}
                icon={<TrendingUp className="w-4 h-4" />}
                color="text-blue-400"
              />
              <ActivityItem
                label="Downgrades"
                value={analytics.downgrades_this_month}
                icon={<AlertTriangle className="w-4 h-4" />}
                color="text-yellow-400"
              />
              <ActivityItem
                label="Cancellations"
                value={analytics.cancellations_this_month}
                icon={<XCircle className="w-4 h-4" />}
                color="text-red-400"
              />
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="bg-white/5 border-white/10">
          <TabsTrigger
            value="plans"
            className="text-white/70 data-[state=active]:bg-[#FF6900] data-[state=active]:text-white"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Subscription Plans
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="text-white/70 data-[state=active]:bg-[#FF6900] data-[state=active]:text-white"
          >
            <Users className="w-4 h-4 mr-2" />
            User Subscriptions
          </TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Active Plans ({filteredPlans.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* Filters */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-white/70 mb-2 block">Search Users</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                    <Input
                      placeholder="Search by email or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">Plan</label>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trialing">Trialing</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Users ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-white/70">User</TableHead>
                    <TableHead className="text-white/70">Email</TableHead>
                    <TableHead className="text-white/70">Plan</TableHead>
                    <TableHead className="text-white/70">Status</TableHead>
                    <TableHead className="text-white/70">Next Billing</TableHead>
                    <TableHead className="text-white/70">Revenue</TableHead>
                    <TableHead className="text-white/70">Risk</TableHead>
                    <TableHead className="text-white/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.slice(0, 20).map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="text-white/90">{user.display_name || "N/A"}</TableCell>
                      <TableCell className="text-white/70 font-mono text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-white/30 text-white/90">
                          {user.subscription.plan_id.replace("plan_", "")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`border-current/30 ${
                            user.subscription.status === "active"
                              ? "text-emerald-400"
                              : "text-yellow-400"
                          }`}
                        >
                          {user.subscription.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/70 text-sm">
                        {new Date(user.subscription.current_period_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-white font-semibold">
                        ${user.total_revenue.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              user.risk_score > 0.7
                                ? "bg-red-500"
                                : user.risk_score > 0.4
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                          />
                          <span className="text-xs text-white/70">{(user.risk_score * 100).toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Plan Dialog */}
      <Dialog open={isCreatePlanDialogOpen} onOpenChange={setIsCreatePlanDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Plan</DialogTitle>
            <DialogDescription className="text-white/70">
              Create a new subscription plan for your users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/90">Plan Name</Label>
                <Input className="bg-white/5 border-white/10 text-white" placeholder="e.g., Premium" />
              </div>
              <div>
                <Label className="text-white/90">Plan Type</Label>
                <Select>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-white/90">Description</Label>
              <Textarea className="bg-white/5 border-white/10 text-white" placeholder="Plan description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/90">Monthly Price</Label>
                <Input
                  type="number"
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="29.99"
                />
              </div>
              <div>
                <Label className="text-white/90">Yearly Price</Label>
                <Input
                  type="number"
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="299.99"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatePlanDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#FF6900] hover:bg-[#E55A00]">Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="bg-white/5 border-white/10">
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

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white text-lg">{plan.name}</CardTitle>
            {plan.is_popular && <Badge className="mt-2 bg-[#FF6900]">Popular</Badge>}
          </div>
          <Badge variant="outline" className={plan.is_active ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"}>
            {plan.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-2xl font-bold text-white">${plan.price_monthly}</div>
          <div className="text-sm text-white/60">/month or ${plan.price_yearly}/year</div>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-white/90">
            <span className="font-semibold text-white">{plan.limits.nexas_max}</span> NexAs
          </div>
          <div className="text-sm text-white/90">
            <span className="font-semibold text-white">{plan.limits.executions_per_month.toLocaleString()}</span> Executions/month
          </div>
          <div className="text-sm text-white/90">
            <span className="font-semibold text-white">{plan.limits.api_calls_per_month.toLocaleString()}</span> API Calls/month
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button size="sm" variant="outline" className="flex-1 bg-white/5 border-white/10 hover:bg-white/10">
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button size="sm" variant="ghost" className="flex-1 hover:bg-red-500/20 text-red-400">
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityItem({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={color}>{icon}</div>
        <span className="text-white/90 text-sm">{label}</span>
      </div>
      <span className="text-white font-semibold">{value}</span>
    </div>
  );
}
