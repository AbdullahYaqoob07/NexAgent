"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

// Backend-aligned types
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
  id?: string;
  user_id?: string;
  email: string;
  display_name?: string;
  subscription?: {
    plan?: string;
    plan_id?: string;
    status?: string;
    billing_cycle?: string;
    current_period_end?: string;
    next_billing_date?: string;
  };
  total_revenue?: number;
  invoices_count?: number;
  last_payment_date?: string;
  risk_score?: number;
}

interface AdminUserListResponse {
  users: UserBilling[];
  total_count: number;
  criteria: Record<string, any>;
  limit: number;
}

async function fetchAdminBilling(
  periodDays: number,
  planFilter: string,
  statusFilter: string,
): Promise<{
  plans: Plan[];
  analytics: AdminAnalytics | null;
  users: UserBilling[];
  fetchedAt: Date;
}> {
  try {
    const planParam = planFilter === "all" ? undefined : `plan_${planFilter}`;
    const statusParam = statusFilter === "all" ? undefined : statusFilter;

    const [plansRes, analyticsRes, usersRes] = await Promise.all([
      apiClient.get<Plan[]>("/api/billing/plans", { params: { active_only: false } }),
      apiClient.get<AdminAnalytics>("/api/billing/admin/analytics", {
        params: { period_days: periodDays },
      }),
      apiClient.get<AdminUserListResponse>("/api/billing/admin/users", {
        params: {
          limit: 100,
          ...(planParam ? { plan: planParam } : {}),
          ...(statusParam ? { status: statusParam } : {}),
        },
      }),
    ]);

    return {
      plans: plansRes.data || [],
      analytics: analyticsRes.data || null,
      users: (usersRes.data.users || []) as UserBilling[],
      fetchedAt: new Date(),
    };
  } catch (error) {
    console.error("❌ Billing API Error:", error);
    return {
      plans: [],
      analytics: null,
      users: [],
      fetchedAt: new Date(),
    };
  }
}

export default function AdminBillingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodDays, setPeriodDays] = useState(30);
  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserBilling | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["adminBilling", periodDays, planFilter, statusFilter],
    queryFn: () => fetchAdminBilling(periodDays, planFilter, statusFilter),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const plans = data?.plans ?? [];
  const analytics = data?.analytics ?? null;
  const users = data?.users ?? [];
  const lastRefresh = data?.fetchedAt ?? new Date();

  const revenueByPlanData = useMemo(() => {
    if (!analytics || !analytics.revenue_by_plan || Object.keys(analytics.revenue_by_plan).length === 0) return [];
    return Object.entries(analytics.revenue_by_plan).map(([plan, revenue]) => ({
      name: plan.charAt(0).toUpperCase() + plan.slice(1),
      value: revenue,
      fill: plan === "pro" ? "#FF6900" : plan === "basic" ? "#3B82F6" : "#10B981",
    }));
  }, [analytics]);

  const usersByPlanData = useMemo(() => {
    if (!analytics || !analytics.users_by_plan || Object.keys(analytics.users_by_plan).length === 0) return [];
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

    const sub = user.subscription || {};
    const planId = sub.plan_id || sub.plan || "";
    const status = sub.status || "no-subscription";

    const matchesPlan = planFilter === "all" || planId.includes(planFilter);
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const filteredPlans = plans.filter((plan) => plan.is_active);

  if (isLoading && !data) {
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
            onClick={() => refetch()}
            className="bg-white/5 border-white/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
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
      {analytics ? (
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
      ) : (
        <div className="text-sm text-white/60">
          No billing analytics available yet.
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
            {revenueByPlanData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-white/60">
                No revenue data available by plan.
              </div>
            ) : (
              <>
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
            </>
            )}
          </CardContent>
        </Card>

        {/* Users by Plan */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Users by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {usersByPlanData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-white/60">
                No user distribution data by plan.
              </div>
            ) : (
              <>
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
            </>
            )}
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
                {filteredPlans.length === 0 ? (
                  <div className="text-sm text-white/60">
                    No active plans configured yet.
                  </div>
                ) : (
                  filteredPlans.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} />
                  ))
                )}
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
                    <TableHead className="text-white/70">#</TableHead>
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
                  {filteredUsers.length === 0 ? (
                    <TableRow className="hover:bg-white/5">
                      <TableCell colSpan={8} className="h-32 text-center text-white/60">
                        No users found for current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.slice(0, 20).map((user, index) => {
                      const sub = user.subscription || {};
                      const planId = sub.plan_id || sub.plan;
                      const planLabel = planId ? planId.replace("plan_", "") : "No plan";
                      const status = sub.status ?? "no-subscription";
                      const nextBillingRaw = sub.current_period_end || sub.next_billing_date;
                      const nextBilling = nextBillingRaw
                        ? new Date(nextBillingRaw).toLocaleDateString()
                        : "N/A";

                      const userIndexDisplay = index + 1;

                      return (
                        <TableRow
                          key={user.id || user.user_id || index}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <TableCell className="text-white/70 font-mono text-xs">{userIndexDisplay}</TableCell>
                          <TableCell className="text-white/70 font-mono text-sm">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-white/30 text-white/90">
                              {planLabel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`border-current/30 ${
                                status === "active"
                                  ? "text-emerald-400"
                                  : status === "no-subscription"
                                  ? "text-white/60"
                                  : "text-yellow-400"
                              }`}
                            >
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white/70 text-sm">
                            {nextBilling}
                          </TableCell>
                          <TableCell className="text-white font-semibold">
                            {(user.total_revenue ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  user.risk_score == null
                                    ? "bg-gray-500"
                                    : user.risk_score > 0.7
                                    ? "bg-red-500"
                                    : user.risk_score > 0.4
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                              />
                              <span className="text-xs text-white/70">
                                {user.risk_score != null
                                  ? `${(user.risk_score * 100).toFixed(0)}%`
                                  : "N/A"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-white/10"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
<DialogContent className="bg-black border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Eye className="w-4 h-4" />
              User billing details
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Read-only view of this user's billing and subscription information.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-white/60">Email</div>
                <div className="text-white font-mono text-xs break-all">{selectedUser.email}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-white/60">Plan</div>
                  <div className="text-white">
                    {(selectedUser.subscription?.plan_id || selectedUser.subscription?.plan || "No plan").replace("plan_", "")}
                  </div>
                </div>
                <div>
                  <div className="text-white/60">Status</div>
                  <div className="text-white capitalize">{selectedUser.subscription?.status || "no-subscription"}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-white/60">Next billing</div>
                  <div className="text-white">
                    {selectedUser.subscription?.current_period_end || selectedUser.subscription?.next_billing_date
                      ? new Date(
                          selectedUser.subscription?.current_period_end ||
                            (selectedUser.subscription?.next_billing_date as string)
                        ).toLocaleDateString()
                      : "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-white/60">Total revenue</div>
                  <div className="text-white">${(selectedUser.total_revenue ?? 0).toFixed(2)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-white/60">Invoices</div>
                  <div className="text-white">{selectedUser.invoices_count ?? 0}</div>
                </div>
                <div>
                  <div className="text-white/60">Risk score</div>
                  <div className="text-white">
                    {selectedUser.risk_score != null
                      ? `${(selectedUser.risk_score * 100).toFixed(0)}%`
                      : "N/A"}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Plan Dialog */}
      <Dialog open={isCreatePlanDialogOpen} onOpenChange={setIsCreatePlanDialogOpen}>
<DialogContent className="bg-black border-white/10 max-w-2xl">
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
