/**
 * Notifications Admin API Service
 * Integrates with backend /api/v1/notifications endpoints
 */

import apiClient from './client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  status: string;
  channels: string[];
  created_at: string;
  read_at?: string;
  delivery_attempts?: number;
}

export interface NotificationStats {
  total_notifications: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_type: Record<string, number>;
  delivery_rate: number;
}

// ============================================================================
// NOTIFICATION OPERATIONS
// ============================================================================

/**
 * Get notifications with filtering and pagination
 */
export async function getNotifications(params: {
  status?: string;
  notification_type?: string;
  priority?: string;
  page?: number;
  page_size?: number;
  include_read?: boolean;
}): Promise<{ notifications: Notification[]; total: number; page: number; page_size: number }> {
  try {
    const response = await apiClient.get('/api/v1/notifications', { params });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return { notifications: [], total: 0, page: 1, page_size: 50 };
  }
}

/**
 * Get notification statistics
 */
export async function getNotificationStats(): Promise<NotificationStats | null> {
  try {
    const response = await apiClient.get('/api/v1/notifications/stats');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching notification stats:', error);
    return null;
  }
}

/**
 * Create a notification
 */
export async function createNotification(data: {
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  channels: string[];
  metadata?: any;
}): Promise<{ success: boolean; notification_id?: string; error?: string }> {
  try {
    const response = await apiClient.post('/api/v1/notifications', data);
    return { success: true, notification_id: response.data.data?.notification_id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create notification' };
  }
}

/**
 * Create bulk notifications
 */
export async function createBulkNotifications(data: {
  user_ids: string[];
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  channels: string[];
  metadata?: any;
}): Promise<{ success_count: number; failed_count: number; errors?: string[] }> {
  try {
    const response = await apiClient.post('/api/v1/notifications/bulk', data);
    return response.data;
  } catch (error: any) {
    return {
      success_count: 0,
      failed_count: data.user_ids.length,
      errors: [error.message || 'Failed to create bulk notifications']
    };
  }
}

/**
 * Mark notifications as read (bulk)
 */
export async function markNotificationsAsRead(notificationIds: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.post('/api/v1/notifications/mark-read', {
      notification_ids: notificationIds,
      status: 'read'
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to mark notifications as read' };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.delete(`/api/v1/notifications/${notificationId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete notification' };
  }
}

/**
 * Resend/deliver a notification
 */
export async function resendNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.post(`/api/v1/notifications/${notificationId}/deliver`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to resend notification' };
  }
}

// Export as service object
const notificationsAdminService = {
  getNotifications,
  getNotificationStats,
  createNotification,
  createBulkNotifications,
  markNotificationsAsRead,
  deleteNotification,
  resendNotification
};

export default notificationsAdminService;
