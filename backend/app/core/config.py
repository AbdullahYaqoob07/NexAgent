from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_VERSION: str = "v1"
    PROJECT_NAME: str = "NexAgent API"
    DESCRIPTION: str = "NexAgent Workflow Automation Backend"
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-here-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Firebase Configuration
    FIREBASE_PROJECT_ID: str = "nexagent-90391"
    FIREBASE_PRIVATE_KEY_ID: str = ""
    FIREBASE_PRIVATE_KEY: str = ""
    FIREBASE_CLIENT_EMAIL: str = ""
    FIREBASE_CLIENT_ID: str = ""
    FIREBASE_AUTH_URI: str = "https://accounts.google.com/o/oauth2/auth"
    FIREBASE_TOKEN_URI: str = "https://oauth2.googleapis.com/token"
    FIREBASE_AUTH_PROVIDER_CERT_URL: str = "https://www.googleapis.com/oauth2/v1/certs"
    FIREBASE_CLIENT_CERT_URL: str = ""
    
    # Email Configuration (Optional)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@nexagent.com"
    
    # Stripe Configuration
    STRIPE_SECRET_KEY: str = "sk_test_example"
    STRIPE_PUBLISHABLE_KEY: str = "pk_test_example" 
    STRIPE_WEBHOOK_SECRET: str = "whsec_example"
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "https://nexagent.com"]
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()


def get_firebase_credentials():
    """Get Firebase credentials as a dictionary for Firebase Admin SDK"""
    return {
        "type": "service_account",
        "project_id": settings.FIREBASE_PROJECT_ID,
        "private_key_id": settings.FIREBASE_PRIVATE_KEY_ID,
        "private_key": settings.FIREBASE_PRIVATE_KEY.replace('\\n', '\n'),
        "client_email": settings.FIREBASE_CLIENT_EMAIL,
        "client_id": settings.FIREBASE_CLIENT_ID,
        "auth_uri": settings.FIREBASE_AUTH_URI,
        "token_uri": settings.FIREBASE_TOKEN_URI,
        "auth_provider_x509_cert_url": settings.FIREBASE_AUTH_PROVIDER_CERT_URL,
        "client_x509_cert_url": settings.FIREBASE_CLIENT_CERT_URL,
    }