# User Synchronization Setup Guide

This guide explains how to set up and use the Clerk to Firebase user synchronization system in NexAgent.

## 🎯 Overview

The user sync system automatically syncs user data from Clerk (authentication provider) to Firebase Firestore. This provides:

- **Data ownership**: Store user data in your own database
- **Custom fields**: Add NexAgent-specific user properties
- **Relationships**: Link users to workflows, executions, etc.
- **Analytics**: Better insights into user behavior
- **Offline access**: Query user data without external API calls

## 🏗️ Architecture

```
Clerk (Auth) ──────────┐
                       ├──→ User Sync Service ──→ Firebase Firestore
Webhook Events ────────┘
```

## 📁 File Structure

```
lib/
├── userSync.ts          # Main sync service
├── userSyncUtils.ts     # Utility functions
└── firebase.ts          # Firebase config

app/api/webhooks/clerk/
└── route.ts             # Webhook handler

scripts/
└── syncUsers.ts         # Bulk sync script

firestore.rules          # Security rules
```

## 🔧 Setup Instructions

### 1. Environment Variables

Add these to your `.env.local`:

```env
# Clerk Configuration (already configured)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_secret

# Add this for webhooks
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret

# Firebase Configuration (already configured)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
# ... other Firebase vars
```

### 2. Configure Clerk Webhooks

