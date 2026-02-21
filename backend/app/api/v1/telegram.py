"""
Telegram Bot API Endpoint
Handles sending messages via Telegram Bot API
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator
import requests
from typing import Optional, Literal
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/telegram", tags=["telegram"])


class TelegramSendRequest(BaseModel):
    """Request model for sending Telegram message"""
    bot_token: str = Field(..., min_length=1, description="Telegram bot token")
    chat_id: str = Field(..., pattern=r"^-?\d+$", description="Chat or channel ID")
    message: str = Field(..., min_length=1, max_length=4096, description="Message text")
    parse_mode: Optional[Literal["HTML", "Markdown", "MarkdownV2"]] = Field(
        default="HTML", description="Text formatting mode"
    )
    disable_notification: bool = Field(
        default=False, description="Send without sound/vibration"
    )
    protect_content: bool = Field(
        default=False, description="Protect message from forwarding"
    )

    @validator('bot_token')
    def validate_bot_token(cls, v):
        """Validate bot token format"""
        if ':' not in v or len(v.split(':')) != 2:
            raise ValueError('Invalid bot token format (must be: ID:TOKEN)')
        return v


class TelegramSendResponse(BaseModel):
    """Response model from Telegram send"""
    success: bool
    message_id: Optional[int] = None
    chat_id: Optional[str] = None
    sent_at: Optional[str] = None
    message_text: Optional[str] = None
    error: Optional[str] = None


@router.post("/send", response_model=TelegramSendResponse)
async def send_telegram_message(request: TelegramSendRequest):
    """
    Send a message via Telegram Bot API
    
    This endpoint acts as a secure proxy to Telegram API.
    Bot tokens are never exposed in frontend code.
    
    Args:
        request: TelegramSendRequest with bot token, chat ID, and message
        
    Returns:
        TelegramSendResponse with success status and message ID
    """
    try:
        # Construct Telegram API URL
        telegram_url = f"https://api.telegram.org/bot{request.bot_token}/sendMessage"
        
        # Prepare payload
        payload = {
            "chat_id": request.chat_id,
            "text": request.message,
            "parse_mode": request.parse_mode or "HTML",
            "disable_notification": request.disable_notification,
            "protect_content": request.protect_content,
        }
        
        # Log request (don't log token)
        logger.info(
            f"Sending Telegram message to chat {request.chat_id} "
            f"(len={len(request.message)})"
        )
        
        # Make request to Telegram API with timeout
        response = requests.post(telegram_url, json=payload, timeout=10)
        
        # Handle Telegram API errors
        if response.status_code != 200:
            error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
            error_message = error_data.get('description', f'HTTP {response.status_code}')
            
            logger.error(f"Telegram API error: {error_message}")
            
            return TelegramSendResponse(
                success=False,
                error=f"Telegram API error: {error_message}"
            )
        
        # Parse successful response
        result_data = response.json()
        result = result_data.get('result', {})
        message_id = result.get('message_id')
        chat = result.get('chat', {})
        chat_id = str(chat.get('id', request.chat_id))
        sent_at = result.get('date')
        
        logger.info(f"✅ Message sent successfully: ID {message_id} to chat {chat_id}")
        
        return TelegramSendResponse(
            success=True,
            message_id=message_id,
            chat_id=chat_id,
            sent_at=str(sent_at) if sent_at else datetime.utcnow().isoformat(),
            message_text=request.message,
            error=None
        )
        
    except requests.exceptions.Timeout:
        logger.error("❌ Telegram API request timed out")
        return TelegramSendResponse(
            success=False,
            error="Request timed out. Telegram server not responding."
        )
    
    except requests.exceptions.ConnectionError as e:
        logger.error(f"❌ Connection error: {str(e)}")
        return TelegramSendResponse(
            success=False,
            error=f"Connection error. Check internet connection."
        )
    
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Network error: {str(e)}")
        return TelegramSendResponse(
            success=False,
            error=f"Network error: {str(e)}"
        )
    
    except Exception as e:
        logger.error(f"❌ Unexpected error: {str(e)}")
        return TelegramSendResponse(
            success=False,
            error=f"Internal error: {str(e)}"
        )


@router.get("/health")
async def telegram_health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "telegram",
        "timestamp": datetime.utcnow().isoformat()
    }
