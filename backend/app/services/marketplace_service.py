from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from decimal import Decimal
import logging
import asyncio
import json
from concurrent.futures import ThreadPoolExecutor

from app.models.marketplace_models import (
    NexaCreateRequest, NexaUpdateRequest, NexaSearchRequest, NexaResponse, NexaListResponse,
    SellerRegistrationRequest, SellerProfileUpdateRequest, SellerResponse, SellerDashboardResponse,
    CheckoutRequest, PurchaseResponse, PurchaseListResponse,
    CollectionCreateRequest, CollectionUpdateRequest, CollectionResponse,
    ReviewCreateRequest, ReviewResponse,
    AdminNexaModerationRequest, AdminAnalyticsResponse,
    SuccessResponse, ErrorResponse, BulkOperationResponse,
    NexaStatus, SellerStatus, PurchaseStatus
)
from app.db.marketplace_db import marketplace_db
from app.services.stripe_service import stripe_service
from app.services.firebase_service import FirebaseService

logger = logging.getLogger(__name__)


class MarketplaceService:
    """
    Comprehensive marketplace service layer with business logic
    
    Features:
    - Nexa management and publishing
    - Seller onboarding and management
    - Payment processing and purchase handling
    - Collections and favorites
    - Reviews and ratings
    - Admin operations and moderation
    - Analytics and reporting
    """
    
    def __init__(self):
        self.firebase_service = FirebaseService()
        self.executor = ThreadPoolExecutor(max_workers=10)
        self.background_tasks = set()

    # =============================================================================
    # NEXA MANAGEMENT
    # =============================================================================

    async def create_nexa(self, nexa_data: NexaCreateRequest, user_id: str) -> Dict[str, Any]:
        """Create a new Nexa in the marketplace"""
        try:
            # Check if user is a verified seller
            seller = await marketplace_db.get_seller_by_user_id(user_id)
            if not seller:
                return {
                    'success': False,
                    'error': 'User is not registered as a seller',
                    'error_code': 'NOT_A_SELLER'
                }
            
            if seller['status'] != SellerStatus.ACTIVE.value:
                return {
                    'success': False,
                    'error': 'Seller account is not active',
                    'error_code': 'SELLER_NOT_ACTIVE'
                }
            
            # Create the Nexa
            nexa_id = await marketplace_db.create_nexa(nexa_data, seller['id'])
            
            # Send for review if pricing is set
            if nexa_data.pricing_model.value != 'free' or nexa_data.price > 0:
                await self._submit_for_review(nexa_id)
            
            return {
                'success': True,
                'message': 'Nexa created successfully',
                'nexa_id': nexa_id,
                'status': 'draft' if nexa_data.price > 0 else 'pending_review'
            }
            
        except Exception as e:
            logger.error(f"Error creating Nexa: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_code': 'CREATION_FAILED'
            }

    async def get_nexa_details(self, nexa_id: str, user_id: str = None) -> Optional[NexaResponse]:
        """Get detailed Nexa information"""
        try:
            nexa_data = await marketplace_db.get_nexa_by_id(nexa_id, user_id)
            if not nexa_data:
                return None
            
            # Convert to response model
            return NexaResponse(**nexa_data)
            
        except Exception as e:
            logger.error(f"Error getting Nexa details: {str(e)}")
            return None

    async def search_nexas(self, search_params: NexaSearchRequest, user_id: str = None) -> NexaListResponse:
        """Search and filter Nexas with pagination"""
        try:
            # Convert search params to database query params
            db_params = {
                'query': search_params.query,
                'category': search_params.category.value if search_params.category else None,
                'pricing_model': search_params.pricing_model.value if search_params.pricing_model else None,
                'min_price': float(search_params.min_price) if search_params.min_price else None,
                'max_price': float(search_params.max_price) if search_params.max_price else None,
                'license_type': search_params.license_type.value if search_params.license_type else None,
                'min_rating': search_params.min_rating,
                'tags': search_params.tags,
                'sort_by': search_params.sort_by,
                'user_id': user_id
            }
            
            # Get paginated results
            results = await marketplace_db.search_nexas(**db_params)
            
            # Convert to response models
            nexas = [NexaResponse(**nexa) for nexa in results['nexas']]
            
            return NexaListResponse(
                nexas=nexas,
                total=results['total'],
                page=results['page'],
                page_size=results['page_size'],
                total_pages=results['total_pages'],
                has_next=results['has_next'],
                has_prev=results['has_prev']
            )
            
        except Exception as e:
            logger.error(f"Error searching Nexas: {str(e)}")
            return NexaListResponse(
                nexas=[],
                total=0,
                page=1,
                page_size=20,
                total_pages=0,
                has_next=False,
                has_prev=False
            )

    async def update_nexa(self, nexa_id: str, update_data: NexaUpdateRequest, user_id: str) -> Dict[str, Any]:
        """Update Nexa details"""
        try:
            # Check ownership
            nexa = await marketplace_db.get_nexa_by_id(nexa_id)
            if not nexa:
                return {'success': False, 'error': 'Nexa not found'}
            
            seller = await marketplace_db.get_seller_by_user_id(user_id)
            if not seller or nexa['seller_id'] != seller['id']:
                return {'success': False, 'error': 'Access denied'}
            
            # Update the Nexa
            update_dict = update_data.dict(exclude_unset=True)
            success = await marketplace_db.update_nexa(nexa_id, update_dict)
            
            if success:
                # Resubmit for review if pricing changed
                if 'price' in update_dict or 'pricing_model' in update_dict:
                    await self._submit_for_review(nexa_id)
                
                return {'success': True, 'message': 'Nexa updated successfully'}
            else:
                return {'success': False, 'error': 'Update failed'}
                
        except Exception as e:
            logger.error(f"Error updating Nexa: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def delete_nexa(self, nexa_id: str, user_id: str) -> Dict[str, Any]:
        """Delete a Nexa"""
        try:
            # Check ownership
            nexa = await marketplace_db.get_nexa_by_id(nexa_id)
            if not nexa:
                return {'success': False, 'error': 'Nexa not found'}
            
            seller = await marketplace_db.get_seller_by_user_id(user_id)
            if not seller or nexa['seller_id'] != seller['id']:
                return {'success': False, 'error': 'Access denied'}
            
            # Check if Nexa has been purchased
            # TODO: Add check for existing purchases
            
            # Delete the Nexa
            success = await marketplace_db.delete_nexa(nexa_id)
            
            if success:
                return {'success': True, 'message': 'Nexa deleted successfully'}
            else:
                return {'success': False, 'error': 'Deletion failed'}
                
        except Exception as e:
            logger.error(f"Error deleting Nexa: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def get_seller_nexas(self, user_id: str, page: int = 1, page_size: int = 20) -> NexaListResponse:
        """Get seller's published Nexas"""
        try:
            seller = await marketplace_db.get_seller_by_user_id(user_id)
            if not seller:
                return NexaListResponse(nexas=[], total=0, page=1, page_size=page_size, total_pages=0, has_next=False, has_prev=False)
            
            offset = (page - 1) * page_size
            
            # Search for seller's Nexas
            results = await marketplace_db.search_nexas(
                seller_id=seller['id'],
                limit=page_size,
                offset=offset,
                user_id=user_id
            )
            
            nexas = [NexaResponse(**nexa) for nexa in results['nexas']]
            
            return NexaListResponse(
                nexas=nexas,
                total=results['total'],
                page=page,
                page_size=page_size,
                total_pages=results['total_pages'],
                has_next=results['has_next'],
                has_prev=results['has_prev']
            )
            
        except Exception as e:
            logger.error(f"Error getting seller Nexas: {str(e)}")
            return NexaListResponse(nexas=[], total=0, page=1, page_size=page_size, total_pages=0, has_next=False, has_prev=False)

    # =============================================================================
    # SELLER MANAGEMENT
    # =============================================================================

    async def register_seller(self, registration_data: SellerRegistrationRequest, user_id: str) -> Dict[str, Any]:
        """Register a new seller"""
        try:
            # Check if user is already a seller
            existing_seller = await marketplace_db.get_seller_by_user_id(user_id)
            if existing_seller:
                return {
                    'success': False,
                    'error': 'User is already registered as a seller',
                    'error_code': 'ALREADY_SELLER'
                }
            
            # Create seller account
            seller_id = await marketplace_db.create_seller(registration_data, user_id)
            
            # Create Stripe Connect account
            seller_data = await marketplace_db.get_seller_by_id(seller_id)
            stripe_result = await stripe_service.create_connect_account(seller_data)
            
            if stripe_result['success']:
                # Update seller with Stripe account ID
                await marketplace_db.update_seller(seller_id, {
                    'stripe_account_id': stripe_result['account_id'],
                    'stripe_onboarding_complete': stripe_result['details_submitted']
                })
                
                return {
                    'success': True,
                    'message': 'Seller registration successful',
                    'seller_id': seller_id,
                    'stripe_account_id': stripe_result['account_id'],
                    'onboarding_required': not stripe_result['details_submitted']
                }
            else:
                # Delete seller if Stripe account creation failed
                await marketplace_db.delete_seller(seller_id)
                return {
                    'success': False,
                    'error': 'Failed to create payment account',
                    'error_code': 'STRIPE_SETUP_FAILED'
                }
                
        except Exception as e:
            logger.error(f"Error registering seller: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_code': 'REGISTRATION_FAILED'
            }

    async def get_seller_onboarding_link(self, user_id: str, return_url: str, refresh_url: str) -> Dict[str, Any]:
        """Get Stripe onboarding link for seller"""
        try:
            seller = await marketplace_db.get_seller_by_user_id(user_id)
            if not seller or not seller['stripe_account_id']:
                return {'success': False, 'error': 'Seller not found or no Stripe account'}
            
            link_result = await stripe_service.create_account_link(
                seller['stripe_account_id'],
                return_url,
                refresh_url
            )
            
            return link_result
            
        except Exception as e:
            logger.error(f"Error getting onboarding link: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def get_seller_dashboard(self, user_id: str) -> Optional[SellerDashboardResponse]:
        """Get seller dashboard data"""
        try:
            seller = await marketplace_db.get_seller_by_user_id(user_id)
            if not seller:
                return None
            
            # Get seller analytics
            analytics = await marketplace_db.get_seller_analytics(seller['id'])
            
            # Get Stripe account status
            stripe_status = await stripe_service.get_account_status(seller['stripe_account_id']) if seller['stripe_account_id'] else None
            
            return SellerDashboardResponse(
                seller=SellerResponse(**seller),
                stats=analytics,
                recent_sales=analytics.get('recent_sales', []),
                top_nexas=analytics.get('top_nexas', []),
                pending_payouts=Decimal(str(analytics.get('pending_payouts', 0))),
                revenue_chart=analytics.get('revenue_chart', []),
                sales_chart=analytics.get('sales_chart', [])
            )
            
        except Exception as e:
            logger.error(f"Error getting seller dashboard: {str(e)}")
            return None

    async def update_seller_profile(self, update_data: SellerProfileUpdateRequest, user_id: str) -> Dict[str, Any]:
        """Update seller profile"""
        try:
            seller = await marketplace_db.get_seller_by_user_id(user_id)
            if not seller:
                return {'success': False, 'error': 'Seller not found'}
            
            update_dict = update_data.dict(exclude_unset=True)
            success = await marketplace_db.update_seller(seller['id'], update_dict)
            
            if success:
                return {'success': True, 'message': 'Profile updated successfully'}
            else:
                return {'success': False, 'error': 'Update failed'}
                
        except Exception as e:
            logger.error(f"Error updating seller profile: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def get_seller_profile(self, seller_id: str) -> Optional[SellerResponse]:
        """Get public seller profile"""
        try:
            seller_data = await marketplace_db.get_seller_by_id(seller_id)
            if not seller_data:
                return None
            
            return SellerResponse(**seller_data)
            
        except Exception as e:
            logger.error(f"Error getting seller profile: {str(e)}")
            return None

    # =============================================================================
    # PURCHASE & PAYMENT PROCESSING
    # =============================================================================

    async def create_checkout_session(self, checkout_data: CheckoutRequest, user_id: str) -> Dict[str, Any]:
        """Create Stripe checkout session for Nexa purchase"""
        try:
            # Get Nexa details
            nexa = await marketplace_db.get_nexa_by_id(checkout_data.nexa_id, user_id)
            if not nexa:
                return {'success': False, 'error': 'Nexa not found'}
            
            if nexa['status'] != NexaStatus.APPROVED.value:
                return {'success': False, 'error': 'Nexa not available for purchase'}
            
            # Check if already purchased
            if nexa.get('is_purchased'):
                return {'success': False, 'error': 'Already purchased'}
            
            # Get seller details
            seller = await marketplace_db.get_seller_by_id(nexa['seller_id'])
            if not seller or not seller['stripe_account_id']:
                return {'success': False, 'error': 'Seller payment account not set up'}
            
            # Get user email
            user_doc = await self.firebase_service.get_user_by_id(user_id)
            user_email = user_doc.get('email') if user_doc else None
            
            # Create purchase record
            purchase_data = {
                'user_id': user_id,
                'nexa_id': nexa['id'],
                'nexa_name': nexa['name'],
                'seller_id': seller['id'],
                'seller_name': seller['business_name'],
                'amount': nexa['price'],
                'currency': nexa['currency'],
                'license_type': nexa['license_type'],
                'max_installations': nexa.get('max_installations')
            }
            
            purchase_id = await marketplace_db.create_purchase(purchase_data)
            
            # Create Stripe checkout session
            stripe_result = await stripe_service.create_checkout_session(
                nexa_data=nexa,
                seller_data=seller,
                customer_email=user_email,
                success_url=checkout_data.success_url,
                cancel_url=checkout_data.cancel_url,
                coupon_code=checkout_data.coupon_code
            )
            
            if stripe_result['success']:
                # Update purchase with session ID
                await marketplace_db.update_purchase(purchase_id, {
                    'stripe_session_id': stripe_result['session_id'],
                    'stripe_payment_intent_id': stripe_result['payment_intent_id']
                })
                
                return {
                    'success': True,
                    'checkout_url': stripe_result['url'],
                    'session_id': stripe_result['session_id'],
                    'purchase_id': purchase_id
                }
            else:
                return {
                    'success': False,
                    'error': stripe_result['error'],
                    'error_type': 'STRIPE_ERROR'
                }
                
        except Exception as e:
            logger.error(f"Error creating checkout session: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def get_user_purchases(self, user_id: str, page: int = 1, page_size: int = 20) -> PurchaseListResponse:
        """Get user's purchase history"""
        try:
            offset = (page - 1) * page_size
            result = await marketplace_db.get_user_purchases(user_id, page_size, offset)
            
            purchases = [PurchaseResponse(**purchase) for purchase in result['purchases']]
            
            return PurchaseListResponse(
                purchases=purchases,
                total=result['total'],
                page=result['page'],
                page_size=result['page_size']
            )
            
        except Exception as e:
            logger.error(f"Error getting user purchases: {str(e)}")
            return PurchaseListResponse(purchases=[], total=0, page=1, page_size=page_size)

    async def get_purchase_details(self, purchase_id: str, user_id: str) -> Optional[PurchaseResponse]:
        """Get purchase details"""
        try:
            purchase = await marketplace_db.get_purchase_by_id(purchase_id)
            if not purchase or purchase['user_id'] != user_id:
                return None
            
            return PurchaseResponse(**purchase)
            
        except Exception as e:
            logger.error(f"Error getting purchase details: {str(e)}")
            return None

    # =============================================================================
    # FAVORITES & COLLECTIONS
    # =============================================================================

    async def star_nexa(self, nexa_id: str, user_id: str) -> Dict[str, Any]:
        """Add Nexa to user favorites"""
        try:
            # Check if Nexa exists
            nexa = await marketplace_db.get_nexa_by_id(nexa_id)
            if not nexa:
                return {'success': False, 'error': 'Nexa not found'}
            
            # Star the Nexa
            success = await marketplace_db.star_nexa(user_id, nexa_id)
            
            if success:
                return {'success': True, 'message': 'Nexa starred successfully'}
            else:
                return {'success': False, 'error': 'Failed to star Nexa'}
                
        except Exception as e:
            logger.error(f"Error starring Nexa: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def unstar_nexa(self, nexa_id: str, user_id: str) -> Dict[str, Any]:
        """Remove Nexa from user favorites"""
        try:
            success = await marketplace_db.unstar_nexa(user_id, nexa_id)
            
            if success:
                return {'success': True, 'message': 'Nexa unstarred successfully'}
            else:
                return {'success': False, 'error': 'Failed to unstar Nexa'}
                
        except Exception as e:
            logger.error(f"Error unstarring Nexa: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def get_starred_nexas(self, user_id: str, page: int = 1, page_size: int = 20) -> NexaListResponse:
        """Get user's starred Nexas"""
        try:
            offset = (page - 1) * page_size
            result = await marketplace_db.get_starred_nexas(user_id, page_size, offset)
            
            nexas = [NexaResponse(**nexa) for nexa in result['nexas']]
            
            return NexaListResponse(
                nexas=nexas,
                total=result['total'],
                page=result['page'],
                page_size=result['page_size'],
                total_pages=(result['total'] + page_size - 1) // page_size,
                has_next=result['page'] * page_size < result['total'],
                has_prev=result['page'] > 1
            )
            
        except Exception as e:
            logger.error(f"Error getting starred Nexas: {str(e)}")
            return NexaListResponse(nexas=[], total=0, page=1, page_size=page_size, total_pages=0, has_next=False, has_prev=False)

    # =============================================================================
    # ADMIN OPERATIONS & CONFIGURATION
    # =============================================================================

    async def get_fee_configuration(self) -> Dict[str, Any]:
        """Return current marketplace fee configuration for admin settings UI."""
        try:
            return await marketplace_db.get_fee_config()
        except Exception as e:
            logger.error(f"Error getting fee configuration: {str(e)}")
            return {}

    async def update_fee_configuration(self, fee_config: Dict[str, Any], admin_user_id: str) -> Dict[str, Any]:
        """Update marketplace fee configuration.

        The caller is expected to enforce super-admin authorization.
        """
        try:
            success = await marketplace_db.update_fee_config(fee_config, admin_user_id)
            if success:
                return {'success': True, 'message': 'Fee configuration updated successfully'}
            return {'success': False, 'error': 'Failed to update fee configuration'}
        except Exception as e:
            logger.error(f"Error updating fee configuration: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def get_category_configuration(self) -> List[Dict[str, Any]]:
        """Return all marketplace categories for admin configuration UI."""
        try:
            return await marketplace_db.get_categories()
        except Exception as e:
            logger.error(f"Error getting category configuration: {str(e)}")
            return []

    async def add_category(self, category_data: Dict[str, Any], admin_user_id: str) -> Dict[str, Any]:
        """Create a new marketplace category from admin panel."""
        try:
            category_id = await marketplace_db.add_category(category_data, admin_user_id)
            if not category_id:
                return {'success': False, 'error': 'Failed to create category'}
            return {
                'success': True,
                'message': 'Category created successfully',
                'category_id': category_id,
            }
        except Exception as e:
            logger.error(f"Error adding category: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def moderate_nexa(self, moderation_data: AdminNexaModerationRequest, admin_user_id: str) -> Dict[str, Any]:
        """Moderate a Nexa (admin only)"""
        try:
            nexa = await marketplace_db.get_nexa_by_id(moderation_data.nexa_id)
            if not nexa:
                return {'success': False, 'error': 'Nexa not found'}
            
            # Update Nexa status based on action
            status_mapping = {
                'approve': NexaStatus.APPROVED.value,
                'reject': NexaStatus.REJECTED.value,
                'suspend': NexaStatus.SUSPENDED.value,
                'archive': NexaStatus.ARCHIVED.value
            }
            
            new_status = status_mapping.get(moderation_data.action)
            if not new_status:
                return {'success': False, 'error': 'Invalid action'}
            
            update_data = {
                'status': new_status,
                'last_reviewed_by': admin_user_id,
                'last_reviewed_at': datetime.utcnow(),
                'review_notes': moderation_data.notes
            }
            
            if moderation_data.action == 'reject':
                update_data['rejection_reason'] = moderation_data.reason
            elif moderation_data.action == 'approve':
                update_data['published_at'] = datetime.utcnow()
            
            success = await marketplace_db.update_nexa(moderation_data.nexa_id, update_data)
            
            if success:
                # Send notification to seller
                await self._notify_seller_of_moderation(nexa['seller_id'], moderation_data)
                
                return {'success': True, 'message': f'Nexa {moderation_data.action}d successfully'}
            else:
                return {'success': False, 'error': 'Moderation update failed'}
                
        except Exception as e:
            logger.error(f"Error moderating Nexa: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def get_pending_nexas(self, limit: int = 50) -> List[NexaResponse]:
        """Get Nexas pending review (admin only)"""
        try:
            results = await marketplace_db.search_nexas(
                status=NexaStatus.PENDING_REVIEW.value,
                limit=limit,
                sort_by='oldest'
            )
            
            return [NexaResponse(**nexa) for nexa in results['nexas']]
            
        except Exception as e:
            logger.error(f"Error getting pending Nexas: {str(e)}")
            return []

    async def get_marketplace_analytics(self) -> AdminAnalyticsResponse:
        """Get marketplace-wide analytics (admin only)"""
        try:
            analytics = await marketplace_db.get_marketplace_analytics()
            
            return AdminAnalyticsResponse(
                total_nexas=analytics.get('total_nexas', 0),
                total_sellers=analytics.get('total_sellers', 0),
                total_purchases=analytics.get('total_purchases', 0),
                total_revenue=Decimal(str(analytics.get('total_revenue', 0))),
                new_nexas_today=analytics.get('new_nexas_today', 0),
                new_sellers_today=analytics.get('new_sellers_today', 0),
                purchases_today=analytics.get('purchases_today', 0),
                revenue_today=Decimal(str(analytics.get('revenue_today', 0))),
                revenue_chart=analytics.get('revenue_chart', []),
                nexas_chart=analytics.get('nexas_chart', []),
                users_chart=analytics.get('users_chart', []),
                top_nexas=analytics.get('top_nexas', []),
                top_sellers=analytics.get('top_sellers', []),
                pending_nexas=analytics.get('pending_nexas', 0),
                pending_reviews=analytics.get('pending_reviews', 0),
                pending_reports=analytics.get('pending_reports', 0)
            )
            
        except Exception as e:
            logger.error(f"Error getting marketplace analytics: {str(e)}")
            return AdminAnalyticsResponse(
                total_nexas=0, total_sellers=0, total_purchases=0, total_revenue=Decimal('0'),
                new_nexas_today=0, new_sellers_today=0, purchases_today=0, revenue_today=Decimal('0'),
                revenue_chart=[], nexas_chart=[], users_chart=[], top_nexas=[], top_sellers=[],
                pending_nexas=0, pending_reviews=0, pending_reports=0
            )

    # =============================================================================
    # HELPER METHODS
    # =============================================================================

    async def _submit_for_review(self, nexa_id: str):
        """Submit Nexa for admin review"""
        try:
            await marketplace_db.update_nexa(nexa_id, {
                'status': NexaStatus.PENDING_REVIEW.value,
                'submitted_for_review_at': datetime.utcnow()
            })
            
            # Notify admin of new submission (optional)
            # await self._notify_admin_of_submission(nexa_id)
            
        except Exception as e:
            logger.error(f"Error submitting Nexa for review: {str(e)}")

    async def _notify_seller_of_moderation(self, seller_id: str, moderation_data: AdminNexaModerationRequest):
        """Notify seller of moderation decision"""
        try:
            # Get seller data
            seller = await marketplace_db.get_seller_by_id(seller_id)
            if not seller:
                return
            
            # Create notification
            from app.services.notification_service import notification_service
            from app.models.notification_models import NotificationCreateRequest, NotificationType, NotificationPriority
            
            notification_data = NotificationCreateRequest(
                user_id=seller['user_id'],
                title=f"Nexa {moderation_data.action}d",
                message=f"Your Nexa has been {moderation_data.action}d. {moderation_data.reason or ''}",
                notification_type=NotificationType.CUSTOM,
                priority=NotificationPriority.HIGH if moderation_data.action == 'reject' else NotificationPriority.MEDIUM,
                metadata={
                    'nexa_id': moderation_data.nexa_id,
                    'action': moderation_data.action,
                    'reason': moderation_data.reason
                }
            )
            
            await notification_service.create_notification(notification_data)
            
        except Exception as e:
            logger.error(f"Error notifying seller: {str(e)}")

    async def process_webhook_event(self, event_type: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process Stripe webhook events"""
        try:
            return await stripe_service.handle_webhook_event(event_type, event_data)
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
            return {'success': False, 'error': str(e)}


# Singleton instance
marketplace_service = MarketplaceService()