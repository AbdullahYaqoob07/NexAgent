import logging
from typing import Optional, Dict, Any, List
from firebase_admin import firestore
from datetime import datetime

logger = logging.getLogger(__name__)


class WorkflowService:
    def __init__(self):
        self.db = firestore.client()
        self.workflows_collection = 'workflows'
        self.users_collection = 'users'
    
    async def create_workflow(
        self,
        user_id: str,
        name: str,
        description: Optional[str] = None,
        can_be_listed: bool = False,
        nodes: List[Dict[str, Any]] = None,
        edges: List[Dict[str, Any]] = None,
        variables: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Create a new workflow
        """
        try:
            # Create workflow document
            workflow_ref = self.db.collection(self.workflows_collection).document()
            workflow_id = workflow_ref.id
            
            workflow_data = {
                'id': workflow_id,
                'userId': user_id,
                'name': name,
                'description': description,
                'canBeListed': can_be_listed,
                'nodes': nodes or [],
                'edges': edges or [],
                'variables': variables or {},
                'status': 'draft',  # draft, active, archived
                'version': 1,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
                'lastExecutedAt': None,
                'executionCount': 0,
                'tags': [],
                'isPublic': False,
                'collaborators': []
            }
            
            # Save workflow to Firestore
            workflow_ref.set(workflow_data)
            
            # Update user's workflow count
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_ref.update({
                'usage.totalWorkflows': firestore.Increment(1),
                'usage.workflowsCreated': firestore.Increment(1),
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            
            logger.info(f"✅ Workflow created: {workflow_id} for user {user_id}")
            
            return {
                'success': True,
                'workflow': workflow_data
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to create workflow: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_user_workflows(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get all workflows for a user with pagination
        """
        try:
            # Build query
            query = self.db.collection(self.workflows_collection).where('userId', '==', user_id)
            
            # Filter by status if provided
            if status:
                query = query.where('status', '==', status)
            
            # Order by creation date (newest first)
            query = query.order_by('createdAt', direction=firestore.Query.DESCENDING)
            
            # Get all workflows for counting
            all_workflows = list(query.stream())
            total = len(all_workflows)
            
            # Apply pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated_workflows = all_workflows[start_index:end_index]
            
            # Convert to dict
            workflows = []
            for workflow_doc in paginated_workflows:
                workflow_data = workflow_doc.to_dict()
                workflows.append(workflow_data)
            
            logger.info(f"✅ Retrieved {len(workflows)} workflows for user {user_id}")
            
            return {
                'success': True,
                'workflows': workflows,
                'total': total,
                'page': page,
                'pageSize': page_size
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get workflows: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'workflows': [],
                'total': 0
            }
    
    async def get_workflow_by_id(
        self,
        workflow_id: str,
        user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get a specific workflow by ID
        If user_id is provided, verify ownership
        """
        try:
            workflow_ref = self.db.collection(self.workflows_collection).document(workflow_id)
            workflow_doc = workflow_ref.get()
            
            if not workflow_doc.exists:
                logger.warning(f"⚠️ Workflow not found: {workflow_id}")
                return None
            
            workflow_data = workflow_doc.to_dict()
            
            # Verify ownership if user_id provided
            if user_id and workflow_data.get('userId') != user_id:
                # Check if workflow is public/canBeListed
                if not workflow_data.get('canBeListed', False):
                    logger.warning(f"⚠️ Unauthorized access attempt to workflow {workflow_id} by user {user_id}")
                    return None
            
            logger.info(f"✅ Retrieved workflow: {workflow_id}")
            return workflow_data
            
        except Exception as e:
            logger.error(f"❌ Failed to get workflow: {str(e)}")
            return None
    
    async def update_workflow(
        self,
        workflow_id: str,
        user_id: str,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update a workflow (only by owner)
        """
        try:
            workflow_ref = self.db.collection(self.workflows_collection).document(workflow_id)
            workflow_doc = workflow_ref.get()
            
            if not workflow_doc.exists:
                return {'success': False, 'error': 'Workflow not found'}
            
            workflow_data = workflow_doc.to_dict()
            
            # Verify ownership
            if workflow_data.get('userId') != user_id:
                return {'success': False, 'error': 'Unauthorized'}
            
            # Update workflow
            updates['updatedAt'] = firestore.SERVER_TIMESTAMP
            updates['version'] = firestore.Increment(1)
            
            workflow_ref.update(updates)
            
            logger.info(f"✅ Workflow updated: {workflow_id}")
            
            return {'success': True}
            
        except Exception as e:
            logger.error(f"❌ Failed to update workflow: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def delete_workflow(
        self,
        workflow_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Delete a workflow (only by owner)
        """
        try:
            workflow_ref = self.db.collection(self.workflows_collection).document(workflow_id)
            workflow_doc = workflow_ref.get()
            
            if not workflow_doc.exists:
                return {'success': False, 'error': 'Workflow not found'}
            
            workflow_data = workflow_doc.to_dict()
            
            # Verify ownership
            if workflow_data.get('userId') != user_id:
                return {'success': False, 'error': 'Unauthorized'}
            
            # Delete workflow
            workflow_ref.delete()
            
            # Update user's workflow count
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_ref.update({
                'usage.totalWorkflows': firestore.Increment(-1),
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            
            logger.info(f"✅ Workflow deleted: {workflow_id}")
            
            return {'success': True}
            
        except Exception as e:
            logger.error(f"❌ Failed to delete workflow: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def increment_execution_count(
        self,
        workflow_id: str
    ) -> Dict[str, Any]:
        """
        Increment the execution count for a workflow
        """
        try:
            workflow_ref = self.db.collection(self.workflows_collection).document(workflow_id)
            
            # Update workflow execution count and last executed time
            workflow_ref.update({
                'executionCount': firestore.Increment(1),
                'lastExecutedAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            
            logger.info(f"✅ Execution count incremented for workflow: {workflow_id}")
            
            return {'success': True}
            
        except Exception as e:
            logger.error(f"❌ Failed to increment execution count: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_public_workflows(
        self,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Get all public/listed workflows
        """
        try:
            # Query for workflows with canBeListed = true
            query = (
                self.db.collection(self.workflows_collection)
                .where('canBeListed', '==', True)
                .order_by('createdAt', direction=firestore.Query.DESCENDING)
            )
            
            # Get all workflows for counting
            all_workflows = list(query.stream())
            total = len(all_workflows)
            
            # Apply pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated_workflows = all_workflows[start_index:end_index]
            
            # Convert to dict
            workflows = []
            for workflow_doc in paginated_workflows:
                workflow_data = workflow_doc.to_dict()
                workflows.append(workflow_data)
            
            logger.info(f"✅ Retrieved {len(workflows)} public workflows")
            
            return {
                'success': True,
                'workflows': workflows,
                'total': total,
                'page': page,
                'pageSize': page_size
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get public workflows: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'workflows': [],
                'total': 0
            }


# Global instance
workflow_service = WorkflowService()
