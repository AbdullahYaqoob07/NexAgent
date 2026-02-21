# NexAgent Plan System & Workflow Limits

## Overview

NexAgent implements a tiered subscription plan system with different limits based on the user's plan. By default, all new users start with a **30-day trial period** with limited features.

---

## Plan Types

### 1. **Trial Plan** (Default)
- **Duration**: 30 days from signup
- **Workflow Limit**: 5 workflows maximum
- **Status**: `trialing`
- **Automatically assigned**: Yes (on user signup)

When users sign up, they are automatically placed on a trial plan with:
- `subscription.plan`: `"trial"`
- `subscription.status`: `"trialing"`
- `subscription.trial_ends_at`: `(signup date + 30 days)`
- `usage.limits.workflowsMax`: `5`

### 2. **Free Plan**
- **Workflow Limit**: 5 workflows maximum
- **Status**: `active`
- **Cost**: $0/month

### 3. **Basic Plan** (Future)
- **Workflow Limit**: 25 workflows
- **Status**: `active`
- **Cost**: TBD

### 4. **Pro Plan** (Future)
- **Workflow Limit**: 100 workflows
- **Status**: `active`
- **Cost**: TBD

### 5. **Enterprise Plan** (Future)
- **Workflow Limit**: Unlimited
- **Status**: `active`
- **Cost**: Custom pricing

---

## How It Works

### 1. User Signup
When a user creates an account through `/api/v1/auth/signup`:

```python
# File: backend/app/services/firebase_service.py
'subscription': {
    'plan': 'trial',  # Default plan
    'status': 'trialing',
    'trial_ends_at': datetime.now() + timedelta(days=30),  # 30 days from now
    ...
}

'usage': {
    'totalWorkflows': 0,
    'limits': {
        'workflowsMax': 5,  # Trial plan allows 5 workflows
        ...
    }
}
```

### 2. Workflow Creation
When a user attempts to create a workflow through `/api/v1/workflows` (POST):

```python
# File: backend/app/services/workflow_service.py

# Check if user has reached their workflow limit
current_workflows = user.usage.totalWorkflows
max_workflows = user.usage.limits.workflowsMax

if current_workflows >= max_workflows:
    return {
        'success': False,
        'error': f'Workflow limit reached. Your {plan} plan allows up to {max_workflows} workflows.',
        'limit_reached': True,
        'current_count': current_workflows,
        'max_allowed': max_workflows,
        'plan': current_plan
    }
```

### 3. API Response
When the limit is reached, the API returns:

**HTTP Status**: `403 Forbidden`

**Response Body**:
```json
{
  "detail": {
    "message": "Workflow limit reached. Your trial plan allows up to 5 workflows. Please upgrade your plan to create more workflows.",
    "limit_reached": true,
    "current_count": 5,
    "max_allowed": 5,
    "plan": "trial"
  }
}
```

---

## Implementation Details

### Modified Files

1. **`backend/app/services/firebase_service.py`**
   - Sets default plan to `'trial'` during user creation
   - Sets trial expiration to 30 days from signup
   - Initializes workflow limit to 5

2. **`backend/app/services/workflow_service.py`**
   - Validates workflow count against plan limits before creation
   - Returns detailed error information when limit is reached
   - Includes plan information in error response

3. **`backend/app/api/v1/workflows.py`**
   - Handles workflow limit errors with 403 Forbidden status
   - Provides structured error response for frontend

4. **`backend/USER_DATA_STRUCTURE.md`**
   - Updated documentation to reflect trial plan defaults

---

## User Data Structure

```javascript
{
  "subscription": {
    "plan": "trial",  // Current plan
    "status": "trialing",  // Subscription status
    "trial_ends_at": Timestamp,  // When trial expires
    "billing_cycle": "monthly",
    ...
  },
  
  "usage": {
    "totalWorkflows": 3,  // Current workflow count
    "limits": {
      "workflowsMax": 5,  // Maximum allowed workflows
      ...
    }
  }
}
```

---

## Frontend Integration

### Handling Workflow Limit Errors

When the frontend receives a 403 error with `limit_reached: true`, it should:

1. **Display upgrade prompt** to the user
2. **Show current usage** (e.g., "You've used 5 of 5 workflows")
3. **Offer plan upgrade options** with pricing
4. **Link to billing/upgrade page**

### Example Frontend Code

```typescript
try {
  await workflowApi.createWorkflow(workflowData);
} catch (error) {
  if (error.response?.status === 403) {
    const details = error.response.data.detail;
    
    if (details.limit_reached) {
      // Show upgrade dialog
      showUpgradeDialog({
        message: details.message,
        currentCount: details.current_count,
        maxAllowed: details.max_allowed,
        currentPlan: details.plan
      });
    }
  }
}
```

---

## Testing

### Test Workflow Limit

1. **Create a test user**:
   ```bash
   POST /api/v1/auth/signup
   {
     "email": "test@example.com",
     "password": "testpass123",
     "display_name": "Test User"
   }
   ```

2. **Verify trial plan assignment**:
   - Check Firestore user document
   - Confirm `subscription.plan` is `"trial"`
   - Confirm `usage.limits.workflowsMax` is `5`

3. **Create 5 workflows**:
   ```bash
   POST /api/v1/workflows (x5)
   ```

4. **Attempt to create 6th workflow**:
   ```bash
   POST /api/v1/workflows
   ```
   
   **Expected Response**: `403 Forbidden` with limit error

---

## Plan Upgrades (Future Implementation)

When implementing plan upgrades:

1. **Update subscription in Firestore**:
   ```python
   user_ref.update({
       'subscription.plan': 'pro',
       'subscription.status': 'active',
       'subscription.trial_ends_at': None,
       'usage.limits.workflowsMax': 100,  # Updated limit
       'subscription.updated_at': firestore.SERVER_TIMESTAMP
   })
   ```

2. **Handle Stripe subscription**:
   - Create Stripe subscription
   - Update `stripeSubscriptionId`
   - Set billing cycle and next billing date

3. **Trial Expiration**:
   - Monitor `trial_ends_at` timestamp
   - Convert to free plan or downgrade when trial ends
   - Send email notifications before expiration

---

## Plan Limits Reference

| Plan       | Workflows | Tokens/Month | API Calls/Month | Executions/Month |
|------------|-----------|--------------|-----------------|------------------|
| Trial      | 5         | 10,000       | 1,000           | 500              |
| Free       | 5         | 10,000       | 1,000           | 500              |
| Basic      | 25        | 50,000       | 10,000          | 5,000            |
| Pro        | 100       | 250,000      | 50,000          | 25,000           |
| Enterprise | Unlimited | Unlimited    | Unlimited       | Unlimited        |

---

## Notes

- Trial period is 30 days from signup
- After trial expiration, users should be moved to free plan (or blocked until they upgrade)
- Workflow limit is enforced at creation time
- Users can still view/edit existing workflows even at limit
- Deleting a workflow decreases the count, allowing creation of new workflows

---

## Related Files

- `backend/app/services/firebase_service.py` - User creation with plan
- `backend/app/services/workflow_service.py` - Workflow limit validation
- `backend/app/api/v1/workflows.py` - API error handling
- `backend/USER_DATA_STRUCTURE.md` - Complete user data schema
- `backend/WORKFLOW_ENDPOINTS.md` - Workflow API documentation
