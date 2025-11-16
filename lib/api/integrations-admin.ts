/**
 * Integrations Admin API Service
 * Integrates with backend /api/v1/integrations endpoints
 */

import apiClient from './client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  version: string;
  status: 'active' | 'inactive' | 'deprecated';
  popularity: number;
  rating: number;
  totalConnections: number;
  authType: 'oauth2' | 'api_key' | 'basic' | 'custom';
  capabilities: string[];
  webhookSupport: boolean;
  documentationUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  integrationCount: number;
}

export interface IntegrationConnection {
  id: string;
  userId: string;
  userName?: string;
  integrationId: string;
  integrationName: string;
  status: 'active' | 'inactive' | 'error' | 'pending';
  credentials?: Record<string, any>;
  config?: Record<string, any>;
  lastSync?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationStats {
  totalIntegrations: number;
  activeIntegrations: number;
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  popularIntegrations: Array<{
    id: string;
    name: string;
    connections: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
  }>;
}

export interface CreateConnectionRequest {
  integrationId: string;
  credentials: Record<string, any>;
  config?: Record<string, any>;
}

export interface UpdateConnectionRequest {
  status?: 'active' | 'inactive';
  credentials?: Record<string, any>;
  config?: Record<string, any>;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latency?: number;
  details?: Record<string, any>;
}

// ============================================================================
// INTEGRATION CATALOG
// ============================================================================

/**
 * Get all integrations
 */
export async function getIntegrations(
  category?: string,
  status?: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{ success: boolean; integrations: Integration[]; total: number; page: number; pageSize: number } | null> {
  try {
    const response = await apiClient.get('/api/v1/integrations/', {
      params: { category, status, page, pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching integrations:', error);
    return null;
  }
}

/**
 * Get a specific integration by ID
 */
export async function getIntegration(integrationId: string): Promise<{ success: boolean; integration: Integration } | null> {
  try {
    const response = await apiClient.get(`/api/v1/integrations/${integrationId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching integration:', error);
    return null;
  }
}

/**
 * Search integrations by query
 */
export async function searchIntegrations(
  query: string,
  category?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ success: boolean; integrations: Integration[]; total: number; page: number; pageSize: number } | null> {
  try {
    const response = await apiClient.get('/api/v1/integrations/search/query', {
      params: { query, category, page, pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error searching integrations:', error);
    return null;
  }
}

/**
 * Get popular integrations
 */
export async function getPopularIntegrations(
  limit: number = 10
): Promise<{ success: boolean; integrations: Integration[] } | null> {
  try {
    const response = await apiClient.get('/api/v1/integrations/popular/list', {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching popular integrations:', error);
    return null;
  }
}

/**
 * Get all integration categories
 */
export async function getCategories(): Promise<{ success: boolean; categories: IntegrationCategory[] } | null> {
  try {
    const response = await apiClient.get('/api/v1/integrations/categories/all');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    return null;
  }
}

// ============================================================================
// INTEGRATION CONNECTIONS
// ============================================================================

/**
 * Get all connections (admin view)
 */
export async function getConnections(
  userId?: string,
  integrationId?: string,
  status?: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{ success: boolean; connections: IntegrationConnection[]; total: number; page: number; pageSize: number } | null> {
  try {
    const response = await apiClient.get('/api/v1/integrations/connections', {
      params: { userId, integrationId, status, page, pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching connections:', error);
    return null;
  }
}

/**
 * Get a specific connection by ID
 */
export async function getConnection(connectionId: string): Promise<{ success: boolean; connection: IntegrationConnection } | null> {
  try {
    const response = await apiClient.get(`/api/v1/integrations/connections/${connectionId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching connection:', error);
    return null;
  }
}

/**
 * Create a new connection
 */
export async function createConnection(
  data: CreateConnectionRequest
): Promise<{ success: boolean; connection: IntegrationConnection; message: string } | null> {
  try {
    const response = await apiClient.post('/api/v1/integrations/connections', data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating connection:', error);
    return null;
  }
}

/**
 * Update a connection
 */
export async function updateConnection(
  connectionId: string,
  data: UpdateConnectionRequest
): Promise<{ success: boolean; connection: IntegrationConnection; message: string } | null> {
  try {
    const response = await apiClient.put(`/api/v1/integrations/connections/${connectionId}`, data);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating connection:', error);
    return null;
  }
}

/**
 * Delete a connection
 */
export async function deleteConnection(
  connectionId: string
): Promise<{ success: boolean; message: string } | null> {
  try {
    const response = await apiClient.delete(`/api/v1/integrations/connections/${connectionId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting connection:', error);
    return null;
  }
}

/**
 * Test a connection
 */
export async function testConnection(
  connectionId: string
): Promise<{ success: boolean; result: TestConnectionResult; message: string } | null> {
  try {
    const response = await apiClient.post(`/api/v1/integrations/connections/${connectionId}/test`);
    return response.data;
  } catch (error) {
    console.error('❌ Error testing connection:', error);
    return null;
  }
}

/**
 * Get connection statistics
 */
export async function getConnectionStats(
  timeRange: string = '30d'
): Promise<{ success: boolean; stats: IntegrationStats; timestamp: string } | null> {
  try {
    const response = await apiClient.get('/api/v1/integrations/connections/stats/summary', {
      params: { timeRange }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching connection stats:', error);
    return null;
  }
}

// Export as service object
const integrationsAdminService = {
  // Catalog
  getIntegrations,
  getIntegration,
  searchIntegrations,
  getPopularIntegrations,
  getCategories,
  
  // Connections
  getConnections,
  getConnection,
  createConnection,
  updateConnection,
  deleteConnection,
  testConnection,
  getConnectionStats
};

export default integrationsAdminService;
