# User Data Structure

## Overview

When a user signs up, a comprehensive user document is created in Firestore with all the necessary fields to support the entire application. This ensures all dashboard pages, profile pages, and features have the data they need from day one.

## Complete User Document Structure

```javascript
{
  // Core Identity
  uid: "firebase_user_id",
  email: "user@example.com",
  displayName: "John Doe",
  photoURL: null,
  emailVerified: false,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastLoginAt: Timestamp,
  
  // Profile Information (for /profile page)
  profile: {
    firstName: "John",
    lastName: "Doe",
    bio: null,
    company: null,
    jobTitle: null,
    location: null,
    timezone: "UTC",
    language: "en",
    avatar: {
      url: null,
      initials: "JD"  // Generated from name
    }
  },
  
  // Social Links (for /profile page)
  socialLinks: {
    twitter: null,
    linkedin: null,
    github: null,
    website: null
  },
  
  // Subscription Details (for /dashboard and all pages)
  subscription: {
    plan: "free",  // Options: free, pro, enterprise
    status: "active",
    startDate: Timestamp,
    endDate: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null
  },
  
  // Usage Stats (for /dashboard page)
  usage: {
    // Tokens
    tokensUsed: 0,
    tokensThisMonth: 0,
    
    // Workflows (for /workflows page)
    totalWorkflows: 0,
    workflowsCreated: 0,
    activeWorkflows: 0,
    
    // API Calls
    totalApiCalls: 0,
    apiCallsThisMonth: 0,
    apiCallsToday: 0,
    
    // Performance Metrics (for /dashboard)
    successRate: 100,
    avgResponseTime: 0,
    totalExecutionTime: 0,
    
    // Limits (based on subscription plan)
    limits: {
      tokensPerMonth: 10000,      // Free tier: 10k tokens
      workflowsMax: 5,             // Free tier: 5 workflows
      apiCallsPerMonth: 1000,      // Free tier: 1k API calls
      executionsPerMonth: 500      // Free tier: 500 executions
    }
  },
  
  // Security Settings (for /profile security tab)
  security: {
    twoFactorEnabled: false,
    twoFactorMethod: null,
    backupCodes: [],
    lastPasswordChange: Timestamp,
    sessionTimeout: 604800,  // 1 week in seconds
    ipWhitelist: [],
    loginNotifications: true
  },
  
  // Onboarding Progress (for onboarding flow)
  onboarding: {
    completed: false,
    currentStep: 0,
    completedSteps: [],
    skipped: false,
    startedAt: Timestamp,
    completedAt: null
  },
  
  // Activity Tracking (for analytics)
  activity: {
    lastSeen: Timestamp,
    lastActiveFeature: null,
    featureUsage: {},
    sessionCount: 1,
    totalTimeSpent: 0
  },
  
  // Workspace Settings (for team features)
  workspace: {
    name: "John Doe's Workspace",
    description: null,
    members: [],
    roles: ["owner"],
    settings: {
      defaultWorkflowVisibility: "private",
      allowSharing: false,
      requireApproval: true
    }
  },
  
  // User Preferences (for UI customization)
  preferences: {
    theme: "dark",
    language: "en",
    timezone: "UTC",
    emailNotifications: true,
    pushNotifications: false,
    weeklyReports: true,
    marketingEmails: false,
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h"
  },
  
  // API Keys (for /tokens page) - empty array initially
  apiKeys: [],
  
  // Integrations (for /credentials page) - empty array initially
  integrations: [],
  
  // Credentials Count (for /credentials page)
  credentialsCount: 0
}
```

## Data Usage by Page

### Dashboard (`/dashboard`)
**Uses:**
- `displayName` - Welcome message
- `usage.totalWorkflows` - Workflows stat card
- `usage.workflowsCreated` - Monthly workflows stat
- `usage.totalApiCalls` - API calls stat card
- `usage.apiCallsThisMonth` - Monthly API calls stat
- `usage.tokensUsed` - Tokens stat card
- `usage.limits.tokensPerMonth` - Token limit display
- `usage.successRate` - Success rate stat
- `usage.avgResponseTime` - Response time stat

