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
  
  // Subscription Details (for /dashboard and billing pages)
  subscription: {
    plan: "trial",  // Options: trial, free, basic, pro, enterprise
    status: "trialing",  // trialing, active, cancelled, past_due, unpaid
    billing_cycle: "monthly",  // monthly, yearly
    startDate: Timestamp,
    endDate: null,
    next_billing_date: null,  // When next payment is due
    trial_ends_at: Timestamp + 30 days,  // Trial expiration date (30 days from signup)
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,    // Stripe customer ID (created at signup)
    stripeSubscriptionId: null, // Stripe subscription ID
    created_at: Timestamp,     // When subscription was created
    updated_at: Timestamp      // Last subscription change
  },
  
  // NOTE: By default, new users start with a 30-day 'trial' plan
  // Trial plan allows up to 5 workflows to be created
  
  // Usage Stats (for /dashboard page and billing)
  usage: {
    // Tokens
    tokensUsed: 0,
    tokensThisMonth: 0,
    
    // Workflows/NexAs (for /workflows page)
    totalWorkflows: 0,          // Total NexAs created (main billing metric)
    workflowsCreated: 0,        // NexAs created this period
    activeWorkflows: 0,         // Currently active NexAs
    
    // API Calls
    totalApiCalls: 0,
    apiCallsThisMonth: 0,
    apiCallsToday: 0,
    
    // Additional Billing Metrics
    storage_used_gb: 0.0,       // File storage usage
    team_members_count: 1,      // Team size (billing factor)
    integrations_count: 0,      // Connected services count
    executions_this_month: 0,   // Workflow executions this month
    
    // Performance Metrics (for /dashboard)
    successRate: 100,
    avgResponseTime: 0,
    totalExecutionTime: 0,
    
    // Billing Period Tracking
    last_reset_date: Timestamp,     // When monthly counters were last reset
    current_period_start: Timestamp, // Current billing period start
    current_period_end: null,       // Current billing period end
    
    // Plan Limits (enforced in real-time)
    limits: {
      tokensPerMonth: 10000,      // Free tier: 10k tokens
      workflowsMax: 5,            // Free tier: 5 NexAs (main limit!)
      apiCallsPerMonth: 1000,     // Free tier: 1k API calls
      executionsPerMonth: 500,    // Free tier: 500 executions
      storage_gb: 1,              // Free tier: 1GB storage
      team_members: 1             // Free tier: 1 team member
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

### Billing & Subscription (`/billing`)
**Uses:**
- `subscription.plan` - Current plan name
- `subscription.status` - Subscription status
- `subscription.next_billing_date` - Next payment date
- `subscription.billing_cycle` - Monthly/yearly billing
- `usage.totalWorkflows` - NexAs created (main billing metric)
- `usage.limits.workflowsMax` - Plan limit for NexAs
- `usage.executions_this_month` - Current usage
- `usage.storage_used_gb` - Storage consumption
- `usage.team_members_count` - Team size

**Initialized with:**
- Free plan with 5 NexA limit
- Active subscription status
- Monthly billing cycle
- All usage counters at 0
- Stripe customer ID ready for payments

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
| **NexAs (Workflows)** | **5** |
| Tokens per month | 10,000 |
| API calls per month | 1,000 |
| Workflow executions per month | 500 |
| File storage | 1 GB |
| Team members | 1 (owner only) |

### Typical Plan Progression:

| Plan | NexAs | Executions/Month | Storage | Price |
|------|-------|------------------|---------|-------|
| **Free** | 5 | 500 | 1 GB | $0 |
| **Basic** | 25 | 1,000 | 10 GB | $19/month |
| **Pro** | 100 | 10,000 | 100 GB | $49/month |
| **Enterprise** | Unlimited | Unlimited | 1 TB | $199/month |

## Future Enhancements

### When User Creates Workflow (with Limit Check)
```javascript
// Check limit before creation
const currentCount = usage.totalWorkflows;
const limit = usage.limits.workflowsMax;

if (currentCount >= limit) {
  throw new Error(`NexA limit reached (${limit}). Upgrade your plan to create more.`);
}

// Update usage stats
usage.totalWorkflows += 1
usage.workflowsCreated += 1
usage.activeWorkflows += 1
```

### When User Upgrades Plan
```javascript
// Update subscription
subscription.plan = "basic";
subscription.updated_at = Timestamp;
subscription.next_billing_date = calculateNextBilling();

// Update limits
usage.limits = {
  workflowsMax: 25,        // Basic plan: 25 NexAs
  executionsPerMonth: 1000,
  storage_gb: 10,
  team_members: 3
};
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
usage.integrations_count += 1  // Track for billing
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

### Monthly Billing Reset (Runs on user's billing date)
```javascript
// Reset monthly counters
usage.tokensThisMonth = 0
usage.apiCallsThisMonth = 0
usage.executions_this_month = 0
usage.workflowsCreated = 0

// Update billing period tracking
usage.last_reset_date = Timestamp
usage.current_period_start = Timestamp
usage.current_period_end = calculatePeriodEnd(subscription.billing_cycle)

// Update next billing date
subscription.next_billing_date = calculateNextBilling(subscription.billing_cycle)
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
✅ **Billing ready** - Stripe integration fields, usage limits, plan tracking  
✅ **Limit enforcement** - Real-time usage checks against plan limits  
✅ **Scalable** - Easy to add new fields and features  

### Billing Integration Benefits:
- 🎯 **NexA Limits**: Free users get 5 NexAs, enforced in real-time
- 💳 **Stripe Ready**: Customer ID created at signup for seamless payments
- 📊 **Usage Tracking**: All billing metrics tracked from day one
- 🚀 **Upgrade Flow**: Smooth plan transitions with limit updates
- 🔄 **Billing Cycles**: Monthly/yearly billing with automatic resets

Your users will have a smooth experience from signup through their entire journey! 🚀
