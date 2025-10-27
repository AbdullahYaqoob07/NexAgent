"use client";

import { useEffect, useMemo, useState } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ResponsiveContainer,
} from "recharts";
import { Activity, AlertTriangle, Clock, Cpu, Gauge, Network, Server, TrendingUp } from "lucide-react";

export default function Page() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [system, setSystem] = useState<any | null>(null);
  const [apiMetrics, setApiMetrics] = useState<any[]>([]);
  const [errors, setErrors] = useState<any | null>(null);
  const [overview, setOverview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [timelineRes, systemRes, apiRes, errorRes, wfOverview] = await Promise.all([
          apiClient.get("/api/v1/analytics/events/timeline", { params: { timeRange: "24h", interval: "hour" } }),
          apiClient.get("/api/v1/analytics/system/health"),
          apiClient.get("/api/v1/analytics/system/api-metrics", { params: { timeRange: "24h" } }),
          apiClient.get("/api/v1/analytics/system/error-rate", { params: { timeRange: "24h" } }),
          apiClient.get("/api/v1/analytics/workflows/overview", { params: { timeRange: "30d" } }),
        ]);
        if (!mounted) return;
        
        console.log('📊 Analytics Data Received:', {
          timeline: timelineRes.data,
          system: systemRes.data,
          apiMetrics: apiRes.data,
          errors: errorRes.data,
          overview: wfOverview.data
        });
        
        // Handle timeline data - check if it's a proper object or string
        const timelineData = typeof timelineRes.data === 'string' ? [] : (timelineRes.data?.timeline || []);
        setTimeline(timelineData);
        
        // Handle system data - check if it's a proper object or string
        const systemData = typeof systemRes.data === 'string' ? null : systemRes.data;
        setSystem(systemData);
        
        // Handle API metrics - check if it's a proper object or string
        const apiData = typeof apiRes.data === 'string' ? [] : (apiRes.data?.metrics || []);
        setApiMetrics(apiData);
        
        // Handle errors data - check if it's a proper object or string
        const errorsData = typeof errorRes.data === 'string' ? null : errorRes.data;
        setErrors(errorsData);
        
        // Handle overview data - check if it's a proper object or string
        const overviewData = typeof wfOverview.data === 'string' ? null : (wfOverview.data?.overview || wfOverview.data);
        setOverview(overviewData);
        
      } catch (error) {
        console.error('❌ Analytics API Error:', error);
        // No fallback data - will show empty/zero values
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
    <div className="space-y-6">
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
        <Card className="bg-white/5 border-white/10 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Events timeline (24h)</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Errors by type */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Errors by type (24h)</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API latency bars */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">API latency p95 (top endpoints)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ p95: { label: "p95 latency", color: "#60A5FA" } }} className="h-72">
              <BarChart data={apiLatencyBars} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fill: "#9CA3AF" }} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fill: "#9CA3AF" }} />
                <Bar dataKey="p95" fill="var(--color-p95)" radius={[4, 4, 0, 0]} />
                <ChartTooltip content={<ChartTooltipContent />} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* API metrics table */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">API metrics (24h)</CardTitle>
          </CardHeader>
          <CardContent>
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
                {(apiMetrics || []).slice(0, 8).map((m: any) => (
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, accent }: { title: string; value: string | number; icon?: React.ReactNode; accent?: "emerald" | "red" | "blue" }) {
  const color = accent === "emerald" ? "text-emerald-400" : accent === "red" ? "text-red-400" : "text-white";
  return (
    <Card className="bg-white/5 border-white/10">
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
