/**
 * Firebase Authentication Service
 * 
 * Handles user authentication with email/password and Google sign-in
 */

import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  User,
  UserCredential,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from './firebase';

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  creationTime: string | null;
  lastSignInTime: string | null;
  providerData: Array<{
    providerId: string;
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  }>;
}

class FirebaseAuthService {
  /**
   * Transform Firebase User to AuthUser
   */
  private transformUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber,
      creationTime: user.metadata.creationTime || null,
      lastSignInTime: user.metadata.lastSignInTime || null,
      providerData: user.providerData.map(provider => ({
        providerId: provider.providerId,
        uid: provider.uid,
        email: provider.email,
        displayName: provider.displayName,
        photoURL: provider.photoURL
      }))
    };
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, displayName?: string): Promise<AuthUser> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name if provided
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      // Send email verification
      await sendEmailVerification(userCredential.user);
      
      console.log('✅ User created successfully:', userCredential.user.email);
      
      // Call backend API to create user profile
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/v1/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: password,
            display_name: displayName || null
          })
        });
        
        if (!response.ok) {
          console.warn('⚠️ Backend signup failed:', await response.text());
        } else {
          console.log('✅ Backend user profile created');
        }
      } catch (backendError) {
        console.warn('⚠️ Backend API unavailable:', backendError);
      }
      
      return this.transformUser(userCredential.user);
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthUser> {
    try {
      // Check account lockout status before attempting sign-in
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';
      try {
        const lockoutCheck = await fetch(`${backendUrl}/api/v1/auth/check-lockout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: '' // Not needed for lockout check
          })
        });

        if (lockoutCheck.ok) {
          const lockoutData = await lockoutCheck.json();
          if (lockoutData.isLocked) {
            const lockedUntil = lockoutData.lockedUntil;
            // lockedUntil is a timestamp in seconds, convert to milliseconds for Date.now() comparison
            const minutesRemaining = lockedUntil 
              ? Math.max(1, Math.ceil((lockedUntil * 1000 - Date.now()) / 60000))
              : 30;
            throw new Error(`Account is locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute(s).`);
          }
        }
      } catch (lockoutError: any) {
        // If lockout check fails, still throw the error if it's a lockout error
        if (lockoutError.message && lockoutError.message.includes('locked')) {
          throw lockoutError;
        }
        // Otherwise, log warning but continue (backend might be unavailable)
        console.warn('⚠️ Lockout check failed, proceeding with sign-in attempt:', lockoutError);
      }

      // Attempt Firebase sign-in (will fail if account is disabled)
      let userCredential;
      let firebaseError: any = null;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (error: any) {
        firebaseError = error;
        // If account is disabled, check lockout status and show appropriate message
        if (error?.code === 'auth/user-disabled') {
          try {
            const lockoutCheck = await fetch(`${backendUrl}/api/v1/auth/check-lockout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: email,
                password: ''
              })
            });
            
            if (lockoutCheck.ok) {
              const lockoutData = await lockoutCheck.json();
              if (lockoutData.isLocked && lockoutData.lockedUntil) {
                // lockedUntil is a timestamp in seconds, convert to milliseconds for Date.now() comparison
                const minutesRemaining = Math.max(1, Math.ceil((lockoutData.lockedUntil * 1000 - Date.now()) / 60000));
                throw new Error(`Account is locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute(s).`);
              }
            }
          } catch (lockoutError: any) {
            // If we got a lockout error message, throw it; otherwise throw generic disabled message
            if (lockoutError.message && lockoutError.message.includes('locked')) {
              throw lockoutError;
            }
          }
          throw new Error('This account has been temporarily locked due to too many failed login attempts. Please try again later.');
        }
        // For other errors, we'll handle them in the outer catch block
        throw error;
      }
      
      console.log('✅ User signed in successfully:', userCredential.user.email);
      
      // Reset failed login attempts on successful sign-in
      try {
        await fetch(`${backendUrl}/api/v1/auth/reset-failed-attempts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: '' // Not needed for reset
          })
        });
      } catch (resetError) {
        console.warn('⚠️ Failed to reset failed attempts:', resetError);
      }
      
      // Get ID token and verify with backend
      try {
        const idToken = await userCredential.user.getIdToken().catch((e)=>{
          console.error('Failed to get Firebase ID token:', e);
          return null as any;
        });

        if (!idToken) {
          console.warn('No Firebase ID token returned after sign-in. Check Firebase config and network.');
        } else {
          // Store for API client fallback and developer convenience
          try { localStorage.setItem('backend_auth_token', idToken); } catch {}
        }

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/v1/auth/verify-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: idToken || ''
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          
          console.log('🔍 Backend verify-token response:', {
            requires_mfa: data.metadata?.requires_mfa,
            metadata: data.metadata
          });
          
          // Check if MFA is required
          if (data.metadata?.requires_mfa) {
            console.log('🔐 MFA is required - returning user with requiresMFA flag');
            // IMPORTANT: Don't store session token or set user as fully authenticated yet
            // The user is only partially authenticated until MFA is verified
            // Return user with MFA flag - frontend will handle verification
            const authUser = this.transformUser(userCredential.user);
            // Clear any stored tokens since MFA is not verified yet
            try { 
              localStorage.removeItem('backend_session_token');
              localStorage.removeItem('backend_auth_token');
            } catch {}
            return { ...authUser, requiresMFA: true, uid: userCredential.user.uid } as any;
          }
          
          console.log('✅ MFA not required - proceeding with normal login');
          
          // Check if user is admin and handle redirection
          if (data.metadata?.is_admin) {
            console.log('✅ Admin user detected, should redirect to:', data.metadata.redirect_to);
            
            // Store admin info for the frontend
            try {
              localStorage.setItem('user_is_admin', 'true');
              localStorage.setItem('admin_role', data.metadata.admin_role);
              localStorage.setItem('admin_permissions', JSON.stringify(data.metadata.permissions));
              localStorage.setItem('admin_redirect_url', data.metadata.redirect_to);
            } catch {}
          } else {
            console.log('✅ Regular user detected, should redirect to:', data.metadata?.redirect_to);
            
            // Clear any admin flags
            try {
              localStorage.removeItem('user_is_admin');
              localStorage.removeItem('admin_role');
              localStorage.removeItem('admin_permissions');
              localStorage.removeItem('admin_redirect_url');
            } catch {}
          }
        } else {
          console.warn('⚠️ Backend token verification failed:', await response.text());
        }
      } catch (backendError) {
        console.warn('⚠️ Backend API unavailable:', backendError);
      }
      
      return this.transformUser(userCredential.user);
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      console.error('❌ Error code:', error?.code);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      
      // Extract error code - Firebase errors can have code in different places
      const errorCode = error?.code || 
                       (error?.message?.includes('auth/') ? error.message.match(/auth\/[^\s]+/)?.[0] : null) ||
                       (error?.message?.toLowerCase().includes('password') ? 'auth/wrong-password' : null) ||
                       (error?.message?.toLowerCase().includes('invalid') ? 'auth/invalid-credential' : null);
      
      console.log('🔍 Detected error code:', errorCode);
      
      // Record failed login attempt for authentication errors (but not network errors or user-disabled)
      // User-disabled means account is already locked, so don't record again
      // Record for ANY auth error that's not user-disabled, network, or too-many-requests
      const isAuthError = errorCode && errorCode.startsWith('auth/');
      const shouldRecordFailure = isAuthError && 
        errorCode !== 'auth/user-disabled' && 
        errorCode !== 'auth/network-request-failed' &&
        errorCode !== 'auth/too-many-requests';
      
      if (shouldRecordFailure) {
        console.log('📝 Recording failed login attempt for:', email, 'Error code:', errorCode);
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';
          console.log('📝 Calling backend:', `${backendUrl}/api/v1/auth/record-failed-attempt`);
          
          const failedAttemptResponse = await fetch(`${backendUrl}/api/v1/auth/record-failed-attempt`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
              password: '' // Not needed for recording failure
            })
          });

          console.log('📝 Failed attempt response status:', failedAttemptResponse.status);
          
          if (failedAttemptResponse.ok) {
            const attemptData = await failedAttemptResponse.json();
            console.log('📝 Failed attempt data:', JSON.stringify(attemptData, null, 2));
            
            if (attemptData.isLocked) {
              const lockedUntil = attemptData.lockedUntil;
              // lockedUntil is a timestamp in seconds, convert to milliseconds for Date.now() comparison
              const minutesRemaining = lockedUntil 
                ? Math.max(1, Math.ceil((lockedUntil * 1000 - Date.now()) / 60000))
                : 30;
              // Throw lockout error - this will be caught and displayed
              throw new Error(`Account is locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute(s).`);
            } else if (attemptData.remainingAttempts !== undefined && attemptData.remainingAttempts < 5) {
              // Show remaining attempts in error message
              const remaining = attemptData.remainingAttempts;
              const finalErrorCode = errorCode || 'auth/wrong-password';
              const errorMsg = this.getErrorMessage(finalErrorCode);
              // Throw error with remaining attempts - this will be caught and displayed
              throw new Error(`${errorMsg} ${remaining} attempt(s) remaining before account lockout.`);
            }
          } else {
            const errorText = await failedAttemptResponse.text();
            console.error('❌ Failed to record failed attempt. Status:', failedAttemptResponse.status);
            console.error('❌ Response:', errorText);
          }
        } catch (recordError: any) {
          console.error('⚠️ Failed to record failed attempt:', recordError);
          console.error('⚠️ Record error details:', recordError.message);
          console.error('⚠️ Record error stack:', recordError.stack);
          // If we threw a specific error (lockout or remaining attempts), re-throw it
          if (recordError.message && (
            recordError.message.includes('locked') || 
            recordError.message.includes('remaining') ||
            recordError.message.includes('attempt(s)')
          )) {
            throw recordError;
          }
        }
      } else {
        console.log('⏭️ Skipping failed attempt recording. Error code:', errorCode, 'isAuthError:', isAuthError);
      }
      
      // Check if error message already contains lockout info (from lockout check at the start or from record attempt)
      // This preserves custom error messages like lockout messages
      if (error?.message && (
        error.message.includes('locked') || 
        error.message.includes('too many failed') ||
        error.message.includes('try again in') ||
        error.message.includes('remaining') ||
        error.message.includes('attempt(s)')
      )) {
        // Preserve the lockout/remaining attempts error message
        throw new Error(error.message);
      }
      
      // Use errorCode if it was set, otherwise get it from error object
      const finalErrorCode = errorCode || 'auth/unknown-error';
      throw new Error(this.getErrorMessage(finalErrorCode));
    }
  }

  /**
   * Sign in with Google
   * (also verifies token with backend so admin metadata/redirects work)
   */
  async signInWithGoogle(): Promise<AuthUser> {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      console.log('✅ Google sign in successful:', userCredential.user.email);

      // Fallback: if this Google account is the hard-coded admin, set admin flags
      try {
        if (userCredential.user.email === 'admin@gmail.com') {
          localStorage.setItem('user_is_admin', 'true');
          localStorage.setItem('admin_redirect_url', '/admin321');
        }
      } catch {}

      // Mirror the backend verification logic used in email/password sign-in
      try {
        const idToken = await userCredential.user.getIdToken().catch((e) => {
          console.error('Failed to get Firebase ID token (Google):', e);
          return null as any;
        });

        if (!idToken) {
          console.warn('No Firebase ID token returned after Google sign-in.');
        } else {
          // Store for API client fallback and developer convenience
          try {
            localStorage.setItem('backend_auth_token', idToken);
          } catch {}
        }

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/v1/auth/verify-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: idToken || '',
          }),
        });

        if (response.ok) {
          const data = await response.json();

          if (data.metadata?.is_admin) {
            console.log('✅ Admin user (Google) detected, should redirect to:', data.metadata.redirect_to);

            try {
              localStorage.setItem('user_is_admin', 'true');
              localStorage.setItem('admin_role', data.metadata.admin_role);
              localStorage.setItem('admin_permissions', JSON.stringify(data.metadata.permissions));
              localStorage.setItem('admin_redirect_url', data.metadata.redirect_to);
            } catch {}
          } else {
            console.log('✅ Regular Google user, redirect target:', data.metadata?.redirect_to);

            // Clear any admin flags
            try {
              localStorage.removeItem('user_is_admin');
              localStorage.removeItem('admin_role');
              localStorage.removeItem('admin_permissions');
              localStorage.removeItem('admin_redirect_url');
            } catch {}
          }
        } else {
          console.warn('⚠️ Backend token verification (Google) failed:', await response.text());
        }
      } catch (backendError) {
        console.warn('⚠️ Backend API unavailable during Google sign-in:', backendError);
      }

      return this.transformUser(userCredential.user);
    } catch (error: any) {
      console.error('❌ Google sign in error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Sign out current user
   */
  async signOutUser(): Promise<void> {
    try {
      await signOut(auth);
      // Clear all auth-related localStorage items
      try {
        localStorage.removeItem('backend_auth_token');
        localStorage.removeItem('backend_session_token');
        localStorage.removeItem('user_is_admin');
        localStorage.removeItem('admin_redirect_url');
      } catch {}
      console.log('✅ User signed out successfully');
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('✅ Password reset email sent to:', email);
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates: {
    displayName?: string;
    photoURL?: string;
  }): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user is signed in');
      
      await updateProfile(user, updates);
      console.log('✅ Profile updated successfully');
    } catch (error: any) {
      console.error('❌ Profile update error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Update user password
   */
  async updateUserPassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('No user is signed in');
      
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      console.log('✅ Password updated successfully');
    } catch (error: any) {
      console.error('❌ Password update error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user is signed in');
      
      await sendEmailVerification(user);
      console.log('✅ Verification email sent');
    } catch (error: any) {
      console.error('❌ Send verification error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Get current auth user (transformed)
   */
  getCurrentAuthUser(): AuthUser | null {
    const user = auth.currentUser;
    return user ? this.transformUser(user) : null;
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(auth, (user) => {
      callback(user ? this.transformUser(user) : null);
    });
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!auth.currentUser;
  }

  /**
   * Get user token
   */
  async getUserToken(): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (!user) return null;
      
      return await user.getIdToken();
    } catch (error) {
      console.error('❌ Error getting user token:', error);
      return null;
    }
  }

  /**
   * Get user ID
   */
  getUserId(): string | null {
    return auth.currentUser?.uid || null;
  }

  /**
   * Convert Firebase error codes to user-friendly messages
   */
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed. Please try again.';
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled. Please try again.';
      case 'auth/popup-blocked':
        return 'Popup was blocked. Please allow popups and try again.';
      case 'auth/requires-recent-login':
        return 'Please sign in again to complete this action.';
      case 'auth/user-disabled':
        return 'This account has been temporarily locked due to too many failed login attempts. Please try again later.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled. Please contact support.';
      default:
        return 'An error occurred during authentication. Please try again.';
    }
  }
}

// Export singleton instance
export const authService = new FirebaseAuthService();
