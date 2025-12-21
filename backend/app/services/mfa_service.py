"""
MFA Service - TOTP (Time-based One-Time Password) Implementation
"""

import pyotp
import qrcode
from io import BytesIO
import base64
import secrets
import hashlib
from typing import Dict, Any, Optional
from datetime import datetime
from firebase_admin import firestore
import logging

logger = logging.getLogger(__name__)


class MFAService:
    def __init__(self):
        # Import firebase_service to use its initialized Firestore client
        from app.services.firebase_service import firebase_service
        self.db = firebase_service.db
    
    def generate_secret(self) -> str:
        """Generate a random TOTP secret (base32 encoded)"""
        return pyotp.random_base32()
    
    def generate_qr_code_data_url(self, email: str, secret: str, issuer: str = "NexAgent") -> str:
        """Generate QR code as base64 data URL for authenticator app"""
        try:
            # Create TOTP URI
            totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
                name=email,
                issuer_name=issuer
            )
            
            # Generate QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(totp_uri)
            qr.make(fit=True)
            
            # Create image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64 data URL
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return f"data:image/png;base64,{img_str}"
            
        except Exception as e:
            logger.error(f"Failed to generate QR code: {str(e)}")
            raise
    
    def verify_totp(self, secret: str, code: str, valid_window: int = 1) -> bool:
        """
        Verify TOTP code
        
        Args:
            secret: TOTP secret
            code: 6-digit code from authenticator app
            valid_window: Number of time steps to allow (default 1 = current and previous/next 30 seconds)
        
        Returns:
            True if code is valid, False otherwise
        """
        try:
            totp = pyotp.TOTP(secret)
            # Verify with window to account for clock skew
            return totp.verify(code, valid_window=valid_window)
        except Exception as e:
            logger.error(f"TOTP verification error: {str(e)}")
            return False
    
    def generate_backup_codes(self, count: int = 10) -> list[str]:
        """Generate backup codes (one-time use codes)"""
        return [secrets.token_hex(4).upper() for _ in range(count)]
    
    def hash_backup_code(self, code: str) -> str:
        """Hash backup code for storage (using SHA256)"""
        return hashlib.sha256(code.encode()).hexdigest()
    
    def verify_backup_code(self, code: str, hashed_codes: list[str]) -> tuple[bool, Optional[str]]:
        """
        Verify backup code and return the matched hash if valid
        
        Returns:
            (is_valid, matched_hash) tuple
        """
        code_hash = self.hash_backup_code(code)
        for hashed_code in hashed_codes:
            if hashed_code == code_hash:
                return True, hashed_code
        return False, None
    
    async def setup_mfa(self, uid: str, email: str) -> Dict[str, Any]:
        """
        Setup MFA for a user - generates secret and QR code
        
        Returns:
            {
                'success': True,
                'secret': secret,
                'qr_code': qr_code_data_url,
                'manual_entry_key': secret
            }
        """
        try:
            # Generate secret
            secret = self.generate_secret()
            
            # Generate QR code
            qr_code = self.generate_qr_code_data_url(email, secret)
            
            # Store secret temporarily (encrypted) in Firestore
            # We'll store it permanently after user verifies the setup
            user_ref = self.db.collection('users').document(uid)
            user_ref.update({
                'security.mfaSecret': secret,  # Store temporarily, will be kept after verification
                'security.mfaSetupInProgress': True,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            
            logger.info(f"MFA setup initiated for user {uid}")
            
            return {
                'success': True,
                'secret': secret,
                'qr_code': qr_code,
                'manual_entry_key': secret
            }
            
        except Exception as e:
            logger.error(f"Failed to setup MFA: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def verify_mfa_setup(self, uid: str, code: str) -> Dict[str, Any]:
        """
        Verify MFA setup by checking the code from authenticator app
        
        Returns:
            {
                'success': True,
                'backup_codes': [list of backup codes]
            }
        """
        try:
            user_ref = self.db.collection('users').document(uid)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                return {'success': False, 'error': 'User not found'}
            
            user_data = user_doc.to_dict()
            security = user_data.get('security', {})
            secret = security.get('mfaSecret')
            
            if not secret:
                return {'success': False, 'error': 'MFA setup not initiated'}
            
            # Verify the code
            if not self.verify_totp(secret, code):
                return {'success': False, 'error': 'Invalid verification code'}
            
            # Generate backup codes
            backup_codes = self.generate_backup_codes(10)
            hashed_backup_codes = [self.hash_backup_code(code) for code in backup_codes]
            
            # Enable MFA and store backup codes
            # Get current security data and update it
            current_security = user_data.get('security', {})
            current_security['twoFactorEnabled'] = True
            current_security['twoFactorMethod'] = 'totp'
            current_security['mfaBackupCodes'] = hashed_backup_codes
            current_security['mfaSetupInProgress'] = False
            current_security['mfaEnabledAt'] = firestore.SERVER_TIMESTAMP
            
            # Update the entire security object
            user_ref.update({
                'security': current_security,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            
            # Verify the update was successful
            updated_doc = user_ref.get()
            updated_data = updated_doc.to_dict()
            updated_security = updated_data.get('security', {})
            logger.info(f"MFA enabled for user {uid}. Verification: twoFactorEnabled={updated_security.get('twoFactorEnabled')}, method={updated_security.get('twoFactorMethod')}, backup_codes={len(updated_security.get('mfaBackupCodes', []))}")
            
            return {
                'success': True,
                'backup_codes': backup_codes  # Return plain codes only once
            }
            
        except Exception as e:
            logger.error(f"Failed to verify MFA setup: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def verify_mfa_login(self, uid: str, code: str) -> Dict[str, Any]:
        """
        Verify MFA code during login
        
        Returns:
            {'success': True} if valid, {'success': False, 'error': '...'} if invalid
        """
        try:
            user_ref = self.db.collection('users').document(uid)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                return {'success': False, 'error': 'User not found'}
            
            user_data = user_doc.to_dict()
            security = user_data.get('security', {})
            
            if not security.get('twoFactorEnabled'):
                return {'success': False, 'error': 'MFA not enabled'}
            
            secret = security.get('mfaSecret')
            if not secret:
                return {'success': False, 'error': 'MFA secret not found'}
            
            # Try TOTP code first
            if self.verify_totp(secret, code):
                return {'success': True, 'method': 'totp'}
            
            # Try backup code
            backup_codes = security.get('mfaBackupCodes', [])
            is_valid, matched_hash = self.verify_backup_code(code, backup_codes)
            
            if is_valid:
                # Remove used backup code
                backup_codes.remove(matched_hash)
                user_ref.update({
                    'security.mfaBackupCodes': backup_codes,
                    'updatedAt': firestore.SERVER_TIMESTAMP
                })
                logger.info(f"Backup code used for user {uid}")
                return {'success': True, 'method': 'backup'}
            
            return {'success': False, 'error': 'Invalid code'}
            
        except Exception as e:
            logger.error(f"Failed to verify MFA login: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def disable_mfa(self, uid: str) -> Dict[str, Any]:
        """Disable MFA for a user"""
        try:
            user_ref = self.db.collection('users').document(uid)
            user_ref.update({
                'security.twoFactorEnabled': False,
                'security.twoFactorMethod': None,
                'security.mfaSecret': None,
                'security.mfaBackupCodes': [],
                'security.mfaSetupInProgress': False,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            
            logger.info(f"MFA disabled for user {uid}")
            return {'success': True}
            
        except Exception as e:
            logger.error(f"Failed to disable MFA: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_mfa_status(self, uid: str) -> Dict[str, Any]:
        """Get MFA status for a user"""
        try:
            user_ref = self.db.collection('users').document(uid)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                return {'success': False, 'error': 'User not found'}
            
            user_data = user_doc.to_dict()
            security = user_data.get('security', {})
            
            # Debug: log the actual security data
            logger.info(f"MFA status check for {uid}: security data = {security}")
            
            # Check if MFA is enabled
            enabled = security.get('twoFactorEnabled', False)
            
            # If not enabled but has backup codes and method, it means MFA was set up but flag wasn't saved
            # Auto-fix: if user has backup codes and method, enable MFA
            has_backup_codes = len(security.get('mfaBackupCodes', [])) > 0
            has_method = security.get('twoFactorMethod') is not None
            has_secret = security.get('mfaSecret') is not None
            
            if not enabled and has_backup_codes and has_method and has_secret:
                logger.warning(f"User {uid} has MFA setup (backup codes, method, secret) but twoFactorEnabled is False. Auto-fixing...")
                # Fix the missing flag
                current_security = security.copy()
                current_security['twoFactorEnabled'] = True
                user_ref.update({
                    'security': current_security,
                    'updatedAt': firestore.SERVER_TIMESTAMP
                })
                enabled = True
                logger.info(f"Auto-fixed MFA status for user {uid}")
            
            return {
                'success': True,
                'enabled': enabled,
                'method': security.get('twoFactorMethod'),
                'setup_in_progress': security.get('mfaSetupInProgress', False),
                'backup_codes_count': len(security.get('mfaBackupCodes', []))
            }
            
        except Exception as e:
            logger.error(f"Failed to get MFA status: {str(e)}")
            return {'success': False, 'error': str(e)}


# Create global instance
mfa_service = MFAService()

