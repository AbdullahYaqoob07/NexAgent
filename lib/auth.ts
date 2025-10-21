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
        const response = await fetch('http://localhost:8000/api/v1/auth/signup', {
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ User signed in successfully:', userCredential.user.email);
      
      // Get ID token and verify with backend
      try {
        const idToken = await userCredential.user.getIdToken();
        const response = await fetch('http://localhost:8000/api/v1/auth/verify-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: idToken
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Backend token verified:', data.user);
        } else {
          console.warn('⚠️ Backend token verification failed:', await response.text());
        }
      } catch (backendError) {
        console.warn('⚠️ Backend API unavailable:', backendError);
      }
      
      return this.transformUser(userCredential.user);
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<AuthUser> {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      console.log('✅ Google sign in successful:', userCredential.user.email);
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
        return 'This account has been disabled. Please contact support.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled. Please contact support.';
      default:
        return 'An error occurred during authentication. Please try again.';
    }
  }
}

// Export singleton instance
export const authService = new FirebaseAuthService();
