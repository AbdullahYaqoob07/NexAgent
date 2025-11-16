/**
 * Analytics Admin API Service
 * Integrates with backend /api/v1/analytics endpoints
 */

import apiClient from './client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SystemHealth {
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

export interface ResourceUsage {
  cpuUsage: number;
  memoryUsage: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  diskUsage: number;
  diskUsedGB: number;
  diskTotalGB: number;
  activeThreads: number;
  timestamp: string;
}

export interface APIMetric {
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

export interface ErrorRateMetrics {
  totalErrors: number;
  errorRate: number;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  criticalErrors: number;
  warningErrors: number;
  topErrors: Array<{ type: string; count: number }>;
  timestamp: string;
}

export interface EventTimelinePoint {
  timestamp: string;
  count: number;
}

export interface WorkflowOverview {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  period: string;
}

export interface UserActivityMetrics {
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

export interface UserEngagementMetrics {
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

// ============================================================================
// SYSTEM ANALYTICS
// ============================================================================

/**
 * Get system health overview
 */
export async function getSystemHealth(): Promise<SystemHealth | null> {
  try {
    const response = await apiClient.get('/api/v1/analytics/system/health');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching system health:', error);
    return null;
  }
}

/**
 * Get resource usage metrics
 */
export async function getResourceUsage(): Promise<ResourceUsage | null> {
  try {
    const response = await apiClient.get('/api/v1/analytics/system/resource-usage');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching resource usage:', error);
    return null;
  }
}

/**
 * Get API performance metrics
 */
export async function getAPIMetrics(timeRange: string = '24h'): Promise<{ success: boolean; metrics: APIMetric[]; timestamp: string } | null> {
  try {
    const response = await apiClient.get('/api/v1/analytics/system/api-metrics', {
      params: { timeRange }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching API metrics:', error);
    return null;
  }
}

/**
 * Get error rate metrics
 */
export async function getErrorRateMetrics(timeRange: string = '24h'): Promise<ErrorRateMetrics | null> {
  try {
    const response = await apiClient.get('/api/v1/analytics/system/error-rate', {
      params: { timeRange }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching error rate:', error);
    return null;
  }
}

/**
 * Get system uptime statistics
 */
export async function getSystemUptime(timeRange: string = '30d'): Promise<any> {
  try {
    const response = await apiClient.get('/api/v1/analytics/system/uptime', {
      params: { timeRange }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching uptime:', error);
    return null;
  }
}

// ============================================================================
// WORKFLOW ANALYTICS
// ============================================================================

/**
 * Get workflow overview analytics
 */
export async function getWorkflowOverview(timeRange: string = '30d'): Promise<{ success: boolean; overview: WorkflowOverview } | null> {
  try {
    const response = await apiClient.get('/api/v1/analytics/workflows/overview', {
      params: { timeRange }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching workflow overview:', error);
    return null;
  }
}

/**
 * Get workflow success rates
 */
export async function getWorkflowSuccessRates(timeRange: string = '30d'): Promise<any> {
  try {
    const response = await apiClient.get('/api/v1/analytics/workflows/success-rate', {
      params: { timeRange }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching success rates:', error);
    return null;
  }
}

/**
 * Get top performing workflows
 */
export async function getTopPerformingWorkflows(timeRange: string = '30d', limit: number = 10): Promise<any> {
  try {
    const response = await apiClient.get('/api/v1/analytics/workflows/top-performers', {
      params: { timeRange, limit }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching top performers:', error);
    return null;
  }
}

// ============================================================================
// EVENT ANALYTICS
// ============================================================================

/**
 * Get events timeline
 */
export async function getEventsTimeline(timeRange: string = '24h', interval: string = 'hour'): Promise<{ success: boolean; timeline: EventTimelinePoint[]; period: string } | null> {
  try {
    const response = await apiClient.get('/api/v1/analytics/events/timeline', {
      params: { timeRange, interval }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching events timeline:', error);
    return null;
  }
}

// ============================================================================
// USER ANALYTICS
// ============================================================================

/**
 * Get user activity metrics
 */
export async function getUserActivity(
  timeRange: string = '30d',
  page: number = 1,
  pageSize: number = 100
): Promise<{ success: boolean; metrics: UserActivityMetrics[]; total: number; page: number; pageSize: number } | null> {
  try {
    const response = await apiClient.get('/api/v1/analytics/users/activity', {
      params: { timeRange, page, pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching user activity:', error);
    return null;
  }
}

/**
 * Get user engagement metrics
 */
export async function getUserEngagement(timeRange: string = '30d'): Promise<UserEngagementMetrics | null> {
  try {
    const response = await apiClient.get('/api/v1/analytics/users/engagement', {
      params: { timeRange }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching user engagement:', error);
    return null;
  }
}

/**
 * Get specific user metrics
 */
export async function getUserMetrics(userId: string, timeRange: string = '30d'): Promise<any> {
  try {
    const response = await apiClient.get(`/api/v1/analytics/users/${userId}/metrics`, {
      params: { timeRange }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching user metrics:', error);
    return null;
  }
}

// Export as service object
const analyticsAdminService = {
  // System
  getSystemHealth,
  getResourceUsage,
  getAPIMetrics,
  getErrorRateMetrics,
  getSystemUptime,
  
  // Workflows
  getWorkflowOverview,
  getWorkflowSuccessRates,
  getTopPerformingWorkflows,
  
  // Events
  getEventsTimeline,
  
  // Users
  getUserActivity,
  getUserEngagement,
  getUserMetrics
};

export default analyticsAdminService;
