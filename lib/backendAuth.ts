/**
 * Backend Authentication Service
 * 
 * Handles authentication through the FastAPI backend instead of Firebase client SDK
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface BackendAuthUser {
  uid: string;
  email: string;
  display_name: string | null;
  email_verified: boolean;
  created_at?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: BackendAuthUser;
  token?: string;
}

class BackendAuthService {
  private token: string | null = null;
  private user: BackendAuthUser | null = null;

  /**
   * Sign up with email and password through backend
   */
  async signUp(email: string, password: string, displayName?: string): Promise<BackendAuthUser> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Sign up failed');
      }

      console.log('✅ Backend sign up successful:', data);
      
      // Store user data
      if (data.user) {
        this.user = data.user;
      }

      return data.user;
    } catch (error: any) {
      console.error('❌ Backend sign up error:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  }

  /**
   * Sign in with email and password through backend
   */
  async signIn(email: string, password: string): Promise<BackendAuthUser> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Sign in failed');
      }

      console.log('✅ Backend sign in successful:', data);
      
      // Store user data and token if provided
      if (data.user) {
        this.user = data.user;
      }
      if (data.token) {
        this.token = data.token;
        localStorage.setItem('auth_token', data.token);
      }

      return data.user;
    } catch (error: any) {
      console.error('❌ Backend sign in error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  /**
   * Verify token with backend
   */
  async verifyToken(token: string): Promise<BackendAuthUser | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        return null;
      }

      this.user = data.user;
      this.token = token;
      return data.user;
    } catch (error) {
      console.error('❌ Token verification error:', error);
      return null;
    }
  }

  /**
   * Get current user profile from backend
   */
  async getCurrentUser(): Promise<BackendAuthUser | null> {
    try {
      const token = this.token || localStorage.getItem('auth_token');
      if (!token) {
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return null;
      }

      this.user = data.user;
      return data.user;
    } catch (error) {
      console.error('❌ Get current user error:', error);
      return null;
    }
  }

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send password reset email');
      }

      console.log('✅ Password reset email sent');
    } catch (error: any) {
      console.error('❌ Forgot password error:', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    console.log('✅ Signed out successfully');
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    return this.token || localStorage.getItem('auth_token');
  }

  /**
   * Get stored user
   */
  getUser(): BackendAuthUser | null {
    return this.user;
  }
}

// Export singleton instance
export const backendAuthService = new BackendAuthService();
