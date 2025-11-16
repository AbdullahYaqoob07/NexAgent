/**
 * Audit Admin API Service
 * Integrates with backend /api/v1/audit endpoints
 */

import apiClient from './client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  success: boolean;
}

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  severity?: string;
  success?: boolean;
  page?: number;
  pageSize?: number;
}

export interface AuditLogSummary {
  totalLogs: number;
  todayLogs: number;
  weekLogs: number;
  monthLogs: number;
  criticalEvents: number;
  failedActions: number;
  topActions: Array<{ action: string; count: number }>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
  activityByHour: Array<{ hour: number; count: number }>;
}

export interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  userName?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  metadata?: Record<string, any>;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  timestamp: string;
}

export interface SecurityEventFilter {
  type?: string;
  severity?: string;
  userId?: string;
  resolved?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateAuditLogRequest {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  success?: boolean;
}

export interface CreateSecurityEventRequest {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

/**
 * Get audit logs with optional filtering
 */
export async function getAuditLogs(
  filters?: AuditLogFilter
): Promise<{ success: boolean; logs: AuditLog[]; total: number; page: number; pageSize: number } | null> {
  try {
    const response = await apiClient.get('/api/v1/audit/logs', {
      params: filters
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching audit logs:', error);
    return null;
  }
}

/**
 * Get a specific audit log by ID
 */
export async function getAuditLog(logId: string): Promise<{ success: boolean; log: AuditLog } | null> {
  try {
    const response = await apiClient.get(`/api/v1/audit/logs/${logId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching audit log:', error);
    return null;
  }
}

/**
 * Create a new audit log entry
 */
export async function createAuditLog(data: CreateAuditLogRequest): Promise<{ success: boolean; log: AuditLog; message: string } | null> {
  try {
    const response = await apiClient.post('/api/v1/audit/logs', data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating audit log:', error);
    return null;
  }
}

/**
 * Get audit log statistics summary
 */
export async function getAuditLogSummary(
  timeRange: string = '30d'
): Promise<{ success: boolean; summary: AuditLogSummary; timestamp: string } | null> {
  try {
    const response = await apiClient.get('/api/v1/audit/logs/statistics/summary', {
      params: { timeRange }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching audit summary:', error);
    return null;
  }
}

// ============================================================================
// SECURITY EVENTS
// ============================================================================

/**
 * Get security events with optional filtering
 */
export async function getSecurityEvents(
  filters?: SecurityEventFilter
): Promise<{ success: boolean; events: SecurityEvent[]; total: number; page: number; pageSize: number } | null> {
  try {
    const response = await apiClient.get('/api/v1/audit/security/events', {
      params: filters
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching security events:', error);
    return null;
  }
}

/**
 * Create a new security event
 */
export async function createSecurityEvent(
  data: CreateSecurityEventRequest
): Promise<{ success: boolean; event: SecurityEvent; message: string } | null> {
  try {
    const response = await apiClient.post('/api/v1/audit/security/events', data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating security event:', error);
    return null;
  }
}

/**
 * Resolve a security event
 */
export async function resolveSecurityEvent(
  eventId: string,
  notes?: string
): Promise<{ success: boolean; event: SecurityEvent; message: string } | null> {
  try {
    const response = await apiClient.post(`/api/v1/audit/security/events/${eventId}/resolve`, {
      notes
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error resolving security event:', error);
    return null;
  }
}

// Export as service object
const auditAdminService = {
  // Audit Logs
  getAuditLogs,
  getAuditLog,
  createAuditLog,
  getAuditLogSummary,
  
  // Security Events
  getSecurityEvents,
  createSecurityEvent,
  resolveSecurityEvent
};

export default auditAdminService;
