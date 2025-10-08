/**
 * User Sync Utilities
 * 
 * Helper functions for user data transformation and validation
 * for Firebase auth and Firestore
 */

import { User as FirebaseAuthUser } from 'firebase/auth';
import { FirebaseUser } from './userSync';
import { Timestamp } from 'firebase/firestore';
import { AuthUser } from './auth';

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (basic validation)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

/**
 * Sanitize user input to prevent XSS and other attacks
 */
export function sanitizeString(input: string | null): string | null {
  if (!input) return null;
  
  return input
    .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
    .trim()
    .substring(0, 100); // Limit length
}

/**
 * Generate a display name from various user data
 */
export function generateDisplayName(
  firstName: string | null,
  lastName: string | null,
  email: string,
  username: string | null
): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  
  if (firstName) {
    return firstName.trim();
  }
  
  if (username) {
    return username.trim();
  }
  
  // Fallback to email username part
  return email.split('@')[0] || 'User';
}

/**
 * Extract user's primary email from Firebase auth user
 */
export function extractPrimaryEmail(firebaseUser: FirebaseAuthUser | AuthUser): string {
  if (!firebaseUser.email) {
    throw new Error(`No email found for user ${firebaseUser.uid}`);
  }
  
  if (!isValidEmail(firebaseUser.email)) {
    throw new Error(`Invalid email format for user ${firebaseUser.uid}`);
  }
  
  return firebaseUser.email;
}

/**
 * Extract user's primary phone number from Firebase auth user
 */
export function extractPrimaryPhone(firebaseUser: FirebaseAuthUser | AuthUser): string | null {
  if (!firebaseUser.phoneNumber) {
    return null;
  }
  
  if (!isValidPhoneNumber(firebaseUser.phoneNumber)) {
    return null;
  }
  
  return firebaseUser.phoneNumber;
}

/**
 * Check if user's email is verified
 */
export function isEmailVerified(firebaseUser: FirebaseAuthUser | AuthUser): boolean {
  return firebaseUser.emailVerified;
}

/**
 * Convert Firebase auth timestamp to Firebase Timestamp
 */
export function authToFirebaseTimestamp(authTimestamp: string | null): Timestamp | null {
  if (!authTimestamp) return null;
  return Timestamp.fromDate(new Date(authTimestamp));
}

/**
 * Validate Firebase auth user data before sync
 */
