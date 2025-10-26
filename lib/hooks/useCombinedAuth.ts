'use client';

/**
 * Combined Authentication Hook
 * Uses Firebase for frontend auth and Backend API for session management
 */

import { useAuth } from '@/lib/AuthContext';
import { useBackendAuth } from '@/lib/contexts/BackendAuthContext';

export function useCombinedAuth() {
  const firebaseAuth = useAuth();
  const backendAuth = useBackendAuth();

  return {
    // User data - prefer backend user if available
    user: backendAuth.user || firebaseAuth.user,
    firebaseUser: firebaseAuth.user,
    backendUser: backendAuth.user,
    
    // Loading states
    loading: firebaseAuth.loading || backendAuth.loading,
    isAuthenticated: !!backendAuth.user || !!firebaseAuth.user,
    
    // Backend-specific auth (for API calls)
    backendSignIn: backendAuth.signIn,
    backendSignUp: backendAuth.signUp,
    backendLogout: backendAuth.logout,
    
    // Firebase auth methods (for user management)
    signIn: firebaseAuth.signIn,
    signUp: firebaseAuth.signUp,
    signInWithGoogle: firebaseAuth.signInWithGoogle,
    signOut: async () => {
      // Logout from both systems
      await Promise.all([
        firebaseAuth.signOut(),
        backendAuth.logout(),
      ]);
    },
    
    // Other Firebase methods
    resetPassword: firebaseAuth.resetPassword,
    updateProfile: firebaseAuth.updateProfile,
    updatePassword: firebaseAuth.updatePassword,
    sendVerificationEmail: firebaseAuth.sendVerificationEmail,
    getUserToken: firebaseAuth.getUserToken,
    
    // Backend-specific methods
    refreshBackendUser: backendAuth.refreshUser,
    
    // Errors
    backendError: backendAuth.error,
    clearBackendError: backendAuth.clearError,
  };
}
