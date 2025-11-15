'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { userSyncService, FirebaseUser } from './userSync';

export interface UserProfileData {
  // Core user info
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  
  // Extended profile
  profile: FirebaseUser['profile'];
  socialLinks: FirebaseUser['socialLinks'];
  preferences: FirebaseUser['preferences'];
  subscription: FirebaseUser['subscription'];
  usage: FirebaseUser['usage'];
  security: FirebaseUser['security'];
  onboarding: FirebaseUser['onboarding'];
  activity: FirebaseUser['activity'];
  workspace: FirebaseUser['workspace'];
  apiKeys: FirebaseUser['apiKeys'];
  integrations: FirebaseUser['integrations'];
  
  // Computed values
  initials: string;
  fullName: string;
  memberSince: Date;
  isVerified: boolean;
}

export function useUserProfile() {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  // Transform Firebase user to component-friendly format
  const transformUserData = useCallback((firebaseUser: FirebaseUser): UserProfileData => {
    const fullName = firebaseUser.profile.firstName && firebaseUser.profile.lastName
      ? `${firebaseUser.profile.firstName} ${firebaseUser.profile.lastName}`
      : firebaseUser.displayName || firebaseUser.email.split('@')[0];

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
      
      profile: firebaseUser.profile,
      socialLinks: firebaseUser.socialLinks,
      preferences: firebaseUser.preferences,
      subscription: firebaseUser.subscription,
      usage: firebaseUser.usage,
      security: firebaseUser.security,
      onboarding: firebaseUser.onboarding,
      activity: firebaseUser.activity,
      workspace: firebaseUser.workspace,
      apiKeys: firebaseUser.apiKeys,
      integrations: firebaseUser.integrations,
      
      initials: firebaseUser.profile.avatar.initials,
      fullName,
      memberSince: firebaseUser.createdAt.toDate(),
      isVerified: firebaseUser.emailVerified && firebaseUser.subscription.status === 'active'
    };
  }, []);

  // Load user profile data via React Query
  const loadUserProfile = useCallback(async (): Promise<UserProfileData | null> => {
    if (!authUser) return null;

    const firebaseUser = await userSyncService.getUser(authUser.uid);
    if (firebaseUser) {
      return transformUserData(firebaseUser);
    }

    console.log('User not found in Firestore, creating...');
    const newUser = await userSyncService.syncUser(authUser);
    return transformUserData(newUser);
  }, [authUser, transformUserData]);

  const {
    data: profileData,
    isLoading: loading,
    error,
  } = useQuery<UserProfileData | null>({
    queryKey: ['userProfile', authUser?.uid],
    queryFn: loadUserProfile,
    enabled: !!authUser,
    staleTime: 60 * 1000,
  });

  // Update profile information
  const updateProfile = useCallback(async (updates: Partial<FirebaseUser['profile']>) => {
    if (!authUser) return;

    try {
      await userSyncService.updateUserProfile(authUser.uid, updates);
      await queryClient.invalidateQueries({ queryKey: ['userProfile', authUser.uid] });
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
      return false;
    }
  }, [authUser, loadUserProfile]);

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<FirebaseUser['preferences']>) => {
    if (!authUser) return;

    try {
      await userSyncService.updateUserPreferences(authUser.uid, updates);
      await queryClient.invalidateQueries({ queryKey: ['userProfile', authUser.uid] });
      return true;
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError('Failed to update preferences');
      return false;
    }
  }, [authUser, loadUserProfile]);

  // Update social links
  const updateSocialLinks = useCallback(async (updates: Partial<FirebaseUser['socialLinks']>) => {
    if (!authUser) return;

    try {
      await userSyncService.updateUserSocialLinks(authUser.uid, updates);
      await queryClient.invalidateQueries({ queryKey: ['userProfile', authUser.uid] });
      return true;
    } catch (err) {
      console.error('Error updating social links:', err);
      setError('Failed to update social links');
      return false;
    }
  }, [authUser, loadUserProfile]);

  // Update onboarding progress
  const updateOnboarding = useCallback(async (step: number, completedStep?: string) => {
    if (!authUser) return;

    try {
      await userSyncService.updateOnboardingProgress(authUser.uid, step, completedStep);
      await queryClient.invalidateQueries({ queryKey: ['userProfile', authUser.uid] });
      return true;
    } catch (err) {
      console.error('Error updating onboarding:', err);
      setError('Failed to update onboarding');
      return false;
    }
  }, [authUser, loadUserProfile]);

  // Track feature usage
  const trackFeature = useCallback(async (featureName: string) => {
    if (!authUser) return;

    try {
      await userSyncService.trackFeatureUsage(authUser.uid, featureName);
      // Don't reload profile for feature tracking to avoid unnecessary API calls
    } catch (err) {
      console.error('Error tracking feature usage:', err);
      // Don't set error state for feature tracking
    }
  }, [authUser]);

  // Update workspace settings
  const updateWorkspace = useCallback(async (updates: Partial<FirebaseUser['workspace']>) => {
    if (!authUser) return;

    try {
      await userSyncService.updateUserWorkspace(authUser.uid, updates);
      await queryClient.invalidateQueries({ queryKey: ['userProfile', authUser.uid] });
      return true;
    } catch (err) {
      console.error('Error updating workspace:', err);
      setError('Failed to update workspace');
      return false;
    }
  }, [authUser, loadUserProfile]);

  // Manage API keys
  const updateAPIKey = useCallback(async (apiKeyData: FirebaseUser['apiKeys'][0]) => {
    if (!authUser) return;

    try {
      await userSyncService.updateUserAPIKey(authUser.uid, apiKeyData);
      await queryClient.invalidateQueries({ queryKey: ['userProfile', authUser.uid] });
      return true;
    } catch (err) {
      console.error('Error updating API key:', err);
      setError('Failed to update API key');
      return false;
    }
  }, [authUser, loadUserProfile]);

  const removeAPIKey = useCallback(async (apiKeyId: string) => {
    if (!authUser) return;

    try {
      await userSyncService.removeUserAPIKey(authUser.uid, apiKeyId);
      await queryClient.invalidateQueries({ queryKey: ['userProfile', authUser.uid] });
      return true;
    } catch (err) {
      console.error('Error removing API key:', err);
      setError('Failed to remove API key');
      return false;
    }
  }, [authUser, loadUserProfile]);

  // Manage integrations
  const updateIntegration = useCallback(async (integrationData: FirebaseUser['integrations'][0]) => {
    if (!authUser) return;

    try {
      await userSyncService.updateUserIntegration(authUser.uid, integrationData);
      await queryClient.invalidateQueries({ queryKey: ['userProfile', authUser.uid] });
      return true;
    } catch (err) {
      console.error('Error updating integration:', err);
      setError('Failed to update integration');
      return false;
    }
  }, [authUser, loadUserProfile]);

  // Update security settings
  const updateSecurity = useCallback(async (updates: Partial<FirebaseUser['security']>) => {
    if (!authUser) return;

    try {
      await userSyncService.updateUserSecurity(authUser.uid, updates);
      await queryClient.invalidateQueries({ queryKey: ['userProfile', authUser.uid] });
      return true;
    } catch (err) {
      console.error('Error updating security:', err);
      setError('Failed to update security');
      return false;
    }
  }, [authUser, loadUserProfile]);

  // Check usage limits
  const checkLimits = useCallback(async () => {
    if (!authUser) return { withinLimits: true, limitWarnings: [] };

    try {
      return await userSyncService.checkUsageLimits(authUser.uid);
    } catch (err) {
      console.error('Error checking usage limits:', err);
      return { withinLimits: true, limitWarnings: [] };
    }
  }, [authUser]);

  return {
    // Data
    profileData,
    loading,
    error: error ? 'Failed to load user profile' : null,
    
    // Actions
    updateProfile,
    updatePreferences,
    updateSocialLinks,
    updateWorkspace,
    updateAPIKey,
    removeAPIKey,
    updateIntegration,
    updateOnboarding,
    trackFeature,
    checkLimits,
    refreshProfile: () => queryClient.invalidateQueries({ queryKey: ['userProfile', authUser?.uid] }),
    updateSecurity,
    
    // Computed helpers
    isNewUser: profileData?.onboarding && !profileData.onboarding.completed,
    isPremiumUser: profileData?.subscription && ['pro', 'enterprise'].includes(profileData.subscription.plan),
    needsEmailVerification: profileData ? !profileData.emailVerified : false,
    
    // Quick access to commonly used data
    displayName: profileData?.fullName || profileData?.email?.split('@')[0] || 'User',
    initials: profileData?.initials || 'U',
    avatar: profileData?.profile.avatar || { url: null, initials: 'U' },
    plan: profileData?.subscription.plan || 'free',
    theme: profileData?.preferences.theme || 'dark'
  };
}

// Export types for use in components
export type { FirebaseUser } from './userSync';