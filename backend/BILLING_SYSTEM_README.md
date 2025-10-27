# NexAgent Billing System

A comprehensive billing and subscription management system built with FastAPI, Firestore, and Stripe integration.

## 🚀 Features

### Core Functionality
- **Plan Management**: Create and manage subscription plans with flexible pricing
- **Subscription Management**: Full subscription lifecycle with Stripe integration
- **Usage Tracking**: Real-time usage monitoring with automatic limit enforcement
- **Admin Analytics**: Comprehensive billing analytics and reporting
- **Webhook Processing**: Automated Stripe webhook handling
- **Payment Integration**: Secure payment processing via Stripe

### Key Capabilities
- Multi-tier subscription plans (Free, Basic, Pro, Enterprise)
- Monthly/yearly billing cycles with trial periods
- Real-time usage tracking and limit enforcement
- Admin dashboard with MRR, churn, and user analytics
- Automated payment processing and dunning management
- Comprehensive audit trails and billing history

## 🏗️ Architecture

### Components
1. **Models** (`billing_models.py`) - Pydantic models for data validation
2. **Database Layer** (`billing_db.py`) - Firestore operations with caching
3. **Service Layer** (`billing_service.py`) - Business logic and Stripe integration
4. **API Routes** (`billing.py`) - RESTful endpoints
5. **Authentication** (`auth_dependency.py`) - JWT-based auth with role-based access

### Data Flow
```
Client Request → Auth Middleware → API Routes → Service Layer → Database Layer → Firestore/Stripe
```

## 📊 Data Models

### Plan Structure
```python
{
  "name": "Pro Plan",
  "plan_type": "pro",
  "price_monthly": 29.99,
  "price_yearly": 299.99,
  "limits": {
    "nexas_max": 50,
    "executions_per_month": 5000,
    "api_calls_per_month": 10000,
    "storage_gb": 100.0,
    "team_members": 10,
    "tokens_per_month": 1000000
  },
  "features": {
    "priority_support": true,
    "advanced_analytics": true,
    "custom_integrations": true
  }
}
```

### Subscription Structure
```python
{
  "user_id": "user_123",
  "plan_id": "plan_pro",
  "status": "active",
  "billing_cycle": "monthly",
  "current_period_start": "2024-01-01T00:00:00Z",
  "current_period_end": "2024-02-01T00:00:00Z",
  "stripe_subscription_id": "sub_xyz123"
}
```

### Usage Tracking
```python
{
  "user_id": "user_123",
  "metric": "nexas",
  "amount": 25,
  "period": "2024-01",
  "metadata": {"workflow_id": "wf_123"}
}
```

## 🔌 API Endpoints

### Plans
- `GET /api/billing/plans` - List all plans
- `GET /api/billing/plans/{plan_id}` - Get specific plan
- `POST /api/billing/plans` - Create plan (admin only)
- `PUT /api/billing/plans/{plan_id}` - Update plan (admin only)

### Subscriptions
- `POST /api/billing/subscriptions` - Create subscription
- `GET /api/billing/subscriptions/me` - Get user's subscription
- `PUT /api/billing/subscriptions/{id}` - Update subscription
- `DELETE /api/billing/subscriptions/me` - Cancel subscription

### Usage Tracking
- `POST /api/billing/usage/track` - Track usage
- `GET /api/billing/usage/me` - Get usage data
- `GET /api/billing/usage/check-limit` - Check usage limits

### Admin Operations
- `GET /api/billing/admin/analytics` - Get billing analytics
- `GET /api/billing/admin/users` - Get user list with billing info
- `GET /api/billing/admin/users/{user_id}/subscription` - Get user subscription
- `PUT /api/billing/admin/users/{user_id}/subscription` - Update user subscription

### Webhooks
- `POST /api/billing/webhooks/stripe` - Stripe webhook handler

## 🔧 Configuration

### Environment Variables
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# API Configuration
API_HOST=localhost
API_PORT=8000
DEBUG=True
LOG_LEVEL=INFO
```

### Firebase Collections
The system uses these Firestore collections:
- `billing_plans` - Subscription plans
- `billing_subscriptions` - User subscriptions
- `billing_usage` - Usage tracking data
- `billing_invoices` - Invoice records
- `billing_payment_methods` - Payment methods
- `billing_history` - Audit trails
- `users` - User documents (enhanced with billing fields)

## 🚀 Getting Started

### 1. Installation
```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Run the Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Create Default Plans
Use the admin API to create your subscription plans:
```bash
curl -X POST "http://localhost:8000/api/billing/plans" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pro Plan",
    "description": "Professional plan with advanced features",
    "plan_type": "pro",
    "price_monthly": 29.99,
    "price_yearly": 299.99,
    "limits": {
      "nexas_max": 50,
      "executions_per_month": 5000,
      "api_calls_per_month": 10000,
      "storage_gb": 100,
      "team_members": 10,
      "tokens_per_month": 1000000
    },
    "features": {
      "priority_support": true,
      "advanced_analytics": true,
      "custom_integrations": true,
      "sla_guarantee": false,
      "white_labeling": false,
      "api_access": true,
      "webhook_notifications": true
    },
    "is_popular": true,
    "trial_days": 14
  }'
```

