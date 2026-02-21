from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from decimal import Decimal
import logging
import uuid
import json
from concurrent.futures import ThreadPoolExecutor

from firebase_admin import firestore
from app.services.firebase_service import FirebaseService
from app.models.billing_models import (
    PlanCreateRequest, PlanUpdateRequest, PlanResponse, PlanType, BillingCycle,
    SubscriptionCreateRequest, SubscriptionStatus, UsageMetric,
    InvoiceStatus, PaymentStatus
)

logger = logging.getLogger(__name__)


class BillingDatabase:
    """
    Optimized database layer for billing operations with Firestore
    
    Features:
    - Efficient indexing and querying
    - Batch operations for performance
    - Transaction support for consistency
    - Connection pooling and caching
    - Comprehensive error handling
    """
    
    def __init__(self):
        self.firebase_service = FirebaseService()
        self.db = self.firebase_service.db
        self.executor = ThreadPoolExecutor(max_workers=5)
        
        # Collection references (optimized)
        self.plans_collection = self.db.collection('billing_plans')
        self.subscriptions_collection = self.db.collection('billing_subscriptions')  
        self.invoices_collection = self.db.collection('billing_invoices')
        self.usage_collection = self.db.collection('billing_usage')
        self.payment_methods_collection = self.db.collection('billing_payment_methods')
        self.billing_history_collection = self.db.collection('billing_history')
        
        # Cache for frequently accessed data
        self._plan_cache = {}
        self._cache_ttl = 300  # 5 minutes
        self._last_cache_update = {}
    
    # =============================================================================
    # PLAN MANAGEMENT
    # =============================================================================
    
    async def create_plan(self, plan_data: PlanCreateRequest, created_by: str) -> str:
        """Create a new billing plan"""
        try:
            plan_id = f"plan_{plan_data.plan_type.value}"
            
            plan_doc = {
                'id': plan_id,
                'name': plan_data.name,
                'description': plan_data.description,
                'plan_type': plan_data.plan_type.value,
                'price_monthly': float(plan_data.price_monthly),
                'price_yearly': float(plan_data.price_yearly),
                'limits': {
                    'nexas_max': plan_data.limits.nexas_max,
                    'executions_per_month': plan_data.limits.executions_per_month,
                    'api_calls_per_month': plan_data.limits.api_calls_per_month,
                    'storage_gb': float(plan_data.limits.storage_gb),
                    'team_members': plan_data.limits.team_members,
                    'tokens_per_month': plan_data.limits.tokens_per_month
                },
                'features': {
                    'priority_support': plan_data.features.priority_support,
                    'advanced_analytics': plan_data.features.advanced_analytics,
                    'custom_integrations': plan_data.features.custom_integrations,
                    'sla_guarantee': plan_data.features.sla_guarantee,
                    'white_labeling': plan_data.features.white_labeling,
                    'api_access': plan_data.features.api_access,
                    'webhook_notifications': plan_data.features.webhook_notifications
                },
                'is_popular': plan_data.is_popular,
                'is_active': plan_data.is_active,
                'trial_days': plan_data.trial_days,
                'stripe_price_monthly_id': None,
                'stripe_price_yearly_id': None,
                'created_by': created_by,
                'created_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP,
                
                # Indexing fields for efficient queries
                'price_monthly_cents': int(plan_data.price_monthly * 100),
                'price_yearly_cents': int(plan_data.price_yearly * 100),
                'sort_order': self._get_plan_sort_order(plan_data.plan_type)
            }
            
            # Create with transaction for consistency
            transaction = self.db.transaction()
            plan_ref = self.plans_collection.document(plan_id)
            
            @firestore.transactional
            def create_plan_transaction(transaction):
                # Check if plan already exists
                existing_plan = transaction.get(plan_ref)
                if existing_plan.exists:
                    raise ValueError(f"Plan {plan_id} already exists")
                
                transaction.set(plan_ref, plan_doc)
            
            create_plan_transaction(transaction)
            
            # Clear cache
            self._clear_plan_cache()
            
            logger.info(f"Created billing plan {plan_id} by {created_by}")
            return plan_id
            
        except Exception as e:
            logger.error(f"Error creating billing plan: {str(e)}")
            raise
    
    async def get_plan_by_id(self, plan_id: str) -> Optional[Dict[str, Any]]:
        """Get plan by ID with caching"""
        try:
            # Check cache first
            cache_key = f"plan_{plan_id}"
            if self._is_cache_valid(cache_key):
                return self._plan_cache.get(cache_key)
            
            plan_doc = self.plans_collection.document(plan_id).get()
            
            if not plan_doc.exists:
                return None
            
            plan_data = plan_doc.to_dict()
            
            # Cache the result
            self._plan_cache[cache_key] = plan_data
            self._last_cache_update[cache_key] = datetime.utcnow()
            
            return plan_data
            
        except Exception as e:
            logger.error(f"Error getting plan {plan_id}: {str(e)}")
            return None
    
    async def get_all_plans(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get all billing plans with optional filtering"""
        try:
            cache_key = f"all_plans_{'active' if active_only else 'all'}"
            
            # Check cache first
            if self._is_cache_valid(cache_key):
                return self._plan_cache.get(cache_key, [])
            
            query = self.plans_collection.order_by('sort_order')
            
            if active_only:
                query = query.where('is_active', '==', True)
            
            plans_docs = query.get()
            plans = [doc.to_dict() for doc in plans_docs]
            
            # Cache the results
            self._plan_cache[cache_key] = plans
            self._last_cache_update[cache_key] = datetime.utcnow()
            
            return plans
            
        except Exception as e:
            logger.error(f"Error getting all plans: {str(e)}")
            return []

    async def get_plan_by_price_id(self, price_id: str) -> Optional[Dict[str, Any]]:
        """Get plan by Stripe price ID (monthly or yearly)"""
        try:
            if not price_id:
                return None

            monthly_query = self.plans_collection.where('stripe_price_monthly_id', '==', price_id).get()
            if monthly_query:
                return monthly_query[0].to_dict()

            yearly_query = self.plans_collection.where('stripe_price_yearly_id', '==', price_id).get()
            if yearly_query:
                return yearly_query[0].to_dict()

            return None

        except Exception as e:
            logger.error(f"Error getting plan by price ID {price_id}: {str(e)}")
            return None
    
    async def update_plan(self, plan_id: str, update_data: Dict[str, Any]) -> bool:
        """Update billing plan"""
        try:
            update_doc = {
                **update_data,
                'updated_at': firestore.SERVER_TIMESTAMP
            }
            
            # Handle nested updates for limits and features
            if 'limits' in update_data:
                for key, value in update_data['limits'].items():
                    update_doc[f'limits.{key}'] = value
                del update_doc['limits']
            
            if 'features' in update_data:
                for key, value in update_data['features'].items():
                    update_doc[f'features.{key}'] = value
                del update_doc['features']
            
            self.plans_collection.document(plan_id).update(update_doc)
            
            # Clear cache
            self._clear_plan_cache()
            
            logger.info(f"Updated billing plan {plan_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating plan {plan_id}: {str(e)}")
            return False
    
    # =============================================================================
    # SUBSCRIPTION MANAGEMENT
    # =============================================================================
    
    async def create_subscription(self, user_id: str, subscription_data: Dict[str, Any]) -> str:
        """Create user subscription with transaction"""
        try:
            subscription_id = f"sub_{user_id}_{int(datetime.utcnow().timestamp())}"
            
            subscription_doc = {
                'id': subscription_id,
                'user_id': user_id,
                'plan_id': subscription_data['plan_id'],
                'status': subscription_data.get('status', SubscriptionStatus.ACTIVE.value),
                'billing_cycle': subscription_data['billing_cycle'],
                'current_period_start': subscription_data['current_period_start'],
                'current_period_end': subscription_data['current_period_end'],
                'next_billing_date': subscription_data.get('next_billing_date'),
                'trial_start': subscription_data.get('trial_start'),
                'trial_end': subscription_data.get('trial_end'),
                'cancel_at_period_end': subscription_data.get('cancel_at_period_end', False),
                'canceled_at': None,
                'stripe_subscription_id': subscription_data.get('stripe_subscription_id'),
                'stripe_customer_id': subscription_data.get('stripe_customer_id'),
                'created_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP,
                
                # Indexing fields
                'status_index': subscription_data.get('status', SubscriptionStatus.ACTIVE.value),
                'plan_type': subscription_data.get('plan_type'),
                'monthly_value': float(subscription_data.get('monthly_value', 0))
            }
            
            # Use transaction to ensure consistency
            transaction = self.db.transaction()
            subscription_ref = self.subscriptions_collection.document(subscription_id)
            user_ref = self.db.collection('users').document(user_id)
            
            @firestore.transactional
            def create_subscription_transaction(transaction):
                # Update user's subscription reference
                user_doc = transaction.get(user_ref)
                if not user_doc.exists:
                    raise ValueError(f"User {user_id} not found")
                
                # Cancel existing subscription if any
                existing_subs = self.subscriptions_collection.where('user_id', '==', user_id).where('status', 'in', ['active', 'trialing']).get()
                for sub_doc in existing_subs:
                    transaction.update(sub_doc.reference, {
                        'status': SubscriptionStatus.CANCELED.value,
                        'canceled_at': firestore.SERVER_TIMESTAMP,
                        'updated_at': firestore.SERVER_TIMESTAMP
                    })
                
                # Create new subscription
                transaction.set(subscription_ref, subscription_doc)
                
                # Update user document
                transaction.update(user_ref, {
                    'subscription.plan': subscription_data['plan_id'],
                    'subscription.status': subscription_data.get('status', SubscriptionStatus.ACTIVE.value),
                    'subscription.billing_cycle': subscription_data['billing_cycle'],
                    'subscription.stripeSubscriptionId': subscription_data.get('stripe_subscription_id'),
                    'subscription.updated_at': firestore.SERVER_TIMESTAMP,
                    'subscription.current_period_start': subscription_data['current_period_start'],
                    'subscription.current_period_end': subscription_data['current_period_end'],
                    'subscription.next_billing_date': subscription_data.get('next_billing_date'),
                    'subscription.trial_ends_at': subscription_data.get('trial_end')
                })
            
            create_subscription_transaction(transaction)
            
            logger.info(f"Created subscription {subscription_id} for user {user_id}")
            return subscription_id
            
        except Exception as e:
            logger.error(f"Error creating subscription for user {user_id}: {str(e)}")
            raise
    
    async def get_user_subscription(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's active subscription"""
        try:
            # Query for active subscription
            subscription_docs = (
                self.subscriptions_collection
                .where('user_id', '==', user_id)
                .where('status', 'in', ['active', 'trialing', 'past_due'])
                .order_by('created_at', direction=firestore.Query.DESCENDING)
                .limit(1)
                .get()
            )
            
            if not subscription_docs:
                return None
            
            subscription_data = subscription_docs[0].to_dict()
            
            # Enrich with plan details
            plan_data = await self.get_plan_by_id(subscription_data['plan_id'])
            if plan_data:
                subscription_data['plan_details'] = plan_data
            
            return subscription_data
            
        except Exception as e:
            logger.error(f"Error getting subscription for user {user_id}: {str(e)}")
            return None
    
    async def update_subscription(self, subscription_id: str, update_data: Dict[str, Any]) -> bool:
        """Update subscription with user document sync"""
        try:
            # Get subscription to find user_id
            subscription_doc = self.subscriptions_collection.document(subscription_id).get()
            if not subscription_doc.exists:
                return False
            
            subscription_data = subscription_doc.to_dict()
            user_id = subscription_data['user_id']
            
            # Use transaction for consistency
            transaction = self.db.transaction()
            subscription_ref = self.subscriptions_collection.document(subscription_id)
            user_ref = self.db.collection('users').document(user_id)
            
            @firestore.transactional
            def update_subscription_transaction(transaction):
                update_doc = {
                    **update_data,
                    'updated_at': firestore.SERVER_TIMESTAMP
                }
                
                transaction.update(subscription_ref, update_doc)
                
                # Update user document if needed
                user_updates = {}
                if 'status' in update_data:
                    user_updates['subscription.status'] = update_data['status']
                if 'plan_id' in update_data:
                    user_updates['subscription.plan'] = update_data['plan_id']
                if 'billing_cycle' in update_data:
                    user_updates['subscription.billing_cycle'] = update_data['billing_cycle']
                if 'next_billing_date' in update_data:
                    user_updates['subscription.next_billing_date'] = update_data['next_billing_date']
                
                if user_updates:
                    user_updates['subscription.updated_at'] = firestore.SERVER_TIMESTAMP
                    transaction.update(user_ref, user_updates)
            
            update_subscription_transaction(transaction)
            
            logger.info(f"Updated subscription {subscription_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating subscription {subscription_id}: {str(e)}")
            return False
    
    # =============================================================================
    # USAGE TRACKING
    # =============================================================================
    
    async def track_usage(self, user_id: str, metric: UsageMetric, amount: Union[int, float], metadata: Dict[str, Any] = None) -> bool:
        """Track usage with efficient batch updates"""
        try:
            # Get current period
            current_time = datetime.utcnow()
            period_key = f"{current_time.year}-{current_time.month:02d}"
            
            usage_id = f"{user_id}_{period_key}_{metric.value}"
            usage_ref = self.usage_collection.document(usage_id)
            user_ref = self.db.collection('users').document(user_id)
            
            # Use transaction for atomic updates
            transaction = self.db.transaction()
            
            @firestore.transactional
            def track_usage_transaction(transaction):
                # Get or create usage document
                usage_doc = transaction.get(usage_ref)
                
                if usage_doc.exists:
                    current_usage = usage_doc.to_dict()['amount']
                    new_usage = current_usage + amount
                    
                    transaction.update(usage_ref, {
                        'amount': new_usage,
                        'last_updated': firestore.SERVER_TIMESTAMP,
                        'update_count': firestore.Increment(1),
                        'metadata': metadata or {}
                    })
                else:
                    transaction.set(usage_ref, {
                        'user_id': user_id,
                        'metric': metric.value,
                        'amount': amount,
                        'period': period_key,
                        'period_start': datetime(current_time.year, current_time.month, 1),
                        'period_end': self._get_month_end(current_time.year, current_time.month),
                        'created_at': firestore.SERVER_TIMESTAMP,
                        'last_updated': firestore.SERVER_TIMESTAMP,
                        'update_count': 1,
                        'metadata': metadata or {}
                    })
                    new_usage = amount
                
                # Update user document usage cache for quick access
                user_field_map = {
                    UsageMetric.NEXAS: 'usage.totalWorkflows',
                    UsageMetric.EXECUTIONS: 'usage.executions_this_month',
                    UsageMetric.API_CALLS: 'usage.apiCallsThisMonth',
                    UsageMetric.STORAGE: 'usage.storage_used_gb',
                    UsageMetric.TEAM_MEMBERS: 'usage.team_members_count',
                    UsageMetric.TOKENS: 'usage.tokensThisMonth'
                }
                
                if metric in user_field_map:
                    user_field = user_field_map[metric]
                    transaction.update(user_ref, {
                        user_field: new_usage,
                        'usage.last_reset_date': firestore.SERVER_TIMESTAMP
                    })
            
            track_usage_transaction(transaction)
            
            logger.debug(f"Tracked usage for user {user_id}: {metric.value} += {amount}")
            return True
            
        except Exception as e:
            logger.error(f"Error tracking usage for user {user_id}: {str(e)}")
            return False
    
    async def get_user_usage(self, user_id: str, period: Optional[str] = None) -> Dict[str, Any]:
        """Get user usage for specific period"""
        try:
            if not period:
                current_time = datetime.utcnow()
                period = f"{current_time.year}-{current_time.month:02d}"
            
            # Query usage documents for the period
            usage_docs = (
                self.usage_collection
                .where('user_id', '==', user_id)
                .where('period', '==', period)
                .get()
            )
            
            usage_data = {}
            for doc in usage_docs:
                doc_data = doc.to_dict()
                usage_data[doc_data['metric']] = {
                    'amount': doc_data['amount'],
                    'last_updated': doc_data['last_updated'],
                    'metadata': doc_data.get('metadata', {})
                }
            
            return usage_data
            
        except Exception as e:
            logger.error(f"Error getting usage for user {user_id}: {str(e)}")
            return {}
    
    async def check_usage_limit(self, user_id: str, metric: UsageMetric, additional_usage: Union[int, float] = 0) -> Dict[str, Any]:
        """Check if user would exceed limits with additional usage"""
        try:
            # Get user's current subscription and plan
            subscription = await self.get_user_subscription(user_id)
            if not subscription:
                return {
                    'allowed': False,
                    'error': 'No active subscription',
                    'current_usage': 0,
                    'limit': 0
                }
            
            plan_data = subscription.get('plan_details', {})
            limits = plan_data.get('limits', {})
            
            # Get current usage
            current_usage_data = await self.get_user_usage(user_id)
            current_usage = current_usage_data.get(metric.value, {}).get('amount', 0)
            
            # Get limit for this metric
            limit_map = {
                UsageMetric.NEXAS: 'nexas_max',
                UsageMetric.EXECUTIONS: 'executions_per_month',
                UsageMetric.API_CALLS: 'api_calls_per_month', 
                UsageMetric.STORAGE: 'storage_gb',
                UsageMetric.TEAM_MEMBERS: 'team_members',
                UsageMetric.TOKENS: 'tokens_per_month'
            }
            
            limit_key = limit_map.get(metric)
            if not limit_key:
                return {'allowed': True, 'current_usage': current_usage, 'limit': float('inf')}
            
            limit = limits.get(limit_key, 0)
            new_usage = current_usage + additional_usage
            
            return {
                'allowed': new_usage <= limit,
                'current_usage': current_usage,
                'limit': limit,
                'new_usage': new_usage,
                'usage_percentage': (new_usage / limit * 100) if limit > 0 else 0,
                'available': max(0, limit - current_usage)
            }
            
        except Exception as e:
            logger.error(f"Error checking usage limit for user {user_id}: {str(e)}")
            return {'allowed': False, 'error': str(e), 'current_usage': 0, 'limit': 0}
    
    # =============================================================================
    # ADMIN OPERATIONS
    # =============================================================================
    
    async def get_admin_analytics(self, period_days: int = 30) -> Dict[str, Any]:
        """Get comprehensive admin analytics"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=period_days)
            
            # Run multiple queries in parallel for efficiency
            analytics_data = {
                'period_start': start_date,
                'period_end': end_date,
                'total_users': 0,
                'paying_users': 0,
                'trial_users': 0,
                'canceled_users': 0,
                'mrr': Decimal('0'),
                'arr': Decimal('0'),
                'churn_rate': 0.0,
                'users_by_plan': {},
                'revenue_by_plan': {},
                'new_subscriptions_this_month': 0,
                'failed_payments_this_month': 0
            }
            
            # Get subscription statistics
            subscriptions_query = (
                self.subscriptions_collection
                .where('created_at', '>=', start_date)
                .get()
            )
            
            plan_counts = {}
            revenue_by_plan = {}
            total_mrr = Decimal('0')
            
            for sub_doc in subscriptions_query:
                sub_data = sub_doc.to_dict()
                plan_id = sub_data.get('plan_id', 'unknown')
                status = sub_data.get('status', 'unknown')
                
                # Count by plan
                plan_counts[plan_id] = plan_counts.get(plan_id, 0) + 1
                
                # Calculate MRR for active subscriptions
                if status in ['active', 'trialing']:
                    monthly_value = Decimal(str(sub_data.get('monthly_value', 0)))
                    total_mrr += monthly_value
                    revenue_by_plan[plan_id] = revenue_by_plan.get(plan_id, Decimal('0')) + monthly_value
                
                # Count by status
                if status == 'active':
                    analytics_data['paying_users'] += 1
                elif status == 'trialing':
                    analytics_data['trial_users'] += 1
                elif status == 'canceled':
                    analytics_data['canceled_users'] += 1
            
            analytics_data.update({
                'users_by_plan': plan_counts,
                'revenue_by_plan': {k: float(v) for k, v in revenue_by_plan.items()},
                'mrr': float(total_mrr),
                'arr': float(total_mrr * 12),
                'new_subscriptions_this_month': len(subscriptions_query)
            })
            
            return analytics_data
            
        except Exception as e:
            logger.error(f"Error getting admin analytics: {str(e)}")
            return {'error': str(e)}
    
    async def get_users_by_criteria(self, criteria: Dict[str, Any], limit: int = 100) -> List[Dict[str, Any]]:
        """Get users matching specific criteria for admin operations"""
        try:
            # This is a complex query that might need to be optimized based on specific use cases
            # For now, we'll implement basic filtering
            
            users_query = self.db.collection('users')
            
            # Apply filters
            if 'plan' in criteria:
                users_query = users_query.where('subscription.plan', '==', criteria['plan'])
            
            if 'status' in criteria:
                users_query = users_query.where('subscription.status', '==', criteria['status'])
            
            if 'usage_threshold' in criteria:
                # This would need special handling in production
                pass
            
            users_docs = users_query.limit(limit).get()
            
            users_data = []
            for user_doc in users_docs:
                user_data = user_doc.to_dict()
                user_data['id'] = user_doc.id
                users_data.append(user_data)
            
            return users_data
            
        except Exception as e:
            logger.error(f"Error getting users by criteria: {str(e)}")
            return []
    
    # =============================================================================
    # UTILITY METHODS
    # =============================================================================
    
    def _get_plan_sort_order(self, plan_type: PlanType) -> int:
        """Get sort order for plan types"""
        order_map = {
            PlanType.FREE: 1,
            PlanType.BASIC: 2,
            PlanType.PRO: 3,
            PlanType.ENTERPRISE: 4
        }
        return order_map.get(plan_type, 999)
    
    def _get_month_end(self, year: int, month: int) -> datetime:
        """Get last day of month"""
        if month == 12:
            return datetime(year + 1, 1, 1) - timedelta(days=1)
        else:
            return datetime(year, month + 1, 1) - timedelta(days=1)
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached data is still valid"""
        if cache_key not in self._plan_cache:
            return False
        
        last_update = self._last_cache_update.get(cache_key)
        if not last_update:
            return False
        
        return (datetime.utcnow() - last_update).seconds < self._cache_ttl
    
    def _clear_plan_cache(self):
        """Clear plan cache"""
        cache_keys_to_remove = [key for key in self._plan_cache.keys() if key.startswith('plan_') or key.startswith('all_plans_')]
        for key in cache_keys_to_remove:
            self._plan_cache.pop(key, None)
            self._last_cache_update.pop(key, None)


# Create singleton instance
billing_db = BillingDatabase()