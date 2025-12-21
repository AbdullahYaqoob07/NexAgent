"""
Backup Service - Automated daily backups for user data
"""

import json
import gzip
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from firebase_admin import firestore, storage
import logging
from io import BytesIO

logger = logging.getLogger(__name__)


class BackupService:
    def __init__(self):
        self.db = firestore.client()
        try:
            # Try to get the default bucket, but don't fail if not configured
            self.bucket = storage.bucket()
        except Exception as e:
            logger.warning(f"Firebase Storage bucket not initialized: {str(e)}")
            self.bucket = None
    
    async def get_user_backup_settings(self, uid: str) -> Dict[str, Any]:
        """Get user's backup settings from Firestore"""
        try:
            user_doc = self.db.collection('users').document(uid).get()
            if not user_doc.exists:
                return {'backupEnabled': False, 'backupFrequency': 'daily'}
            
            user_data = user_doc.to_dict()
            preferences = user_data.get('preferences', {})
            advanced = preferences.get('advanced', {})
            
            return {
                'backupEnabled': advanced.get('backupEnabled', True),  # Default to True
                'backupFrequency': advanced.get('backupFrequency', 'daily')
            }
        except Exception as e:
            logger.error(f"Failed to get backup settings for {uid}: {str(e)}")
            return {'backupEnabled': False, 'backupFrequency': 'daily'}
    
    async def should_run_backup(self, uid: str) -> bool:
        """Check if backup should run based on settings and last backup time"""
        try:
            settings = await self.get_user_backup_settings(uid)
            
            if not settings.get('backupEnabled', False):
                return False
            
            # Check last backup time
            user_doc = self.db.collection('users').document(uid).get()
            if not user_doc.exists:
                return True  # First backup
            
            user_data = user_doc.to_dict()
            backups = user_data.get('backups', {})
            last_backup_time = backups.get('lastBackupTime')
            
            if not last_backup_time:
                return True  # First backup
            
            # Convert Firestore timestamp to datetime
            if hasattr(last_backup_time, 'timestamp'):
                last_backup = datetime.fromtimestamp(last_backup_time.timestamp())
            elif hasattr(last_backup_time, 'seconds'):
                # Firestore Timestamp object
                last_backup = datetime.fromtimestamp(last_backup_time.seconds)
            elif isinstance(last_backup_time, datetime):
                last_backup = last_backup_time
            else:
                # Try to parse as ISO string
                try:
                    last_backup = datetime.fromisoformat(str(last_backup_time))
                except:
                    return True  # If we can't parse, assume it's time for a backup
            
            # Calculate time since last backup
            time_since_backup = datetime.now() - last_backup
            
            # Check frequency
            frequency = settings.get('backupFrequency', 'daily')
            if frequency == 'daily':
                return time_since_backup >= timedelta(hours=24)
            elif frequency == 'weekly':
                return time_since_backup >= timedelta(days=7)
            elif frequency == 'monthly':
                return time_since_backup >= timedelta(days=30)
            
            return False
        except Exception as e:
            logger.error(f"Failed to check backup schedule for {uid}: {str(e)}")
            return False
    
    async def backup_user_data(self, uid: str) -> Dict[str, Any]:
        """Create a backup of user's data (workflows, profile, etc.)"""
        try:
            logger.info(f"Starting backup for user {uid}")
            
            # Collect all user data
            backup_data = {
                'user_id': uid,
                'backup_timestamp': datetime.now().isoformat(),
                'backup_version': '1.0',
                'data': {}
            }
            
            # 1. User profile data
            user_doc = self.db.collection('users').document(uid).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                # Remove sensitive data that shouldn't be backed up
                user_data_clean = {
                    'profile': user_data.get('profile', {}),
                    'preferences': user_data.get('preferences', {}),
                    'workspace': user_data.get('workspace', {}),
                    'usage': user_data.get('usage', {}),
                    'subscription': user_data.get('subscription', {}),
                }
                backup_data['data']['user_profile'] = user_data_clean
            
            # 2. User's workflows
            workflows = []
            workflows_ref = self.db.collection('workflows').where('userId', '==', uid).stream()
            for workflow_doc in workflows_ref:
                workflow_data = workflow_doc.to_dict()
                workflows.append({
                    'id': workflow_doc.id,
                    'data': workflow_data
                })
            backup_data['data']['workflows'] = workflows
            
            # 3. Workflow executions (recent ones, limit to last 100 per workflow)
            executions = []
            executions_ref = self.db.collection('workflow_executions').where('userId', '==', uid).order_by('createdAt', direction=firestore.Query.DESCENDING).limit(100).stream()
            for exec_doc in executions_ref:
                exec_data = exec_doc.to_dict()
                executions.append({
                    'id': exec_doc.id,
                    'data': exec_data
                })
            backup_data['data']['executions'] = executions
            
            # 4. User's integrations
            integrations = []
            integrations_ref = self.db.collection('integrations').where('userId', '==', uid).stream()
            for int_doc in integrations_ref:
                int_data = int_doc.to_dict()
                # Remove sensitive API keys from backup
                int_data_clean = {k: v for k, v in int_data.items() if 'key' not in k.lower() and 'secret' not in k.lower() and 'token' not in k.lower()}
                integrations.append({
                    'id': int_doc.id,
                    'data': int_data_clean
                })
            backup_data['data']['integrations'] = integrations
            
            # Compress backup data
            backup_json = json.dumps(backup_data, default=str)
            backup_bytes = backup_json.encode('utf-8')
            compressed = gzip.compress(backup_bytes)
            
            # Store in Firebase Storage
            backup_filename = f"backups/{uid}/{datetime.now().strftime('%Y%m%d_%H%M%S')}_backup.json.gz"
            
            if self.bucket:
                blob = self.bucket.blob(backup_filename)
                blob.upload_from_string(compressed, content_type='application/gzip')
                blob.make_public()  # Or use signed URLs for security
                backup_url = blob.public_url
            else:
                # Fallback: store backup info in Firestore (not the actual data)
                backup_url = f"backup_stored_locally_{backup_filename}"
                logger.warning("Firebase Storage not available, storing backup metadata only")
            
            # Update user document with backup info
            backup_info = {
                'lastBackupTime': firestore.SERVER_TIMESTAMP,
                'lastBackupUrl': backup_url,
                'lastBackupSize': len(compressed),
                'backupCount': firestore.Increment(1)
            }
            
            user_ref = self.db.collection('users').document(uid)
            user_data = user_ref.get().to_dict() if user_ref.get().exists else {}
            backups = user_data.get('backups', {})
            backup_count = backups.get('backupCount', 0)
            
            user_ref.update({
                'backups.lastBackupTime': firestore.SERVER_TIMESTAMP,
                'backups.lastBackupUrl': backup_url,
                'backups.lastBackupSize': len(compressed),
                'backups.backupCount': backup_count + 1,
                'backups.backupHistory': firestore.ArrayUnion([{
                    'timestamp': firestore.SERVER_TIMESTAMP,
                    'url': backup_url,
                    'size': len(compressed),
                    'filename': backup_filename
                }])
            })
            
            logger.info(f"Backup completed for user {uid}: {backup_filename} ({len(compressed)} bytes)")
            
            return {
                'success': True,
                'backup_url': backup_url,
                'backup_size': len(compressed),
                'backup_filename': backup_filename,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to create backup for user {uid}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_backup_history(self, uid: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get user's backup history"""
        try:
            user_doc = self.db.collection('users').document(uid).get()
            if not user_doc.exists:
                return []
            
            user_data = user_doc.to_dict()
            backups = user_data.get('backups', {})
            history = backups.get('backupHistory', [])
            
            # Convert Firestore timestamps to ISO strings
            for backup in history:
                if 'timestamp' in backup and hasattr(backup['timestamp'], 'timestamp'):
                    backup['timestamp'] = datetime.fromtimestamp(backup['timestamp'].timestamp()).isoformat()
            
            return history[-limit:] if limit else history
            
        except Exception as e:
            logger.error(f"Failed to get backup history for {uid}: {str(e)}")
            return []
    
    async def process_scheduled_backups(self) -> Dict[str, Any]:
        """Process backups for all users who have backups enabled and are due"""
        try:
            logger.info("Starting scheduled backup process")
            
            # Get all users
            users_ref = self.db.collection('users').stream()
            processed = 0
            successful = 0
            failed = 0
            
            for user_doc in users_ref:
                uid = user_doc.id
                try:
                    if await self.should_run_backup(uid):
                        result = await self.backup_user_data(uid)
                        if result.get('success'):
                            successful += 1
                        else:
                            failed += 1
                        processed += 1
                except Exception as e:
                    logger.error(f"Error processing backup for user {uid}: {str(e)}")
                    failed += 1
                    processed += 1
            
            logger.info(f"Backup process completed: {processed} processed, {successful} successful, {failed} failed")
            
            return {
                'success': True,
                'processed': processed,
                'successful': successful,
                'failed': failed,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to process scheduled backups: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }


# Create global instance
backup_service = BackupService()

