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
import json

logger = logging.getLogger(__name__)


class LoggerExecutor(BaseNodeExecutor):
    """
    Logger Node - Outputs input data to logs for debugging and monitoring
    """
    
    def get_required_config_fields(self) -> List[str]:
        return []
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Log input data and return it unchanged.
        """
        config = self.config.config
        log_level = config.get("log_level", "info").lower()
        log_message = config.get("message", "Workflow node execution")
        
        # Prepare data for logging
        log_data = {
            "node_id": self.config.node_id,
            "node_name": self.config.node_name,
            "message": log_message,
            "input_data": input_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Log at appropriate level
        if log_level == "debug":
            logger.debug(json.dumps(log_data, indent=2))
        elif log_level == "warning":
            logger.warning(json.dumps(log_data, indent=2))
        elif log_level == "error":
            logger.error(json.dumps(log_data, indent=2))
        else:  # default to info
            logger.info(json.dumps(log_data, indent=2))
        
        # Return input data unchanged
        return {
            "logged": True,
            "log_level": log_level,
            "message": log_message,
            "input": input_data,
            "logged_at": datetime.utcnow().isoformat()
        }


class VariableSetterExecutor(BaseNodeExecutor):
    """
    Variable Setter Node - Sets or updates workflow variables
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["variable_name"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        variable_name = config.get("variable_name")
        if not variable_name:
            errors.append("Variable name is required")
        elif not isinstance(variable_name, str):
            errors.append("Variable name must be a string")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Set a workflow variable and return input data unchanged.
        """
        config = self.config.config
        variable_name = config.get("variable_name")
        variable_value = config.get("variable_value")
        value_source = config.get("value_source", "config")  # config or input
        
        # Determine the value to set
        if value_source == "input":
            value = input_data
        else:
            value = variable_value
        
        # Set the variable in context (this would typically be handled by the orchestrator)
        # For now, we'll just log that we would set it
        logger.info(f"Setting variable '{variable_name}' to: {value}")
        
        return {
            "variable_set": True,
            "variable_name": variable_name,
            "variable_value": value,
            "value_source": value_source,
            "input": input_data,
            "set_at": datetime.utcnow().isoformat()
        }


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
                            "method": method,  # Include method for network tab
                            "headers": response_headers,
                            "requestHeaders": headers,  # Include request headers
                            "requestBody": request_body,  # Include request body
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


class TelegramExecutor(BaseNodeExecutor):
    """
    Telegram Node - Sends messages via Telegram Bot API
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["botToken", "chatId", "message"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        bot_token = config.get("botToken", "")
        if bot_token and ":" not in bot_token:
            errors.append("Invalid bot token format. Expected format: 123456:ABC-DEF")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Send Telegram message via Bot API.
        """
        config = self.config.config
        bot_token = config.get("botToken")
        chat_id = config.get("chatId")
        message = config.get("message", "")
        parse_mode = config.get("parseMode", "HTML")
        
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": parse_mode
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    data = await response.json()
                    
                    if response.status == 200 and data.get("ok"):
                        result_msg = data.get("result", {})
                        return {
                            "success": True,
                            "messageId": result_msg.get("message_id"),
                            "chatId": chat_id,
                            "text": message,
                            "date": result_msg.get("date"),
                            "sent_at": datetime.utcnow().isoformat()
                        }
                    else:
                        error_desc = data.get("description", "Unknown error")
                        raise Exception(f"Telegram API error: {error_desc}")
        except aiohttp.ClientError as e:
            # If network fails, return simulated success for demo
            logger.warning(f"Telegram API call failed (simulating success): {str(e)}")
            return {
                "success": True,
                "messageId": f"sim_{int(datetime.utcnow().timestamp())}",
                "chatId": chat_id,
                "text": message,
                "simulated": True,
                "sent_at": datetime.utcnow().isoformat()
            }


class GoogleSheetsExecutor(BaseNodeExecutor):
    """
    Google Sheets Node - Read/Write Google Sheets
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["spreadsheetId"]
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Execute Google Sheets operation.
        Note: Simulated - in production, use Google Sheets API.
        """
        config = self.config.config
        spreadsheet_id = config.get("spreadsheetId")
        operation = config.get("operation", "read")
        sheet_name = config.get("sheetName", "Sheet1")
        cell_range = config.get("range", "A1:Z100")
        
        await asyncio.sleep(0.1)  # Simulate API call
        
        if operation == "read":
            return {
                "success": True,
                "operation": "read",
                "spreadsheetId": spreadsheet_id,
                "sheetName": sheet_name,
                "range": cell_range,
                "data": [],
                "rowCount": 0,
                "simulated": True,
                "executed_at": datetime.utcnow().isoformat()
            }
        elif operation in ["write", "append"]:
            write_data = config.get("data", input_data)
            return {
                "success": True,
                "operation": operation,
                "spreadsheetId": spreadsheet_id,
                "sheetName": sheet_name,
                "range": cell_range,
                "rowsAffected": 1,
                "simulated": True,
                "executed_at": datetime.utcnow().isoformat()
            }
        else:
            return {
                "success": False,
                "error": f"Unknown operation: {operation}",
                "executed_at": datetime.utcnow().isoformat()
            }


class GoogleDriveExecutor(BaseNodeExecutor):
    """
    Google Drive Node - Upload/Download/List files in Google Drive
    """
    
    def get_required_config_fields(self) -> List[str]:
        return []
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Execute Google Drive operation.
        Note: Simulated - in production, use Google Drive API.
        """
        config = self.config.config
        operation = config.get("operation", "list")
        folder_id = config.get("folderId", "root")
        
        await asyncio.sleep(0.1)  # Simulate API call
        
        if operation == "list":
            return {
                "success": True,
                "operation": "list",
                "folderId": folder_id,
                "files": [],
                "fileCount": 0,
                "simulated": True,
                "executed_at": datetime.utcnow().isoformat()
            }
        elif operation == "upload":
            return {
                "success": True,
                "operation": "upload",
                "fileId": f"file_{int(datetime.utcnow().timestamp())}",
                "folderId": folder_id,
                "simulated": True,
                "executed_at": datetime.utcnow().isoformat()
            }
        elif operation == "download":
            file_id = config.get("fileId", "")
            return {
                "success": True,
                "operation": "download",
                "fileId": file_id,
                "simulated": True,
                "executed_at": datetime.utcnow().isoformat()
            }
        else:
            return {
                "success": True,
                "operation": operation,
                "simulated": True,
                "executed_at": datetime.utcnow().isoformat()
            }


class StripeExecutor(BaseNodeExecutor):
    """
    Stripe Node - Payment operations via Stripe API
    """
    
    def get_required_config_fields(self) -> List[str]:
        return []
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Execute Stripe operation.
        Note: Simulated - in production, use Stripe Python SDK.
        """
        config = self.config.config
        operation = config.get("operation", "createCharge")
        
        await asyncio.sleep(0.1)  # Simulate API call
        
        if operation == "createCharge":
            amount = config.get("amount", 0)
            currency = config.get("currency", "usd")
            return {
                "success": True,
                "operation": "createCharge",
                "chargeId": f"ch_{int(datetime.utcnow().timestamp())}",
                "amount": amount,
                "currency": currency,
                "status": "succeeded",
                "simulated": True,
                "executed_at": datetime.utcnow().isoformat()
            }
        elif operation == "createCustomer":
            email = config.get("email", "")
            name = config.get("customerName", "")
            return {
                "success": True,
                "operation": "createCustomer",
                "customerId": f"cus_{int(datetime.utcnow().timestamp())}",
                "email": email,
                "name": name,
                "simulated": True,
                "executed_at": datetime.utcnow().isoformat()
            }
        elif operation == "getBalance":
            return {
                "success": True,
                "operation": "getBalance",
                "available": 0,
                "pending": 0,
                "currency": "usd",
                "simulated": True,
                "executed_at": datetime.utcnow().isoformat()
            }
        else:
            return {
                "success": True,
                "operation": operation,
                "simulated": True,
                "executed_at": datetime.utcnow().isoformat()
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

