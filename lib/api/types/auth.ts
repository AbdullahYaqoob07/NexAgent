/**
 * TypeScript types for Authentication API
 * Matches FastAPI backend schemas
 */

// Request types
export interface SignUpRequest {
  email: string;
  password: string;
  display_name?: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface TokenVerifyRequest {
  idToken: string;
}

// Response types
export interface UserResponse {
  uid: string;
  email: string;
  display_name?: string;
  email_verified: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: UserResponse;
  access_token?: string;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  status_code?: number;
}

// API Error type
export interface ApiError {
  status?: number;
  message: string;
  error: string;
}
