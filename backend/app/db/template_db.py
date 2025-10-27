import logging
from typing import Optional, Dict, Any, List
from firebase_admin import firestore
from datetime import datetime

logger = logging.getLogger(__name__)


class TemplateDB:
    """Database operations for templates"""
    
    def __init__(self):
        self.db = firestore.client()
        self.templates_collection = 'workflow_templates'
        self.categories_collection = 'template_categories'
        self.ratings_collection = 'template_ratings'
        self.bookmarks_collection = 'template_bookmarks'
        self.workflows_collection = 'workflows'
        self.users_collection = 'users'
    
    # ==================== Template CRUD Operations ====================
    
    async def create_template(self, template_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new template"""
        try:
            template_ref = self.db.collection(self.templates_collection).document()
            template_id = template_ref.id
            
            template_data['id'] = template_id
            template_data['createdAt'] = firestore.SERVER_TIMESTAMP
            template_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            
            template_ref.set(template_data)
            
            logger.info(f"✅ Template created: {template_id}")
            return {'success': True, 'templateId': template_id, 'data': template_data}
            
        except Exception as e:
            logger.error(f"❌ Failed to create template: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_template_by_id(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get template by ID"""
        try:
            template_ref = self.db.collection(self.templates_collection).document(template_id)
            template_doc = template_ref.get()
            
            if not template_doc.exists:
                return None
            
            return template_doc.to_dict()
            
        except Exception as e:
            logger.error(f"❌ Failed to get template: {str(e)}")
            return None
    
    async def update_template(self, template_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update a template"""
        try:
            template_ref = self.db.collection(self.templates_collection).document(template_id)
            
            updates['updatedAt'] = firestore.SERVER_TIMESTAMP
            template_ref.update(updates)
            
            logger.info(f"✅ Template updated: {template_id}")
            return {'success': True}
            
        except Exception as e:
            logger.error(f"❌ Failed to update template: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def delete_template(self, template_id: str) -> Dict[str, Any]:
        """Delete a template"""
        try:
            template_ref = self.db.collection(self.templates_collection).document(template_id)
            template_ref.delete()
            
            logger.info(f"✅ Template deleted: {template_id}")
            return {'success': True}
            
        except Exception as e:
            logger.error(f"❌ Failed to delete template: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # ==================== Template Search & List Operations ====================
    
    async def search_templates(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        difficulty: Optional[str] = None,
        sort_by: str = 'popular',
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Search templates with filters"""
        try:
            # Build query
            query_ref = self.db.collection(self.templates_collection).where('isActive', '==', True)
            
            # Apply category filter
            if category:
                query_ref = query_ref.where('category', '==', category)
            
            # Apply difficulty filter
            if difficulty:
                query_ref = query_ref.where('difficulty', '==', difficulty)
            
            # Apply tags filter (Firestore array-contains only supports one value)
            if tags and len(tags) > 0:
                query_ref = query_ref.where('tags', 'array_contains', tags[0])
            
            # Apply sorting
            if sort_by == 'popular':
                query_ref = query_ref.order_by('usageCount', direction=firestore.Query.DESCENDING)
            elif sort_by == 'newest':
                query_ref = query_ref.order_by('createdAt', direction=firestore.Query.DESCENDING)
            elif sort_by == 'rating':
                query_ref = query_ref.order_by('rating', direction=firestore.Query.DESCENDING)
            elif sort_by == 'most_used':
                query_ref = query_ref.order_by('usageCount', direction=firestore.Query.DESCENDING)
            
            # Get all matching documents
            all_templates = list(query_ref.stream())
            
            # Filter by text query if provided (client-side filtering)
            if query:
                query_lower = query.lower()
                filtered_templates = []
                for doc in all_templates:
                    data = doc.to_dict()
                    if (query_lower in data.get('name', '').lower() or 
                        query_lower in data.get('description', '').lower() or
                        any(query_lower in tag.lower() for tag in data.get('tags', []))):
                        filtered_templates.append(doc)
                all_templates = filtered_templates
            
            # Filter by additional tags (client-side)
            if tags and len(tags) > 1:
                filtered_templates = []
                for doc in all_templates:
                    data = doc.to_dict()
                    template_tags = [tag.lower() for tag in data.get('tags', [])]
                    if all(tag.lower() in template_tags for tag in tags):
                        filtered_templates.append(doc)
                all_templates = filtered_templates
            
            total = len(all_templates)
            
            # Apply pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated_templates = all_templates[start_index:end_index]
            
            # Convert to dicts
            templates = [doc.to_dict() for doc in paginated_templates]
            
            logger.info(f"✅ Found {total} templates")
            return {
                'success': True,
                'templates': templates,
                'total': total,
                'page': page,
                'pageSize': page_size
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to search templates: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'templates': [],
                'total': 0
            }
    
    async def get_featured_templates(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get featured templates"""
        try:
            templates = []
            query_ref = (self.db.collection(self.templates_collection)
                        .where('isActive', '==', True)
                        .where('isFeatured', '==', True)
                        .order_by('rating', direction=firestore.Query.DESCENDING)
                        .limit(limit))
            
            for doc in query_ref.stream():
                templates.append(doc.to_dict())
            
            return templates
            
        except Exception as e:
            logger.error(f"❌ Failed to get featured templates: {str(e)}")
            return []
    
    async def get_user_templates(self, author_id: str) -> List[Dict[str, Any]]:
        """Get all templates created by a user"""
        try:
            templates = []
            query_ref = (self.db.collection(self.templates_collection)
                        .where('authorId', '==', author_id)
                        .order_by('createdAt', direction=firestore.Query.DESCENDING))
            
            for doc in query_ref.stream():
                templates.append(doc.to_dict())
            
            return templates
            
        except Exception as e:
            logger.error(f"❌ Failed to get user templates: {str(e)}")
            return []
    
    # ==================== Category Operations ====================
    
    async def get_all_categories(self) -> List[Dict[str, Any]]:
        """Get all template categories"""
        try:
            categories = []
            query_ref = (self.db.collection(self.categories_collection)
                        .where('isActive', '==', True)
                        .order_by('name'))
            
            for doc in query_ref.stream():
                category_data = doc.to_dict()
                # Count templates in this category
                template_count = len(list(
                    self.db.collection(self.templates_collection)
                    .where('category', '==', category_data['id'])
                    .where('isActive', '==', True)
                    .stream()
                ))
                category_data['templateCount'] = template_count
                categories.append(category_data)
            
            return categories
            
        except Exception as e:
            logger.error(f"❌ Failed to get categories: {str(e)}")
            return []
    
    async def create_category(self, category_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new category"""
        try:
            category_ref = self.db.collection(self.categories_collection).document()
            category_id = category_ref.id
            
            category_data['id'] = category_id
            category_ref.set(category_data)
            
            logger.info(f"✅ Category created: {category_id}")
            return {'success': True, 'categoryId': category_id}
            
        except Exception as e:
            logger.error(f"❌ Failed to create category: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # ==================== Rating Operations ====================
    
    async def add_or_update_rating(
        self,
        template_id: str,
        user_id: str,
        rating: int,
        review: Optional[str] = None
    ) -> Dict[str, Any]:
        """Add or update a template rating"""
        try:
            # Check if user already rated this template
            existing_ratings = list(
                self.db.collection(self.ratings_collection)
                .where('templateId', '==', template_id)
                .where('userId', '==', user_id)
                .stream()
            )
            
            if existing_ratings:
                # Update existing rating
                rating_ref = existing_ratings[0].reference
                rating_ref.update({
                    'rating': rating,
                    'review': review,
                    'updatedAt': firestore.SERVER_TIMESTAMP
                })
                action = 'updated'
            else:
                # Create new rating
                rating_ref = self.db.collection(self.ratings_collection).document()
                rating_data = {
                    'id': rating_ref.id,
                    'templateId': template_id,
                    'userId': user_id,
                    'rating': rating,
                    'review': review,
                    'createdAt': firestore.SERVER_TIMESTAMP,
                    'updatedAt': firestore.SERVER_TIMESTAMP
                }
                rating_ref.set(rating_data)
                action = 'added'
            
            # Recalculate template average rating
            await self._update_template_rating(template_id)
            
            logger.info(f"✅ Rating {action} for template {template_id}")
            return {'success': True, 'action': action}
            
        except Exception as e:
            logger.error(f"❌ Failed to add/update rating: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_template_ratings(self, template_id: str) -> Dict[str, Any]:
        """Get all ratings for a template"""
        try:
            ratings = []
            query_ref = (self.db.collection(self.ratings_collection)
                        .where('templateId', '==', template_id)
                        .order_by('createdAt', direction=firestore.Query.DESCENDING))
            
            for doc in query_ref.stream():
                rating_data = doc.to_dict()
                # Get user name
                user_doc = self.db.collection(self.users_collection).document(rating_data['userId']).get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    rating_data['userName'] = user_data.get('displayName', 'Anonymous')
                ratings.append(rating_data)
            
            # Calculate statistics
            total_ratings = len(ratings)
            average_rating = sum(r['rating'] for r in ratings) / total_ratings if total_ratings > 0 else 0
            
            # Rating distribution
            distribution = {'5': 0, '4': 0, '3': 0, '2': 0, '1': 0}
            for rating in ratings:
                distribution[str(rating['rating'])] += 1
            
            return {
                'success': True,
                'ratings': ratings,
                'averageRating': round(average_rating, 2),
                'totalRatings': total_ratings,
                'ratingDistribution': distribution
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get ratings: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'ratings': [],
                'averageRating': 0,
                'totalRatings': 0
            }
    
    async def get_user_rating(self, template_id: str, user_id: str) -> Optional[int]:
        """Get user's rating for a template"""
        try:
            ratings = list(
                self.db.collection(self.ratings_collection)
                .where('templateId', '==', template_id)
                .where('userId', '==', user_id)
                .limit(1)
                .stream()
            )
            
            if ratings:
                return ratings[0].to_dict().get('rating')
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to get user rating: {str(e)}")
            return None
    
    async def _update_template_rating(self, template_id: str):
        """Internal method to update template's average rating and review count"""
        try:
            ratings_data = await self.get_template_ratings(template_id)
            
            template_ref = self.db.collection(self.templates_collection).document(template_id)
            template_ref.update({
                'rating': ratings_data['averageRating'],
                'reviewCount': ratings_data['totalRatings'],
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            
        except Exception as e:
            logger.error(f"❌ Failed to update template rating: {str(e)}")
    
    # ==================== Bookmark Operations ====================
    
    async def toggle_bookmark(self, template_id: str, user_id: str) -> Dict[str, Any]:
        """Toggle bookmark for a template"""
        try:
            # Check if bookmark exists
            existing_bookmarks = list(
                self.db.collection(self.bookmarks_collection)
                .where('templateId', '==', template_id)
                .where('userId', '==', user_id)
                .stream()
            )
            
            if existing_bookmarks:
                # Remove bookmark
                for bookmark in existing_bookmarks:
                    bookmark.reference.delete()
                is_bookmarked = False
                
                # Decrement bookmark count
                template_ref = self.db.collection(self.templates_collection).document(template_id)
                template_ref.update({
                    'bookmarkCount': firestore.Increment(-1)
                })
            else:
                # Add bookmark
                bookmark_ref = self.db.collection(self.bookmarks_collection).document()
                bookmark_data = {
                    'id': bookmark_ref.id,
                    'templateId': template_id,
                    'userId': user_id,
                    'createdAt': firestore.SERVER_TIMESTAMP
                }
                bookmark_ref.set(bookmark_data)
                is_bookmarked = True
                
                # Increment bookmark count
                template_ref = self.db.collection(self.templates_collection).document(template_id)
                template_ref.update({
                    'bookmarkCount': firestore.Increment(1)
                })
            
            logger.info(f"✅ Bookmark toggled for template {template_id}: {is_bookmarked}")
            return {'success': True, 'isBookmarked': is_bookmarked}
            
        except Exception as e:
            logger.error(f"❌ Failed to toggle bookmark: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def is_bookmarked(self, template_id: str, user_id: str) -> bool:
        """Check if template is bookmarked by user"""
        try:
            bookmarks = list(
                self.db.collection(self.bookmarks_collection)
                .where('templateId', '==', template_id)
                .where('userId', '==', user_id)
                .limit(1)
                .stream()
            )
            
            return len(bookmarks) > 0
            
        except Exception as e:
            logger.error(f"❌ Failed to check bookmark: {str(e)}")
            return False
    
    async def get_user_bookmarks(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all bookmarked templates for a user"""
        try:
            # Get bookmark records
            bookmarks = list(
                self.db.collection(self.bookmarks_collection)
                .where('userId', '==', user_id)
                .order_by('createdAt', direction=firestore.Query.DESCENDING)
                .stream()
            )
            
            # Get template data for each bookmark
            templates = []
            for bookmark in bookmarks:
                bookmark_data = bookmark.to_dict()
                template_data = await self.get_template_by_id(bookmark_data['templateId'])
                if template_data and template_data.get('isActive', False):
                    templates.append(template_data)
            
            return templates
            
        except Exception as e:
            logger.error(f"❌ Failed to get bookmarked templates: {str(e)}")
            return []
    
    # ==================== Statistics ====================
    
    async def increment_usage_count(self, template_id: str):
        """Increment template usage count when cloned"""
        try:
            template_ref = self.db.collection(self.templates_collection).document(template_id)
            template_ref.update({
                'usageCount': firestore.Increment(1),
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            
            logger.info(f"✅ Usage count incremented for template {template_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to increment usage count: {str(e)}")
    
    async def get_template_stats(self) -> Dict[str, Any]:
        """Get overall template statistics"""
        try:
            # Count total templates
            total_templates = len(list(
                self.db.collection(self.templates_collection)
                .where('isActive', '==', True)
                .stream()
            ))
            
            # Count categories
            total_categories = len(list(
                self.db.collection(self.categories_collection)
                .where('isActive', '==', True)
                .stream()
            ))
            
            # Calculate total usage
            all_templates = list(self.db.collection(self.templates_collection).stream())
            total_usage = sum(t.to_dict().get('usageCount', 0) for t in all_templates)
            
            # Calculate average rating
            total_ratings = sum(t.to_dict().get('reviewCount', 0) for t in all_templates)
            average_rating = sum(
                t.to_dict().get('rating', 0) * t.to_dict().get('reviewCount', 0) 
                for t in all_templates
            ) / total_ratings if total_ratings > 0 else 0
            
            return {
                'success': True,
                'totalTemplates': total_templates,
                'totalCategories': total_categories,
                'totalUsage': total_usage,
                'averageRating': round(average_rating, 2)
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get template stats: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }


# Create singleton instance
template_db = TemplateDB()