export function validateFirebaseAuthUser(firebaseUser: FirebaseAuthUser | AuthUser): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check required fields
  if (!firebaseUser.uid) {
    errors.push('User ID is required');
  }
  
  if (!firebaseUser.email || !isValidEmail(firebaseUser.email)) {
    errors.push('Valid email address is required');
  }
  
  // Validate timestamps if they exist
  if ('creationTime' in firebaseUser && firebaseUser.creationTime && isNaN(new Date(firebaseUser.creationTime).getTime())) {
    errors.push('Invalid createdAt timestamp');
  }
  
  if ('lastSignInTime' in firebaseUser && firebaseUser.lastSignInTime && isNaN(new Date(firebaseUser.lastSignInTime).getTime())) {
    errors.push('Invalid lastSignInAt timestamp');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate Firebase user data
 */
export function validateFirebaseUser(firebaseUser: Partial<FirebaseUser>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check required fields
  if (!firebaseUser.id) {
    errors.push('User ID is required');
  }
  
  if (!firebaseUser.uid) {
    errors.push('Firebase UID is required');
  }
  
  if (!firebaseUser.email || !isValidEmail(firebaseUser.email)) {
    errors.push('Valid email is required');
  }
  
  // Validate subscription plan
  if (firebaseUser.subscription?.plan && 
      !['free', 'pro', 'enterprise'].includes(firebaseUser.subscription.plan)) {
    errors.push('Invalid subscription plan');
  }
  
  // Validate subscription status
  if (firebaseUser.subscription?.status && 
      !['active', 'canceled', 'past_due'].includes(firebaseUser.subscription.status)) {
    errors.push('Invalid subscription status');
  }
  
  // Validate theme preference
  if (firebaseUser.preferences?.theme && 
      !['dark', 'light'].includes(firebaseUser.preferences.theme)) {
    errors.push('Invalid theme preference');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Compare two user objects to detect changes
 */
export function getUserChanges(
  oldUser: FirebaseUser,
  newUser: Partial<FirebaseUser>
): Partial<FirebaseUser> {
  const changes: Partial<FirebaseUser> = {};
  
  // List of fields to compare (excluding timestamps and nested objects)
  const fieldsToCompare: (keyof FirebaseUser)[] = [
    'email', 'displayName', 'phoneNumber', 'emailVerified'
  ];
  
  for (const field of fieldsToCompare) {
    if (newUser[field] !== undefined && oldUser[field] !== newUser[field]) {
      (changes as any)[field] = newUser[field];
    }
  }
  
  return changes;
}

/**
 * Create a safe user object for logging (without sensitive data)
 */
export function createSafeUserForLogging(user: FirebaseUser): Partial<FirebaseUser> {
  return {
    id: user.id,
    email: user.email ? user.email.replace(/(.{2}).*@/, '$1***@') : undefined,
    displayName: user.displayName,
    subscription: user.subscription,
    usage: user.usage,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

/**
 * Generate user avatar initials
 */
export function generateUserInitials(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  
  if (firstName) {
    return firstName.substring(0, 2).toUpperCase();
  }
  
  // Fallback to email
  const emailPart = email.split('@')[0];
  return emailPart.substring(0, 2).toUpperCase();
}

/**
 * Calculate user subscription status
 */
export function calculateSubscriptionStatus(user: FirebaseUser): {
  isActive: boolean;
  isPro: boolean;
  isEnterprise: boolean;
  daysUntilExpiry: number | null;
} {
  const subscription = user.subscription;
  const now = new Date();
  
  if (!subscription) {
    return {
      isActive: false,
      isPro: false,
      isEnterprise: false,
      daysUntilExpiry: null
    };
  }
  
  const isActive = subscription.status === 'active';
  const isPro = subscription.plan === 'pro' && isActive;
  const isEnterprise = subscription.plan === 'enterprise' && isActive;
  
  let daysUntilExpiry: number | null = null;
  if (subscription.currentPeriodEnd && isActive) {
    const expiryDate = subscription.currentPeriodEnd.toDate();
    const diffTime = expiryDate.getTime() - now.getTime();
    daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  return {
    isActive,
    isPro,
    isEnterprise,
    daysUntilExpiry
  };
}

/**
 * Check if user has exceeded usage limits
 */
export function checkUsageLimits(user: FirebaseUser): {
  tokensExceeded: boolean;
  workflowsExceeded: boolean;
  apiCallsExceeded: boolean;
  suggestions: string[];
} {
  const usage = user.usage;
  const subscription = user.subscription;
  const suggestions: string[] = [];
  
  if (!usage || !subscription) {
    return {
      tokensExceeded: false,
      workflowsExceeded: false,
      apiCallsExceeded: false,
      suggestions: []
    };
  }
  
  // Define limits based on subscription plan
  const limits = {
    free: { tokens: 1000, workflows: 3, apiCalls: 100 },
    pro: { tokens: 10000, workflows: 50, apiCalls: 1000 },
    enterprise: { tokens: 100000, workflows: 500, apiCalls: 10000 }
  };
  
  const userLimits = limits[subscription.plan] || limits.free;
  
  const tokensExceeded = usage.tokensUsed >= userLimits.tokens;
  const workflowsExceeded = usage.workflowsCreated >= userLimits.workflows;
  const apiCallsExceeded = usage.apiCallsThisMonth >= userLimits.apiCalls;
  
  if (tokensExceeded) {
    suggestions.push('Consider upgrading to increase token limit');
  }
  if (workflowsExceeded) {
    suggestions.push('Upgrade to create more workflows');
  }
  if (apiCallsExceeded) {
    suggestions.push('API call limit reached, upgrade for more calls');
  }
  
  return {
    tokensExceeded,
    workflowsExceeded,
    apiCallsExceeded,
    suggestions
  };
}