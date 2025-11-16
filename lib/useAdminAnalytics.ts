'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from './api/client';

export interface BillingAnalytics {
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

export interface SystemHealth {
  status: string;
  uptimePercentage: number;
  errorRate: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  activeConnections: number;
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
}

export interface AdminAnalytics {
  billing: BillingAnalytics | null;
  systemHealth: SystemHealth | null;
  resourceUsage: ResourceUsage | null;
}

async function fetchBillingAnalytics(): Promise<BillingAnalytics | null> {
  try {
    const res = await apiClient.get('/api/billing/admin/analytics');
    const data = res.data;
    if (!data) return null;

    return {
      mrr: Number(data.mrr ?? 0),
      arr: Number(data.arr ?? 0),
      churnRate: Number(data.churn_rate ?? 0),
      totalUsers: Number(data.total_users ?? 0),
      payingUsers: Number(data.paying_users ?? 0),
      trialUsers: Number(data.trial_users ?? 0),
      canceledUsers: Number(data.canceled_users ?? 0),
      usersByPlan: data.users_by_plan || {},
      revenueByPlan: data.revenue_by_plan || {},
      newSubscriptionsThisMonth: Number(data.new_subscriptions_this_month ?? 0),
      failedPaymentsThisMonth: Number(data.failed_payments_this_month ?? 0),
    };
  } catch (error) {
    console.error('Error fetching billing analytics:', error);
    return null;
  }
}

async function fetchSystemHealth(): Promise<SystemHealth | null> {
  try {
    const res = await apiClient.get('/api/v1/analytics/system/health');
    const d = res.data;
    if (!d) return null;

    return {
      status: d.status,
      uptimePercentage: Number(d.uptimePercentage ?? 0),
      errorRate: Number(d.errorRate ?? 0),
      totalRequests: Number(d.totalRequests ?? 0),
      successfulRequests: Number(d.successfulRequests ?? 0),
      failedRequests: Number(d.failedRequests ?? 0),
      avgResponseTime: Number(d.avgResponseTime ?? 0),
      activeConnections: Number(d.activeConnections ?? 0),
    };
  } catch (error) {
    // System health is optional; treat failures as "no data" without noisy errors
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Error fetching system health:', error);
    }
    return null;
  }
}

async function fetchResourceUsage(): Promise<ResourceUsage | null> {
  try {
    const res = await apiClient.get('/api/v1/analytics/system/resource-usage');
    const m = res.data;
    if (!m) return null;

    return {
      cpuUsage: Number(m.cpuUsage ?? 0),
      memoryUsage: Number(m.memoryUsage ?? 0),
      memoryUsedMB: Number(m.memoryUsedMB ?? 0),
      memoryTotalMB: Number(m.memoryTotalMB ?? 0),
      diskUsage: Number(m.diskUsage ?? 0),
      diskUsedGB: Number(m.diskUsedGB ?? 0),
      diskTotalGB: Number(m.diskTotalGB ?? 0),
      activeThreads: Number(m.activeThreads ?? 0),
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Error fetching resource usage:', error);
    }
    return null;
  }
}

export function useAdminAnalytics() {
  // Fetch billing analytics with React Query (caching + background refetch)
  const {
    data: billing,
    isLoading: billingLoading,
    error: billingError,
  } = useQuery<BillingAnalytics | null>({
    queryKey: ['adminBillingAnalytics'],
    queryFn: fetchBillingAnalytics,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes in the background
  });

  // Fetch system health with React Query
  const {
    data: systemHealth,
    isLoading: systemHealthLoading,
    error: systemHealthError,
  } = useQuery<SystemHealth | null>({
    queryKey: ['adminSystemHealth'],
    queryFn: fetchSystemHealth,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });

  // Fetch resource usage with React Query
  const {
    data: resourceUsage,
    isLoading: resourceUsageLoading,
    error: resourceUsageError,
  } = useQuery<ResourceUsage | null>({
    queryKey: ['adminResourceUsage'],
    queryFn: fetchResourceUsage,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });

  // Derive computed values for top cards
  const revenue = billing
    ? `$${(billing.mrr || billing.arr).toLocaleString()}`
    : 'Loading...';

  const activeUsers =
    billing && billing.payingUsers !== undefined && billing.totalUsers !== undefined
      ? `${billing.payingUsers}/${billing.totalUsers} paying`
      : 'Loading...';

  const churn = billing ? `${(billing.churnRate * 100).toFixed(1)}%` : 'Loading...';

  const resources = resourceUsage
    ? `${Math.round(resourceUsage.cpuUsage)}% CPU • ${Math.round(
        resourceUsage.memoryUsage
      )}% MEM`
    : 'Loading...';

  return {
    // Raw data
    billing,
    systemHealth,
    resourceUsage,

    // Loading states
    loading: billingLoading || systemHealthLoading || resourceUsageLoading,
    billingLoading,
    systemHealthLoading,
    resourceUsageLoading,

    // Errors
    error: billingError || systemHealthError || resourceUsageError,

    // Computed display values for cards
    revenue,
    activeUsers,
    churn,
    resources,
  };
}
