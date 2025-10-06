/**
 * Firebase Auth Context Provider
 * 
 * Provides authentication state and methods throughout the app
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthUser } from './auth';
import { userSyncService } from './userSync';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthUser>;
  signInWithGoogle: () => Promise<AuthUser>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  getUserToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to authentication state changes
    const unsubscribe = authService.onAuthStateChange(async (authUser) => {
      setUser(authUser);
      setLoading(false);

      // Auto-sync user to Firestore when auth state changes
      if (authUser) {
        try {
          await userSyncService.syncUser(authUser);
          console.log('✅ User auto-synced to Firestore');
        } catch (error) {
          console.error('❌ Error auto-syncing user:', error);
        }
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const authUser = await authService.signIn(email, password);
    return authUser;
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const authUser = await authService.signUp(email, password, displayName);
    return authUser;
  };

  const signInWithGoogle = async () => {
    const authUser = await authService.signInWithGoogle();
    return authUser;
  };

  const signOut = async () => {
    await authService.signOutUser();
  };

  const resetPassword = async (email: string) => {
    await authService.resetPassword(email);
  };

  const updateProfile = async (updates: { displayName?: string; photoURL?: string }) => {
    await authService.updateUserProfile(updates);
    // Refresh user data
    const currentUser = authService.getCurrentAuthUser();
    if (currentUser) {
      setUser(currentUser);
      await userSyncService.syncUser(currentUser);
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    await authService.updateUserPassword(currentPassword, newPassword);
  };

  const sendVerificationEmail = async () => {
    await authService.sendVerificationEmail();
  };

  const getUserToken = async () => {
    return await authService.getUserToken();
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    updatePassword,
    sendVerificationEmail,
    getUserToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Custom hook for protected routes
export function useRequireAuth() {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to sign in page
      window.location.href = '/sign-in';
    }
  }, [user, loading]);

  return { user, loading };
}