/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import analyticsAdminService from "@/lib/api/analytics-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Activity, AlertTriangle, Clock, Gauge, Server, TrendingUp } from "lucide-react";

// Types matching backend analytics responses
interface EventTimelinePoint {
  timestamp: string;
  count: number;
}

interface EventTimelineResponse {
  success: boolean;
  timeline: EventTimelinePoint[];
  period: string;
}

interface SystemHealthResponseDTO {
  success: boolean;
  status: string;
  uptime: number;
  uptimePercentage: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  errorRate: number;
  activeConnections: number;
  timestamp: string;
}

interface ApiMetric {
  endpoint: string;
  method: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  minLatency: number;
  maxLatency: number;
  errorRate: number;
}

interface ApiMetricsResponse {
  success: boolean;
  metrics: ApiMetric[];
  timestamp: string;
}

interface ErrorRateResponse {
  totalErrors: number;
  errorRate: number;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  criticalErrors: number;
  warningErrors: number;
  topErrors: { type: string; count: number }[];
  timestamp: string;
}

interface WorkflowOverviewResponse {
  success: boolean;
  overview: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    period: string;
  };
}

export default function Page() {
  const [timeline, setTimeline] = useState<EventTimelinePoint[]>([]);
  const [system, setSystem] = useState<SystemHealthResponseDTO | null>(null);
  const [apiMetrics, setApiMetrics] = useState<ApiMetric[]>([]);
  const [errors, setErrors] = useState<ErrorRateResponse | null>(null);
  const [overview, setOverview] = useState<WorkflowOverviewResponse["overview"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [timelineRes, systemRes, apiRes, errorRes, wfOverview] = await Promise.all([
          analyticsAdminService.getEventsTimeline("24h", "hour"),
          analyticsAdminService.getSystemHealth(),
          analyticsAdminService.getAPIMetrics("24h"),
          analyticsAdminService.getErrorRateMetrics("24h"),
          analyticsAdminService.getWorkflowOverview("30d"),
        ]);
        if (!mounted) return;

        setTimeline(timelineRes?.timeline || []);
        setSystem(systemRes || null);
        setApiMetrics(apiRes?.metrics || []);
        setErrors(errorRes || null);
        setOverview(wfOverview?.overview || null);
      } catch (error) {
        console.error("❌ Analytics API Error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const timelineData = useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (timeline || []).map((t: any) => ({
        name: new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        count: t.count ?? t.value ?? 0,
      })),
    [timeline]
  );

  const errorTypeData = useMemo(() => {
    const map = errors?.errorsByType || {};
    return Object.entries(map).map(([k, v]) => ({ name: k, value: v as number }));
  }, [errors]);

  const apiLatencyBars = useMemo(() => {
    return (apiMetrics || [])
      .slice(0, 6)
      .map((m: any) => ({ name: `${m.method} ${m.endpoint}`, p95: m.p95Latency, errorRate: m.errorRate }));
  }, [apiMetrics]);

  const kpi = {
    executions: overview?.totalExecutions ?? 0,
    successRate: overview?.successRate ?? 0,
    failed: overview?.failedExecutions ?? 0,
    avgResponse: system?.avgResponseTime ?? 0,
    errorRate: system?.errorRate ?? 0,
    uptime: system?.uptimePercentage ?? 0,
  };
  
  console.log('📊 KPI Data:', { kpi, overview, system });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard title="Executions" value={kpi.executions.toLocaleString()} icon={<Activity className="w-4 h-4" />} />
        <KpiCard title="Success rate" value={`${kpi.successRate.toFixed(1)}%`} icon={<TrendingUp className="w-4 h-4" />} accent="emerald" />
        <KpiCard title="Failed" value={kpi.failed.toLocaleString()} icon={<AlertTriangle className="w-4 h-4" />} accent="red" />
        <KpiCard title="Avg response" value={`${Math.round(kpi.avgResponse)} ms`} icon={<Clock className="w-4 h-4" />} />
        <KpiCard title="Error rate" value={`${kpi.errorRate?.toFixed?.(2) ?? 0}%`} icon={<Gauge className="w-4 h-4" />} />
        <KpiCard title="Uptime" value={`${kpi.uptime?.toFixed?.(2) ?? 0}%`} icon={<Server className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Timeline */}
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Events timeline (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineData.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-white/50">
                <Activity className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No events recorded in the last 24 hours</p>
              </div>
            ) : (
              <ChartContainer
                config={{ count: { label: "Events", color: "#FF6900" } }}
                className="h-72"
              >
                <LineChart data={timelineData} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fill: "#9CA3AF" }} />
                  <YAxis tick={{ fill: "#9CA3AF" }} />
                  <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Errors by type */}
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">Errors by type (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {errorTypeData.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-white/50">
                <AlertTriangle className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No errors recorded</p>
                <p className="text-xs mt-1">System running smoothly</p>
              </div>
            ) : (
              <ChartContainer config={{ a: { color: "#FF6900" } }} className="h-72">
                <PieChart>
                  <Pie data={errorTypeData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {errorTypeData.map((_, i) => (
                      <Cell key={i} fill={["#FF6900", "#EF4444", "#F59E0B", "#22C55E", "#3B82F6", "#A855F7"][i % 6]} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent />} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API latency bars */}
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">API latency p95 (top endpoints)</CardTitle>
          </CardHeader>
          <CardContent>
            {apiLatencyBars.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-white/50">
                <Server className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No API calls recorded</p>
              </div>
            ) : (
              <ChartContainer config={{ p95: { label: "p95 latency", color: "#60A5FA" } }} className="h-72">
                <BarChart data={apiLatencyBars} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fill: "#9CA3AF" }} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "#9CA3AF" }} />
                  <Bar dataKey="p95" fill="var(--color-p95)" radius={[4, 4, 0, 0]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* API metrics table */}
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">API metrics (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {apiMetrics.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-white/50">
                <Clock className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No API metrics available</p>
                <p className="text-xs mt-1">Waiting for API activity</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-white/70">Endpoint</TableHead>
                    <TableHead className="text-white/70">Calls</TableHead>
                    <TableHead className="text-white/70">Success</TableHead>
                    <TableHead className="text-white/70">Error%</TableHead>
                    <TableHead className="text-right text-white/70">p95 (ms)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiMetrics.slice(0, 8).map((m) => (
                    <TableRow key={`${m.method}-${m.endpoint}`}>
                      <TableCell className="text-white/90">{m.method} {m.endpoint}</TableCell>
                      <TableCell className="text-white/70">{m.totalCalls}</TableCell>
                      <TableCell className="text-white/70">{m.successfulCalls}</TableCell>
                      <TableCell className="text-white/70">{m.errorRate}%</TableCell>
                      <TableCell className="text-right text-white/90">{Math.round(m.p95Latency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, accent }: { title: string; value: string | number; icon?: React.ReactNode; accent?: "emerald" | "red" | "blue" }) {
  const color = accent === "emerald" ? "text-emerald-400" : accent === "red" ? "text-red-400" : "text-white";
  return (
    <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

