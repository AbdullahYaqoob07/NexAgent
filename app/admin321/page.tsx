"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Activity, Users, Coins } from "lucide-react";
import Image from "next/image";

interface BillingAnalytics {
  mrr: number;
  arr: number;
  churnRate: number;
  totalUsers: number;
  payingUsers: number;
  trialUsers: number;
  canceledUsers: number;
  usersByPlan: Record<string, number>;
  revenueByPlan: Record<string, number>;
  newSubscriptionsThisMonth: number;
  failedPaymentsThisMonth: number;
}

interface SystemHealth {
  status: string;
  uptimePercentage: number;
  errorRate: number;
  totalRequests: number;
}

export default function AdminOverviewPage() {
  const [revenue, setRevenue] = useState<string | number>("Loading...");
  const [activeUsers, setActiveUsers] = useState<string | number>("Loading...");
  const [churn, setChurn] = useState<string | number>("Loading...");
  const [resources, setResources] = useState<string | number>("Loading...");
  const [billingAnalytics, setBillingAnalytics] = useState<BillingAnalytics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    // Billing admin analytics: revenue + user metrics + plan distribution
    apiClient
      .get("/api/billing/admin/analytics")
      .then((res) => {
        const data = res.data;
        if (!data) {
          setRevenue("API not Available for this");
          setActiveUsers("API not Available for this");
          setChurn("API not Available for this");
          return;
        }

        const mrr = Number(data.mrr ?? 0);
        const arr = Number(data.arr ?? 0);
        setRevenue(`$${(mrr || arr).toLocaleString()}`);

        setActiveUsers(
          data.paying_users !== undefined && data.total_users !== undefined
            ? `${data.paying_users}/${data.total_users} paying`
            : "API not Available for this"
        );

        if (data.churn_rate !== undefined) {
          setChurn(`${(Number(data.churn_rate) * 100).toFixed(1)}%`);
        } else {
          setChurn("API not Available for this");
        }

        setBillingAnalytics({
          mrr,
          arr,
          churnRate: Number(data.churn_rate ?? 0),
          totalUsers: Number(data.total_users ?? 0),
          payingUsers: Number(data.paying_users ?? 0),
          trialUsers: Number(data.trial_users ?? 0),
          canceledUsers: Number(data.canceled_users ?? 0),
          usersByPlan: data.users_by_plan || {},
          revenueByPlan: data.revenue_by_plan || {},
          newSubscriptionsThisMonth: Number(data.new_subscriptions_this_month ?? 0),
          failedPaymentsThisMonth: Number(data.failed_payments_this_month ?? 0),
        });
      })
      .catch(() => {
        setRevenue("API not Available for this");
        setActiveUsers("API not Available for this");
        setChurn("API not Available for this");
      });

    // Resources: system resource usage
    apiClient
      .get("/api/v1/analytics/system/resource-usage")
      .then((res) => {
        // API returns ResourceUsageMetrics directly: { cpuUsage, memoryUsage, ... }
        const m = res.data;
        if (m && (m.cpuUsage !== undefined || m.memoryUsage !== undefined)) {
          const cpu = Math.round(m.cpuUsage ?? 0);
          const mem = Math.round(m.memoryUsage ?? 0);
          setResources(`${cpu}% CPU • ${mem}% MEM`);
        } else {
          setResources("API not Available for this");
        }
      })
      .catch(() => setResources("API not Available for this"));

    // System health: uptime, error rate, total requests
    apiClient
      .get("/api/v1/analytics/system/health")
      .then((res) => {
        const d = res.data;
        if (!d) return;
        setSystemHealth({
          status: d.status,
          uptimePercentage: Number(d.uptimePercentage ?? 0),
          errorRate: Number(d.errorRate ?? 0),
          totalRequests: Number(d.totalRequests ?? 0),
        });
      })
      .catch(() => {
        setSystemHealth(null);
      });
  }, []);

  return (
    <div className="relative space-y-6">
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

        {/* Right-aligned background */}
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

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white text-sm">MRR / ARR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white whitespace-normal leading-tight">{revenue}</span>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-xs text-white/50 mt-2">From billing admin analytics</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white text-sm">Active customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white whitespace-normal leading-tight">{activeUsers}</span>
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-xs text-white/50 mt-2">Paying vs total users</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white text-sm">Churn rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white whitespace-normal leading-tight">{churn}</span>
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-xs text-white/50 mt-2">Monthly churn</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white text-sm">Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white whitespace-normal leading-tight">{resources}</span>
              <Coins className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-xs text-white/50 mt-2">Data source check</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project summary */}
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Plan performance</CardTitle>
          </CardHeader>
          <CardContent>
            {billingAnalytics ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-white/70">Plan</TableHead>
                    <TableHead className="text-white/70">Users</TableHead>
                    <TableHead className="text-white/70">MRR share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(billingAnalytics.usersByPlan).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-white/60 text-center">
                        No billing data yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    Object.entries(billingAnalytics.usersByPlan).map(([planId, users]) => {
                      const revenue = billingAnalytics.revenueByPlan[planId] ?? 0;
                      const totalRevenue = Object.values(billingAnalytics.revenueByPlan).reduce(
                        (sum, v) => sum + (v ?? 0),
                        0
                      );
                      const share = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
                      return (
                        <TableRow key={planId}>
                          <TableCell className="text-white">{planId}</TableCell>
                          <TableCell className="text-white/80">{users}</TableCell>
                          <TableCell className="text-white/60">
                            {`$${Number(revenue).toLocaleString()} (${share.toFixed(1)}%)`}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            ) : (
              <div className="text-white/60 text-sm">Loading billing analytics...</div>
            )}
          </CardContent>
        </Card>

        {/* Overall progress */}
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">Billing health</CardTitle>
          </CardHeader>
          <CardContent>
            {billingAnalytics ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-white/60 mb-1">Churn rate</div>
                  <div className="text-2xl font-bold text-white">
                    {(billingAnalytics.churnRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs text-white/70">
                  <div>
                    <div className="text-white text-base font-semibold">
                      {billingAnalytics.newSubscriptionsThisMonth}
                    </div>
                    <div>New subs (30d)</div>
                  </div>
                  <div>
                    <div className="text-orange-400 text-base font-semibold">
                      {billingAnalytics.failedPaymentsThisMonth}
                    </div>
                    <div>Failed payments (30d)</div>
                  </div>
                  <div>
                    <div className="text-white text-base font-semibold">
                      {billingAnalytics.totalUsers}
                    </div>
                    <div>Total users</div>
                  </div>
                  <div>
                    <div className="text-emerald-400 text-base font-semibold">
                      {billingAnalytics.payingUsers}
                    </div>
                    <div>Paying users</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-white/60 text-sm">Loading billing health...</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today tasks (simplified) */}
      <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">System status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {systemHealth ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Status</span>
                <Badge
                  variant="outline"
                  className="border-white/20 text-white/80 capitalize"
                >
                  {systemHealth.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Uptime</span>
                <span className="text-white">
                  {systemHealth.uptimePercentage.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Error rate</span>
                <span className="text-white">{systemHealth.errorRate.toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Total requests (last 5m)</span>
                <span className="text-white">
                  {systemHealth.totalRequests.toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <div className="text-white/60">System health metrics not available.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
