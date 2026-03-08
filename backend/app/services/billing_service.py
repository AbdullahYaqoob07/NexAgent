from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from decimal import Decimal
import logging
import asyncio
from contextlib import asynccontextmanager

import stripe
from fastapi import HTTPException
from app.db.billing_db import billing_db
from app.models.billing_models import (
    PlanCreateRequest, PlanUpdateRequest, PlanResponse,
    SubscriptionCreateRequest, SubscriptionResponse, SubscriptionUpdateRequest,
    UsageResponse, UsageTrackingRequest, UsageMetric,
    InvoiceResponse, PaymentMethodResponse,
    AdminAnalyticsResponse, AdminUserListResponse,
    WebhookEventResponse, BillingCycle, SubscriptionStatus, PlanType
)
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class BillingService:
    """
    Service layer for billing operations
    
    Handles business logic, Stripe integration, and data validation
    while delegating database operations to BillingDatabase
    """
    
    def __init__(self):
        self.db = billing_db
        self._webhook_handlers = {
            'invoice.payment_succeeded': self._handle_payment_succeeded,
            'invoice.payment_failed': self._handle_payment_failed,
            'customer.subscription.updated': self._handle_subscription_updated,
            'customer.subscription.deleted': self._handle_subscription_deleted,
            'invoice.created': self._handle_invoice_created
        }
    
    # =============================================================================
    # PLAN MANAGEMENT
    # =============================================================================
    
    async def create_plan(self, plan_data: PlanCreateRequest, created_by: str) -> PlanResponse:
        """Create a new billing plan with Stripe price objects"""
        try:
            # Create Stripe price objects
            stripe_prices = await self._create_stripe_prices(plan_data)
            
            # Create plan in database
            plan_id = await self.db.create_plan(plan_data, created_by)
            
            # Update with Stripe price IDs
            await self.db.update_plan(plan_id, {
                'stripe_price_monthly_id': stripe_prices['monthly'],
                'stripe_price_yearly_id': stripe_prices['yearly']
            })
            
            # Get the created plan
            plan_doc = await self.db.get_plan_by_id(plan_id)
            if not plan_doc:
                raise HTTPException(status_code=500, detail="Plan created but could not be retrieved")
            
            return PlanResponse(**plan_doc)
            
        except stripe.StripeError as e:
            logger.error(f"Stripe error creating plan: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Payment provider error: {str(e)}")
        except Exception as e:
            logger.error(f"Error creating plan: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_plan(self, plan_id: str) -> Optional[PlanResponse]:
        """Get plan by ID"""
        try:
            plan_doc = await self.db.get_plan_by_id(plan_id)
            if not plan_doc:
                return None
            
            return PlanResponse(**plan_doc)
            
        except Exception as e:
            logger.error(f"Error getting plan {plan_id}: {str(e)}")
            return None
    
    async def get_all_plans(self, active_only: bool = True) -> List[PlanResponse]:
        """Get all plans"""
        try:
            plans_data = await self.db.get_all_plans(active_only)
            return [PlanResponse(**plan) for plan in plans_data]
            
        except Exception as e:
            logger.error(f"Error getting all plans: {str(e)}")
            return []
    
    async def update_plan(self, plan_id: str, update_data: PlanUpdateRequest, updated_by: str) -> bool:
        """Update plan"""
        try:
            # Convert to dict and add metadata
            update_dict = update_data.model_dump(exclude_unset=True)
            update_dict['updated_by'] = updated_by
            
            # Update Stripe prices if pricing changed
            if 'price_monthly' in update_dict or 'price_yearly' in update_dict:
                plan_doc = await self.db.get_plan_by_id(plan_id)
                if not plan_doc:
                    raise HTTPException(status_code=404, detail="Plan not found")
                
                # Create new Stripe prices
                plan_for_stripe = PlanCreateRequest(**{
                    **plan_doc,
                    **update_dict
                })
                stripe_prices = await self._create_stripe_prices(plan_for_stripe)
                update_dict.update({
                    'stripe_price_monthly_id': stripe_prices['monthly'],
                    'stripe_price_yearly_id': stripe_prices['yearly']
                })
            
            return await self.db.update_plan(plan_id, update_dict)
            
        except Exception as e:
            logger.error(f"Error updating plan {plan_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # =============================================================================
    # SUBSCRIPTION MANAGEMENT
    # =============================================================================
    
    async def create_subscription(self, user_id: str, subscription_data: SubscriptionCreateRequest) -> SubscriptionResponse:
        """Create subscription with Stripe integration"""
        try:
            # Get plan details
            plan = await self.get_plan(subscription_data.plan_id)
            if not plan:
                raise HTTPException(status_code=404, detail="Plan not found")
            
            # Get user's Stripe customer ID (should be created during signup)
            user_doc = await self._get_user_document(user_id)
            stripe_customer_id = self._extract_stripe_customer_id(user_doc)
            
            if not stripe_customer_id:
                raise HTTPException(status_code=400, detail="User has no Stripe customer ID")
            
            # Determine price ID based on billing cycle
            price_id = (plan.stripe_price_monthly_id if subscription_data.billing_cycle == BillingCycle.MONTHLY 
                       else plan.stripe_price_yearly_id)
            
            if not price_id:
                raise HTTPException(status_code=400, detail="Plan has no configured Stripe prices")
            
            # Create Stripe subscription
            stripe_subscription = await self._create_stripe_subscription(
                customer_id=stripe_customer_id,
                price_id=price_id,
                trial_days=plan.trial_days if subscription_data.start_trial else 0
            )
            
            # Calculate subscription details
            current_period_start = datetime.fromtimestamp(stripe_subscription.current_period_start)
            current_period_end = datetime.fromtimestamp(stripe_subscription.current_period_end)
            next_billing_date = current_period_end
            
            # Calculate monthly value for metrics
            monthly_value = (
                float(plan.price_monthly) if subscription_data.billing_cycle == BillingCycle.MONTHLY
                else float(plan.price_yearly) / 12
            )
            
            # Prepare subscription data for database
            db_subscription_data = {
                'plan_id': subscription_data.plan_id,
                'status': stripe_subscription.status,
                'billing_cycle': subscription_data.billing_cycle.value,
                'current_period_start': current_period_start,
                'current_period_end': current_period_end,
                'next_billing_date': next_billing_date,
                'trial_start': datetime.fromtimestamp(stripe_subscription.trial_start) if stripe_subscription.trial_start else None,
                'trial_end': datetime.fromtimestamp(stripe_subscription.trial_end) if stripe_subscription.trial_end else None,
                'stripe_subscription_id': stripe_subscription.id,
                'stripe_customer_id': stripe_customer_id,
                'plan_type': plan.plan_type.value,
                'monthly_value': monthly_value
            }
            
            # Create in database
            subscription_id = await self.db.create_subscription(user_id, db_subscription_data)
            
            # Get the created subscription
            subscription_doc = await self.db.get_user_subscription(user_id)
            if not subscription_doc:
                raise HTTPException(status_code=500, detail="Subscription created but could not be retrieved")
            
            return SubscriptionResponse(**subscription_doc)
            
        except stripe.StripeError as e:
            logger.error(f"Stripe error creating subscription: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Payment provider error: {str(e)}")
        except Exception as e:
            logger.error(f"Error creating subscription: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_user_subscription(self, user_id: str) -> Optional[SubscriptionResponse]:
        """Get user's active subscription"""
        try:
            subscription_doc = await self.db.get_user_subscription(user_id)
            if not subscription_doc:
                return None
            
            return SubscriptionResponse(**subscription_doc)
            
        except Exception as e:
            logger.error(f"Error getting subscription for user {user_id}: {str(e)}")
            return None
    
    async def update_subscription(self, subscription_id: str, update_data: SubscriptionUpdateRequest) -> bool:
        """Update subscription"""
        try:
            update_dict = update_data.model_dump(exclude_unset=True)
            
            # Handle plan changes
            if 'plan_id' in update_dict:
                # This would require complex Stripe subscription modification
                # For now, we'll handle this as a cancellation + new subscription
                pass
            
            return await self.db.update_subscription(subscription_id, update_dict)
            
        except Exception as e:
            logger.error(f"Error updating subscription {subscription_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def cancel_subscription(self, user_id: str, cancel_at_period_end: bool = True) -> bool:
        """Cancel user subscription"""
        try:
            subscription = await self.get_user_subscription(user_id)
            if not subscription:
                raise HTTPException(status_code=404, detail="No active subscription found")
            
            # Cancel in Stripe
            if subscription.stripe_subscription_id:
                try:
                    await self._cancel_stripe_subscription(
                        subscription.stripe_subscription_id,
                        cancel_at_period_end
                    )
                except stripe.StripeError as e:
                    logger.warning(f"Stripe cancellation failed: {str(e)}")
            
            # Update in database
            update_data = {
                'cancel_at_period_end': cancel_at_period_end,
                'canceled_at': datetime.utcnow() if not cancel_at_period_end else None,
                'status': SubscriptionStatus.CANCELED.value if not cancel_at_period_end else subscription.status
            }
            
            return await self.db.update_subscription(subscription.id, update_data)
            
        except Exception as e:
            logger.error(f"Error canceling subscription for user {user_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # =============================================================================
    # USAGE TRACKING
    # =============================================================================
    
    async def track_usage(self, request: UsageTrackingRequest) -> bool:
        """Track usage for a user"""
        try:
            # Check if usage would exceed limits
            limit_check = await self.db.check_usage_limit(
                request.user_id, 
                request.metric, 
                request.amount
            )
            
            if not limit_check['allowed']:
                raise HTTPException(
                    status_code=429, 
                    detail=f"Usage limit exceeded. Current: {limit_check['current_usage']}, Limit: {limit_check['limit']}"
                )
            
            # Track the usage
            success = await self.db.track_usage(
                request.user_id,
                request.metric,
                request.amount,
                request.metadata
            )
            
            if not success:
                raise HTTPException(status_code=500, detail="Failed to track usage")
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error tracking usage: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_user_usage(self, user_id: str, period: Optional[str] = None) -> UsageResponse:
        """Get user usage data"""
        try:
            # Get current subscription and limits
            subscription = await self.get_user_subscription(user_id)
            if not subscription:
                raise HTTPException(status_code=404, detail="No active subscription found")
            
            # Get usage data
            usage_data = await self.db.get_user_usage(user_id, period)
            
            # Get plan limits
            plan_limits = subscription.plan_details.limits if subscription.plan_details else {}
            
            # Format response
            usage_metrics = []
            for metric in UsageMetric:
                current_usage = usage_data.get(metric.value, {}).get('amount', 0)
                
                limit_map = {
                    UsageMetric.NEXAS: plan_limits.nexas_max,
                    UsageMetric.EXECUTIONS: plan_limits.executions_per_month,
                    UsageMetric.API_CALLS: plan_limits.api_calls_per_month,
                    UsageMetric.STORAGE: plan_limits.storage_gb,
                    UsageMetric.TEAM_MEMBERS: plan_limits.team_members,
                    UsageMetric.TOKENS: plan_limits.tokens_per_month
                }
                
                limit = limit_map.get(metric, float('inf'))
                usage_percentage = (current_usage / limit * 100) if limit > 0 else 0
                
                usage_metrics.append({
                    'metric': metric.value,
                    'current_usage': current_usage,
                    'limit': limit,
                    'usage_percentage': usage_percentage,
                    'available': max(0, limit - current_usage),
                    'last_updated': usage_data.get(metric.value, {}).get('last_updated')
                })
            
            return UsageResponse(
                user_id=user_id,
                period=period or f"{datetime.utcnow().year}-{datetime.utcnow().month:02d}",
                metrics=usage_metrics,
                subscription_id=subscription.id,
                plan_id=subscription.plan_id
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting usage for user {user_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def check_usage_limit(self, user_id: str, metric: UsageMetric, additional_usage: Union[int, float] = 0) -> Dict[str, Any]:
        """Check usage limits"""
        try:
            return await self.db.check_usage_limit(user_id, metric, additional_usage)
        except Exception as e:
            logger.error(f"Error checking usage limits: {str(e)}")
            return {'allowed': False, 'error': str(e)}
    
    # =============================================================================
    # ADMIN OPERATIONS
    # =============================================================================
    
    async def get_admin_analytics(self, period_days: int = 30) -> AdminAnalyticsResponse:
        """Get admin analytics"""
        try:
            analytics_data = await self.db.get_admin_analytics(period_days)
            
            if 'error' in analytics_data:
                raise HTTPException(status_code=500, detail=analytics_data['error'])
            
            return AdminAnalyticsResponse(**analytics_data)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting admin analytics: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_admin_user_list(self, criteria: Dict[str, Any], limit: int = 100) -> AdminUserListResponse:
        """Get user list for admin"""
        try:
            users_data = await self.db.get_users_by_criteria(criteria, limit)
            
            return AdminUserListResponse(
                users=users_data,
                total_count=len(users_data),
                criteria=criteria,
                limit=limit
            )
            
        except Exception as e:
            logger.error(f"Error getting admin user list: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def admin_update_user_subscription(self, user_id: str, update_data: Dict[str, Any]) -> bool:
        """Admin update user subscription"""
        try:
            subscription = await self.get_user_subscription(user_id)
            if not subscription:
                raise HTTPException(status_code=404, detail="User has no subscription")
            
            return await self.db.update_subscription(subscription.id, update_data)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error admin updating subscription: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # =============================================================================
    # WEBHOOK HANDLERS
    # =============================================================================
    
    async def handle_stripe_webhook(self, event_data: Dict[str, Any]) -> WebhookEventResponse:
        """Handle Stripe webhook events"""
        try:
            event_type = event_data.get('type')
            
            if event_type in self._webhook_handlers:
                handler = self._webhook_handlers[event_type]
                await handler(event_data)
                
                return WebhookEventResponse(
                    event_id=event_data.get('id'),
                    event_type=event_type,
                    processed=True,
                    processed_at=datetime.utcnow()
                )
            else:
                logger.info(f"Unhandled webhook event type: {event_type}")
                return WebhookEventResponse(
                    event_id=event_data.get('id'),
                    event_type=event_type,
                    processed=False,
                    processed_at=datetime.utcnow()
                )
                
        except Exception as e:
            logger.error(f"Error handling webhook: {str(e)}")
            return WebhookEventResponse(
                event_id=event_data.get('id', 'unknown'),
                event_type=event_data.get('type', 'unknown'),
                processed=False,
                error=str(e),
                processed_at=datetime.utcnow()
            )
    
    # =============================================================================
    # PRIVATE HELPER METHODS
    # =============================================================================
    
    async def _create_stripe_prices(self, plan_data: PlanCreateRequest) -> Dict[str, str]:
        """Create Stripe price objects for a plan"""
        try:
            # Create Stripe product first
            product = stripe.Product.create(
                name=plan_data.name,
                description=plan_data.description,
                metadata={
                    'plan_type': plan_data.plan_type.value,
                    'nexas_max': str(plan_data.limits.nexas_max),
                    'executions_per_month': str(plan_data.limits.executions_per_month)
                }
            )
            
            # Create monthly price
            monthly_price = stripe.Price.create(
                unit_amount=int(plan_data.price_monthly * 100),  # Convert to cents
                currency='usd',
                recurring={'interval': 'month'},
                product=product.id,
                metadata={'billing_cycle': 'monthly'}
            )
            
            # Create yearly price
            yearly_price = stripe.Price.create(
                unit_amount=int(plan_data.price_yearly * 100),  # Convert to cents
                currency='usd',
                recurring={'interval': 'year'},
                product=product.id,
                metadata={'billing_cycle': 'yearly'}
            )
            
            return {
                'monthly': monthly_price.id,
                'yearly': yearly_price.id,
                'product': product.id
            }
            
        except Exception as e:
            logger.error(f"Error creating Stripe prices: {str(e)}")
            raise
    
    async def _create_stripe_subscription(self, customer_id: str, price_id: str, trial_days: int = 0) -> Any:
        """Create Stripe subscription"""
        subscription_params = {
            'customer': customer_id,
            'items': [{'price': price_id}],
            'payment_behavior': 'default_incomplete',
            'expand': ['latest_invoice.payment_intent'],
        }
        
        if trial_days > 0:
            trial_end = datetime.utcnow() + timedelta(days=trial_days)
            subscription_params['trial_end'] = int(trial_end.timestamp())
        
        return stripe.Subscription.create(**subscription_params)
    
    async def _cancel_stripe_subscription(self, subscription_id: str, at_period_end: bool = True) -> Any:
        """Cancel Stripe subscription"""
        if at_period_end:
            return stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
        else:
            return stripe.Subscription.delete(subscription_id)
    
    async def _get_user_document(self, user_id: str) -> Dict[str, Any]:
        """Get user document from database"""
        # This should use your existing user service
        # For now, we'll access Firestore directly
        user_doc = self.db.db.collection('users').document(user_id).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        return user_doc.to_dict()

    async def _ensure_stripe_customer_id(self, user_id: str, user_doc: Dict[str, Any]) -> str:
        """Get or create a Stripe customer for the user and persist it in Firestore."""
        existing = self._extract_stripe_customer_id(user_doc)
        if existing:
            return existing

        email = user_doc.get('email')
        name = user_doc.get('displayName') or user_doc.get('name') or user_doc.get('username')

        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={'firebase_uid': user_id}
        )

        user_ref = self.db.db.collection('users').document(user_id)
        user_ref.update({
            'stripeCustomerId': customer.id,
            'subscription.stripeCustomerId': customer.id,
            'subscription.customerId': customer.id,
            'subscription.updated_at': datetime.utcnow(),
        })

        return customer.id

    def _extract_stripe_customer_id(self, user_doc: Dict[str, Any]) -> Optional[str]:
        """Extract Stripe customer ID from user document"""
        if not user_doc:
            return None
        return (
            user_doc.get('stripeCustomerId')
            or user_doc.get('subscription', {}).get('stripeCustomerId')
            or user_doc.get('subscription', {}).get('customerId')
        )

    async def _get_user_ref_by_stripe_customer_id(self, customer_id: str):
        """Find user document by Stripe customer ID"""
        users_collection = self.db.db.collection('users')

        results = users_collection.where('subscription.stripeCustomerId', '==', customer_id).get()
        if results:
            return results[0].reference

        legacy_results = users_collection.where('subscription.customerId', '==', customer_id).get()
        if legacy_results:
            return legacy_results[0].reference

        return None
    
    # Webhook event handlers
    async def _handle_payment_succeeded(self, event_data: Dict[str, Any]):
        """Handle successful payment"""
        invoice = event_data['data']['object']
        subscription_id = invoice.get('subscription')
        
        if subscription_id:
            # Update subscription status to active
            # Implementation depends on your needs
            pass
    
    async def _handle_payment_failed(self, event_data: Dict[str, Any]):
        """Handle failed payment"""
        invoice = event_data['data']['object']
        # Handle payment failure logic
        pass
    
    async def _handle_subscription_updated(self, event_data: Dict[str, Any]):
        """Handle subscription update"""
        subscription = event_data['data']['object']
        customer_id = subscription.get('customer')
        if not customer_id:
            return

        user_ref = await self._get_user_ref_by_stripe_customer_id(customer_id)
        if not user_ref:
            logger.warning(f"No user found for Stripe customer {customer_id}")
            return

        price_id = None
        items = subscription.get('items', {}).get('data', [])
        if items:
            price_id = items[0].get('price', {}).get('id')

        plan_doc = await self.db.get_plan_by_price_id(price_id) if price_id else None
        plan_type = (plan_doc.get('plan_type') if plan_doc else 'basic')
        limits = plan_doc.get('limits') if plan_doc else None

        current_period_start = subscription.get('current_period_start')
        current_period_end = subscription.get('current_period_end')
        trial_end = subscription.get('trial_end')

        update_payload = {
            'subscription.plan': plan_type,
            'subscription.status': subscription.get('status', SubscriptionStatus.ACTIVE.value),
            'subscription.billing_cycle': subscription.get('items', {}).get('data', [{}])[0].get('price', {}).get('recurring', {}).get('interval', 'monthly'),
            'subscription.currentPeriodStart': datetime.fromtimestamp(current_period_start) if current_period_start else None,
            'subscription.currentPeriodEnd': datetime.fromtimestamp(current_period_end) if current_period_end else None,
            'subscription.next_billing_date': datetime.fromtimestamp(current_period_end) if current_period_end else None,
            'subscription.trial_ends_at': datetime.fromtimestamp(trial_end) if trial_end else None,
            'subscription.cancelAtPeriodEnd': subscription.get('cancel_at_period_end', False),
            'subscription.stripeSubscriptionId': subscription.get('id'),
            'subscription.stripeCustomerId': customer_id
        }

        update_payload.update({
            'subscription.startDate': datetime.fromtimestamp(current_period_start) if current_period_start else None,
            'subscription.endDate': datetime.fromtimestamp(current_period_end) if current_period_end else None
        })

        if limits:
            update_payload.update({
                'usage.limits.workflowsMax': limits.get('nexas_max', 15),
                'usage.limits.executionsPerMonth': limits.get('executions_per_month', 0),
                'usage.limits.apiCallsPerMonth': limits.get('api_calls_per_month', 0),
                'usage.limits.storage_gb': limits.get('storage_gb', 0),
                'usage.limits.team_members': limits.get('team_members', 1),
                'usage.limits.tokensPerMonth': limits.get('tokens_per_month', 0)
            })
            update_payload.update({
                'usage.limits.storageLimit': limits.get('storage_gb', 0),
                'usage.limits.teamMembers': limits.get('team_members', 1)
            })
        else:
            update_payload['usage.limits.workflowsMax'] = 15
            update_payload['usage.limits.storageLimit'] = 0
            update_payload['usage.limits.teamMembers'] = 1

        user_ref.update(update_payload)
    
    async def _handle_subscription_deleted(self, event_data: Dict[str, Any]):
        """Handle subscription deletion"""
        subscription = event_data['data']['object']
        customer_id = subscription.get('customer')
        if not customer_id:
            return

        user_ref = await self._get_user_ref_by_stripe_customer_id(customer_id)
        if not user_ref:
            logger.warning(f"No user found for Stripe customer {customer_id}")
            return

        user_ref.update({
            'subscription.status': SubscriptionStatus.CANCELED.value,
            'subscription.cancelAtPeriodEnd': False
        })
    
    async def _handle_invoice_created(self, event_data: Dict[str, Any]):
        """Handle invoice creation"""
        invoice = event_data['data']['object']
        # Store invoice data
        pass


    # =============================================================================
    # INVOICE OPERATIONS
    # =============================================================================
    
    async def get_user_invoices(self, user_id: str, limit: int = 10, starting_after: Optional[str] = None):
        """Get user's invoices from Stripe"""
        try:
            # Get user's Stripe customer ID
            user_doc = await self._get_user_document(user_id)
            stripe_customer_id = self._extract_stripe_customer_id(user_doc)
            
            if not stripe_customer_id:
                return {"invoices": [], "total_count": 0, "has_more": False}
            
            # Fetch invoices from Stripe
            invoices = stripe.Invoice.list(
                customer=stripe_customer_id,
                limit=limit,
                starting_after=starting_after
            )
            
            return {
                "invoices": [self._format_invoice(inv) for inv in invoices.data],
                "total_count": invoices.total_count or 0,
                "has_more": invoices.has_more
            }
            
        except Exception as e:
            logger.error(f"Error getting user invoices: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_invoice(self, invoice_id: str, user_id: str):
        """Get specific invoice"""
        try:
            invoice = stripe.Invoice.retrieve(invoice_id)
            
            # Verify user owns this invoice
            user_doc = await self._get_user_document(user_id)
            if invoice.customer != self._extract_stripe_customer_id(user_doc):
                raise HTTPException(status_code=403, detail="Access denied")
            
            return self._format_invoice(invoice)
            
        except stripe.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            raise HTTPException(status_code=404, detail="Invoice not found")
    
    # =============================================================================
    # PAYMENT METHOD OPERATIONS
    # =============================================================================
    
    async def get_payment_methods(self, user_id: str):
        """Get user's payment methods"""
        try:
            user_doc = await self._get_user_document(user_id)
            stripe_customer_id = self._extract_stripe_customer_id(user_doc)
            
            if not stripe_customer_id:
                return {"payment_methods": [], "default_payment_method": None}
            
            payment_methods = stripe.PaymentMethod.list(
                customer=stripe_customer_id,
                type="card"
            )
            
            customer = stripe.Customer.retrieve(stripe_customer_id)
            
            return {
                "payment_methods": [self._format_payment_method(pm) for pm in payment_methods.data],
                "default_payment_method": customer.invoice_settings.default_payment_method
            }
            
        except Exception as e:
            logger.error(f"Error getting payment methods: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def add_payment_method(self, user_id: str, request):
        """Add payment method to user"""
        try:
            user_doc = await self._get_user_document(user_id)
            stripe_customer_id = self._extract_stripe_customer_id(user_doc)
            
            if not stripe_customer_id:
                raise HTTPException(status_code=400, detail="User has no Stripe customer ID")
            
            # Attach payment method to customer
            payment_method = stripe.PaymentMethod.attach(
                request.payment_method_id,
                customer=stripe_customer_id
            )
            
            # Set as default if requested
            if request.set_as_default:
                stripe.Customer.modify(
                    stripe_customer_id,
                    invoice_settings={'default_payment_method': request.payment_method_id}
                )
            
            return self._format_payment_method(payment_method)
            
        except Exception as e:
            logger.error(f"Error adding payment method: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def delete_payment_method(self, user_id: str, payment_method_id: str):
        """Delete payment method"""
        try:
            # Verify ownership
            user_doc = await self._get_user_document(user_id)
            stripe_customer_id = self._extract_stripe_customer_id(user_doc)
            
            payment_method = stripe.PaymentMethod.retrieve(payment_method_id)
            if payment_method.customer != stripe_customer_id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            stripe.PaymentMethod.detach(payment_method_id)
            return True
            
        except Exception as e:
            logger.error(f"Error deleting payment method: {str(e)}")
            return False
    
    # =============================================================================
    # ADDITIONAL PLAN OPERATIONS
    # =============================================================================
    
    async def delete_plan(self, plan_id: str, deleted_by: str):
        """Delete a plan"""
        try:
            return await self.db.update_plan(plan_id, {
                'is_active': False,
                'deleted_at': datetime.utcnow(),
                'deleted_by': deleted_by
            })
            
        except Exception as e:
            logger.error(f"Error deleting plan: {str(e)}")
            return False
    
    # =============================================================================
    # SUBSCRIPTION HISTORY
    # =============================================================================
    
    async def get_subscription_history(self, user_id: str, limit: int = 10):
        """Get user's subscription history"""
        try:
            # This would need to be implemented in the database layer
            # For now, return empty response
            return {
                "subscriptions": [],
                "total_count": 0
            }
            
        except Exception as e:
            logger.error(f"Error getting subscription history: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # =============================================================================
    # SUBSCRIPTION CONTROL
    # =============================================================================
    
    async def pause_subscription(self, user_id: str, request):
        """Pause user subscription"""
        try:
            subscription = await self.get_user_subscription(user_id)
            if not subscription:
                return False
            
            # Pause in Stripe
            stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                pause_collection={'behavior': 'keep_as_draft'}
            )
            
            # Update in database
            return await self.db.update_subscription(subscription.id, {
                'status': 'paused',
                'paused_at': datetime.utcnow(),
                'pause_reason': request.reason
            })
            
        except Exception as e:
            logger.error(f"Error pausing subscription: {str(e)}")
            return False
    
    async def resume_subscription(self, user_id: str, request):
        """Resume paused subscription"""
        try:
            subscription = await self.get_user_subscription(user_id)
            if not subscription:
                return False
            
            # Resume in Stripe
            stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                pause_collection=''
            )
            
            # Update in database
            return await self.db.update_subscription(subscription.id, {
                'status': 'active',
                'resumed_at': datetime.utcnow()
            })
            
        except Exception as e:
            logger.error(f"Error resuming subscription: {str(e)}")
            return False
    
    # =============================================================================
    # USAGE ADJUSTMENTS
    # =============================================================================
    
    async def adjust_user_usage(self, request, admin_id: str):
        """Adjust user usage (admin only)"""
        try:
            if request.reset_to_zero:
                # Reset to zero
                success = await self.db.track_usage(
                    request.user_id,
                    request.metric,
                    -999999,  # Large negative number to reset
                    {"admin_reset": True, "admin_id": admin_id, "reason": request.reason}
                )
            else:
                # Adjust by amount
                success = await self.db.track_usage(
                    request.user_id,
                    request.metric,
                    request.adjustment_amount,
                    {"admin_adjustment": True, "admin_id": admin_id, "reason": request.reason}
                )
            
            return success
            
        except Exception as e:
            logger.error(f"Error adjusting usage: {str(e)}")
            return False
    
    async def reset_user_usage(self, request, admin_id: str):
        """Reset user usage (admin only)"""
        try:
            # Reset all specified metrics
            all_success = True
            for metric in request.metrics:
                success = await self.db.track_usage(
                    request.user_id,
                    metric,
                    -999999,  # Large negative to reset
                    {"admin_reset": True, "admin_id": admin_id, "reason": request.reason}
                )
                if not success:
                    all_success = False
            
            return all_success
            
        except Exception as e:
            logger.error(f"Error resetting usage: {str(e)}")
            return False
    
    # =============================================================================
    # CHECKOUT & BILLING PORTAL
    # =============================================================================
    
    async def create_checkout_session(self, user_id: str, request):
        """Create Stripe checkout session"""
        try:
            user_doc = await self._get_user_document(user_id)
            stripe_customer_id = await self._ensure_stripe_customer_id(user_id, user_doc)
            
            plan = await self.get_plan(request.plan_id)
            if not plan:
                raise HTTPException(status_code=404, detail="Plan not found")
            
            price_id = (plan.stripe_price_monthly_id if request.billing_cycle.value == 'monthly' 
                       else plan.stripe_price_yearly_id)
            
            session_params = {
                'customer': stripe_customer_id,
                'payment_method_types': ['card'],
                'line_items': [{'price': price_id, 'quantity': 1}],
                'mode': 'subscription',
                'success_url': request.success_url,
                'cancel_url': request.cancel_url
            }
            
            if request.coupon_code:
                session_params['discounts'] = [{'coupon': request.coupon_code}]
            
            session = stripe.checkout.Session.create(**session_params)
            
            return {
                'session_id': session.id,
                'checkout_url': session.url,
                'expires_at': datetime.fromtimestamp(session.expires_at)
            }
            
        except Exception as e:
            logger.error(f"Error creating checkout session: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def create_billing_portal_session(self, user_id: str, request):
        """Create Stripe billing portal session"""
        try:
            user_doc = await self._get_user_document(user_id)
            stripe_customer_id = await self._ensure_stripe_customer_id(user_id, user_doc)
            
            session = stripe.billing_portal.Session.create(
                customer=stripe_customer_id,
                return_url=request.return_url
            )
            
            return {
                'portal_url': session.url,
                'expires_at': datetime.utcnow() + timedelta(hours=1)  # Portal sessions expire after 1 hour
            }
            
        except Exception as e:
            logger.error(f"Error creating billing portal session: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # =============================================================================
    # COUPON MANAGEMENT
    # =============================================================================
    
    async def create_coupon(self, request, created_by: str):
        """Create discount coupon"""
        try:
            # Create in Stripe first
            stripe_coupon_data = {
                'id': request.code,
                'name': request.name,
                'duration': 'once',  # Simplified for now
            }
            
            if request.discount_type == 'percentage':
                stripe_coupon_data['percent_off'] = float(request.discount_value)
            else:
                stripe_coupon_data['amount_off'] = int(request.discount_value * 100)
                stripe_coupon_data['currency'] = 'usd'
            
            stripe_coupon = stripe.Coupon.create(**stripe_coupon_data)
            
            # Store in database (would need database implementation)
            coupon_data = {
                'id': f"coupon_{request.code}",
                'code': request.code,
                'name': request.name,
                'description': request.description,
                'discount_type': request.discount_type,
                'discount_value': float(request.discount_value),
                'times_redeemed': 0,
                'max_redemptions': request.max_redemptions,
                'expires_at': request.expires_at,
                'applies_to_plans': request.applies_to_plans,
                'is_active': request.is_active,
                'stripe_coupon_id': stripe_coupon.id,
                'created_by': created_by,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            return coupon_data
            
        except Exception as e:
            logger.error(f"Error creating coupon: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_all_coupons(self, active_only: bool = True):
        """Get all coupons"""
        try:
            # This would need database implementation
            # For now return empty list
            return []
            
        except Exception as e:
            logger.error(f"Error getting coupons: {str(e)}")
            return []
    
    async def update_coupon(self, coupon_id: str, request, updated_by: str):
        """Update coupon"""
        try:
            # This would need database implementation
            return None
            
        except Exception as e:
            logger.error(f"Error updating coupon: {str(e)}")
            return None
    
    async def delete_coupon(self, coupon_id: str, deleted_by: str):
        """Delete coupon"""
        try:
            # This would need database implementation
            return False
            
        except Exception as e:
            logger.error(f"Error deleting coupon: {str(e)}")
            return False
    
    # =============================================================================
    # REFUND MANAGEMENT
    # =============================================================================
    
    async def create_refund(self, request, admin_id: str):
        """Create refund"""
        try:
            refund_params = {
                'payment_intent': request.payment_intent_id,
                'reason': request.reason,
                'metadata': {
                    'admin_id': admin_id,
                    'description': request.description or ''
                }
            }
            
            if request.amount:
                refund_params['amount'] = int(request.amount * 100)
            
            refund = stripe.Refund.create(**refund_params)
            
            return {
                'id': refund.id,
                'amount': refund.amount / 100,
                'currency': refund.currency.upper(),
                'status': refund.status,
                'reason': refund.reason,
                'description': request.description,
                'payment_intent_id': request.payment_intent_id,
                'created_at': datetime.fromtimestamp(refund.created)
            }
            
        except Exception as e:
            logger.error(f"Error creating refund: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_all_refunds(self, limit: int = 50, starting_after: Optional[str] = None):
        """Get all refunds"""
        try:
            refunds = stripe.Refund.list(
                limit=limit,
                starting_after=starting_after
            )
            
            return {
                'refunds': [self._format_refund(refund) for refund in refunds.data],
                'total_count': refunds.total_count or 0,
                'has_more': refunds.has_more
            }
            
        except Exception as e:
            logger.error(f"Error getting refunds: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # =============================================================================
    # TAX CALCULATION
    # =============================================================================
    
    async def calculate_tax(self, request):
        """Calculate tax for amount and location"""
        try:
            # Simplified tax calculation - in production you'd use a tax service
            tax_rate = 0.0
            
            # Basic US tax rates by state (simplified)
            us_tax_rates = {
                'CA': 0.0725,  # California
                'NY': 0.08,    # New York
                'TX': 0.0625,  # Texas
                'FL': 0.06,    # Florida
            }
            
            if request.customer_country.upper() == 'US' and request.customer_state:
                tax_rate = us_tax_rates.get(request.customer_state.upper(), 0.0)
            
            subtotal = request.amount
            tax_amount = subtotal * Decimal(str(tax_rate))
            total_amount = subtotal + tax_amount
            
            return {
                'subtotal': subtotal,
                'tax_amount': tax_amount,
                'total_amount': total_amount,
                'tax_rate': Decimal(str(tax_rate)),
                'tax_breakdown': [
                    {
                        'name': 'State Tax',
                        'rate': tax_rate,
                        'amount': float(tax_amount)
                    }
                ] if tax_rate > 0 else [],
                'applicable_taxes': ['state_tax'] if tax_rate > 0 else []
            }
            
        except Exception as e:
            logger.error(f"Error calculating tax: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # =============================================================================
    # HELPER METHODS FOR FORMATTING
    # =============================================================================
    
    def _format_invoice(self, stripe_invoice):
        """Format Stripe invoice for API response"""
        return {
            'id': stripe_invoice.id,
            'number': stripe_invoice.number,
            'status': stripe_invoice.status,
            'amount_paid': stripe_invoice.amount_paid / 100,
            'amount_due': stripe_invoice.amount_due / 100,
            'currency': stripe_invoice.currency.upper(),
            'created_at': datetime.fromtimestamp(stripe_invoice.created),
            'due_date': datetime.fromtimestamp(stripe_invoice.due_date) if stripe_invoice.due_date else None,
            'pdf_url': stripe_invoice.invoice_pdf,
            'hosted_url': stripe_invoice.hosted_invoice_url
        }
    
    def _format_payment_method(self, stripe_pm):
        """Format Stripe payment method for API response"""
        return {
            'id': stripe_pm.id,
            'type': stripe_pm.type,
            'card': {
                'brand': stripe_pm.card.brand,
                'last4': stripe_pm.card.last4,
                'exp_month': stripe_pm.card.exp_month,
                'exp_year': stripe_pm.card.exp_year
            } if stripe_pm.type == 'card' else {},
            'created_at': datetime.fromtimestamp(stripe_pm.created)
        }
    
    def _format_refund(self, stripe_refund):
        """Format Stripe refund for API response"""
        return {
            'id': stripe_refund.id,
            'amount': stripe_refund.amount / 100,
            'currency': stripe_refund.currency.upper(),
            'status': stripe_refund.status,
            'reason': stripe_refund.reason,
            'description': stripe_refund.metadata.get('description', ''),
            'payment_intent_id': stripe_refund.payment_intent,
            'created_at': datetime.fromtimestamp(stripe_refund.created)
        }


# Create singleton instance
billing_service = BillingService()
