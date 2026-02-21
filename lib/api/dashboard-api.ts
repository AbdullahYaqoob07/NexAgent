/**
 * Dashboard API Service
 * Handles user dashboard data from backend analytics endpoints
 */

import apiClient from './client';

const DASHBOARD_BASE = '/api/v1/analytics/dashboard';

// Dashboard types matching backend responses
export interface DashboardOverview {
  success: boolean;
  period: string;
  workflows: {
    total: number;
    active: number;
    success_rate: number;
  };
  executions: {
    total: number;
    successful: number;
    failed: number;
    running: number;
  };
  users: {
    total: number;
    active: number;
    new: number;
  };
  integrations: {
    total: number;
    active: number;
    connections: number;
  };
  system: {
    health: string;
    uptime: number;
    error_rate: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    userId?: string;
    workflowId?: string;
  }>;
}

export interface RealTimeMetrics {
  success: boolean;
  activeExecutions: number;
  executionsPerMinute: number;
  avgExecutionTime: number;
  currentErrorRate: number;
  activeUsers: number;
  requestsPerSecond: number;
  queuedJobs: number;
  systemLoad: number;
  timestamp: string;
}

export interface TrendDataPoint {
  timestamp: string;
  value: number;
}

export interface TrendAnalysis {
  success: boolean;
  metric: string;
  timeRange: string;
  dataPoints: TrendDataPoint[];
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
  insights: string[];
}

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  category: 'system' | 'workflow' | 'user' | 'integration';
  source: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface AlertsResponse {
  success: boolean;
  alerts: Alert[];
  total: number;
  criticalCount: number;
  warningCount: number;
}

export interface WidgetData {
  success: boolean;
  widgetType: string;
  data: any;
}

export type TimeRange = '24h' | '7d' | '30d' | '90d';

const dashboardApiService = {
  /**
   * Get main dashboard overview
   * GET /api/v1/analytics/dashboard/overview
   */
  async getDashboardOverview(timeRange: TimeRange = '24h'): Promise<DashboardOverview> {
    try {
      const response = await apiClient.get<DashboardOverview>(`${DASHBOARD_BASE}/overview`, {
        params: { timeRange },
      });
      return response.data;
    } catch (error: any) {
      // Suppress expected errors (network, 401, invalid token)
      if (error?.error !== 'NETWORK_ERROR' && 
          error?.message !== 'Network Error' &&
          error?.status !== 401 &&
          error?.message !== 'Invalid token') {
        console.error('❌ Get dashboard overview error:', {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
        });
      }
      // Return fallback data
      return {
        success: false,
        period: timeRange,
        workflows: { total: 0, active: 0, success_rate: 0 },
        executions: { total: 0, successful: 0, failed: 0, running: 0 },
        users: { total: 0, active: 0, new: 0 },
        integrations: { total: 0, active: 0, connections: 0 },
        system: { health: 'unknown', uptime: 0, error_rate: 0 },
        recentActivity: [],
      };
    }
  },

  /**
   * Get real-time metrics
   * GET /api/v1/analytics/dashboard/real-time
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      const response = await apiClient.get<RealTimeMetrics>(`${DASHBOARD_BASE}/real-time`);
      return response.data;
    } catch (error: any) {
      // Suppress expected errors (network, 401, invalid token)
      if (error?.error !== 'NETWORK_ERROR' && 
          error?.message !== 'Network Error' &&
          error?.status !== 401 &&
          error?.message !== 'Invalid token') {
        console.error('❌ Get real-time metrics error:', {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
        });
      }
      return {
        success: false,
        activeExecutions: 0,
        executionsPerMinute: 0,
        avgExecutionTime: 0,
        currentErrorRate: 0,
        activeUsers: 0,
        requestsPerSecond: 0,
        queuedJobs: 0,
        systemLoad: 0,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Get trend analysis for a metric
   * GET /api/v1/analytics/dashboard/trends
   */
  async getTrends(metric: string, timeRange: TimeRange = '7d'): Promise<TrendAnalysis> {
    try {
      const response = await apiClient.get<TrendAnalysis>(`${DASHBOARD_BASE}/trends`, {
        params: { metric, timeRange },
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Get trends error:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      return {
        success: false,
        metric,
        timeRange,
        dataPoints: [],
        trend: 'stable',
        changePercentage: 0,
        insights: [],
      };
    }
  },

  /**
   * Get active alerts
   * GET /api/v1/analytics/dashboard/alerts
   */
  async getAlerts(params?: {
    severity?: 'critical' | 'warning' | 'info';
    category?: 'system' | 'workflow' | 'user' | 'integration';
    acknowledged?: boolean;
    limit?: number;
  }): Promise<AlertsResponse> {
    try {
      const response = await apiClient.get<AlertsResponse>(`${DASHBOARD_BASE}/alerts`, {
        params: {
          severity: params?.severity,
          category: params?.category,
          acknowledged: params?.acknowledged,
          limit: params?.limit || 50,
        },
      });
      return response.data;
    } catch (error: any) {
      // Suppress expected errors (network, 401, invalid token)
      if (error?.error !== 'NETWORK_ERROR' && 
          error?.message !== 'Network Error' &&
          error?.status !== 401 &&
          error?.message !== 'Invalid token') {
        console.error('❌ Get alerts error:', {
          message: error?.message,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          url: `${DASHBOARD_BASE}/alerts`,
        });
      }
      return {
        success: false,
        alerts: [],
        total: 0,
        criticalCount: 0,
        warningCount: 0,
      };
    }
  },

  /**
   * Get widget data
   * GET /api/v1/analytics/dashboard/widgets
   */
  async getWidgetData(widgetType: string): Promise<WidgetData> {
    try {
      const response = await apiClient.get<WidgetData>(`${DASHBOARD_BASE}/widgets`, {
        params: { widgetType },
      });
      return response.data;
    } catch (error) {
      console.error('❌ Get widget data error:', error);
      return {
        success: false,
        widgetType,
        data: null,
      };
    }
  },

  /**
   * Get execution chart data (widget helper)
   */
  async getExecutionChartData(): Promise<WidgetData> {
    return this.getWidgetData('execution_chart');
  },

  /**
   * Get success rate widget (widget helper)
   */
  async getSuccessRateWidget(): Promise<WidgetData> {
    return this.getWidgetData('success_rate');
  },
};

export default dashboardApiService;
