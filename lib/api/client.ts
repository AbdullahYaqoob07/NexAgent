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
    if (process.env.NEXT_PUBLIC_DEBUG_TOKENS === 'true') {
      console.log('[API Client Debug] Request:', {
        url: config.url,
        hasFirebaseUser: !!auth?.currentUser,
        hasLocalToken: !!bearer,
        hasEnvToken: !!ENV_BEARER,
        willUseFirebaseToken: !!(auth?.currentUser)
      });
    }

    // Always prefer Firebase ID token for authenticated users
    if (typeof window !== 'undefined' && auth?.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken(true); // Force refresh
        if (idToken) {
          (config.headers as any).Authorization = `Bearer ${idToken}`;
          if (process.env.NEXT_PUBLIC_DEBUG_TOKENS === 'true') {
            console.log('[API Client Debug] Using fresh Firebase ID token from current user');
          }
        }
      } catch (error) {
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
      if (status === 401 && typeof window !== 'undefined') {
        const onAdmin = window.location.pathname.startsWith('/admin321');
        // Keep admin pages from redirect loops while experimenting
        if (!onAdmin) {
          try { localStorage.removeItem('backend_auth_token'); } catch {}
          if (window.location.pathname !== '/sign-in') {
            window.location.href = '/sign-in';
          }
        }
      }

      return Promise.reject({
        status,
        message: data?.message || data?.detail || 'An error occurred',
        error: (data as any)?.error || 'API_ERROR',
      });
    }

    return Promise.reject({
      message: 'Network error. Please check your connection.',
      error: 'NETWORK_ERROR',
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
