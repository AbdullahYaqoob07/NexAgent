/**
 * API Client for Backend Communication
 * Base HTTP client for all backend API requests
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('backend_auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
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
      const data = error.response.data;

      // Handle 401 - Unauthorized
      if (status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('backend_auth_token');
        if (window.location.pathname !== '/sign-in') {
          window.location.href = '/sign-in';
        }
      }

      return Promise.reject({
        status,
        message: data?.message || data?.detail || 'An error occurred',
        error: data?.error || 'API_ERROR',
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
