"""
Action Node Executors
"""
import asyncio
import aiohttp
import json
from typing import Any, Dict, List, Optional
from datetime import datetime
import logging
from ..nodes.base import BaseNodeExecutor

logger = logging.getLogger(__name__)


class HttpRequestExecutor(BaseNodeExecutor):
    """
    HTTP Request Node - Makes HTTP requests to external APIs
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["url"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        # Validate URL
        url = config.get("url", "")
        if url:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(url)
                if not parsed.scheme or not parsed.netloc:
                    errors.append("Invalid URL format")
            except Exception:
                errors.append("Invalid URL format")
        
        # Validate method
        method = config.get("method", "GET")
        valid_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
        if method.upper() not in valid_methods:
            errors.append(f"Invalid HTTP method. Must be one of: {', '.join(valid_methods)}")
        
        # Validate timeout
        timeout = config.get("timeout", 30000)
        if not isinstance(timeout, (int, float)) or timeout <= 0:
            errors.append("Timeout must be a positive number")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Execute HTTP request.
        """
        config = self.config.config
        method = config.get("method", "GET").upper()
        url = config.get("url")
        headers = config.get("headers", {})
        body = config.get("body")
        timeout = config.get("timeout", 30000) / 1000.0  # Convert to seconds
        retry_count = config.get("retryCount", 0)
        
        # Build query parameters if provided
        params = config.get("paramsList", [])
        query_params = {}
        if isinstance(params, list):
            for param in params:
                if isinstance(param, dict) and "key" in param:
                    query_params[param["key"]] = param.get("value", "")
        
        # Prepare request body
        request_body = None
        if body is not None and method not in ["GET", "HEAD"]:
            if isinstance(body, str):
                request_body = body
            else:
                request_body = json.dumps(body)
                if "Content-Type" not in headers:
                    headers["Content-Type"] = "application/json"
        
        # Execute request with retries
        last_error = None
        for attempt in range(retry_count + 1):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.request(
                        method=method,
                        url=url,
                        headers=headers,
                        params=query_params if query_params else None,
                        data=request_body,
                        timeout=aiohttp.ClientTimeout(total=timeout)
                    ) as response:
                        # Read response
                        content_type = response.headers.get("Content-Type", "")
                        
                        if "application/json" in content_type:
                            data = await response.json()
                        elif "text/" in content_type:
                            data = await response.text()
                        else:
                            data = await response.read()
                        
                        response_headers = dict(response.headers)
                        
                        result = {
                            "status": response.status,
                            "statusText": response.reason,
                            "url": str(response.url),
                            "headers": response_headers,
                            "contentType": content_type,
                            "data": data,
                            "ok": response.status < 400
                        }
                        
                        return result
                        
            except asyncio.TimeoutError:
                last_error = f"Request timeout after {timeout}s"
                if attempt < retry_count:
                    await asyncio.sleep(2 ** attempt * 0.2)  # Exponential backoff
                    continue
                raise
            except Exception as e:
                last_error = str(e)
                if attempt < retry_count:
                    await asyncio.sleep(2 ** attempt * 0.2)
                    continue
                raise
        
        if last_error:
            raise Exception(f"HTTP request failed after {retry_count + 1} attempts: {last_error}")


class EmailExecutor(BaseNodeExecutor):
    """
    Email Node - Sends emails
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["to", "subject"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        # Validate email addresses
        to = config.get("to", "")
        if to:
            if not isinstance(to, (str, list)):
                errors.append("'to' must be a string or list of email addresses")
            elif isinstance(to, str) and "@" not in to:
                errors.append("Invalid email address format")
        
        # Check for API key or SMTP config
        if not self.context.api_keys.get("email") and not config.get("smtp"):
            errors.append("Email API key or SMTP configuration required")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Send email.
        Note: This is a placeholder. In production, integrate with SendGrid, AWS SES, etc.
        """
        config = self.config.config
        to = config.get("to")
        subject = config.get("subject")
        body = config.get("body", "")
        from_email = config.get("from", "noreply@nexagent.com")
        
        # In production, this would call an email service
        # For now, we'll simulate it
        await asyncio.sleep(0.1)  # Simulate API call
        
        return {
            "success": True,
            "message_id": f"email_{datetime.utcnow().timestamp()}",
            "to": to,
            "subject": subject,
            "sent_at": datetime.utcnow().isoformat()
        }


class SlackExecutor(BaseNodeExecutor):
    """
    Slack Node - Sends Slack messages
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["channel", "message"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        # Check for Slack API token
        if not self.context.api_keys.get("slack"):
            errors.append("Slack API token required")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Send Slack message.
        Note: This is a placeholder. In production, use Slack Web API.
        """
        config = self.config.config
        channel = config.get("channel")
        message = config.get("message")
        
        # In production, this would call Slack API
        # For now, we'll simulate it
        await asyncio.sleep(0.1)
        
        return {
            "success": True,
            "ts": datetime.utcnow().timestamp(),
            "channel": channel,
            "message": message,
            "sent_at": datetime.utcnow().isoformat()
        }


class DatabaseExecutor(BaseNodeExecutor):
    """
    Database Query Node - Executes database queries
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["query"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        # Check for database connection
        if not config.get("connection") and not self.context.api_keys.get("database"):
            errors.append("Database connection or API key required")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Execute database query.
        Note: This is a placeholder. In production, use proper database drivers.
        """
        config = self.config.config
        query = config.get("query")
        connection = config.get("connection", {})
        
        # In production, this would execute the query
        # For now, we'll simulate it
        await asyncio.sleep(0.1)
        
        return {
            "success": True,
            "rows_affected": 0,
            "data": [],
            "executed_at": datetime.utcnow().isoformat()
        }

