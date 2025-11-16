/**
 * Marketplace Admin API Service
 * Integrates with backend /api/marketplace/admin endpoints
 */

import apiClient from './client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PendingNexa {
  id: string;
  title: string;
  description: string;
  seller: string;
  seller_id: string;
  category: string;
  price: number;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface PendingSeller {
  id: string;
  user_id: string;
  business_name: string;
  email: string;
  country: string;
  business_description?: string;
  verification_status: string;
  applied_at: string;
  documents?: any[];
}

export interface MarketplaceAnalytics {
  total_nexas: number;
  total_sellers: number;
  total_purchases: number;
  total_revenue: number;
  pending_nexas: number;
  pending_sellers: number;
  active_nexas: number;
  verified_sellers: number;
  conversion_rate: number;
  avg_purchase_value: number;
  revenue_chart?: Array<{ date: string; revenue: number }>;
  sales_chart?: Array<{ date: string; sales: number }>;
  top_categories?: Array<{ name: string; count: number; revenue: number }>;
  top_sellers?: Array<any>;
  recent_activity?: Array<any>;
}

export interface Dispute {
  id: string;
  purchase_id: string;
  buyer: string;
  seller: string;
  nexa: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
}

export interface BulkOperationResponse {
  success_count: number;
  failed_count: number;
  errors?: string[];
}

// ============================================================================
// NEXA MODERATION
// ============================================================================

/**
 * Get all pending Nexas awaiting review
 */
export async function getPendingNexas(page: number = 1, pageSize: number = 20): Promise<PendingNexa[]> {
  try {
    const response = await apiClient.get('/api/marketplace/admin/nexas/pending', {
      params: { page, page_size: pageSize }
    });
    return response.data || [];
  } catch (error) {
    console.error('❌ Error fetching pending nexas:', error);
    return [];
  }
}

/**
 * Approve a Nexa for marketplace listing
 */
export async function approveNexa(
  nexaId: string,
  reviewNote?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await apiClient.post(`/api/marketplace/admin/nexas/${nexaId}/approve`, null, {
      params: { review_note: reviewNote }
    });
    return { success: true, message: response.data.message };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to approve Nexa' };
  }
}

/**
 * Reject a Nexa with reason
 */
export async function rejectNexa(
  nexaId: string,
  rejectionReason: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await apiClient.post(`/api/marketplace/admin/nexas/${nexaId}/reject`, null, {
      params: { rejection_reason: rejectionReason }
    });
    return { success: true, message: response.data.message };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reject Nexa' };
  }
}

/**
 * Suspend a Nexa due to policy violation
 */
export async function suspendNexa(
  nexaId: string,
  suspensionReason: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await apiClient.post(`/api/marketplace/admin/nexas/${nexaId}/suspend`, null, {
      params: { suspension_reason: suspensionReason }
    });
    return { success: true, message: response.data.message };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to suspend Nexa' };
  }
}

/**
 * Perform bulk actions on multiple Nexas
 */
export async function bulkNexaAction(
  nexaIds: string[],
  action: 'approve' | 'reject' | 'suspend',
  reason?: string
): Promise<BulkOperationResponse> {
  try {
    const response = await apiClient.post('/api/marketplace/admin/nexas/bulk-action', {
      nexa_ids: nexaIds,
      action,
      reason
    });
    return response.data;
  } catch (error: any) {
    return {
      success_count: 0,
      failed_count: nexaIds.length,
      errors: [error.message || 'Bulk operation failed']
    };
  }
}

// ============================================================================
// SELLER VERIFICATION
// ============================================================================

/**
 * Get all pending sellers awaiting verification
 */
export async function getPendingSellers(page: number = 1, pageSize: number = 20): Promise<PendingSeller[]> {
  try {
    const response = await apiClient.get('/api/marketplace/admin/sellers/pending', {
      params: { page, page_size: pageSize }
    });
    return response.data || [];
  } catch (error) {
    console.error('❌ Error fetching pending sellers:', error);
    return [];
  }
}

/**
 * Verify/approve a seller
 */
export async function verifySeller(
  sellerId: string,
  verificationNote?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await apiClient.post(`/api/marketplace/admin/sellers/${sellerId}/verify`, null, {
      params: { verification_note: verificationNote }
    });
    return { success: true, message: response.data.message };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to verify seller' };
  }
}

/**
 * Reject seller verification
 */
