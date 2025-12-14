from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.v1.auth import router as auth_router
from app.api.v1.workflows import router as workflow_router
from app.api.v1.notifications import router as notification_router
from app.api.v1.marketplace import router as marketplace_router
from app.api.v1.templates import router as template_router
from app.api.v1.integrations import router as integration_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.audit import router as audit_router
from app.api.routes.billing import router as billing_router
import logging
import uvicorn

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

# Create FastAPI instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.DESCRIPTION,
    version=settings.API_VERSION,
    debug=settings.DEBUG,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Add CORS middleware
# Ensure localhost:3000 is always included for local development
cors_origins = list(settings.CORS_ORIGINS) if isinstance(settings.CORS_ORIGINS, list) else [str(settings.CORS_ORIGINS)]
if "http://localhost:3000" not in cors_origins:
    cors_origins.append("http://localhost:3000")

# Log CORS origins for debugging
logger.info(f"CORS allowed origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware for security
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["localhost", "127.0.0.1", "*.nexagent.com", "*.railway.app", "*.up.railway.app"]
)


# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "error": "HTTP_EXCEPTION",
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "error": "INTERNAL_SERVER_ERROR",
            "status_code": 500
        }
    )


# Health check endpoint
@app.get("/")
async def root():
    return {
        "success": True,
        "message": "NexAgent API is running",
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT
    }


@app.get("/health")
async def health_check():
    return {
        "success": True,
        "message": "API is healthy",
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT
    }


# Include routers
app.include_router(auth_router, prefix=f"/api/{settings.API_VERSION}")
app.include_router(workflow_router, prefix=f"/api/{settings.API_VERSION}")
app.include_router(notification_router, prefix=f"/api/{settings.API_VERSION}")
app.include_router(marketplace_router, prefix=f"/api/{settings.API_VERSION}")
app.include_router(template_router, prefix=f"/api/{settings.API_VERSION}")
app.include_router(integration_router, prefix=f"/api/{settings.API_VERSION}")
app.include_router(analytics_router, prefix=f"/api/{settings.API_VERSION}")
app.include_router(audit_router, prefix=f"/api/{settings.API_VERSION}")
app.include_router(billing_router)


# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.PROJECT_NAME}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"API Version: {settings.API_VERSION}")
    logger.info(f"CORS Origins from config: {settings.CORS_ORIGINS}")
    logger.info(f"CORS Origins after processing: {cors_origins}")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"Shutting down {settings.PROJECT_NAME}")


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )