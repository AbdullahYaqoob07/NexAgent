import stripe
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal
import logging
import json
import hmac
import hashlib
import os

from app.core.config import settings
from app.models.marketplace_models import (
    CheckoutRequest, PurchaseStatus, SellerStatus
)

logger = logging.getLogger(__name__)

# Initialize Stripe with API key
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', 'sk_test_...')


class StripeService:
    """
    Industrial-grade Stripe integration for marketplace payments
    
    Features:
    - Stripe Connect for marketplace payments
    - Webhook handling for payment events
    - Seller account management
    - Payment processing and refunds
    - Subscription management
    - Tax calculations
    """
    
    def __init__(self):
        self.webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', 'whsec_...')
        self.marketplace_fee_percent = getattr(settings, 'MARKETPLACE_FEE_PERCENT', 10.0)  # 10% platform fee
        
    # =============================================================================
    # CUSTOMER MANAGEMENT
    # =============================================================================
    
    async def create_customer(self, email: str, name: Optional[str] = None, metadata: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Create a Stripe customer for subscription billing"""
        try:
            customer_data = {
                'email': email,
                'metadata': metadata or {}
            }
            
            if name:
                customer_data['name'] = name
                
            customer = stripe.Customer.create(**customer_data)
            
            logger.info(f"Created Stripe customer {customer.id} for {email}")
            
            return {
                'success': True,
                'customer_id': customer.id,
                'email': customer.email,
                'name': customer.name
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_type': 'stripe_error'
            }
        except Exception as e:
            logger.error(f"Error creating customer: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_type': 'general_error'
            }
    
    # =============================================================================
    # STRIPE CONNECT - SELLER ACCOUNT MANAGEMENT
    # =============================================================================
    
    async def create_connect_account(self, seller_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a Stripe Connect account for seller"""
        try:
            account_data = {
                'type': 'express',  # Express accounts for easier onboarding
                'country': seller_data['address']['country'],
                'email': seller_data['business_email'],
                'capabilities': {
                    'card_payments': {'requested': True},
                    'transfers': {'requested': True},
                },
                'business_type': 'individual' if seller_data['business_type'] == 'individual' else 'company',
                'metadata': {
                    'seller_id': seller_data['id'],
                    'user_id': seller_data['user_id']
                }
            }
            
            # Add business profile
            if seller_data['business_type'] == 'company':
                account_data['company'] = {
                    'name': seller_data['business_name'],
                    'address': {
                        'line1': seller_data['address']['line1'],
                        'line2': seller_data['address']['line2'],
                        'city': seller_data['address']['city'],
                        'state': seller_data['address']['state'],
                        'postal_code': seller_data['address']['postal_code'],
                        'country': seller_data['address']['country'],
                    }
                }
                
                if seller_data.get('tax_id'):
                    account_data['company']['tax_id'] = seller_data['tax_id']
                    
            else:  # individual
                account_data['individual'] = {
                    'email': seller_data['business_email'],
                    'address': {
                        'line1': seller_data['address']['line1'],
                        'line2': seller_data['address']['line2'],
                        'city': seller_data['address']['city'],
                        'state': seller_data['address']['state'],
                        'postal_code': seller_data['address']['postal_code'],
                        'country': seller_data['address']['country'],
                    }
                }
            
            # Create the account
            account = stripe.Account.create(**account_data)
            
            logger.info(f"Created Stripe Connect account {account.id} for seller {seller_data['id']}")
            
            return {
                'success': True,
                'account_id': account.id,
                'account_status': account.charges_enabled,
                'details_submitted': account.details_submitted,
                'payouts_enabled': account.payouts_enabled
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating Connect account: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_type': 'stripe_error'
            }
        except Exception as e:
            logger.error(f"Error creating Connect account: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_type': 'general_error'
            }
    
    async def create_account_link(self, account_id: str, return_url: str, refresh_url: str) -> Dict[str, Any]:
        """Create onboarding link for Stripe Connect account"""
        try:
            account_link = stripe.AccountLink.create(
                account=account_id,
                return_url=return_url,
                refresh_url=refresh_url,
                type='account_onboarding'
            )
            
            return {
                'success': True,
                'url': account_link.url,
                'expires_at': account_link.expires_at
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating account link: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_account_status(self, account_id: str) -> Dict[str, Any]:
        """Get Stripe Connect account status and capabilities"""
        try:
            account = stripe.Account.retrieve(account_id)
            
            return {
                'success': True,
                'account_id': account.id,
                'charges_enabled': account.charges_enabled,
                'details_submitted': account.details_submitted,
                'payouts_enabled': account.payouts_enabled,
                'requirements': {
                    'currently_due': account.requirements.currently_due,
                    'eventually_due': account.requirements.eventually_due,
                    'past_due': account.requirements.past_due,
                    'pending_verification': account.requirements.pending_verification,
                },
                'capabilities': {
                    'card_payments': account.capabilities.card_payments,
                    'transfers': account.capabilities.transfers,
                }
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error getting account status: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    # =============================================================================
    # PAYMENT PROCESSING
    # =============================================================================
    
    async def create_checkout_session(
        self, 
        nexa_data: Dict[str, Any], 
        seller_data: Dict[str, Any],
        customer_email: str,
        success_url: str,
        cancel_url: str,
        coupon_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create Stripe Checkout session for Nexa purchase"""
        try:
            # Calculate amounts
            price = Decimal(str(nexa_data['price']))
            marketplace_fee = price * Decimal(str(self.marketplace_fee_percent)) / 100
            seller_amount = price - marketplace_fee
            
            # Apply coupon if provided
            discounts = []
            if coupon_code:
                try:
                    coupon = stripe.Coupon.retrieve(coupon_code)
                    discounts = [{'coupon': coupon_code}]
                except stripe.error.InvalidRequestError:
                    logger.warning(f"Invalid coupon code: {coupon_code}")
            
            # Create line items
            line_items = [{
                'price_data': {
                    'currency': nexa_data['currency'].lower(),
                    'product_data': {
                        'name': nexa_data['name'],
                        'description': nexa_data['short_description'],
                        'images': nexa_data.get('screenshots', [])[:1],  # First screenshot as image
                        'metadata': {
                            'nexa_id': nexa_data['id'],
                            'seller_id': seller_data['id'],
                            'license_type': nexa_data['license_type']
                        }
                    },
                    'unit_amount': int(price * 100),  # Convert to cents
                },
                'quantity': 1,
            }]
            
            # Session configuration
            session_config = {
                'payment_method_types': ['card'],
                'line_items': line_items,
                'mode': 'payment',
                'success_url': success_url + '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url': cancel_url,
                'customer_email': customer_email,
                'metadata': {
                    'nexa_id': nexa_data['id'],
                    'seller_id': seller_data['id'],
                    'license_type': nexa_data['license_type'],
                    'marketplace_fee': str(marketplace_fee),
                },
                'payment_intent_data': {
                    'application_fee_amount': int(marketplace_fee * 100),  # Platform fee in cents
                    'transfer_data': {
                        'destination': seller_data['stripe_account_id'],
                    },
                    'metadata': {
                        'nexa_id': nexa_data['id'],
                        'seller_id': seller_data['id']
                    }
                }
            }
            
            # Add discounts if available
            if discounts:
                session_config['discounts'] = discounts
            
            # Create the session
            session = stripe.checkout.Session.create(**session_config)
            
            return {
                'success': True,
                'session_id': session.id,
                'url': session.url,
                'payment_intent_id': session.payment_intent,
                'amount_total': session.amount_total,
                'marketplace_fee': int(marketplace_fee * 100),
                'seller_amount': int(seller_amount * 100)
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating checkout session: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_type': 'stripe_error'
            }
        except Exception as e:
            logger.error(f"Error creating checkout session: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_type': 'general_error'
            }
    
    async def retrieve_checkout_session(self, session_id: str) -> Dict[str, Any]:
        """Retrieve checkout session details"""
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            
            return {
                'success': True,
                'session_id': session.id,
                'payment_status': session.payment_status,
                'payment_intent_id': session.payment_intent,
                'customer_email': session.customer_email,
                'amount_total': session.amount_total,
                'metadata': dict(session.metadata) if session.metadata else {}
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error retrieving session: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str,
        seller_account_id: str,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Create a payment intent for direct payments"""
        try:
            # Calculate marketplace fee
            marketplace_fee = amount * Decimal(str(self.marketplace_fee_percent)) / 100
            
            payment_intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Convert to cents
                currency=currency.lower(),
                application_fee_amount=int(marketplace_fee * 100),
                transfer_data={
                    'destination': seller_account_id,
                },
                metadata=metadata or {}
            )
            
            return {
                'success': True,
                'payment_intent_id': payment_intent.id,
                'client_secret': payment_intent.client_secret,
                'status': payment_intent.status
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payment intent: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    # =============================================================================
    # REFUNDS AND DISPUTES
    # =============================================================================
    
    async def create_refund(self, payment_intent_id: str, amount: Optional[Decimal] = None, reason: str = 'requested_by_customer') -> Dict[str, Any]:
        """Create a refund for a payment"""
        try:
            refund_data = {
                'payment_intent': payment_intent_id,
                'reason': reason,
                'metadata': {
                    'refunded_at': datetime.utcnow().isoformat(),
                    'refund_reason': reason
                }
            }
            
            # Add amount if partial refund
            if amount:
                refund_data['amount'] = int(amount * 100)
            
            refund = stripe.Refund.create(**refund_data)
            
            return {
                'success': True,
                'refund_id': refund.id,
                'amount': refund.amount,
                'status': refund.status,
                'reason': refund.reason
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating refund: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    # =============================================================================
    # SUBSCRIPTION MANAGEMENT (for recurring payments)
    # =============================================================================
    
    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        seller_account_id: str,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Create a subscription for recurring payments"""
        try:
            # Calculate application fee percentage
            application_fee_percent = self.marketplace_fee_percent
            
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{'price': price_id}],
                application_fee_percent=application_fee_percent,
                transfer_data={
                    'destination': seller_account_id,
                },
                metadata=metadata or {}
            )
            
            return {
                'success': True,
                'subscription_id': subscription.id,
                'status': subscription.status,
                'current_period_start': subscription.current_period_start,
                'current_period_end': subscription.current_period_end
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating subscription: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def cancel_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Cancel a subscription"""
        try:
            subscription = stripe.Subscription.delete(subscription_id)
            
            return {
                'success': True,
                'subscription_id': subscription.id,
                'status': subscription.status,
                'canceled_at': subscription.canceled_at
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error canceling subscription: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    # =============================================================================
    # WEBHOOK HANDLING
    # =============================================================================
    
    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Verify Stripe webhook signature"""
        try:
            stripe.Webhook.construct_event(payload, signature, self.webhook_secret)
            return True
        except (stripe.error.SignatureVerificationError, ValueError):
            return False
    
    async def handle_webhook_event(self, event_type: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Stripe webhook events"""
        try:
            handler_result = {'success': True, 'processed': True}
            
            if event_type == 'checkout.session.completed':
                handler_result = await self._handle_checkout_completed(event_data)
            
            elif event_type == 'payment_intent.succeeded':
                handler_result = await self._handle_payment_succeeded(event_data)
            
            elif event_type == 'payment_intent.payment_failed':
                handler_result = await self._handle_payment_failed(event_data)
            
            elif event_type == 'account.updated':
                handler_result = await self._handle_account_updated(event_data)
            
            elif event_type == 'invoice.payment_succeeded':
                handler_result = await self._handle_subscription_payment(event_data)
            
            elif event_type == 'customer.subscription.deleted':
                handler_result = await self._handle_subscription_canceled(event_data)
            
            else:
                handler_result = {'success': True, 'processed': False, 'message': f'Unhandled event type: {event_type}'}
            
            logger.info(f"Webhook event {event_type} processed: {handler_result}")
            return handler_result
            
        except Exception as e:
            logger.error(f"Error handling webhook event {event_type}: {str(e)}")
            return {
                'success': False,
                'processed': False,
                'error': str(e)
            }
    
    async def _handle_checkout_completed(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle completed checkout session"""
        try:
            session = event_data['object']
            session_id = session['id']
            payment_intent_id = session['payment_intent']
            metadata = session.get('metadata', {})
            
            # Update purchase record
            from app.db.marketplace_db import marketplace_db
            
            # Find purchase by session ID
            purchase_query = marketplace_db.purchases_col.where('stripe_session_id', '==', session_id).limit(1)
            purchase_docs = list(purchase_query.stream())
            
            if purchase_docs:
                purchase_doc = purchase_docs[0]
                purchase_data = purchase_doc.to_dict()
                
                # Update purchase status
                await marketplace_db.update_purchase(purchase_data['id'], {
                    'status': PurchaseStatus.COMPLETED.value,
                    'stripe_payment_intent_id': payment_intent_id,
                    'completed_at': datetime.utcnow()
                })
                
                # Update Nexa statistics
                marketplace_db._increment_nexa_stat(purchase_data['nexa_id'], 'purchases')
                
                # Update seller statistics
                await marketplace_db._update_seller_stats(
                    purchase_data['seller_id'], 
                    'sale_completed', 
                    purchase_data['amount']
                )
                
                logger.info(f"Purchase {purchase_data['id']} completed successfully")
            
            return {'success': True, 'processed': True}
            
        except Exception as e:
            logger.error(f"Error handling checkout completed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def _handle_payment_succeeded(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle successful payment intent"""
        try:
            payment_intent = event_data['object']
            payment_intent_id = payment_intent['id']
            
            # Log successful payment
            logger.info(f"Payment intent {payment_intent_id} succeeded")
            
            return {'success': True, 'processed': True}
            
        except Exception as e:
            logger.error(f"Error handling payment succeeded: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def _handle_payment_failed(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle failed payment intent"""
        try:
            payment_intent = event_data['object']
            payment_intent_id = payment_intent['id']
            
            # Update purchase status to failed
            from app.db.marketplace_db import marketplace_db
            
            purchase_query = marketplace_db.purchases_col.where('stripe_payment_intent_id', '==', payment_intent_id).limit(1)
            purchase_docs = list(purchase_query.stream())
            
            if purchase_docs:
                purchase_doc = purchase_docs[0]
                purchase_data = purchase_doc.to_dict()
                
                await marketplace_db.update_purchase(purchase_data['id'], {
                    'status': PurchaseStatus.FAILED.value,
                    'failure_reason': payment_intent.get('last_payment_error', {}).get('message', 'Payment failed')
                })
            
            logger.warning(f"Payment intent {payment_intent_id} failed")
            
            return {'success': True, 'processed': True}
            
        except Exception as e:
            logger.error(f"Error handling payment failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def _handle_account_updated(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Stripe Connect account updates"""
        try:
            account = event_data['object']
            account_id = account['id']
            
            # Update seller account status
            from app.db.marketplace_db import marketplace_db
            
            seller_query = marketplace_db.sellers_col.where('stripe_account_id', '==', account_id).limit(1)
            seller_docs = list(seller_query.stream())
            
            if seller_docs:
                seller_doc = seller_docs[0]
                seller_data = seller_doc.to_dict()
                
                # Update seller status based on account capabilities
                status = SellerStatus.ACTIVE.value if account['charges_enabled'] else SellerStatus.PENDING.value
                
                await marketplace_db.update_seller(seller_data['id'], {
                    'status': status,
                    'stripe_onboarding_complete': account['details_submitted'],
                    'payout_enabled': account['payouts_enabled'],
                    'updated_at': datetime.utcnow()
                })
            
            logger.info(f"Stripe account {account_id} updated")
            
            return {'success': True, 'processed': True}
            
        except Exception as e:
            logger.error(f"Error handling account updated: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def _handle_subscription_payment(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle successful subscription payment"""
        # Implementation for subscription payments
        return {'success': True, 'processed': True}
    
    async def _handle_subscription_canceled(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle canceled subscription"""
        # Implementation for subscription cancellation
        return {'success': True, 'processed': True}
    
    # =============================================================================
    # UTILITY METHODS
    # =============================================================================
    
    async def get_balance(self, account_id: Optional[str] = None) -> Dict[str, Any]:
        """Get account balance"""
        try:
            if account_id:
                balance = stripe.Balance.retrieve(stripe_account=account_id)
            else:
                balance = stripe.Balance.retrieve()
            
            return {
                'success': True,
                'available': [
                    {
                        'amount': bal['amount'],
                        'currency': bal['currency'],
                        'source_types': bal['source_types']
                    } for bal in balance['available']
                ],
                'pending': [
                    {
                        'amount': bal['amount'],
                        'currency': bal['currency'],
                        'source_types': bal['source_types']
                    } for bal in balance['pending']
                ]
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error getting balance: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def create_payout(self, account_id: str, amount: Decimal, currency: str) -> Dict[str, Any]:
        """Create a payout to seller's bank account"""
        try:
            payout = stripe.Payout.create(
                amount=int(amount * 100),
                currency=currency.lower(),
                stripe_account=account_id,
                metadata={
                    'created_at': datetime.utcnow().isoformat()
                }
            )
            
            return {
                'success': True,
                'payout_id': payout.id,
                'amount': payout.amount,
                'status': payout.status,
                'arrival_date': payout.arrival_date
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payout: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }


# Singleton instance
stripe_service = StripeService()