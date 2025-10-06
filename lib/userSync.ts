/**
 * User Sync Service - Sync Clerk users to Firebase Firestore
 * 
 * This service handles syncing user data between Clerk and Firebase,
 * including user creation, updates, and deletion.
 */

import { User } from 'firebase/auth';
import { AuthUser } from './auth';
import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

// Define the comprehensive Firebase user data structure for NexAgent
export interface FirebaseUser {
  // Core Firebase Auth fields
  id: string;
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSignInAt: Timestamp | null;
  
  // Extended profile information
  profile: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    bio: string | null;
    title: string | null;
    company: string | null;
    location: string | null;
    website: string | null;
    phoneNumber: string | null;
    timezone: string;
    avatar: {
      url: string | null;
      initials: string;
    };
  };
  
  // Social links
  socialLinks: {
    github: string | null;
    twitter: string | null;
    linkedin: string | null;
    website: string | null;
  };
  
  // Subscription and billing
  subscription: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'cancelled' | 'past_due' | 'trialing';
    currentPeriodStart?: Timestamp;
    currentPeriodEnd?: Timestamp;
    cancelAtPeriodEnd: boolean;
    trialEndsAt?: Timestamp;
    customerId?: string; // Stripe customer ID
  };
  
  // Usage tracking
  usage: {
    // Current month usage
    tokensUsed: number;
    workflowsCreated: number;
    apiCallsThisMonth: number;
    workflowExecutions: number;
    storageUsed: number; // in MB
    
    // All-time stats
    totalWorkflows: number;
    totalExecutions: number;
    totalApiCalls: number;
    
    // Performance metrics
    successRate: number;
    avgResponseTime: number; // in milliseconds
    
    // Usage limits based on plan
    limits: {
      tokensPerMonth: number;
      workflowsMax: number;
      apiCallsPerMonth: number;
      executionsPerMonth: number;
      storageLimit: number; // in MB
      teamMembers: number;
    };
  };
  
  // User preferences
  preferences: {
    // Appearance
    theme: 'dark' | 'light' | 'system';
    language: string;
    timezone: string;
    dateFormat: string;
    
    // Notifications
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      workflow: boolean;
      security: boolean;
      marketing: boolean;
      weeklyReport: boolean;
    };
    
    // Privacy
    privacy: {
      profileVisibility: 'public' | 'private' | 'team';
      activityVisibility: boolean;
      allowIndexing: boolean;
      shareAnalytics: boolean;
    };
    
    // Dashboard
    dashboard: {
      defaultView: 'overview' | 'workflows' | 'analytics';
      showWelcome: boolean;
      compactMode: boolean;
    };
  };
  
  // Security settings
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: Timestamp;
    activeSessions: number;
    securityScore: number;
    loginAttempts: {
      count: number;
      lastAttempt: Timestamp | null;
      lockedUntil: Timestamp | null;
    };
    trustedDevices: string[]; // device IDs
  };
  
  // Team and collaboration (for future use)
  team?: {
    teamId: string | null;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    permissions: string[];
    invitedBy: string | null;
    joinedAt: Timestamp | null;
  };
  
  // Onboarding and experience
  onboarding: {
    completed: boolean;
    currentStep: number;
    completedSteps: string[];
    skippedSteps: string[];
    completedAt: Timestamp | null;
  };
  
  // Activity and engagement
  activity: {
    lastActiveAt: Timestamp;
    loginCount: number;
    firstLoginAt: Timestamp;
    lastSeenFeatures: string[];
    featuresUsed: Record<string, number>;
    feedbackGiven: string[];
  };
  
  // Workspace settings
  workspace: {
    name: string;
    description: string;
    region: string;
    autoSave: boolean;
    collaborationMode: 'open' | 'restricted' | 'private';
    defaultExecutionTimeout: number;
    maxWorkflowNodes: number;
    enableAnalytics: boolean;
  };
  
  // API Keys management
  apiKeys: Array<{
    id: string;
    name: string;
    keyPreview: string; // Only show last 4 characters
    scopes: string[];
    environment: 'production' | 'development' | 'staging';
    status: 'active' | 'inactive' | 'expired';
    lastUsed: Timestamp | null;
    expiresAt: Timestamp | null;
    rateLimit: number;
    createdAt: Timestamp;
  }>;
  
  // Integrations
  integrations: Array<{
    id: string;
    name: string;
    type: 'oauth' | 'api_key' | 'webhook';
    status: 'connected' | 'disconnected' | 'error' | 'pending';
    lastUsed: Timestamp | null;
    config: Record<string, any>;
    enabled: boolean;
  }>;
  
  // Additional metadata
  metadata: {
    source: 'google' | 'email' | 'invitation' | 'api'; // How user signed up
    referrer: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    initialPlan: 'free' | 'pro' | 'enterprise';
    tags: string[]; // For segmentation
    notes: string | null; // Admin notes
  };
}

