"""
AI/ML Node Executors
"""
import asyncio
import json
from typing import Any, Dict, List
from datetime import datetime
import logging
import aiohttp
from ..nodes.base import BaseNodeExecutor

logger = logging.getLogger(__name__)


class OpenAIExecutor(BaseNodeExecutor):
    """
    OpenAI Node - GPT completions
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["prompt"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        # Check for API key
        api_key = config.get("apiKey") or self.context.api_keys.get("openai")
        if not api_key:
            errors.append("OpenAI API key required")
        
        # Validate model
        model = config.get("model", "gpt-3.5-turbo")
        valid_models = ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "gpt-3.5-turbo-16k"]
        if model not in valid_models:
            errors.append(f"Invalid model. Must be one of: {', '.join(valid_models)}")
        
        # Validate temperature
        temperature = config.get("temperature", 0.7)
        if not isinstance(temperature, (int, float)) or temperature < 0 or temperature > 2:
            errors.append("Temperature must be between 0 and 2")
        
        # Validate max tokens
        max_tokens = config.get("maxTokens", 1000)
        if not isinstance(max_tokens, int) or max_tokens < 1 or max_tokens > 4000:
            errors.append("Max tokens must be between 1 and 4000")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Execute OpenAI API call.
        """
        config = self.config.config
        prompt = config.get("prompt")
        model = config.get("model", "gpt-3.5-turbo")
        temperature = config.get("temperature", 0.7)
        max_tokens = config.get("maxTokens", 1000)
        api_key = config.get("apiKey") or self.context.api_keys.get("openai")
        
        if not api_key:
            raise ValueError("OpenAI API key not found")
        
        # Prepare request
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"OpenAI API error: {response.status} - {error_text}")
                    
                    data = await response.json()
                    
                    return {
                        "success": True,
                        "model": model,
                        "response": data.get("choices", [{}])[0].get("message", {}).get("content", ""),
                        "usage": data.get("usage", {}),
                        "finish_reason": data.get("choices", [{}])[0].get("finish_reason"),
                        "created_at": datetime.utcnow().isoformat()
                    }
        except Exception as e:
            logger.error(f"OpenAI API call failed: {str(e)}")
            raise


class TextAnalysisExecutor(BaseNodeExecutor):
    """
    Text Analysis Node - Analyzes text
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["text"]
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Analyze text.
        Note: This is a placeholder. In production, use NLP libraries or APIs.
        """
        config = self.config.config
        text = config.get("text", "")
        analysis_type = config.get("analysisType", "sentiment")
        
        # Simple analysis (placeholder)
        word_count = len(text.split()) if text else 0
        char_count = len(text) if text else 0
        
        return {
            "text": text,
            "analysis_type": analysis_type,
            "word_count": word_count,
            "char_count": char_count,
            "analyzed_at": datetime.utcnow().isoformat()
        }


class ImageProcessingExecutor(BaseNodeExecutor):
    """
    Image Processing Node - Processes images
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["imageUrl"]
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Process image.
        Note: This is a placeholder. In production, use image processing libraries.
        """
        config = self.config.config
        image_url = config.get("imageUrl")
        operation = config.get("operation", "resize")
        
        return {
            "image_url": image_url,
            "operation": operation,
            "processed_at": datetime.utcnow().isoformat()
        }


class DataTransformExecutor(BaseNodeExecutor):
    """
    Data Transform Node - Transforms data
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["transform"]
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Transform data.
        """
        config = self.config.config
        transform = config.get("transform", {})
        
        # Apply transformations
        result = input_data
        if isinstance(transform, dict):
            # Apply each transformation
            for key, value in transform.items():
                if key == "map":
                    # Map transformation
                    if isinstance(result, list):
                        result = [value(item) if callable(value) else item for item in result]
                elif key == "filter":
                    # Filter transformation
                    if isinstance(result, list):
                        if callable(value):
                            result = [item for item in result if value(item)]
                        # If value is not callable, keep all items (no filtering)
                elif key == "reduce":
                    # Reduce transformation
                    if isinstance(result, list) and callable(value):
                        result = value(result)
        
        return {
            "original": input_data,
            "transformed": result,
            "transformed_at": datetime.utcnow().isoformat()
        }

