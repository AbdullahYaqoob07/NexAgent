"""
Backup API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from app.services.backup_service import backup_service
from app.core.auth_dependency import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backup", tags=["backup"])


@router.post("/create", response_model=Dict[str, Any])
async def create_backup(current_user: dict = Depends(get_current_user)):
    """
    Manually trigger a backup for the current user
    """
    try:
        uid = current_user['uid']
        result = await backup_service.backup_user_data(uid)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Failed to create backup')
            )
        
        return {
            'success': True,
            'message': 'Backup created successfully',
            'backup': result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create backup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create backup"
        )


@router.get("/history", response_model=Dict[str, Any])
async def get_backup_history(
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """
    Get backup history for the current user
    """
    try:
        uid = current_user['uid']
        history = await backup_service.get_backup_history(uid, limit)
        
        return {
            'success': True,
            'history': history,
            'count': len(history)
        }
    except Exception as e:
        logger.error(f"Failed to get backup history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get backup history"
        )


@router.get("/settings", response_model=Dict[str, Any])
async def get_backup_settings(current_user: dict = Depends(get_current_user)):
    """
    Get backup settings for the current user
    """
    try:
        uid = current_user['uid']
        settings = await backup_service.get_user_backup_settings(uid)
        
        return {
            'success': True,
            'settings': settings
        }
    except Exception as e:
        logger.error(f"Failed to get backup settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get backup settings"
        )


@router.put("/settings", response_model=Dict[str, Any])
async def update_backup_settings(
    backup_enabled: bool = None,
    backup_frequency: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Update backup settings for the current user
    """
    try:
        from firebase_admin import firestore
        
        uid = current_user['uid']
        user_ref = backup_service.db.collection('users').document(uid)
        
        updates = {}
        if backup_enabled is not None:
            updates['preferences.advanced.backupEnabled'] = backup_enabled
        if backup_frequency is not None:
            if backup_frequency not in ['daily', 'weekly', 'monthly']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid backup frequency. Must be 'daily', 'weekly', or 'monthly'"
                )
            updates['preferences.advanced.backupFrequency'] = backup_frequency
        
        if updates:
            updates['updatedAt'] = firestore.SERVER_TIMESTAMP
            user_ref.update(updates)
        
        # Get updated settings
        settings = await backup_service.get_user_backup_settings(uid)
        
        return {
            'success': True,
            'message': 'Backup settings updated successfully',
            'settings': settings
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update backup settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update backup settings"
        )

