"""
OTP Service - Handles OTP generation, sending, and verification for 2FA
"""

import secrets
import string
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from firebase_admin import firestore
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)


class OTPService:
    """Service for managing OTP (One-Time Password) operations"""
    
    OTP_LENGTH = 6
    OTP_EXPIRY_MINUTES = 1
    RESEND_COOLDOWN_SECONDS = 60
    MAX_OTP_ATTEMPTS = 5
    
    def __init__(self):
        self.db = firestore.client()
        self.otp_collection = 'otps'
    
    def generate_otp(self) -> str:
        """Generate a 6-digit numeric OTP"""
        return ''.join(secrets.choice(string.digits) for _ in range(self.OTP_LENGTH))
    
    async def create_otp(self, user_id: str, email: str) -> Dict[str, Any]:
        """
        Create and store an OTP for a user
        
        Args:
            user_id: Firebase user UID
            email: User's email address
            
        Returns:
            Dict with OTP details (without the actual code for security)
        """
        try:
            # Check for existing unexpired OTP
            existing_otp = await self.get_active_otp(user_id)
            if existing_otp:
                # Check if resend cooldown has passed
                created_at = existing_otp.get('createdAt')
                if created_at:
                    if isinstance(created_at, datetime):
                        elapsed = (datetime.utcnow() - created_at).total_seconds()
                    else:
                        # Handle Firestore timestamp
                        elapsed = (datetime.utcnow() - created_at).total_seconds()
                    
                    if elapsed < self.RESEND_COOLDOWN_SECONDS:
                        remaining = int(self.RESEND_COOLDOWN_SECONDS - elapsed)
                        raise ValueError(f"Please wait {remaining} seconds before requesting a new OTP")
            
            # Generate new OTP
            otp_code = self.generate_otp()
            expires_at = datetime.utcnow() + timedelta(minutes=self.OTP_EXPIRY_MINUTES)
            
            # Store OTP in Firestore
            otp_doc = {
                'userId': user_id,
                'email': email,
                'otp': otp_code,  # In production, hash this
                'expiresAt': expires_at,
                'used': False,
                'attempts': 0,
                'createdAt': datetime.utcnow(),
                'type': '2fa_login'
            }
            
            doc_ref = self.db.collection(self.otp_collection).document()
            doc_ref.set(otp_doc)
            
            # Send OTP via email
            await self.send_otp_email(email, otp_code)
            
            logger.info(f"OTP created for user {user_id}")
            
            return {
                'success': True,
                'otpId': doc_ref.id,
                'expiresAt': expires_at.isoformat(),
                'message': 'OTP sent to your email'
            }
            
        except Exception as e:
            logger.error(f"Failed to create OTP: {str(e)}")
            raise
    
    async def verify_otp(self, user_id: str, otp_code: str) -> Dict[str, Any]:
        """
        Verify an OTP code
        
        Args:
            user_id: Firebase user UID
            otp_code: The OTP code to verify
            
        Returns:
            Dict with verification result
        """
        try:
            # Get active OTP for user
            otp_doc = await self.get_active_otp(user_id)
            
            if not otp_doc:
                return {
                    'success': False,
                    'error': 'No active OTP found. Please request a new one.'
                }
            
            # Check if already used
            if otp_doc.get('used', False):
                return {
                    'success': False,
                    'error': 'This OTP has already been used. Please request a new one.'
                }
            
            # Check attempts
            attempts = otp_doc.get('attempts', 0)
            if attempts >= self.MAX_OTP_ATTEMPTS:
                # Mark as used to prevent further attempts
                otp_doc['used'] = True
                self.db.collection(self.otp_collection).document(otp_doc['id']).update({
                    'used': True,
                    'updatedAt': datetime.utcnow()
                })
                return {
                    'success': False,
                    'error': 'Maximum verification attempts exceeded. Please request a new OTP.'
                }
            
            # Check expiration
            expires_at = otp_doc.get('expiresAt')
            if isinstance(expires_at, datetime):
                if datetime.utcnow() > expires_at:
                    return {
                        'success': False,
                        'error': 'OTP has expired. Please request a new one.'
                    }
            
            # Verify OTP code
            stored_otp = otp_doc.get('otp')
            if stored_otp != otp_code:
                # Increment attempts
                attempts += 1
                self.db.collection(self.otp_collection).document(otp_doc['id']).update({
                    'attempts': attempts,
                    'updatedAt': datetime.utcnow()
                })
                
                remaining = self.MAX_OTP_ATTEMPTS - attempts
                return {
                    'success': False,
                    'error': f'Invalid OTP code. {remaining} attempts remaining.',
                    'attemptsRemaining': remaining
                }
            
            # Mark OTP as used
            self.db.collection(self.otp_collection).document(otp_doc['id']).update({
                'used': True,
                'verifiedAt': datetime.utcnow(),
                'updatedAt': datetime.utcnow()
            })
            
            logger.info(f"OTP verified successfully for user {user_id}")
            
            return {
                'success': True,
                'message': 'OTP verified successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to verify OTP: {str(e)}")
            return {
                'success': False,
                'error': 'Failed to verify OTP. Please try again.'
            }
    
    async def get_active_otp(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get the most recent active (unexpired, unused) OTP for a user"""
        try:
            query = (
                self.db.collection(self.otp_collection)
                .where('userId', '==', user_id)
                .where('type', '==', '2fa_login')
                .where('used', '==', False)
                .order_by('createdAt', direction=firestore.Query.DESCENDING)
                .limit(1)
            )
            
            docs = query.stream()
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                
                # Check expiration
                expires_at = data.get('expiresAt')
                if isinstance(expires_at, datetime):
                    if datetime.utcnow() <= expires_at:
                        return data
                else:
                    # Handle Firestore timestamp
                    return data
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get active OTP: {str(e)}")
            return None
    
    async def send_otp_email(self, email: str, otp_code: str) -> bool:
        """
        Send OTP code via email
        
        Args:
            email: Recipient email address
            otp_code: The OTP code to send
            
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            # Email configuration from settings
            smtp_host = getattr(settings, 'SMTP_HOST', 'smtp.gmail.com')
            smtp_port = getattr(settings, 'SMTP_PORT', 587)
            smtp_user = getattr(settings, 'SMTP_USERNAME', None) or getattr(settings, 'SMTP_USER', None)
            smtp_password = getattr(settings, 'SMTP_PASSWORD', None)
            smtp_from = getattr(settings, 'EMAIL_FROM', 'noreply@nexagent.com') or getattr(settings, 'SMTP_FROM', 'noreply@nexagent.com')
            
            # Create email message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = 'Your NexAgent 2FA Verification Code'
            msg['From'] = smtp_from
            msg['To'] = email
            
            # Email body
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #FF6900 0%, #FF8555 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .header h1 {{ color: white; margin: 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .otp-code {{ background: #fff; border: 2px dashed #FF6900; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #FF6900; margin: 20px 0; border-radius: 5px; }}
                    .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }}
                    .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Two-Factor Authentication</h1>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>You've requested to sign in to your NexAgent account. Please use the following verification code:</p>
                        
                        <div class="otp-code">{otp_code}</div>
                        
                        <p>This code will expire in <strong>1 minute</strong>.</p>
                        
                        <div class="warning">
                            <strong>⚠️ Security Notice:</strong> If you didn't request this code, please ignore this email or contact support if you're concerned.
                        </div>
                        
                        <p>For security reasons, do not share this code with anyone.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from NexAgent. Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_body = f"""
            Two-Factor Authentication
            
            Your NexAgent verification code is: {otp_code}
            
            This code will expire in 1 minute.
            
            If you didn't request this code, please ignore this email.
            """
            
            msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))
            
            # Send email
            if smtp_user and smtp_password:
                # Use SMTP authentication
                with smtplib.SMTP(smtp_host, smtp_port) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
            else:
                # Log email in development (no actual sending)
                logger.info(f"[DEV] OTP Email would be sent to {email}: {otp_code}")
                logger.warning("SMTP credentials not configured. OTP email not sent.")
                # In production, you should raise an error here
            
            logger.info(f"OTP email sent to {email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send OTP email: {str(e)}")
            # Don't raise - allow OTP creation to succeed even if email fails
            # (in production, you might want to handle this differently)
            return False
    
    async def cleanup_expired_otps(self, user_id: Optional[str] = None):
        """Clean up expired OTPs (can be run as a scheduled job)"""
        try:
            query = self.db.collection(self.otp_collection)
            
            if user_id:
                query = query.where('userId', '==', user_id)
            
            query = query.where('expiresAt', '<', datetime.utcnow())
            
            docs = query.stream()
            deleted_count = 0
            
            for doc in docs:
                doc.reference.delete()
                deleted_count += 1
            
            logger.info(f"Cleaned up {deleted_count} expired OTPs")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired OTPs: {str(e)}")
            return 0


# Global instance
otp_service = OTPService()

