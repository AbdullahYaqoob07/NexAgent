import logging
from typing import Optional, Dict, Any, List
from app.db.template_db import template_db
from app.services.workflow_service import workflow_service
from firebase_admin import firestore
from datetime import datetime

logger = logging.getLogger(__name__)


class TemplateService:
    """Business logic for template management"""
    
    def __init__(self):
        self.db = firestore.client()
        self.users_collection = 'users'
    
    # ==================== Template CRUD Operations ====================
    
    async def create_template(
        self,
        workflow_id: str,
        user_id: str,
        name: str,
        description: str,
        category: str,
        tags: List[str],
        difficulty: str,
        required_integrations: List[str],
        estimated_time: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new template from an existing workflow
        """
        try:
            # Get the source workflow
            workflow = await workflow_service.get_workflow_by_id(workflow_id, user_id)
            
            if not workflow:
                return {'success': False, 'error': 'Workflow not found or unauthorized'}
            
            # Verify workflow belongs to user
            if workflow.get('userId') != user_id:
                return {'success': False, 'error': 'You can only create templates from your own workflows'}
            
            # Get user info for author name
            user_doc = self.db.collection(self.users_collection).document(user_id).get()
            author_name = 'Anonymous'
            if user_doc.exists:
                user_data = user_doc.to_dict()
                author_name = user_data.get('displayName', 'Anonymous')
            
            # Create template data
            template_data = {
                'workflowId': workflow_id,
                'authorId': user_id,
                'authorName': author_name,
                'name': name,
                'description': description,
                'category': category,
                'tags': tags,
                'difficulty': difficulty,
                'requiredIntegrations': required_integrations,
                'estimatedTime': estimated_time,
                
                # Copy workflow structure
                'nodes': workflow.get('nodes', []),
                'edges': workflow.get('edges', []),
                
                # Initialize statistics
                'usageCount': 0,
                'rating': 0.0,
                'reviewCount': 0,
                'bookmarkCount': 0,
                
                # Status
                'isActive': True,
                'isFeatured': False
            }
            
            # Create template in database
            result = await template_db.create_template(template_data)
            
            if result['success']:
                logger.info(f"✅ Template created from workflow {workflow_id}")
                return {
                    'success': True,
                    'templateId': result['templateId'],
                    'template': result['data']
                }
            else:
                return result
            
        except Exception as e:
            logger.error(f"❌ Failed to create template: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_template(
        self,
        template_id: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get a template by ID with user-specific data (bookmarks, ratings)
        """
        try:
            template = await template_db.get_template_by_id(template_id)
            
            if not template:
                return {'success': False, 'error': 'Template not found'}
            
            if not template.get('isActive', False):
                return {'success': False, 'error': 'Template is not active'}
            
            # Get user-specific data if user is authenticated
            is_bookmarked = False
            user_rating = None
            
            if user_id:
                is_bookmarked = await template_db.is_bookmarked(template_id, user_id)
                user_rating = await template_db.get_user_rating(template_id, user_id)
            
            return {
                'success': True,
                'template': template,
                'isBookmarked': is_bookmarked,
                'userRating': user_rating
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get template: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def update_template(
        self,
        template_id: str,
        user_id: str,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update a template (only by author)
        """
        try:
            template = await template_db.get_template_by_id(template_id)
            
            if not template:
                return {'success': False, 'error': 'Template not found'}
            
            # Verify author
            if template.get('authorId') != user_id:
                return {'success': False, 'error': 'Only the template author can update it'}
            
            # Update template
            result = await template_db.update_template(template_id, updates)
            
            if result['success']:
                logger.info(f"✅ Template {template_id} updated by {user_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to update template: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def delete_template(
        self,
        template_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Delete a template (only by author)
        """
        try:
            template = await template_db.get_template_by_id(template_id)
            
            if not template:
                return {'success': False, 'error': 'Template not found'}
            
            # Verify author
            if template.get('authorId') != user_id:
                return {'success': False, 'error': 'Only the template author can delete it'}
            
            # Soft delete - mark as inactive instead of deleting
            result = await template_db.update_template(template_id, {'isActive': False})
            
            if result['success']:
                logger.info(f"✅ Template {template_id} deleted by {user_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to delete template: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_user_templates(self, user_id: str) -> Dict[str, Any]:
        """
        Get all templates created by a user
        """
        try:
            templates = await template_db.get_user_templates(user_id)
            
            return {
                'success': True,
                'templates': templates,
                'total': len(templates)
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get user templates: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'templates': [],
                'total': 0
            }
    
    # ==================== Template Search & Discovery ====================
    
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
        """
        Search and filter templates
        """
        try:
            result = await template_db.search_templates(
                query=query,
                category=category,
                tags=tags,
                difficulty=difficulty,
                sort_by=sort_by,
                page=page,
                page_size=page_size
            )
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to search templates: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'templates': [],
                'total': 0
            }
    
    async def get_featured_templates(self, limit: int = 10) -> Dict[str, Any]:
        """
        Get featured templates
        """
        try:
            templates = await template_db.get_featured_templates(limit)
            
            return {
                'success': True,
                'templates': templates
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get featured templates: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'templates': []
            }
    
    # ==================== Template Clone Operation ====================
    
    async def clone_template(
        self,
        template_id: str,
        user_id: str,
        workflow_name: Optional[str] = None,
        customize_variables: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Clone a template into user's workflows
        """
        try:
            # Get template
            template = await template_db.get_template_by_id(template_id)
            
            if not template:
                return {'success': False, 'error': 'Template not found'}
            
            if not template.get('isActive', False):
                return {'success': False, 'error': 'Template is not active'}
            
            # Generate workflow name
            if not workflow_name:
                workflow_name = f"{template['name']} (from template)"
            
            # Create workflow from template
            result = await workflow_service.create_workflow(
                user_id=user_id,
                name=workflow_name,
                description=f"Created from template: {template['name']}",
                can_be_listed=False,
                nodes=template.get('nodes', []),
                edges=template.get('edges', []),
                variables=customize_variables or {}
            )
            
            if not result['success']:
                return result
            
            # Increment template usage count
            await template_db.increment_usage_count(template_id)
            
            workflow = result['workflow']
            
            logger.info(f"✅ Template {template_id} cloned to workflow {workflow['id']} by user {user_id}")
            
            return {
                'success': True,
                'message': 'Template cloned successfully',
                'workflowId': workflow['id'],
                'workflowName': workflow['name']
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to clone template: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # ==================== Category Management ====================
    
    async def get_categories(self) -> Dict[str, Any]:
        """
        Get all template categories
        """
        try:
            categories = await template_db.get_all_categories()
            
            return {
                'success': True,
                'categories': categories
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get categories: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'categories': []
            }
    
    async def create_category(
        self,
        name: str,
        description: str,
        icon: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new category (admin only)
        """
        try:
            category_data = {
                'name': name,
                'description': description,
                'icon': icon,
                'templateCount': 0,
                'isActive': True
            }
            
            result = await template_db.create_category(category_data)
            
            if result['success']:
                logger.info(f"✅ Category created: {name}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to create category: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # ==================== Rating & Review System ====================
    
    async def rate_template(
        self,
        template_id: str,
        user_id: str,
        rating: int,
        review: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Rate and review a template
        """
        try:
            # Verify template exists
            template = await template_db.get_template_by_id(template_id)
            
            if not template:
                return {'success': False, 'error': 'Template not found'}
            
            if not template.get('isActive', False):
                return {'success': False, 'error': 'Template is not active'}
            
            # Add/update rating
            result = await template_db.add_or_update_rating(
                template_id=template_id,
                user_id=user_id,
                rating=rating,
                review=review
            )
            
            if result['success']:
                logger.info(f"✅ Rating {result['action']} for template {template_id} by user {user_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to rate template: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_template_ratings(self, template_id: str) -> Dict[str, Any]:
        """
        Get all ratings and reviews for a template
        """
        try:
            result = await template_db.get_template_ratings(template_id)
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to get ratings: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'ratings': [],
                'averageRating': 0,
                'totalRatings': 0
            }
    
    # ==================== Bookmark System ====================
    
    async def toggle_bookmark(
        self,
        template_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Toggle bookmark for a template
        """
        try:
            # Verify template exists
            template = await template_db.get_template_by_id(template_id)
            
            if not template:
                return {'success': False, 'error': 'Template not found'}
            
            # Toggle bookmark
            result = await template_db.toggle_bookmark(template_id, user_id)
            
            if result['success']:
                action = 'added' if result['isBookmarked'] else 'removed'
                result['message'] = f"Bookmark {action} successfully"
                logger.info(f"✅ Bookmark {action} for template {template_id} by user {user_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to toggle bookmark: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_user_bookmarks(self, user_id: str) -> Dict[str, Any]:
        """
        Get all bookmarked templates for a user
        """
        try:
            templates = await template_db.get_user_bookmarks(user_id)
            
            return {
                'success': True,
                'templates': templates,
                'total': len(templates)
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get bookmarks: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'templates': [],
                'total': 0
            }
    
    # ==================== Statistics & Analytics ====================
    
    async def get_template_statistics(self) -> Dict[str, Any]:
        """
        Get overall template statistics
        """
        try:
            stats = await template_db.get_template_stats()
            
            if not stats['success']:
                return stats
            
            # Get popular categories
            categories = await template_db.get_all_categories()
            popular_categories = sorted(
                categories,
                key=lambda x: x.get('templateCount', 0),
                reverse=True
            )[:5]
            
            # Get trending templates (most used recently)
            trending_result = await template_db.search_templates(
                sort_by='most_used',
                page=1,
                page_size=10
            )
            
            return {
                'success': True,
                'totalTemplates': stats['totalTemplates'],
                'totalCategories': stats['totalCategories'],
                'totalUsage': stats['totalUsage'],
                'averageRating': stats['averageRating'],
                'popularCategories': popular_categories,
                'trendingTemplates': trending_result.get('templates', [])
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get template statistics: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    # ==================== Admin Operations ====================
    
    async def toggle_featured(
        self,
        template_id: str,
        is_featured: bool
    ) -> Dict[str, Any]:
        """
        Toggle featured status (admin only)
        """
        try:
            result = await template_db.update_template(
                template_id,
                {'isFeatured': is_featured}
            )
            
            if result['success']:
                status = 'featured' if is_featured else 'unfeatured'
                logger.info(f"✅ Template {template_id} {status}")
                result['message'] = f"Template {status} successfully"
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to toggle featured status: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def toggle_active(
        self,
        template_id: str,
        is_active: bool
    ) -> Dict[str, Any]:
        """
        Toggle active status (admin only)
        """
        try:
            result = await template_db.update_template(
                template_id,
                {'isActive': is_active}
            )
            
            if result['success']:
                status = 'activated' if is_active else 'deactivated'
                logger.info(f"✅ Template {template_id} {status}")
                result['message'] = f"Template {status} successfully"
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to toggle active status: {str(e)}")
            return {'success': False, 'error': str(e)}


# Create singleton instance
template_service = TemplateService()