## 📈 Usage Examples

### Track User Activity
```python
from app.services.billing_service import billing_service

# Track workflow execution
await billing_service.track_usage(UsageTrackingRequest(
    user_id="user_123",
    metric=UsageMetric.EXECUTIONS,
    amount=1,
    metadata={"workflow_id": "wf_abc123"}
))
```

### Check Usage Limits
```python
# Check if user can create more workflows
limit_check = await billing_service.check_usage_limit(
    user_id="user_123",
    metric=UsageMetric.NEXAS,
    additional_usage=1
)

if not limit_check['allowed']:
    raise HTTPException(status_code=429, detail="Usage limit exceeded")
```

### Create Subscription
```python
# Create new subscription for user
subscription = await billing_service.create_subscription(
    user_id="user_123",
    subscription_data=SubscriptionCreateRequest(
        plan_id="plan_pro",
        billing_cycle=BillingCycle.MONTHLY,
        start_trial=True
    )
)
```

## 🔍 Monitoring & Analytics

### Admin Analytics
Access comprehensive billing metrics:
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- User distribution by plan
- Churn rates and trends
- New subscriptions and cancellations
- Revenue breakdown by plan

### Usage Monitoring
Track and monitor:
- Real-time usage metrics
- Limit utilization percentages
- Usage trends and patterns
- Overage alerts and notifications

## 🧪 Testing

Run the test suite:
```bash
pytest tests/test_billing.py -v
```

Test coverage includes:
- Plan management operations
- Subscription lifecycle
- Usage tracking and limits
- Admin operations
- Webhook processing
- Database operations
- Service layer logic

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication via Firebase
- Role-based access control (user/admin)
- API key validation for webhooks
- Secure token handling

### Data Protection
- Encrypted Stripe communications
- Secure webhook signature verification
- PCI DSS compliant payment processing
- Audit trails for all billing operations

### Rate Limiting
- Usage-based rate limiting
- Plan-based resource restrictions
- Automatic limit enforcement
- Graceful degradation for overages

## 🚨 Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `402` - Payment Required
- `403` - Forbidden
- `404` - Not Found
- `429` - Usage Limit Exceeded
- `500` - Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "message": "Usage limit exceeded",
  "error": "USAGE_LIMIT_EXCEEDED",
  "status_code": 429,
  "details": {
    "current_usage": 95,
    "limit": 100,
    "metric": "nexas"
  }
}
```

## 📝 Logging

Comprehensive logging includes:
- User actions and API calls
- Billing events and state changes
- Stripe webhook processing
- Error tracking and debugging
- Performance metrics
- Security events

## 🔄 Webhook Events

Handled Stripe events:
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.created`

## 📋 TODO / Future Enhancements

- [ ] Invoice generation and PDF creation
- [ ] Payment method management
- [ ] Dunning management for failed payments
- [ ] Usage-based billing (metered billing)
- [ ] Team/organization billing
- [ ] Advanced analytics dashboard
- [ ] Integration with accounting systems
- [ ] Multi-currency support
- [ ] Promotional codes and discounts
- [ ] Customer portal integration

## 🤝 Contributing

1. Follow existing code patterns
2. Add tests for new functionality
3. Update documentation
4. Use type hints throughout
5. Follow PEP 8 style guidelines

## 📞 Support

For billing system support:
- Check the logs for detailed error information
- Review Stripe dashboard for payment issues
- Use admin analytics for usage insights
- Contact development team for technical issues

## 🎯 Performance Considerations

### Database Optimization
- Efficient Firestore indexing
- Cached frequently accessed data
- Batch operations for bulk updates
- Optimized query patterns

### Scalability
- Async/await throughout
- Connection pooling
- Rate limiting per plan
- Horizontal scaling support

### Monitoring
- Health check endpoints
- Performance metrics
- Error rate monitoring
- Usage trend analysis

---

**Note**: This billing system is production-ready with comprehensive error handling, security measures, and scalability considerations. Always test thoroughly in a staging environment before deploying to production.