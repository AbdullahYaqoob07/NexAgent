/**
 * API Client for Backend Communication
 * Base HTTP client for all backend API requests
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { auth } from '@/lib/firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL!;

if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_BACKEND_API_URL is not set. Please configure it in your frontend env (.env.local).');
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Fallback tokens from env for local admin/dev
const ENV_BEARER = (
  process.env.NEXT_PUBLIC_BACKEND_API_TOEKEN || 
  process.env.NEXT_PUBLIC_BACKEND_API_TOKEN || 
  process.env.NEXT_PUBLIC_BACKEND_TOKEN || 
  ''
).trim();
const ENV_SESSION = (process.env.NEXT_PUBLIC_BACKEND_SESSION_TOKEN || '').trim();

// Request interceptor - Add auth/session tokens
apiClient.interceptors.request.use(
  async (config) => {
    let bearer: string | null = null;
    let session: string | null = null;

    if (typeof window !== 'undefined') {
      bearer = localStorage.getItem('backend_auth_token');
      session = localStorage.getItem('backend_session_token');
    }

    const isAnalytics = (config.url || '').includes('/api/v1/analytics');
    
    // Debug logging for token authentication flow

    // Always prefer Firebase ID token for authenticated users
    if (typeof window !== 'undefined' && auth?.currentUser) {
      try {
        // Force refresh token to ensure it's valid
        const idToken = await auth.currentUser.getIdToken(true);
        if (idToken) {
          (config.headers as any).Authorization = `Bearer ${idToken}`;
          // Store token for fallback
          try {
            localStorage.setItem('backend_auth_token', idToken);
          } catch {}
        } else {
          // If token fetch failed, try to use stored token as fallback
          const storedToken = localStorage.getItem('backend_auth_token');
          if (storedToken) {
            (config.headers as any).Authorization = `Bearer ${storedToken}`;
          }
        }
      } catch (error) {
        // If token refresh fails, try stored token
        try {
          const storedToken = localStorage.getItem('backend_auth_token');
          if (storedToken) {
            (config.headers as any).Authorization = `Bearer ${storedToken}`;
          }
        } catch {}
        
        if (process.env.NEXT_PUBLIC_DEBUG_TOKENS === 'true') {
          console.log('[API Client Debug] Failed to get Firebase token:', error);
        }
      }
    }

    // Fallback: use env/local stored tokens only if no Firebase token was set
    const token = (config.headers as any).Authorization
      ? null
      : bearer || ENV_BEARER || null;
    const sessionToken = session || ENV_SESSION || null;

    if (token) {
      const raw = token.toString();
      const value = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`;
      (config.headers as any).Authorization = value;
      if (process.env.NEXT_PUBLIC_DEBUG_TOKENS === 'true') {
        console.log('[API Client Debug] Using fallback token source:', bearer ? 'localStorage' : 'env');
      }
    }
    if (sessionToken) {
      (config.headers as any)['X-Session-Token'] = sessionToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    if (error.response) {
      const status = error.response.status;
      const data: any = error.response.data as any;

      // Handle 401 - Unauthorized
      // Only redirect if:
      // 1. We have a valid response (not network error)
      // 2. We're not already on sign-in page
      // 3. We're not on admin pages
      // 4. The error is an actual auth failure (not connection refused)
      // 5. We're not on dashboard (dashboard handles its own errors gracefully)
      if (status === 401 && typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const onAdmin = currentPath.startsWith('/admin321');
        const onSignIn = currentPath === '/sign-in' || currentPath.startsWith('/sign-in');
        const onDashboard = currentPath === '/dashboard' || currentPath.startsWith('/dashboard');
        const isPublicEndpoint = error.config?.url?.includes('/check-account-status') || 
                                 error.config?.url?.includes('/forgot-password') ||
                                 error.config?.url?.includes('/sign-up');
        const isAnalyticsEndpoint = error.config?.url?.includes('/analytics/');
        
        // Don't redirect for:
        // - Already on sign-in page (prevent loops)
        // - Admin pages
        // - Dashboard pages (they handle errors gracefully)
        // - Public endpoints that don't require auth
        // - Analytics endpoints (dashboard handles these errors)
        if (!onAdmin && !onSignIn && !onDashboard && !isPublicEndpoint && !isAnalyticsEndpoint) {
          try { localStorage.removeItem('backend_auth_token'); } catch {}
          // Use replace to avoid adding to history
          window.location.replace('/sign-in');
        }
      }

      return Promise.reject({
        status,
        message: data?.message || data?.detail || 'An error occurred',
        error: (data as any)?.error || 'API_ERROR',
      });
    }

    // Network errors (connection refused, timeout, etc.) - don't redirect
    // These are not authentication failures
    return Promise.reject({
      message: error.message || 'Network error. Please check your connection.',
      error: 'NETWORK_ERROR',
      originalError: error
    });
  }
);

// Token management helpers
export const setAuthToken = (token: string | null) => {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('backend_auth_token', token);
    } else {
      localStorage.removeItem('backend_auth_token');
    }
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('backend_auth_token');
  }
  return null;
};

export default apiClient;