1. Go to [Clerk Dashboard](https://dashboard.clerk.dev)
2. Navigate to **Webhooks** section
3. Create a new webhook endpoint:
   - **URL**: `https://your-domain.com/api/webhooks/clerk`
   - **Events**: Select these events:
     - `user.created`
     - `user.updated`
     - `user.deleted`
     - `session.created` (optional)

4. Copy the webhook secret and add it to your `.env.local`

### 3. Deploy Firestore Security Rules

```bash
# Install Firebase CLI if not installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not done)
firebase init firestore

# Deploy security rules
firebase deploy --only firestore:rules
```

### 4. Initial User Sync (Optional)

To sync existing Clerk users to Firebase:

```bash
# Run the bulk sync script
npm run build  # Ensure TypeScript is compiled
npx tsx scripts/syncUsers.ts
```

## 🚀 Usage

### Basic User Operations

```typescript
import { userSyncService, FirebaseUser } from '@/lib/userSync';

// Get user by Clerk ID
const user = await userSyncService.getUser('clerk_user_id');

// Get user by email
const user = await userSyncService.getUserByEmail('user@example.com');

// Update user custom data
await userSyncService.updateUserData('clerk_user_id', {
  subscription: {
    plan: 'pro',
    status: 'active'
  },
  preferences: {
    theme: 'dark',
    notifications: true,
    language: 'en'
  }
});

// Increment usage metrics
await userSyncService.incrementUsage('clerk_user_id', 'tokensUsed', 100);
await userSyncService.incrementUsage('clerk_user_id', 'workflowsCreated');
```

### Using Utility Functions

```typescript
import { 
  calculateSubscriptionStatus,
  checkUsageLimits,
  generateUserInitials 
} from '@/lib/userSyncUtils';

const user = await userSyncService.getUser('clerk_user_id');

if (user) {
  // Check subscription status
  const subscription = calculateSubscriptionStatus(user);
  console.log('Is Pro user:', subscription.isPro);
  
  // Check usage limits
  const limits = checkUsageLimits(user);
  if (limits.tokensExceeded) {
    console.log('User exceeded token limit');
  }
  
  // Generate initials for avatar
  const initials = generateUserInitials(
    user.firstName, 
    user.lastName, 
    user.email
  );
}
```

### In React Components

```typescript
'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { userSyncService, FirebaseUser } from '@/lib/userSync';

export default function UserProfile() {
  const { userId } = useAuth();
  const [userData, setUserData] = useState<FirebaseUser | null>(null);
  
  useEffect(() => {
    if (userId) {
      userSyncService.getUser(userId).then(setUserData);
    }
  }, [userId]);
  
  const updatePreferences = async (theme: 'dark' | 'light') => {
    if (userId) {
      await userSyncService.updateUserData(userId, {
        preferences: { ...userData?.preferences, theme }
      });
      // Refresh data
      const updated = await userSyncService.getUser(userId);
      setUserData(updated);
    }
  };
  
  if (!userData) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Welcome, {userData.fullName}</h1>
      <p>Plan: {userData.subscription?.plan}</p>
      <p>Tokens used: {userData.usage?.tokensUsed}</p>
      
      <button onClick={() => updatePreferences('dark')}>
        Switch to Dark Theme
      </button>
    </div>
  );
}
```

## 🗂️ Data Structure

### Firebase User Document

```typescript
interface FirebaseUser {
  // Basic Clerk data
  id: string;                    // Clerk user ID
  clerkId: string;              // Same as id
  email: string;                // Primary email
  firstName: string | null;     // First name
  lastName: string | null;      // Last name
  fullName: string;            // Generated display name
  username: string | null;     // Username
  imageUrl: string;           // Profile image URL
  phoneNumber: string | null; // Phone number
  emailVerified: boolean;     // Email verification status
  
  // Timestamps
  createdAt: Timestamp;       // User creation date
  updatedAt: Timestamp;       // Last update date
  lastSignInAt: Timestamp | null; // Last sign-in
  
  // NexAgent-specific fields
  subscription?: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'canceled' | 'past_due';
    currentPeriodEnd?: Timestamp;
  };
  
  usage?: {
    tokensUsed: number;
    workflowsCreated: number;
    apiCallsThisMonth: number;
  };
  
  preferences?: {
    theme: 'dark' | 'light';
    notifications: boolean;
    language: string;
  };
  
  metadata?: Record<string, any>;
}
```

## 🔒 Security

### Firestore Rules Summary

- **Users can only read/update their own data**
- **Limited update fields** (no subscription/usage changes from client)
- **Server-side sync only** for user creation/deletion
- **Admin access** for dashboard features (if needed)
- **Workflow isolation** per user

### Best Practices

1. **Never expose sensitive data** in client-side code
2. **Use server actions** for subscription changes
3. **Validate all user input** using utility functions
4. **Monitor usage limits** before allowing operations
5. **Log all important user actions**

## 🧪 Testing

### Test Webhook Endpoint

```bash
# Test webhook health
curl https://your-domain.com/api/webhooks/clerk

# Expected response:
{
  "status": "healthy",
  "service": "Clerk webhook handler",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Test User Sync

```typescript
// In your development environment
import { syncAllUsers } from '@/scripts/syncUsers';

// This will sync all Clerk users to Firebase
const results = await syncAllUsers();
console.log(`Synced ${results.synced}/${results.total} users`);
```

## 📊 Monitoring

### Key Metrics to Monitor

- **Sync success rate**: Track webhook processing success
- **User growth**: Monitor user registrations via Firebase
- **Usage patterns**: Track token usage, workflow creation
- **Error rates**: Monitor sync failures

### Logging

All sync operations are logged with:
- ✅ Success indicators
- ❌ Error messages with details
- 📊 Operation metadata (execution time, etc.)

## 🚨 Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check webhook URL is correct
   - Verify CLERK_WEBHOOK_SECRET is set
   - Check Clerk dashboard webhook configuration

2. **Firebase permission errors**
   - Ensure Firebase config is correct
   - Check Firestore security rules
   - Verify service account permissions

3. **User data not syncing**
   - Check webhook logs in Vercel/deployment platform
   - Verify Firebase Firestore rules allow writes
   - Check for validation errors in logs

### Debug Mode

Set environment variable for detailed logging:
```env
DEBUG_USER_SYNC=true
```

## 🔄 Migration from Existing System

If you have existing user data:

1. **Export existing user data** to JSON format
2. **Run bulk sync script** to populate Firebase
3. **Update existing workflows** to use Firebase user IDs
4. **Test thoroughly** before deploying to production

## 🎯 Next Steps

After setup, consider:

1. **Add usage analytics** tracking
2. **Implement subscription management**
3. **Set up automated billing** integration
4. **Add user activity logging**
5. **Create admin dashboard** for user management

## 📞 Support

For issues:
1. Check this documentation
2. Review application logs
3. Test webhook endpoint manually
4. Verify Firebase configuration
5. Check Clerk dashboard settings