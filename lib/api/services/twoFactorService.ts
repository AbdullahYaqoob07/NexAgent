/**
 * Two-Factor Authentication Service
 */

import apiClient from '../client';

export interface TwoFactorStatus {
  twoFactorEnabled: boolean;
  method?: string;
}

export interface SendOTPResponse {
  success: boolean;
  message: string;
  expiresAt?: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
}

export interface AccountStatus {
  success: boolean;
  accountLocked: boolean;
  failedAttempts: number;
  lockedUntil?: string;
  twoFactorEnabled: boolean;
}

export const twoFactorService = {
  /**
   * Get 2FA status for current user
   */
  async getStatus(): Promise<TwoFactorStatus> {
    try {
      const response = await apiClient.get<TwoFactorStatus>('/api/v1/two-factor/status');
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        throw new Error('Please sign in to view 2FA status');
      }
      throw error;
    }
  },

  /**
   * Enable 2FA for current user
   */
  async enable(method: string = 'email'): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post('/api/v1/two-factor/enable', { method });
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        throw new Error('Please sign in to enable 2FA');
      }
      throw error;
    }
  },

  /**
   * Disable 2FA for current user
   */
  async disable(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post('/api/v1/two-factor/disable');
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        throw new Error('Please sign in to disable 2FA');
      }
      throw error;
    }
  },

  /**
   * Send OTP for 2FA verification
   */
  async sendOTP(): Promise<SendOTPResponse> {
    try {
      const response = await apiClient.post<SendOTPResponse>('/api/v1/two-factor/send-otp');
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        throw new Error('Please sign in to send OTP');
      }
      throw error;
    }
  },

  /**
   * Verify OTP code
   */
  async verifyOTP(otp: string): Promise<VerifyOTPResponse> {
    try {
      const response = await apiClient.post<VerifyOTPResponse>('/api/v1/two-factor/verify-otp', { otp });
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        throw new Error('Please sign in to verify OTP');
      }
      throw error;
    }
  },

  /**
   * Check account status (locked, failed attempts, 2FA status)
   * Called before login attempt
   */
  async checkAccountStatus(email: string): Promise<AccountStatus> {
    try {
      const response = await apiClient.get<AccountStatus>('/api/v1/two-factor/check-account-status', {
        params: { email }
      });
      console.log('Account status response:', response.data);
      return response.data;
    } catch (error: any) {
      // Log the error for debugging
      console.error('checkAccountStatus error:', error);
      // If it's a network error, throw it so caller can handle gracefully
      if (error?.error === 'NETWORK_ERROR' || error?.message === 'Network Error') {
        throw error;
      }
      // For other errors (401, etc.), return default status but log it
      // This endpoint doesn't require auth, so 401 shouldn't happen, but handle it anyway
      return {
        success: true,
        accountLocked: false,
        failedAttempts: 0,
        twoFactorEnabled: false // Will be checked again after login
      };
    }
  }
};

