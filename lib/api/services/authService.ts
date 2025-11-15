/**
 * Authentication Service
 * Handles all auth-related API calls to FastAPI backend
 */

import apiClient, { setAuthToken } from '../client';
import {
  SignUpRequest,
  SignInRequest,
  ForgotPasswordRequest,
  TokenVerifyRequest,
  AuthResponse,
  SuccessResponse,
  UserResponse,
  ApiError,
} from '../types/auth';

const AUTH_BASE = '/api/v1/auth';

export const authService = {
  /**
   * Sign up a new user
   * POST /api/v1/auth/signup
   */
  async signUp(data: SignUpRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(`${AUTH_BASE}/signup`, data);
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Sign in existing user
   * POST /api/v1/auth/signin
   */
  async signIn(data: SignInRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(`${AUTH_BASE}/signin`, data);
      
      // Store token if provided
      if (response.data.access_token) {
        setAuthToken(response.data.access_token);
      }
      
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Request password reset
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<SuccessResponse> {
    try {
      const response = await apiClient.post<SuccessResponse>(`${AUTH_BASE}/forgot-password`, data);
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Verify Firebase ID token
   * POST /api/v1/auth/verify-token
   *
   * Backend expects a payload of the shape: { token: string }
   * but some callers may still send { idToken }. Normalize here.
   */
  async verifyToken(data: TokenVerifyRequest): Promise<AuthResponse> {
    try {
      const payload: Record<string, string> = (data as any).token
        ? { token: (data as any).token }
        : { token: (data as any).idToken };

      const response = await apiClient.post<AuthResponse>(`${AUTH_BASE}/verify-token`, payload);
      
      // Store session token if provided
      if (response.data.access_token) {
        setAuthToken(response.data.access_token);
      }
      
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Get current authenticated user
   * GET /api/v1/auth/me
   */
  async getCurrentUser(): Promise<UserResponse> {
    try {
      const response = await apiClient.get<UserResponse>(`${AUTH_BASE}/me`);
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  /**
   * Logout current user
   * POST /api/v1/auth/logout
   */
  async logout(): Promise<SuccessResponse> {
    try {
      const response = await apiClient.post<SuccessResponse>(`${AUTH_BASE}/logout`);
      
      // Clear stored token
      setAuthToken(null);
      
      return response.data;
    } catch (error) {
      // Clear token even if API call fails
      setAuthToken(null);
      throw error as ApiError;
    }
  },
};

export default authService;
