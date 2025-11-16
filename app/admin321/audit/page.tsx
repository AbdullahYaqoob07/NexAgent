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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
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
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Activity,
  Lock,
  Eye,
  FileText,
  AlertCircle,
  TrendingUp,
  Database,
  Settings,
  Users,
  Globe,
  Zap,
} from "lucide-react";

// Backend-aligned API response types
interface AuditLogApiResponse {
  success: boolean;
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

interface SecurityLogsApiResponse {
  success: boolean;
  logs: SecurityEvent[];
  total: number;
  page: number;
  pageSize: number;
}

interface AuditStatisticsApiResponse extends AuditStatistics {}

interface BackendComplianceAlert {
  id: string;
  alertType: string;
  severity: string;
  standard: string;
  title: string;
  description: string;
  acknowledged: boolean;
  createdAt: string;
}

interface ComplianceAlertsApiResponse {
  success: boolean;
  alerts: BackendComplianceAlert[];
  total: number;
  criticalCount: number;
  warningCount: number;
}

interface ComplianceStatisticsApiResponse {
  overallComplianceScore: number;
  complianceByStandard: Record<string, number>;
  totalViolations: number;
  violationsByType: Record<string, number>;
  dataSubjectRequests: number;
  avgResponseTime: number;
  retentionPolicyCompliance: boolean;
}

interface ComplianceReportSummary {
  id: string;
  standard: string;
  reportPeriod: string;
  generatedAt: string;
  complianceScore: number;
  status: string;
}

interface ComplianceReportsApiResponse {
  success: boolean;
  reports: ComplianceReportSummary[];
  total: number;
}

interface AuditLog {
  id: string;
  eventType: string;
  severity: "info" | "warning" | "error" | "critical";
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  action: string;
  description: string;
  metadata: Record<string, any>;
  changes: Record<string, any>;
  status: string;
  timestamp: string;
}

interface SecurityEvent {
  id: string;
  eventType: string;
  severity: "info" | "warning" | "error" | "critical";
  userId?: string;
  ipAddress: string;
  description: string;
  threatLevel: number;
  mitigationAction?: string;
  resolved: boolean;
  timestamp: string;
}

interface AuditStatistics {
  success: boolean;
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByUser: Array<{ userId: string; count: number }>;
  successRate: number;
  failureRate: number;
  topActions: Array<{ action: string; count: number }>;
  period: string;
}

interface ComplianceAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);
  const [complianceStats, setComplianceStats] = useState<ComplianceStatisticsApiResponse | null>(null);
  const [complianceReports, setComplianceReports] = useState<ComplianceReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7d");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAuditData = async () => {
    try {
      const [logsRes, securityRes, statsRes, alertsRes, compStatsRes, reportsRes] =
        await Promise.all([
          apiClient.get<AuditLogApiResponse>("/api/v1/audit/logs", {
            params: {
              page: currentPage,
              pageSize,
              searchQuery: searchQuery || undefined,
              severity: severityFilter !== "all" ? severityFilter : undefined,
              eventType: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
            },
          }),
          apiClient.get<SecurityLogsApiResponse>("/api/v1/audit/security/events", {
            params: {
              page: 1,
              pageSize: 20,
              resolved: false,
            },
          }),
          apiClient.get<AuditStatisticsApiResponse>(
            "/api/v1/audit/logs/statistics/summary",
          ),
          apiClient.get<ComplianceAlertsApiResponse>(
            "/api/v1/audit/compliance/alerts",
            { params: { limit: 50 } },
          ),
          apiClient.get<ComplianceStatisticsApiResponse>(
            "/api/v1/audit/compliance/statistics",
          ),
          apiClient.get<ComplianceReportsApiResponse>(
            "/api/v1/audit/compliance/reports",
            { params: { limit: 4 } },
          ),
        ]);

      setAuditLogs(logsRes.data.logs || []);
      setSecurityEvents(securityRes.data.logs || []);
      setStatistics(statsRes.data || null);

      setComplianceAlerts(
        (alertsRes.data.alerts || []).map((a) => ({
          id: a.id,
          type: `${a.standard.toUpperCase()} • ${a.alertType}`,
          severity: a.severity,
          message: a.description || a.title,
          timestamp: a.createdAt,
          resolved: a.acknowledged,
        })),
      );

      setComplianceStats(compStatsRes.data || null);
      setComplianceReports(reportsRes.data.reports || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("❌ Audit API Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [currentPage, searchQuery, severityFilter, eventTypeFilter]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(fetchAuditData, 120000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "info":
        return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      case "warning":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "error":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "critical":
        return "text-red-300 bg-red-600/20 border-red-600/40";
      default:
        return "text-white/70 bg-white/5 border-white/10";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "info":
        return <CheckCircle className="w-4 h-4" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4" />;
      case "error":
        return <AlertCircle className="w-4 h-4" />;
      case "critical":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    if (eventType.includes("login")) return <User className="w-4 h-4 text-white/90" />;
    if (eventType.includes("workflow")) return <Activity className="w-4 h-4 text-white/90" />;
    if (eventType.includes("data")) return <Database className="w-4 h-4 text-white/90" />;
    if (eventType.includes("security")) return <Shield className="w-4 h-4 text-white/90" />;
    if (eventType.includes("access")) return <Lock className="w-4 h-4 text-white/90" />;
    return <FileText className="w-4 h-4 text-white/90" />;
  };

  const chartData = useMemo(() => {
    if (!statistics || statistics.totalEvents === 0) return [];
    return Object.entries(statistics.eventsBySeverity).map(([severity, count]) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: count,
      fill:
        severity === "critical"
          ? "#DC2626"
          : severity === "error"
          ? "#EA580C"
          : severity === "warning"
          ? "#D97706"
          : "#2563EB",
    }));
  }, [statistics]);

  const eventTypeData = useMemo(() => {
    if (!statistics || statistics.totalEvents === 0) return [];
    return Object.entries(statistics.eventsByType)
      .slice(0, 6)
      .map(([type, count]) => ({
        name: type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        value: count,
      }));
  }, [statistics]);

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
          {[...Array(4)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
          <p className="text-white/60 mt-1">
            Security monitoring, compliance tracking, and audit trail analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-white/60">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuditData}
            className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Events"
          value={statistics ? statistics.totalEvents.toLocaleString() : "0"}
          icon={<Activity className="w-4 h-4" />}
          color="text-white"
        />
        <KPICard
          title="Success Rate"
          value={`${statistics ? statistics.successRate.toFixed(1) : "0.0"}%`}
          icon={<CheckCircle className="w-4 h-4" />}
          color="text-emerald-400"
        />
        <KPICard
          title="Security Events"
          value={securityEvents.length.toString()}
          icon={<Shield className="w-4 h-4" />}
          color="text-red-400"
        />
        <KPICard
          title="Active Alerts"
          value={complianceAlerts.filter(a => !a.resolved).length.toString()}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="text-yellow-400"
        />
      </div>

      {/* Compliance Alerts */}
      {complianceAlerts.filter((alert) => !alert.resolved).length > 0 && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Compliance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {complianceAlerts.filter((alert) => !alert.resolved).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                  <div className="flex items-center gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div>
                      <div className="font-medium text-red-300">{alert.type}</div>
                      <div className="text-sm text-red-400/80">{alert.message}</div>
                    </div>
                  </div>
                  <div className="text-xs text-red-400/60">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">Events by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-white/60">
                No audit events available for the selected period.
              </div>
            ) : (
              <>
                <ChartContainer
                  config={{
                    critical: { color: "#DC2626" },
                    error: { color: "#EA580C" },
                    warning: { color: "#D97706" },
                    info: { color: "#2563EB" },
                  }}
                  className="h-64"
                >
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={90}
                      paddingAngle={2}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth={1}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {chartData.map((item, index) => (
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
                        {item.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">Top Event Types</CardTitle>
          </CardHeader>
          <CardContent>
            {eventTypeData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-white/60">
                No audit event types to display yet.
              </div>
            ) : (
              <ChartContainer
                config={{ value: { label: "Events", color: "#FF6900" } }}
                className="h-72"
              >
                <BarChart data={eventTypeData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#9CA3AF" }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fill: "#9CA3AF" }} />
                  <Bar
                    dataKey="value"
                    fill="var(--color-value)"
                    radius={[4, 4, 0, 0]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="audit" className="w-full">
        <TabsList className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
          <TabsTrigger 
            value="audit" 
            className="text-white/70 data-[state=active]:bg-[#FF6900] data-[state=active]:text-white hover:text-white transition-colors"
          >
            <FileText className="w-4 h-4 mr-2" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="text-white/70 data-[state=active]:bg-[#FF6900] data-[state=active]:text-white hover:text-white transition-colors"
          >
            <Shield className="w-4 h-4 mr-2" />
            Security Events
          </TabsTrigger>
          <TabsTrigger 
            value="compliance" 
            className="text-white/70 data-[state=active]:bg-[#FF6900] data-[state=active]:text-white hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-6">
          {/* Filters */}
          <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                    <Input
                      placeholder="Search audit logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    Severity
                  </label>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="All severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    Event Type
                  </label>
                  <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                    <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="user_login">User Login</SelectItem>
                      <SelectItem value="workflow_created">Workflow Created</SelectItem>
                      <SelectItem value="data_accessed">Data Accessed</SelectItem>
                      <SelectItem value="failed_login">Failed Login</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    Date Range
                  </label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1d">Last Day</SelectItem>
                      <SelectItem value="7d">Last Week</SelectItem>
                      <SelectItem value="30d">Last Month</SelectItem>
                      <SelectItem value="90d">Last Quarter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Table */}
          <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white">Audit Events ({auditLogs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-white/70">Event</TableHead>
                    <TableHead className="text-white/70">User</TableHead>
                    <TableHead className="text-white/70">Resource</TableHead>
                    <TableHead className="text-white/70">Action</TableHead>
                    <TableHead className="text-white/70">Status</TableHead>
                    <TableHead className="text-white/70">IP Address</TableHead>
                    <TableHead className="text-white/70">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-white/60">
                      No audit events found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getEventTypeIcon(log.eventType)}
                          <div>
                            <div className="font-medium text-white/90">
                              {log.eventType
                                .replace("_", " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </div>
                            <div className="text-sm text-white/60">{log.description}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-white/90">{log.userName || log.userId || "System"}</div>
                          {log.userId && log.userName && (
                            <div className="text-xs text-white/50 font-mono">{log.userId}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-white/90">{log.resourceName || log.resourceType || "N/A"}</div>
                          {log.resourceId && (
                            <div className="text-xs text-white/50 font-mono">{log.resourceId}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-white/30 text-white/90">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getSeverityColor(log.severity)}>
                            {getSeverityIcon(log.severity)}
                            <span className="ml-1">{log.severity}</span>
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              log.status === "success"
                                ? "border-emerald-500/30 text-emerald-400"
                                : "border-red-500/30 text-red-400"
                            }
                          >
                            {log.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-white/70 text-sm">
                          {log.ipAddress || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-white/70 text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Events ({securityEvents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-white/70">Event Type</TableHead>
                    <TableHead className="text-white/70">Threat Level</TableHead>
                    <TableHead className="text-white/70">IP Address</TableHead>
                    <TableHead className="text-white/70">Description</TableHead>
                    <TableHead className="text-white/70">Mitigation</TableHead>
                    <TableHead className="text-white/70">Status</TableHead>
                    <TableHead className="text-white/70">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-white/60">
                        No security events detected in the selected period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    securityEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-red-400" />
                            <span className="text-white/90">
                              {event.eventType
                                .replace("_", " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                event.threatLevel >= 8
                                  ? "bg-red-500"
                                  : event.threatLevel >= 6
                                  ? "bg-orange-500"
                                  : event.threatLevel >= 4
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                            />
                            <span className="text-white/90">{event.threatLevel}/10</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-white/70 text-sm">{event.ipAddress}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-white/90">{event.description}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-white/70 text-sm">
                            {event.mitigationAction || "No action taken"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              event.resolved
                                ? "border-emerald-500/30 text-emerald-400"
                                : "border-red-500/30 text-red-400"
                            }
                          >
                            {event.resolved ? "Resolved" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-white/70 text-sm">
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
            <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-white">Compliance Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {complianceStats &&
                Object.keys(complianceStats.complianceByStandard || {}).length > 0 ? (
                  Object.entries(complianceStats.complianceByStandard).map(
                    ([standard, score]) => {
                      const s = Number(score);
                      const status =
                        s >= 90
                          ? "Compliant"
                          : s >= 70
                          ? "Needs Review"
                          : "Non-compliant";
                      const color =
                        s >= 90
                          ? "text-emerald-400"
                          : s >= 70
                          ? "text-yellow-400"
                          : "text-red-400";
                      return (
                        <ComplianceItem
                          key={standard}
                          standard={standard.toUpperCase()}
                          status={status}
                          score={s}
                          color={color}
                        />
                      );
                    },
                  )
                ) : (
                  <div className="text-sm text-white/60">
                    No compliance statistics available yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-white">Recent Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {complianceReports.length === 0 ? (
                  <div className="text-sm text-white/60">
                    No compliance reports generated yet.
                  </div>
                ) : (
                  complianceReports.map((report) => (
                    <ReportItem
                      key={report.id}
                      title={`${report.standard.toUpperCase()} ${
                        report.reportPeriod
                      }`}
                      date={report.generatedAt}
                      status={report.status}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white">All Compliance Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {complianceAlerts.length === 0 ? (
                  <div className="text-sm text-white/60">
                    No compliance alerts have been raised yet.
                  </div>
                ) : (
                  complianceAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${
                        alert.resolved
                          ? "bg-white/5 border-white/10"
                          : alert.severity === "critical"
                          ? "bg-red-500/10 border-red-500/30"
                          : "bg-yellow-500/10 border-yellow-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                            {getSeverityIcon(alert.severity)}
                            <span className="ml-1">{alert.type}</span>
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              alert.resolved
                                ? "border-emerald-500/30 text-emerald-400"
                                : "border-red-500/30 text-red-400"
                            }
                          >
                            {alert.resolved ? "Resolved" : "Active"}
                          </Badge>
                        </div>
                        <div className="text-xs text-white/60">
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className={`mt-2 ${alert.resolved ? "text-white/60" : "text-white/90"}`}>
                        {alert.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

function ComplianceItem({
  standard,
  status,
  score,
  color
}: {
  standard: string;
  status: string;
  score: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-white/60" />
        <div>
          <div className="font-medium text-white">{standard}</div>
          <div className={`text-sm ${color}`}>{status}</div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-lg font-bold ${color}`}>{score}%</div>
        <div className="text-xs text-white/60">Score</div>
      </div>
    </div>
  );
}

function ReportItem({
  title,
  date,
  status
}: {
  title: string;
  date: string;
  status: string;
}) {
  const statusColor = status === "Generated" ? "text-emerald-400" :
                     status === "In Progress" ? "text-yellow-400" : "text-white/60";
  
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
      <div>
        <div className="font-medium text-white">{title}</div>
        <div className="text-sm text-white/60">{new Date(date).toLocaleDateString()}</div>
      </div>
      <Badge variant="outline" className={`${statusColor} border-current/30`}>
        {status}
      </Badge>
    </div>
  );
}