export async function rejectSeller(
  sellerId: string,
  rejectionReason: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await apiClient.post(`/api/marketplace/admin/sellers/${sellerId}/reject`, null, {
      params: { rejection_reason: rejectionReason }
    });
    return { success: true, message: response.data.message };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reject seller' };
  }
}

/**
 * Suspend a seller account
 */
export async function suspendSeller(
  sellerId: string,
  suspensionReason: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await apiClient.post(`/api/marketplace/admin/sellers/${sellerId}/suspend`, null, {
      params: { suspension_reason: suspensionReason }
    });
    return { success: true, message: response.data.message };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to suspend seller' };
  }
}

// ============================================================================
// MARKETPLACE ANALYTICS
// ============================================================================

/**
 * Get comprehensive marketplace analytics
 */
export async function getMarketplaceAnalytics(
  period: '7d' | '30d' | '90d' | '1y' = '30d'
): Promise<MarketplaceAnalytics | null> {
  try {
    const response = await apiClient.get('/api/marketplace/admin/analytics/overview', {
      params: { period }
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching marketplace analytics:', error);
    return null;
  }
}

/**
 * Get sales analytics with detailed breakdown
 */
export async function getSalesAnalytics(
  period: string = '30d',
  breakdown: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<any> {
  try {
    const response = await apiClient.get('/api/marketplace/admin/analytics/sales', {
      params: { period, breakdown }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching sales analytics:', error);
    return null;
  }
}

/**
 * Get user analytics
 */
export async function getUserAnalytics(period: string = '30d'): Promise<any> {
  try {
    const response = await apiClient.get('/api/marketplace/admin/analytics/users', {
      params: { period }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching user analytics:', error);
    return null;
  }
}

// ============================================================================
// DISPUTE MANAGEMENT
// ============================================================================

/**
 * Get active disputes
 */
export async function getActiveDisputes(
  status?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<Dispute[]> {
  try {
    const response = await apiClient.get('/api/marketplace/admin/disputes', {
      params: { status, page, page_size: pageSize }
    });
    return response.data || [];
  } catch (error) {
    console.error('❌ Error fetching disputes:', error);
    return [];
  }
}

/**
 * Resolve a dispute
 */
export async function resolveDispute(
  disputeId: string,
  resolution: 'approve_refund' | 'deny_refund' | 'partial_refund',
  resolutionNote?: string,
  refundAmount?: number
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await apiClient.post(
      `/api/marketplace/admin/disputes/${disputeId}/resolve`,
      null,
      {
        params: {
          resolution,
          resolution_note: resolutionNote,
          refund_amount: refundAmount
        }
      }
    );
    return { success: true, message: response.data.message };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to resolve dispute' };
  }
}

// ============================================================================
// SYSTEM CONFIGURATION
// ============================================================================

/**
 * Get fee configuration
 */
export async function getFeeConfig(): Promise<any> {
  try {
    const response = await apiClient.get('/api/marketplace/admin/config/fees');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching fee config:', error);
    return null;
  }
}

/**
 * Update fee configuration
 */
export async function updateFeeConfig(feeData: any): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await apiClient.put('/api/marketplace/admin/config/fees', feeData);
    return { success: true, message: response.data.message };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update fee config' };
  }
}

/**
 * Get marketplace categories
 */
export async function getMarketplaceCategories(): Promise<any[]> {
  try {
    const response = await apiClient.get('/api/marketplace/admin/config/categories');
    return response.data || [];
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    return [];
  }
}

/**
 * Create a new category
 */
export async function createCategory(categoryData: any): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await apiClient.post('/api/marketplace/admin/config/categories', categoryData);
    return { success: true, message: response.data.message };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create category' };
  }
}

// Export all as service object
const marketplaceAdminService = {
  // Nexa operations
  getPendingNexas,
  approveNexa,
  rejectNexa,
  suspendNexa,
  bulkNexaAction,
  
  // Seller operations
  getPendingSellers,
  verifySeller,
  rejectSeller,
  suspendSeller,
  
  // Analytics
  getMarketplaceAnalytics,
  getSalesAnalytics,
  getUserAnalytics,
  
  // Disputes
  getActiveDisputes,
  resolveDispute,
  
  // Configuration
  getFeeConfig,
  updateFeeConfig,
  getMarketplaceCategories,
  createCategory
};

export default marketplaceAdminService;
