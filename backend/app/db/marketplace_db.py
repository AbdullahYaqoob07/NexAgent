from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter, BaseCompositeFilter
from app.models.marketplace_models import (
    NexaStatus, NexaCategory, PricingModel, LicenseType, PurchaseStatus, 
    SellerStatus, ReviewStatus, NexaCreateRequest, SellerRegistrationRequest
)
from app.services.firebase_service import FirebaseService
from decimal import Decimal
import uuid
import logging
import json

logger = logging.getLogger(__name__)


class MarketplaceDB:
    """
    Firebase Firestore database operations for Marketplace system
    
    Collections Structure:
    - nexas/{nexa_id}: Individual Nexa documents
    - sellers/{seller_id}: Seller profile documents  
    - purchases/{purchase_id}: Purchase transaction documents
    - collections/{collection_id}: User-created Nexa collections
    - reviews/{review_id}: Nexa reviews and ratings
    - stars/{user_id}/nexas/{nexa_id}: User stars/favorites
    - analytics/{date}: Daily analytics aggregations
    - marketplace_stats: Global marketplace statistics
    """
    
    def __init__(self):
        self.firebase_service = FirebaseService()
        self.db = self.firebase_service.db
        
        # Collection references
        self.nexas_col = self.db.collection('nexas')
        self.sellers_col = self.db.collection('sellers')
        self.purchases_col = self.db.collection('purchases')
        self.collections_col = self.db.collection('collections')
        self.reviews_col = self.db.collection('reviews')
        self.stars_col = self.db.collection('stars')
        self.analytics_col = self.db.collection('analytics')
        self.stats_doc = self.db.collection('marketplace_stats').document('global')

        # Admin configuration collections
        self.config_col = self.db.collection('marketplace_config')
        self.categories_col = self.db.collection('marketplace_categories')

    # =============================================================================
    # NEXA MANAGEMENT
    # =============================================================================

    async def create_nexa(self, nexa_data: NexaCreateRequest, seller_id: str) -> str:
        """Create a new Nexa in the marketplace"""
        try:
            nexa_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            # Get seller information
            seller_doc = await self.get_seller_by_id(seller_id)
            if not seller_doc:
                raise ValueError("Seller not found")
            
            # Prepare Nexa document
            doc_data = {
                'id': nexa_id,
                'seller_id': seller_id,
                'seller_name': seller_doc['business_name'],
                'seller_avatar': seller_doc.get('avatar_url'),
                
                # Basic info
                'name': nexa_data.name,
                'description': nexa_data.description,
                'short_description': nexa_data.short_description,
                'category': nexa_data.category.value,
                'tags': nexa_data.tags,
                'status': NexaStatus.DRAFT.value,
                
                # Workflow data
                'workflow_data': nexa_data.workflow_data,
                'workflow_version': nexa_data.workflow_version,
                'min_nexagent_version': nexa_data.min_nexagent_version,
                'dependencies': nexa_data.dependencies,
                
                # Pricing
                'pricing_model': nexa_data.pricing_model.value,
                'price': float(nexa_data.price or 0),
                'currency': nexa_data.currency,
                'license_type': nexa_data.license_type.value,
                'max_installations': nexa_data.max_installations,
                
                # Media
                'screenshots': nexa_data.screenshots,
                'demo_video_url': nexa_data.demo_video_url,
                'documentation_url': nexa_data.documentation_url,
                
                # Statistics (initialized to 0)
                'downloads': 0,
                'purchases': 0,
                'rating': 0.0,
                'review_count': 0,
                'views': 0,
                'stars': 0,
                
                # Timestamps
                'created_at': now,
                'updated_at': now,
                'published_at': None,
                
                # Search and indexing fields
                'name_lower': nexa_data.name.lower(),
                'category_pricing': f"{nexa_data.category.value}_{nexa_data.pricing_model.value}",
                'seller_category': f"{seller_id}_{nexa_data.category.value}",
                'price_range': self._get_price_range(nexa_data.price or 0),
                'tags_searchable': ' '.join(nexa_data.tags).lower(),
                
                # Status tracking
                'review_notes': None,
                'rejection_reason': None,
                'last_reviewed_by': None,
                'last_reviewed_at': None
            }
            
            # Create the document
            self.nexas_col.document(nexa_id).set(doc_data)
            
            # Update seller stats
            await self._update_seller_stats(seller_id, 'nexa_created')
            
            logger.info(f"Created Nexa {nexa_id} for seller {seller_id}")
            return nexa_id
            
        except Exception as e:
            logger.error(f"Error creating Nexa: {str(e)}")
            raise

    async def get_nexa_by_id(self, nexa_id: str, user_id: str = None) -> Optional[Dict[str, Any]]:
        """Get Nexa by ID with user-specific data"""
        try:
            doc = self.nexas_col.document(nexa_id).get()
            if not doc.exists:
                return None
                
            nexa_data = doc.to_dict()
            
            # Add user-specific data if user is authenticated
            if user_id:
                # Check if user has purchased this Nexa
                purchase_query = self.purchases_col.where(filter=FieldFilter('user_id', '==', user_id)).where(filter=FieldFilter('nexa_id', '==', nexa_id)).where(filter=FieldFilter('status', '==', PurchaseStatus.COMPLETED.value)).limit(1)
                purchases = list(purchase_query.stream())
                nexa_data['is_purchased'] = len(purchases) > 0
                
                # Check if user has starred this Nexa
                star_doc = self.stars_col.document(user_id).collection('nexas').document(nexa_id).get()
                nexa_data['is_starred'] = star_doc.exists
            
            # Increment view count (background operation)
            self._increment_nexa_stat(nexa_id, 'views')
            
            return nexa_data
            
        except Exception as e:
            logger.error(f"Error getting Nexa {nexa_id}: {str(e)}")
            raise

    async def search_nexas(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        pricing_model: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        license_type: Optional[str] = None,
        min_rating: Optional[float] = None,
        tags: Optional[List[str]] = None,
        sort_by: str = "newest",
        limit: int = 20,
        offset: int = 0,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Search and filter Nexas with pagination"""
        try:
            # Start with approved Nexas only
            base_query = self.nexas_col.where(filter=FieldFilter('status', '==', NexaStatus.APPROVED.value))
            
            # Apply filters
            if category:
                base_query = base_query.where(filter=FieldFilter('category', '==', category))
            
            if pricing_model:
                base_query = base_query.where(filter=FieldFilter('pricing_model', '==', pricing_model))
            
            if license_type:
                base_query = base_query.where(filter=FieldFilter('license_type', '==', license_type))
            
            if min_rating:
                base_query = base_query.where(filter=FieldFilter('rating', '>=', min_rating))
            
            # Price range filtering
            if min_price is not None:
                base_query = base_query.where(filter=FieldFilter('price', '>=', min_price))
            if max_price is not None:
                base_query = base_query.where(filter=FieldFilter('price', '<=', max_price))
            
            # Text search (simplified - in production use dedicated search service)
            if query:
                query_lower = query.lower()
                # This is a basic implementation - consider using Algolia or Elasticsearch for production
                base_query = base_query.where(filter=FieldFilter('name_lower', '>=', query_lower)).where(filter=FieldFilter('name_lower', '<=', query_lower + '\uf8ff'))
            
            # Apply sorting
            if sort_by == "newest":
                base_query = base_query.order_by('created_at', direction=firestore.Query.DESCENDING)
            elif sort_by == "oldest":
                base_query = base_query.order_by('created_at', direction=firestore.Query.ASCENDING)
            elif sort_by == "price_low":
                base_query = base_query.order_by('price', direction=firestore.Query.ASCENDING)
            elif sort_by == "price_high":
                base_query = base_query.order_by('price', direction=firestore.Query.DESCENDING)
            elif sort_by == "popular":
                base_query = base_query.order_by('purchases', direction=firestore.Query.DESCENDING)
            elif sort_by == "rating":
                base_query = base_query.order_by('rating', direction=firestore.Query.DESCENDING)
            
            # Get total count (separate query)
            total_docs = list(base_query.stream())
            total_count = len(total_docs)
            
            # Apply pagination
            paginated_query = base_query.offset(offset).limit(limit)
            docs = list(paginated_query.stream())
            
            nexas = []
            for doc in docs:
                nexa_data = doc.to_dict()
                
                # Add user-specific data
                if user_id:
                    # Check purchase status
                    purchase_exists = self._check_user_purchase(user_id, nexa_data['id'])
                    nexa_data['is_purchased'] = purchase_exists
                    
                    # Check star status
                    star_exists = self._check_user_star(user_id, nexa_data['id'])
                    nexa_data['is_starred'] = star_exists
                
                nexas.append(nexa_data)
            
            return {
                'nexas': nexas,
                'total': total_count,
                'page': (offset // limit) + 1,
                'page_size': limit,
                'total_pages': (total_count + limit - 1) // limit,
                'has_next': offset + limit < total_count,
                'has_prev': offset > 0
            }
            
        except Exception as e:
            logger.error(f"Error searching Nexas: {str(e)}")
            raise

    async def update_nexa(self, nexa_id: str, update_data: Dict[str, Any]) -> bool:
        """Update Nexa document"""
        try:
            update_data['updated_at'] = datetime.utcnow()
            
            # Update search fields if relevant data changed
            if 'name' in update_data:
                update_data['name_lower'] = update_data['name'].lower()
            if 'tags' in update_data:
                update_data['tags_searchable'] = ' '.join(update_data['tags']).lower()
            if 'price' in update_data:
                update_data['price_range'] = self._get_price_range(update_data['price'])
            
            self.nexas_col.document(nexa_id).update(update_data)
            return True
            
        except Exception as e:
            logger.error(f"Error updating Nexa {nexa_id}: {str(e)}")
            return False

    async def delete_nexa(self, nexa_id: str) -> bool:
        """Delete Nexa document"""
        try:
            # Also delete related data (reviews, stars, etc.)
            # This should be done in a batch operation
            batch = self.db.batch()
            
            # Delete the Nexa
            nexa_ref = self.nexas_col.document(nexa_id)
            batch.delete(nexa_ref)
            
            # Delete reviews
            reviews_query = self.reviews_col.where(filter=FieldFilter('nexa_id', '==', nexa_id))
            for review_doc in reviews_query.stream():
                batch.delete(review_doc.reference)
            
            # Note: Stars are handled separately as they're in user subcollections
            
            batch.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error deleting Nexa {nexa_id}: {str(e)}")
            return False

    # =============================================================================
    # SELLER MANAGEMENT
    # =============================================================================

    async def create_seller(self, seller_data: SellerRegistrationRequest, user_id: str) -> str:
        """Create a new seller account"""
        try:
            seller_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            doc_data = {
                'id': seller_id,
                'user_id': user_id,
                'business_name': seller_data.business_name,
                'business_email': seller_data.business_email,
                'business_type': seller_data.business_type,
                'status': SellerStatus.PENDING.value,
                
                # Profile
                'bio': seller_data.bio,
                'website_url': seller_data.website_url,
                'social_links': seller_data.social_links or {},
                'avatar_url': None,
                
                # Address (for Stripe)
                'address': {
                    'country': seller_data.country,
                    'line1': seller_data.address_line1,
                    'line2': seller_data.address_line2,
                    'city': seller_data.city,
                    'state': seller_data.state,
                    'postal_code': seller_data.postal_code
                },
                
                # Tax info
                'tax_id': seller_data.tax_id,
                
                # Statistics
                'total_nexas': 0,
                'total_sales': 0,
                'total_revenue': 0.0,
                'rating': 0.0,
                'review_count': 0,
                
                # Stripe integration
                'stripe_account_id': None,
                'stripe_onboarding_complete': False,
                'payout_enabled': False,
                
                # Verification
                'verification_status': 'pending',
                'verification_documents': [],
                
                # Timestamps
                'created_at': now,
                'updated_at': now,
                'verified_at': None,
                
                # Terms acceptance
                'terms_accepted_at': now,
                'privacy_accepted_at': now,
                
                # Search fields
                'business_name_lower': seller_data.business_name.lower()
            }
            
            self.sellers_col.document(seller_id).set(doc_data)
            
            logger.info(f"Created seller {seller_id} for user {user_id}")
            return seller_id
            
        except Exception as e:
            logger.error(f"Error creating seller: {str(e)}")
            raise

    async def get_seller_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get seller by user ID"""
        try:
            query = self.sellers_col.where(filter=FieldFilter('user_id', '==', user_id)).limit(1)
            docs = list(query.stream())
            
            if docs:
                return docs[0].to_dict()
            return None
            
        except Exception as e:
            logger.error(f"Error getting seller for user {user_id}: {str(e)}")
            return None

    async def get_seller_by_id(self, seller_id: str) -> Optional[Dict[str, Any]]:
        """Get seller by ID"""
        try:
            doc = self.sellers_col.document(seller_id).get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Error getting seller {seller_id}: {str(e)}")
            return None

    # =============================================================================
    # PURCHASE MANAGEMENT
    # =============================================================================

    async def create_purchase(self, purchase_data: Dict[str, Any]) -> str:
        """Create a purchase record"""
        try:
            purchase_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            # Generate license key
            license_key = self._generate_license_key()
            
            doc_data = {
                'id': purchase_id,
                'user_id': purchase_data['user_id'],
                'nexa_id': purchase_data['nexa_id'],
                'nexa_name': purchase_data['nexa_name'],
                'seller_id': purchase_data['seller_id'],
                'seller_name': purchase_data['seller_name'],
                
                # Payment info
                'amount': float(purchase_data['amount']),
                'currency': purchase_data['currency'],
                'status': PurchaseStatus.PENDING.value,
                'stripe_payment_intent_id': purchase_data.get('stripe_payment_intent_id'),
                'stripe_session_id': purchase_data.get('stripe_session_id'),
                
                # License info
                'license_key': license_key,
                'license_type': purchase_data['license_type'],
                'max_installations': purchase_data.get('max_installations'),
                'current_installations': 0,
                
                # Download info
                'download_count': 0,
                'expires_at': purchase_data.get('expires_at'),
                
                # Timestamps
                'created_at': now,
                'updated_at': now,
                
                # Search fields
                'user_nexa': f"{purchase_data['user_id']}_{purchase_data['nexa_id']}",
                'seller_purchase': f"{purchase_data['seller_id']}_{purchase_id}",
            }
            
            self.purchases_col.document(purchase_id).set(doc_data)
            
            logger.info(f"Created purchase {purchase_id}")
            return purchase_id
            
        except Exception as e:
            logger.error(f"Error creating purchase: {str(e)}")
            raise

    async def get_user_purchases(
        self, 
        user_id: str, 
        limit: int = 50, 
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get user's purchase history"""
        try:
            query = (self.purchases_col
                    .where(filter=FieldFilter('user_id', '==', user_id))
                    .order_by('created_at', direction=firestore.Query.DESCENDING)
                    .offset(offset)
                    .limit(limit))
            
            docs = list(query.stream())
            purchases = [doc.to_dict() for doc in docs]
            
            # Get total count
            total_query = self.purchases_col.where(filter=FieldFilter('user_id', '==', user_id))
            total_count = len(list(total_query.stream()))
            
            return {
                'purchases': purchases,
                'total': total_count,
                'page': (offset // limit) + 1,
                'page_size': limit
            }
            
        except Exception as e:
            logger.error(f"Error getting user purchases: {str(e)}")
            raise

    # =============================================================================
    # FAVORITES & COLLECTIONS
    # =============================================================================

    async def star_nexa(self, user_id: str, nexa_id: str) -> bool:
        """Add Nexa to user's favorites"""
        try:
            star_ref = self.stars_col.document(user_id).collection('nexas').document(nexa_id)
            star_ref.set({
                'nexa_id': nexa_id,
                'starred_at': datetime.utcnow()
            })
            
            # Increment star count on Nexa
            self._increment_nexa_stat(nexa_id, 'stars')
            
            return True
            
        except Exception as e:
            logger.error(f"Error starring Nexa: {str(e)}")
            return False

    async def unstar_nexa(self, user_id: str, nexa_id: str) -> bool:
        """Remove Nexa from user's favorites"""
        try:
            star_ref = self.stars_col.document(user_id).collection('nexas').document(nexa_id)
            star_ref.delete()
            
            # Decrement star count on Nexa
            self._decrement_nexa_stat(nexa_id, 'stars')
            
            return True
            
        except Exception as e:
            logger.error(f"Error unstarring Nexa: {str(e)}")
            return False

    async def get_starred_nexas(self, user_id: str, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """Get user's starred Nexas"""
        try:
            # Get starred Nexa IDs
            stars_query = (self.stars_col.document(user_id).collection('nexas')
                          .order_by('starred_at', direction=firestore.Query.DESCENDING)
                          .offset(offset)
                          .limit(limit))
            
            star_docs = list(stars_query.stream())
            nexa_ids = [doc.id for doc in star_docs]
            
            # Get Nexa details
            nexas = []
            for nexa_id in nexa_ids:
                nexa = await self.get_nexa_by_id(nexa_id, user_id)
                if nexa:
                    nexas.append(nexa)
            
            # Get total count
            total_stars = len(list(self.stars_col.document(user_id).collection('nexas').stream()))
            
            return {
                'nexas': nexas,
                'total': total_stars,
                'page': (offset // limit) + 1,
                'page_size': limit
            }
            
        except Exception as e:
            logger.error(f"Error getting starred Nexas: {str(e)}")
            raise

    # =============================================================================
    # ADMIN CONFIGURATION (FEES, CATEGORIES)
    # =============================================================================

    async def get_fee_config(self) -> Dict[str, Any]:
        """Return current marketplace fee configuration.

        Configuration is stored in document `marketplace_config/fees`. If the
        document does not exist yet, a sensible default is created and returned
        so that the admin UI always has something real to show.
        """
        try:
            doc_ref = self.config_col.document('fees')
            doc = doc_ref.get()

            if doc.exists:
                data = doc.to_dict()
            else:
                now = datetime.utcnow()
                data = {
                    'seller_commission_percentage': 20.0,
                    'platform_fee_percentage': 5.0,
                    'payment_processor_fee_percentage': 2.9,
                    'minimum_payout_amount': 50.0,
                    'maximum_transaction_amount': 100000.0,
                    'refund_processing_fee_percentage': 0.0,
                    'last_updated': now,
                    'updated_by': 'system',
                }
                doc_ref.set(data)

            # Ensure required numeric fields are present and normalized to float
            defaults = {
                'seller_commission_percentage': 0.0,
                'platform_fee_percentage': 0.0,
                'payment_processor_fee_percentage': 0.0,
                'minimum_payout_amount': 0.0,
                'maximum_transaction_amount': 0.0,
                'refund_processing_fee_percentage': 0.0,
            }
            for key, default in defaults.items():
                val = data.get(key, default)
                try:
                    data[key] = float(val)
                except (TypeError, ValueError):
                    data[key] = default

            return data
        except Exception as e:
            logger.error(f"Error getting fee config: {str(e)}")
            return {}

    async def update_fee_config(self, fee_config: Dict[str, Any], updated_by: str) -> bool:
        """Update fee configuration document.

        The caller is responsible for validation and authorization.
        """
        try:
            doc_ref = self.config_col.document('fees')
            update_data = dict(fee_config)
            update_data['last_updated'] = datetime.utcnow()
            update_data['updated_by'] = updated_by
            doc_ref.set(update_data, merge=True)
            return True
        except Exception as e:
            logger.error(f"Error updating fee config: {str(e)}")
            return False

    async def get_categories(self) -> List[Dict[str, Any]]:
        """Get all marketplace categories for admin configuration UI."""
        try:
            query = self.categories_col.order_by('name')
            docs = list(query.stream())
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.error(f"Error getting categories: {str(e)}")
            return []

    async def add_category(self, category_data: Dict[str, Any], created_by: str) -> Optional[str]:
        """Create a new marketplace category.

        A UUID is generated for the category ID. Timestamps are stored as
        Firestore datetimes; the frontend receives them as ISO strings.
        """
        try:
            category_id = str(uuid.uuid4())
            now = datetime.utcnow()
            doc_data = {
                'id': category_id,
                'name': category_data.get('name', '').strip(),
                'description': category_data.get('description', '').strip(),
                'icon': category_data.get('icon'),
                'is_active': bool(category_data.get('is_active', True)),
                'created_at': now,
                'updated_at': now,
                'created_by': created_by,
            }

            # Basic validation: require non-empty name
            if not doc_data['name']:
                raise ValueError("Category name is required")

            self.categories_col.document(category_id).set(doc_data)
            return category_id
        except Exception as e:
            logger.error(f"Error adding category: {str(e)}")
            return None

    # =============================================================================
    # ANALYTICS & STATISTICS
    # =============================================================================

    async def get_marketplace_analytics(self) -> Dict[str, Any]:
        """Get marketplace-wide analytics"""
        try:
            stats_doc = self.stats_doc.get()
            
            if stats_doc.exists:
                return stats_doc.to_dict()
            
            # Calculate stats if not cached
            return await self._calculate_marketplace_stats()
            
        except Exception as e:
            logger.error(f"Error getting marketplace analytics: {str(e)}")
            return {}

    async def get_seller_analytics(self, seller_id: str) -> Dict[str, Any]:
        """Get seller-specific analytics"""
        try:
            # Get seller Nexas
            nexas_query = self.nexas_col.where(filter=FieldFilter('seller_id', '==', seller_id))
            nexas = [doc.to_dict() for doc in nexas_query.stream()]
            
            # Get seller purchases
            purchases_query = self.purchases_col.where(filter=FieldFilter('seller_id', '==', seller_id))
            purchases = [doc.to_dict() for doc in purchases_query.stream()]
            
            # Calculate analytics
            total_revenue = sum(p['amount'] for p in purchases if p['status'] == PurchaseStatus.COMPLETED.value)
            total_sales = len([p for p in purchases if p['status'] == PurchaseStatus.COMPLETED.value])
            
            return {
                'total_nexas': len(nexas),
                'total_sales': total_sales,
                'total_revenue': total_revenue,
                'avg_rating': sum(n['rating'] for n in nexas) / len(nexas) if nexas else 0,
                'recent_sales': purchases[-10:],  # Last 10 sales
                'top_nexas': sorted(nexas, key=lambda x: x['purchases'], reverse=True)[:5]
            }
            
        except Exception as e:
            logger.error(f"Error getting seller analytics: {str(e)}")
            return {}

    # =============================================================================
    # HELPER METHODS
    # =============================================================================

    def _get_price_range(self, price: float) -> str:
        """Get price range category for indexing"""
        if price == 0:
            return "free"
        elif price < 10:
            return "under_10"
        elif price < 50:
            return "10_to_50"
        elif price < 100:
            return "50_to_100"
        else:
            return "over_100"

    def _generate_license_key(self) -> str:
        """Generate unique license key"""
        import secrets
        return f"NXA-{secrets.token_hex(8).upper()}-{secrets.token_hex(8).upper()}"

    def _increment_nexa_stat(self, nexa_id: str, field: str, amount: int = 1):
        """Increment a statistic field on a Nexa (async operation)"""
        try:
            nexa_ref = self.nexas_col.document(nexa_id)
            nexa_ref.update({field: firestore.Increment(amount)})
        except Exception as e:
            logger.error(f"Error incrementing {field} for Nexa {nexa_id}: {str(e)}")

    def _decrement_nexa_stat(self, nexa_id: str, field: str, amount: int = 1):
        """Decrement a statistic field on a Nexa (async operation)"""
        try:
            nexa_ref = self.nexas_col.document(nexa_id)
            nexa_ref.update({field: firestore.Increment(-amount)})
        except Exception as e:
            logger.error(f"Error decrementing {field} for Nexa {nexa_id}: {str(e)}")

    def _check_user_purchase(self, user_id: str, nexa_id: str) -> bool:
        """Check if user has purchased a Nexa"""
        try:
            query = (self.purchases_col
                    .where(filter=FieldFilter('user_nexa', '==', f"{user_id}_{nexa_id}"))
                    .where(filter=FieldFilter('status', '==', PurchaseStatus.COMPLETED.value))
                    .limit(1))
            
            return len(list(query.stream())) > 0
        except:
            return False

    def _check_user_star(self, user_id: str, nexa_id: str) -> bool:
        """Check if user has starred a Nexa"""
        try:
            star_doc = self.stars_col.document(user_id).collection('nexas').document(nexa_id).get()
            return star_doc.exists
        except:
            return False

    async def _update_seller_stats(self, seller_id: str, action: str, amount: float = 0):
        """Update seller statistics"""
        try:
            seller_ref = self.sellers_col.document(seller_id)
            
            if action == 'nexa_created':
                seller_ref.update({'total_nexas': firestore.Increment(1)})
            elif action == 'sale_completed':
                seller_ref.update({
                    'total_sales': firestore.Increment(1),
                    'total_revenue': firestore.Increment(amount)
                })
                
        except Exception as e:
            logger.error(f"Error updating seller stats: {str(e)}")

    async def _calculate_marketplace_stats(self) -> Dict[str, Any]:
        """Calculate and cache marketplace statistics"""
        try:
            # This would be run periodically to update cached stats
            nexas = list(self.nexas_col.stream())
            sellers = list(self.sellers_col.stream())
            purchases = list(self.purchases_col.stream())
            
            completed_purchases = [p for p in purchases if p.to_dict()['status'] == PurchaseStatus.COMPLETED.value]
            
            stats = {
                'total_nexas': len(nexas),
                'total_sellers': len(sellers),
                'total_purchases': len(completed_purchases),
                'total_revenue': sum(p.to_dict()['amount'] for p in completed_purchases),
                'last_updated': datetime.utcnow()
            }
            
            # Cache the stats
            self.stats_doc.set(stats)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error calculating marketplace stats: {str(e)}")
            return {}


# Singleton instance
marketplace_db = MarketplaceDB()