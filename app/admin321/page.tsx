"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Activity, Users, Coins } from "lucide-react";
import { useAdminAnalytics } from "@/lib/useAdminAnalytics";

export default function AdminOverviewPage() {
  const {
    billing,
    systemHealth,
    resources: resourcesDisplay,
    revenue,
    activeUsers,
    churn,
  } = useAdminAnalytics();

  const billingAnalytics = billing;

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
              <span className="text-2xl font-bold text-white whitespace-normal leading-tight">{resourcesDisplay}</span>
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
