'use client';

/**
 * Backend Authentication Context
 * Manages authentication state with FastAPI backend
 * Integrates with Firebase Auth for token verification
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@/lib/api/services/authService';
import { getAuthToken, setAuthToken } from '@/lib/api/client';
import { UserResponse, ApiError } from '@/lib/api/types/auth';
import { useAuth } from '@/lib/AuthContext';

interface BackendAuthContextType {
  user: UserResponse | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const BackendAuthContext = createContext<BackendAuthContextType | undefined>(undefined);

export function BackendAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: firebaseUser, getUserToken } = useAuth();

  // Sync with Firebase auth and verify token with backend
  useEffect(() => {
    const initBackendAuth = async () => {
      // Check if we have a backend session token
      const backendToken = getAuthToken();
      
      if (backendToken) {
        try {
          // Verify backend session is still valid
          const userData = await authService.getCurrentUser();
          setUser(userData);
          setLoading(false);
          return;
        } catch (err) {
          setAuthToken(null);
        }
      }

      // If Firebase user exists, verify with backend
      if (firebaseUser) {
        try {
          const firebaseToken = await getUserToken();
          if (firebaseToken) {
            // Verify Firebase token with backend to get session token
            const response = await authService.verifyToken({ idToken: firebaseToken });
            if (response.user) {
              setUser(response.user);
            }
          }
        } catch (err) {
          // Backend verification failed - this is non-critical as Firebase auth is primary
          // Only log in development
          if (process.env.NODE_ENV === 'development') {
            console.warn('Backend verification skipped (backend may not be running):', err);
          }
        }
      }
      
      setLoading(false);
    };

    initBackendAuth();
  }, [firebaseUser, getUserToken]);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // Call backend sign-in endpoint
      const response = await authService.signIn({ email, password });
      
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        throw new Error(response.message || 'Sign in failed');
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to sign in');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authService.signUp({ 
        email, 
        password, 
        display_name: displayName 
      });
      
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        throw new Error(response.message || 'Sign up failed');
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to sign up');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setAuthToken(null);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.error('Failed to refresh user:', err);
      setUser(null);
      setAuthToken(null);
    }
  };

  const clearError = () => setError(null);

  const value: BackendAuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    logout,
    refreshUser,
    error,
    clearError,
  };

  return (
    <BackendAuthContext.Provider value={value}>
      {children}
    </BackendAuthContext.Provider>
  );
}

export function useBackendAuth() {
  const context = useContext(BackendAuthContext);
  if (context === undefined) {
    throw new Error('useBackendAuth must be used within BackendAuthProvider');
  }
  return context;
}