**Initialized with:**
- All `usage.*` fields set to `0`
- `limits.*` fields set to free tier values
- `successRate` set to `100%`

### Workflows (`/workflows`)
**Uses:**
- `usage.totalWorkflows` - Workflow count display
- `usage.workflowsCreated` - Monthly workflow count

**Initialized with:**
- `totalWorkflows: 0`
- `workflowsCreated: 0`
- `activeWorkflows: 0`

### Credentials (`/credentials`)
**Uses:**
- `credentialsCount` - Number of connected services
- `integrations[]` - List of connected platforms

**Initialized with:**
- `credentialsCount: 0`
- `integrations: []` (empty array)

### Tokens (`/tokens`)
**Uses:**
- `apiKeys[]` - List of API tokens/keys

**Initialized with:**
- `apiKeys: []` (empty array)

### Profile (`/profile`)
**Uses:**
- `profile.firstName` - First name
- `profile.lastName` - Last name
- `profile.bio` - User bio
- `profile.company` - Company name
- `profile.jobTitle` - Job title
- `profile.location` - Location
- `profile.avatar.url` - Profile picture
- `profile.avatar.initials` - Avatar initials
- `socialLinks.*` - Social media links
- `preferences.*` - UI preferences
- `security.*` - Security settings
- `subscription.*` - Subscription details

**Initialized with:**
- `firstName` and `lastName` extracted from `displayName`
- All optional fields set to `null`
- `avatar.initials` generated from name/email
- `preferences` set to sensible defaults
- `security` set to default security settings
- `subscription` set to free tier

## Benefits of This Approach

### 1. **No Null Reference Errors**
- All pages have guaranteed data structure
- No need to check if fields exist
- Frontend can safely access nested properties

### 2. **Consistent Experience**
- New users see "0 workflows" instead of errors
- Empty states display correctly
- Statistics show meaningful defaults (e.g., 100% success rate)

### 3. **Easy Feature Addition**
- New features can check existing fields
- Usage tracking works from day one
- Analytics have complete data

### 4. **Better UX**
- Dashboard loads immediately with data
- No "loading indefinitely" states
- Users see their stats grow from zero

## Free Tier Limits

Default limits for new users (can be upgraded):

| Resource | Free Tier Limit |
|----------|----------------|
| Tokens per month | 10,000 |
| Maximum workflows | 5 |
| API calls per month | 1,000 |
| Workflow executions per month | 500 |

## Future Enhancements

### When User Creates First Workflow
```javascript
// Update usage stats
usage.totalWorkflows += 1
usage.workflowsCreated += 1
usage.activeWorkflows += 1
```

### When User Connects Integration
```javascript
// Add to integrations array
integrations.push({
  id: "cred_123",
  platform: "shopify",
  name: "My Store",
  status: "active",
  connectedAt: Timestamp
})

credentialsCount += 1
```

### When User Creates API Key
```javascript
// Add to apiKeys array
apiKeys.push({
  id: "key_123",
  name: "Production API Key",
  keyPreview: "nx_prod_abc",
  status: "active",
  environment: "production",
  scopes: ["workflows:read", "workflows:execute"],
  rateLimit: 1000,
  createdAt: Timestamp,
  lastUsed: null
})
```

## Data Cleanup

### Monthly Reset (Runs on 1st of each month)
```javascript
usage.tokensThisMonth = 0
usage.apiCallsThisMonth = 0
usage.workflowsCreated = 0
```

### Session Cleanup (Runs daily)
- Remove expired sessions from `user_sessions` collection
- Update `activity.lastSeen` timestamp
- Clean up old `featureUsage` tracking data

## Summary

✅ **Complete data structure** - All fields initialized on signup  
✅ **Zero values** - Counters start at 0, ready to increment  
✅ **Empty arrays** - API keys, integrations, credentials ready to populate  
✅ **Sensible defaults** - Theme, preferences, security settings configured  
✅ **No null errors** - All pages work immediately after signup  
✅ **Scalable** - Easy to add new fields and features  

Your users will have a smooth experience from signup through their entire journey! 🚀