class UserSyncService {
  private readonly COLLECTION_NAME = 'users';

  /**
   * Transform Firebase Auth user data to comprehensive Firestore user format
   */
  private transformAuthUser(authUser: User | AuthUser): Omit<FirebaseUser, 'createdAt' | 'updatedAt'> {
    const email = authUser.email || '';
    const displayName = authUser.displayName || email.split('@')[0];
    const now = serverTimestamp() as Timestamp;
    
    // Extract name parts from displayName or email
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] || null;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
    
    // Generate initials
    const initials = firstName && lastName 
      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
      : displayName.substring(0, 2).toUpperCase();
    
    // Detect signup source
    const signupSource = authUser.providerData?.some(p => p.providerId === 'google.com') ? 'google' : 'email';
    
    // Get user timezone (default to UTC)
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    
    return {
      id: authUser.uid,
      uid: authUser.uid,
      email,
      displayName,
      photoURL: authUser.photoURL,
      phoneNumber: authUser.phoneNumber,
      emailVerified: authUser.emailVerified,
      lastSignInAt: 'lastSignInTime' in authUser && authUser.lastSignInTime 
        ? Timestamp.fromDate(new Date(authUser.lastSignInTime))
        : ('metadata' in authUser && authUser.metadata.lastSignInTime
          ? Timestamp.fromDate(new Date(authUser.metadata.lastSignInTime))
          : null),
      
      // Extended profile information with sensible defaults
      profile: {
        firstName,
        lastName,
        username: null,
        bio: null,
        title: null,
        company: null,
        location: null,
        website: null,
        phoneNumber: authUser.phoneNumber,
        timezone: userTimezone,
        avatar: {
          url: authUser.photoURL,
          initials
        }
      },
      
      // Social links - initially empty
      socialLinks: {
        github: null,
        twitter: null,
        linkedin: null,
        website: null
      },
      
      // Subscription - start with free plan
      subscription: {
        plan: 'free',
        status: 'active',
        currentPeriodStart: serverTimestamp() as Timestamp,
        cancelAtPeriodEnd: false
      },
      
      // Usage tracking with free tier limits
      usage: {
        // Current month usage
        tokensUsed: 0,
        workflowsCreated: 0,
        apiCallsThisMonth: 0,
        workflowExecutions: 0,
        storageUsed: 0,
        
        // All-time stats
        totalWorkflows: 0,
        totalExecutions: 0,
        totalApiCalls: 0,
        
        // Performance metrics
        successRate: 0,
        avgResponseTime: 0,
        
        // Free tier limits
        limits: {
          tokensPerMonth: 1000,
          workflowsMax: 5,
          apiCallsPerMonth: 100,
          executionsPerMonth: 50,
          storageLimit: 100, // 100MB
          teamMembers: 1
        }
      },
      
      // User preferences with sensible defaults
      preferences: {
        theme: 'dark',
        language: 'en-US',
        timezone: userTimezone,
        dateFormat: 'MM/dd/yyyy',
        
        notifications: {
          email: true,
          push: false,
          sms: false,
          workflow: true,
          security: true,
          marketing: false,
          weeklyReport: true
        },
        
        privacy: {
          profileVisibility: 'private',
          activityVisibility: false,
          allowIndexing: false,
          shareAnalytics: true
        },
        
        dashboard: {
          defaultView: 'overview',
          showWelcome: true,
          compactMode: false
        }
      },
      
      // Security settings with secure defaults
      security: {
        twoFactorEnabled: false,
        lastPasswordChange: serverTimestamp() as Timestamp,
        activeSessions: 1,
        securityScore: authUser.emailVerified ? 70 : 50, // Base security score
        loginAttempts: {
          count: 0,
          lastAttempt: null,
          lockedUntil: null
        },
        trustedDevices: []
      },
      
      // Onboarding state
      onboarding: {
        completed: false,
        currentStep: 1,
        completedSteps: [],
        skippedSteps: [],
        completedAt: null
      },
      
      // Activity tracking
      activity: {
        lastActiveAt: serverTimestamp() as Timestamp,
        loginCount: 1,
        firstLoginAt: serverTimestamp() as Timestamp,
        lastSeenFeatures: [],
        featuresUsed: {},
        feedbackGiven: []
      },
      
      // Workspace settings with defaults
      workspace: {
        name: `${displayName}'s Workspace`,
        description: 'AI-powered workflow automation workspace',
        region: 'us-east-1',
        autoSave: true,
        collaborationMode: 'restricted',
        defaultExecutionTimeout: 300,
        maxWorkflowNodes: 100,
        enableAnalytics: true
      },
      
      // Empty API keys initially
      apiKeys: [],
      
      // Empty integrations initially
      integrations: [],
      
      // Metadata for analytics and support
      metadata: {
        source: signupSource,
        referrer: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        ipAddress: null,
        userAgent: null,
        initialPlan: 'free',
        tags: [],
        notes: null
      }
    };
  }

  /**
   * Sync a single user from Firebase Auth to Firestore
   */
  async syncUser(authUser: User | AuthUser): Promise<FirebaseUser> {
    try {
      console.log(`🔄 Starting user sync for: ${authUser.email}`);
      
      const userRef = doc(db, this.COLLECTION_NAME, authUser.uid);
      const existingUserSnap = await getDoc(userRef);
      
      console.log(`🔍 User exists in Firestore: ${existingUserSnap.exists()}`);
      
      const transformedUser = this.transformAuthUser(authUser);
      console.log(`📋 Transformed user data:`, {
        uid: transformedUser.uid,
        email: transformedUser.email,
        displayName: transformedUser.displayName,
        profileFirstName: transformedUser.profile.firstName
      });
      
      if (existingUserSnap.exists()) {
        // Update existing user
        const existingData = existingUserSnap.data() as FirebaseUser;
        const updatedUser: FirebaseUser = {
          ...existingData,
          ...transformedUser,
          // Preserve existing custom fields but allow updates
          profile: {
            ...existingData.profile,
            ...transformedUser.profile
          },
          subscription: existingData.subscription || transformedUser.subscription,
          usage: existingData.usage || transformedUser.usage,
          preferences: {
            ...existingData.preferences,
            ...transformedUser.preferences
          },
          security: {
            ...existingData.security,
            ...transformedUser.security
          },
          onboarding: existingData.onboarding || transformedUser.onboarding,
          activity: {
            ...existingData.activity,
            lastActiveAt: serverTimestamp() as Timestamp,
            loginCount: (existingData.activity?.loginCount || 0) + 1
          },
          metadata: {
            ...existingData.metadata,
            ...transformedUser.metadata
          },
          createdAt: existingData.createdAt,
          updatedAt: serverTimestamp() as Timestamp
        };
        
        await updateDoc(userRef, updatedUser as any);
        console.log(`✅ Updated user in Firestore: ${authUser.uid}`);
        return updatedUser;
      } else {
        // Create new user
        console.log(`🆕 Creating new user in Firestore...`);
        
        const newUser: FirebaseUser = {
          ...transformedUser,
          createdAt: 'creationTime' in authUser && authUser.creationTime 
            ? Timestamp.fromDate(new Date(authUser.creationTime))
            : ('metadata' in authUser && authUser.metadata.creationTime
              ? Timestamp.fromDate(new Date(authUser.metadata.creationTime))
              : serverTimestamp() as Timestamp),
          updatedAt: serverTimestamp() as Timestamp
        };
        
        console.log(`💾 Saving user data to Firestore...`);
        await setDoc(userRef, newUser as any);
        
        // Verify the document was created
        const verifySnap = await getDoc(userRef);
        if (verifySnap.exists()) {
          console.log(`✅ Successfully created and verified user in Firestore: ${authUser.uid}`);
        } else {
          console.error(`❌ User document not found after creation: ${authUser.uid}`);
        }
        
        return newUser;
      }
    } catch (error) {
      console.error(`❌ Error syncing user ${authUser.uid}:`, error);
      console.error(`❌ Error details:`, {
        name: (error as Error)?.name,
        message: (error as Error)?.message,
        stack: (error as Error)?.stack
      });
      throw error;
    }
  }

  /**
   * Get a user from Firebase by user ID
   */
  async getUser(userId: string): Promise<FirebaseUser | null> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data() as FirebaseUser;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error getting user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get a user from Firebase by email
   */
  async getUserByEmail(email: string): Promise<FirebaseUser | null> {
    try {
      const usersRef = collection(db, this.COLLECTION_NAME);
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as FirebaseUser;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error getting user by email ${email}:`, error);
      throw error;
    }
  }

  /**
   * Delete a user from Firebase
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      await deleteDoc(userRef);
      console.log(`✅ Deleted user from Firebase: ${userId}`);
    } catch (error) {
      console.error(`❌ Error deleting user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user's custom data (subscription, usage, preferences)
   */
  async updateUserData(userId: string, updates: Partial<Pick<FirebaseUser, 'subscription' | 'usage' | 'preferences' | 'metadata'>>): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      } as any);
      console.log(`✅ Updated user data for: ${userId}`);
    } catch (error) {
      console.error(`❌ Error updating user data ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Increment user usage metrics
   */
  async incrementUsage(userId: string, field: keyof Omit<FirebaseUser['usage'], 'limits'>, amount: number = 1): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as FirebaseUser;
        const currentUsage = userData.usage || { tokensUsed: 0, workflowsCreated: 0, apiCallsThisMonth: 0, workflowExecutions: 0, storageUsed: 0, totalWorkflows: 0, totalExecutions: 0, totalApiCalls: 0, successRate: 0, avgResponseTime: 0 };
        
        await updateDoc(userRef, {
          [`usage.${field}`]: (Number(currentUsage[field]) || 0) + amount,
          updatedAt: serverTimestamp()
        } as any);
      }
    } catch (error) {
      console.error(`❌ Error incrementing usage for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all users from Firebase
   */
  async getAllUsers(): Promise<FirebaseUser[]> {
    try {
      const usersRef = collection(db, this.COLLECTION_NAME);
      const querySnapshot = await getDocs(usersRef);
      
      return querySnapshot.docs.map(doc => doc.data() as FirebaseUser);
    } catch (error) {
      console.error('❌ Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Check if user exists in Firebase
   */
  async userExists(userId: string): Promise<boolean> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      const userSnap = await getDoc(userRef);
      return userSnap.exists();
    } catch (error) {
      console.error(`❌ Error checking if user exists ${userId}:`, error);
      return false;
    }
  }

  /**
   * Update user's activity timestamp and login count
   */
  async updateUserActivity(userId: string): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      await updateDoc(userRef, {
        'activity.lastActiveAt': serverTimestamp(),
        'activity.loginCount': serverTimestamp(), // This will need to be incremented properly
        lastSignInAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Updated activity for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Error updating user activity ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user's profile information
   */
  async updateUserProfile(userId: string, profileUpdates: Partial<FirebaseUser['profile']>): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      const updates: any = {
        updatedAt: serverTimestamp()
      };
      
      // Add profile updates with proper field paths
      Object.entries(profileUpdates).forEach(([key, value]) => {
        updates[`profile.${key}`] = value;
      });
      
      await updateDoc(userRef, updates);
      console.log(`✅ Updated profile for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Error updating user profile ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user's preferences
   */
  async updateUserPreferences(userId: string, preferencesUpdates: Partial<FirebaseUser['preferences']>): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      const updates: any = {
        updatedAt: serverTimestamp()
      };
      
      // Handle nested preference updates
      Object.entries(preferencesUpdates).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          // Handle nested objects like notifications, privacy, etc.
          Object.entries(value).forEach(([nestedKey, nestedValue]) => {
            updates[`preferences.${key}.${nestedKey}`] = nestedValue;
          });
        } else {
          updates[`preferences.${key}`] = value;
        }
      });
      
      await updateDoc(userRef, updates);
      console.log(`✅ Updated preferences for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Error updating user preferences ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user's social links
   */
  async updateUserSocialLinks(userId: string, socialLinksUpdates: Partial<FirebaseUser['socialLinks']>): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      const updates: any = {
        updatedAt: serverTimestamp()
      };
      
      // Add social links updates with proper field paths
      Object.entries(socialLinksUpdates).forEach(([key, value]) => {
        updates[`socialLinks.${key}`] = value;
      });
      
      await updateDoc(userRef, updates);
      console.log(`✅ Updated social links for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Error updating user social links ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user's onboarding progress
   */
  async updateOnboardingProgress(userId: string, step: number, completedStep?: string): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as FirebaseUser;
        const completedSteps = userData.onboarding?.completedSteps || [];
        
        if (completedStep && !completedSteps.includes(completedStep)) {
          completedSteps.push(completedStep);
        }
        
        const updates: any = {
          'onboarding.currentStep': step,
          'onboarding.completedSteps': completedSteps,
          updatedAt: serverTimestamp()
        };
        
        // Mark onboarding as completed if it's the final step
        if (step >= 5) { // Assuming 5 onboarding steps
          updates['onboarding.completed'] = true;
          updates['onboarding.completedAt'] = serverTimestamp();
        }
        
        await updateDoc(userRef, updates);
        console.log(`✅ Updated onboarding progress for user: ${userId}`);
      }
    } catch (error) {
      console.error(`❌ Error updating onboarding progress ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(userId: string, featureName: string): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as FirebaseUser;
        const featuresUsed = userData.activity?.featuresUsed || {};
        const lastSeenFeatures = userData.activity?.lastSeenFeatures || [];
        
        // Increment usage count
        featuresUsed[featureName] = (featuresUsed[featureName] || 0) + 1;
        
        // Add to recently seen features (keep last 10)
        if (!lastSeenFeatures.includes(featureName)) {
          lastSeenFeatures.unshift(featureName);
          if (lastSeenFeatures.length > 10) {
            lastSeenFeatures.pop();
          }
        }
        
        await updateDoc(userRef, {
          'activity.featuresUsed': featuresUsed,
          'activity.lastSeenFeatures': lastSeenFeatures,
          'activity.lastActiveAt': serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(`❌ Error tracking feature usage ${userId}:`, error);
    }
  }

  /**
   * Update user's workspace settings
   */
  async updateUserWorkspace(userId: string, workspaceUpdates: Partial<FirebaseUser['workspace']>): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      const updates: any = {
        updatedAt: serverTimestamp()
      };
      
      // Add workspace updates with proper field paths
      Object.entries(workspaceUpdates).forEach(([key, value]) => {
        updates[`workspace.${key}`] = value;
      });
      
      await updateDoc(userRef, updates);
      console.log(`✅ Updated workspace settings for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Error updating user workspace ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user's security settings
   */
  async updateUserSecurity(userId: string, securityUpdates: Partial<FirebaseUser['security']>): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      const updates: any = {
        updatedAt: serverTimestamp()
      };

      // Add security updates with proper field paths
      Object.entries(securityUpdates).forEach(([key, value]) => {
        updates[`security.${key}`] = value;
      });

      await updateDoc(userRef, updates);
      console.log(`✅ Updated security settings for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Error updating user security ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Add or update API key for user
   */
  async updateUserAPIKey(userId: string, apiKeyData: FirebaseUser['apiKeys'][0]): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as FirebaseUser;
        const apiKeys = userData.apiKeys || [];
        
        // Find existing API key or add new one
        const existingIndex = apiKeys.findIndex(key => key.id === apiKeyData.id);
        if (existingIndex >= 0) {
          apiKeys[existingIndex] = { ...apiKeys[existingIndex], ...apiKeyData };
        } else {
          apiKeys.push({
            ...apiKeyData,
            createdAt: serverTimestamp() as Timestamp
          });
        }
        
        await updateDoc(userRef, {
          apiKeys,
          updatedAt: serverTimestamp()
        } as any);
        
        console.log(`✅ Updated API key for user: ${userId}`);
      }
    } catch (error) {
      console.error(`❌ Error updating user API key ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Remove API key for user
   */
  async removeUserAPIKey(userId: string, apiKeyId: string): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as FirebaseUser;
        const apiKeys = userData.apiKeys?.filter(key => key.id !== apiKeyId) || [];
        
        await updateDoc(userRef, {
          apiKeys,
          updatedAt: serverTimestamp()
        } as any);
        
        console.log(`✅ Removed API key for user: ${userId}`);
      }
    } catch (error) {
      console.error(`❌ Error removing user API key ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Add or update integration for user
   */
  async updateUserIntegration(userId: string, integrationData: FirebaseUser['integrations'][0]): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as FirebaseUser;
        const integrations = userData.integrations || [];
        
        // Find existing integration or add new one
        const existingIndex = integrations.findIndex(integration => integration.id === integrationData.id);
        if (existingIndex >= 0) {
          integrations[existingIndex] = { ...integrations[existingIndex], ...integrationData };
        } else {
          integrations.push(integrationData);
        }
        
        await updateDoc(userRef, {
          integrations,
          updatedAt: serverTimestamp()
        } as any);
        
        console.log(`✅ Updated integration for user: ${userId}`);
      }
    } catch (error) {
      console.error(`❌ Error updating user integration ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's current usage limits based on their plan
   */
  async getUserLimits(userId: string): Promise<FirebaseUser['usage']['limits'] | null> {
    try {
      const user = await this.getUser(userId);
      if (!user) return null;
      
      return user.usage.limits;
    } catch (error) {
      console.error(`❌ Error getting user limits ${userId}:`, error);
      return null;
    }
  }

  /**
   * Check if user has reached any usage limits
   */
  async checkUsageLimits(userId: string): Promise<{
    withinLimits: boolean;
    limitWarnings: string[];
  }> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        return { withinLimits: true, limitWarnings: [] };
      }
      
      const { usage } = user;
      const warnings: string[] = [];
      
      // Check each limit
      if (usage.tokensUsed >= usage.limits.tokensPerMonth * 0.9) {
        warnings.push('Token usage is approaching monthly limit');
      }
      if (usage.apiCallsThisMonth >= usage.limits.apiCallsPerMonth * 0.9) {
        warnings.push('API call usage is approaching monthly limit');
      }
      if (usage.workflowsCreated >= usage.limits.workflowsMax) {
        warnings.push('Maximum number of workflows reached');
      }
      if (usage.storageUsed >= usage.limits.storageLimit * 0.9) {
        warnings.push('Storage usage is approaching limit');
      }
      
      return {
        withinLimits: warnings.length === 0,
        limitWarnings: warnings
      };
    } catch (error) {
      console.error(`❌ Error checking usage limits ${userId}:`, error);
      return { withinLimits: true, limitWarnings: [] };
    }
  }
}

// Export singleton instance
export const userSyncService = new UserSyncService();

// FirebaseUser type is already exported above
