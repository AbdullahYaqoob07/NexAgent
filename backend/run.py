#!/usr/bin/env python3
"""
Development script to run the NexAgent FastAPI backend
"""
import sys
from pathlib import Path

# Add project root to Python path so we can import lib
backend_dir = Path(__file__).parent
project_root = backend_dir.parent
sys.path.insert(0, str(project_root))

import uvicorn
from app.main import app
from app.core.config import settings

if __name__ == "__main__":
    print(f"🚀 Starting NexAgent API server...")
    print(f"📍 Environment: {settings.ENVIRONMENT}")
    print(f"🌐 Server: http://{settings.API_HOST}:{settings.API_PORT}")
    print(f"📚 Docs: http://{settings.API_HOST}:{settings.API_PORT}/docs")
    print(f"🔧 Debug mode: {settings.DEBUG}")
    
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=settings.DEBUG
    )